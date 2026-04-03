"""
GroqPlanner — Real LLM-powered workflow planner.

Supports two modes controlled by WORKLINE_MODE env var:
  cloud  (default) — Groq llama-3.3-70b-versatile (external API)
  onprem           — Ollama llama3.2:3b via OLLAMA_BASE_URL (zero external calls)
"""
import json
import logging
import os
from typing import Any, Dict, List, Optional
from collections import deque

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Block registry — single source of truth for all valid block types
# This mirrors the 20-block registry in canvasStore.ts
# ---------------------------------------------------------------------------
BLOCK_REGISTRY: Dict[str, Dict[str, str]] = {
    # Input pack
    "file_upload":    {"category": "Input",     "label": "File Upload",       "description": "Accepts uploaded files (PDF, image, CSV, etc.)"},
    "api_trigger":    {"category": "Input",     "label": "API Trigger",       "description": "Starts the workflow via an external HTTP API call"},
    "form_input":     {"category": "Input",     "label": "Form Input",        "description": "Collects structured data from a web form"},
    # Extract pack
    "ocr":            {"category": "Extract",   "label": "OCR",               "description": "Extracts text from scanned images or PDFs using OCR"},
    "parse":          {"category": "Extract",   "label": "Parse",             "description": "Parses structured data from text (dates, names, tables)"},
    # Transform pack
    "clean":          {"category": "Transform", "label": "Clean",             "description": "Cleans and normalises raw text or data"},
    "map_fields":     {"category": "Transform", "label": "Map Fields",        "description": "Maps input fields to a target schema"},
    # Decide pack
    "router":         {"category": "Decide",    "label": "Router",            "description": "Routes data down condition_true / condition_false edges"},
    "score":          {"category": "Decide",    "label": "Score",             "description": "Assigns a numeric confidence/priority score to each item"},
    # AI pack
    "classify":       {"category": "AI",        "label": "Classify",          "description": "Zero-shot document/text classification using an LLM or BART"},
    "recommend":      {"category": "AI",        "label": "Recommend",         "description": "XGBoost-based recommendation / ranking model"},
    # Human pack
    "human_review":   {"category": "Human",     "label": "Human Review",      "description": "Pauses the workflow and waits for a human to approve/reject"},
    # Act pack
    "store":          {"category": "Act",       "label": "Store File",        "description": "Persists a file or record to storage (MinIO / DB)"},
    "notify":         {"category": "Act",       "label": "Notify",            "description": "Sends an email, Slack, or webhook notification"},
    "create_task":    {"category": "Act",       "label": "Create Task",       "description": "Creates a task in an external project management tool"},
    # Output pack
    "dashboard_out":  {"category": "Output",    "label": "Dashboard Output",  "description": "Publishes a result to the dashboard summary view"},
    "export":         {"category": "Output",    "label": "Export",            "description": "Exports data as CSV, PDF, or JSON for download"},
    # Mechanical domain pack
    "drawing_classifier":       {"category": "Mechanical", "label": "Drawing Classifier",         "description": "Classifies mechanical drawings by type using a vision model"},
    "po_extractor":             {"category": "Mechanical", "label": "PO Extractor",               "description": "Extracts Purchase Order fields from engineering documents"},
    "duplicate_detector":       {"category": "Mechanical", "label": "Duplicate Drawing Detector", "description": "Detects duplicate drawings using embedding cosine similarity"},
    "team_leader_recommender":  {"category": "Mechanical", "label": "Team Leader Recommender",    "description": "Recommends the best team leader using an XGBoost model"},
}

WORKLINE_MODE = os.getenv("WORKLINE_MODE", "cloud").lower()  # "cloud" | "onprem"

VALID_BLOCK_TYPES = set(BLOCK_REGISTRY.keys())


# ---------------------------------------------------------------------------
# Layout helpers — simple horizontal Dagre-style layout computed in Python
# ---------------------------------------------------------------------------
def _compute_layout(nodes: List[Dict], edges: List[Dict]) -> List[Dict]:
    """
    Assigns position_x / position_y to each node using topological level
    (Dagre-style left-to-right layout).  Pure Python — no JS required.
    """
    X_GAP = 260  # px between columns
    Y_GAP = 160  # px between rows in the same column

    # Build adjacency for level computation
    in_degree: Dict[str, int] = {n["id"]: 0 for n in nodes}
    children: Dict[str, List[str]] = {n["id"]: [] for n in nodes}

    for e in edges:
        if e["source"] in children and e["target"] in in_degree:
            children[e["source"]].append(e["target"])
            in_degree[e["target"]] += 1

    # Kahn's BFS — topological levels
    queue = deque([nid for nid, deg in in_degree.items() if deg == 0])
    level: Dict[str, int] = {}
    while queue:
        nid = queue.popleft()
        lvl = level.get(nid, 0)
        for child in children[nid]:
            in_degree[child] -= 1
            level[child] = max(level.get(child, 0), lvl + 1)
            if in_degree[child] == 0:
                queue.append(child)

    # Count nodes per level for vertical centering
    level_counts: Dict[int, int] = {}
    level_idx: Dict[str, int] = {}
    for n in nodes:
        nid = n["id"]
        lvl = level.get(nid, 0)
        idx = level_counts.get(lvl, 0)
        level_counts[lvl] = idx + 1
        level_idx[nid] = idx

    layouted = []
    for n in nodes:
        nid = n["id"]
        lvl = level.get(nid, 0)
        idx = level_idx[nid]
        layouted.append({
            **n,
            "position": {
                "x": 80 + lvl * X_GAP,
                "y": 80 + idx * Y_GAP,
            }
        })
    return layouted


# ---------------------------------------------------------------------------
# DAG validation
# ---------------------------------------------------------------------------
def _validate_dag(nodes: List[Dict], edges: List[Dict]) -> Optional[str]:
    """Returns an error string if invalid, None if valid."""
    node_ids = {n["id"] for n in nodes}

    # 1) Check block types
    for n in nodes:
        if n.get("type") not in VALID_BLOCK_TYPES:
            return (
                f"Block type '{n.get('type')}' is not in the block registry. "
                f"Valid types: {', '.join(sorted(VALID_BLOCK_TYPES))}"
            )

    # 2) Check edge references
    for e in edges:
        if e.get("source") not in node_ids or e.get("target") not in node_ids:
            return f"Edge '{e.get('id')}' references unknown node id."

    # 3) Cycle detection (DFS)
    in_degree: Dict[str, int] = {nid: 0 for nid in node_ids}
    children: Dict[str, List[str]] = {nid: [] for nid in node_ids}
    for e in edges:
        children[e["source"]].append(e["target"])
        in_degree[e["target"]] += 1

    queue = deque([nid for nid, deg in in_degree.items() if deg == 0])
    visited = 0
    while queue:
        nid = queue.popleft()
        visited += 1
        for child in children[nid]:
            in_degree[child] -= 1
            if in_degree[child] == 0:
                queue.append(child)

    if visited != len(node_ids):
        return "The workflow graph contains a cycle. Please produce a DAG (no cycles)."

    return None


# ---------------------------------------------------------------------------
# Prompt builders
# ---------------------------------------------------------------------------
def _build_system_prompt() -> str:
    registry_lines = "\n".join(
        f"  - `{btype}` ({info['category']}): {info['description']}"
        for btype, info in BLOCK_REGISTRY.items()
    )
    return f"""You are WorkLine AI — a senior automation architect specialising in no-code, graph-based workflow design.

## Your Role
Convert the user's plain-English business goal into a JSON workflow graph.

## Available Block Registry
Only use block `type` values from this list (exact string match required):
{registry_lines}

## Output Format (strict JSON — no markdown fences)
{{
  "title": "<short workflow name, 3-6 words>",
  "reasoning": "<one paragraph explaining the overall design and why each block was chosen>",
  "nodes": [
    {{
      "id": "node_1",
      "type": "<one of the block types above>",
      "data": {{
        "label": "<human-readable name>",
        "config": {{}},
        "reasoning": "<one sentence: why this block was placed here>"
      }}
    }}
  ],
  "edges": [
    {{
      "id": "e1-2",
      "source": "node_1",
      "target": "node_2",
      "edge_type": "default"
    }}
  ]
}}

## Rules
1. The graph MUST be a DAG — no cycles.
2. Every `type` must exactly match one of the block types listed above.
3. Use `edge_type`: "default", "condition_true", or "condition_false".
4. Output ONLY the JSON object — no explanation text outside it, no markdown code fences.
5. Node IDs must be "node_1", "node_2", etc. (sequential strings).
6. Edge IDs must be "e<source_num>-<target_num>" format.
7. Keep workflows focused: 3-8 nodes unless complexity genuinely requires more.
"""


def _build_user_message(goal: str) -> str:
    return f"Design a workflow for this goal: {goal}"


def _history_to_messages(turns: list) -> List[Dict[str, str]]:
    """Convert last 8 ConversationTurn ORM objects to Groq message dicts."""
    messages = []
    for turn in turns[-8:]:
        messages.append({"role": turn.role, "content": turn.content})
    return messages


# ---------------------------------------------------------------------------
# GroqPlanner
# ---------------------------------------------------------------------------
class GroqPlanner:
    def __init__(self):
        self._mode = WORKLINE_MODE
        if self._mode == "onprem":
            # Use Ollama via litellm (no external API key needed)
            self._ollama_base = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
            logger.info("GroqPlanner: on-prem mode — Ollama at %s", self._ollama_base)
            self.client = None  # not used in onprem mode
            self.model = "ollama/llama3.2:3b"
        else:
            from groq import Groq
            from sqlalchemy.orm import Session
            api_key = os.getenv("GROQ_API_KEY")
            if not api_key:
                raise RuntimeError("GROQ_API_KEY environment variable is not set.")
            self.client = Groq(api_key=api_key)
            self.model = "llama-3.3-70b-versatile"

    # ------------------------------------------------------------------
    def _call_llm(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
        """Route to Groq (cloud) or Ollama (on-prem) depending on WORKLINE_MODE."""
        if self._mode == "onprem":
            return self._call_ollama(messages)
        return self._call_groq(messages)

    def _call_groq(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
        """Raw Groq call with JSON mode."""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.2,
            response_format={"type": "json_object"},
            max_tokens=4096,
        )
        raw = response.choices[0].message.content
        return json.loads(raw)

    def _call_ollama(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
        """Call local Ollama via the OpenAI-compatible /api/chat endpoint."""
        import urllib.request
        import urllib.error
        payload = json.dumps({
            "model": "llama3.2:3b",
            "messages": messages,
            "stream": False,
            "format": "json",
            "options": {"temperature": 0.2},
        }).encode()
        req = urllib.request.Request(
            f"{self._ollama_base}/api/chat",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.loads(resp.read().decode())
        raw_content = result["message"]["content"]
        return json.loads(raw_content)

    # ------------------------------------------------------------------
    def _parse_and_validate(self, raw: Dict[str, Any]) -> tuple[Dict[str, Any], Optional[str]]:
        """Returns (parsed_proposal, error_string_or_None)."""
        nodes = raw.get("nodes", [])
        edges = raw.get("edges", [])

        err = _validate_dag(nodes, edges)
        if err:
            return raw, err

        # Apply layout
        nodes = _compute_layout(nodes, edges)

        return {
            "title": raw.get("title", "Untitled Workflow"),
            "reasoning": raw.get("reasoning", ""),
            "nodes": nodes,
            "edges": edges,
        }, None

    # ------------------------------------------------------------------
    async def plan(
        self,
        goal: str,
        db: Session,
        conversation_id: Optional[int] = None,
        org_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Main entry point.
        - Creates (or loads) a Conversation record
        - Builds the message list with history (last 8 turns)
        - Calls Groq with retry on validation failure
        - Saves turns to DB
        - Returns WorkflowProposal dict
        """
        from app.models.models import Conversation, ConversationTurn

        # --- Load or create conversation ---
        if conversation_id:
            convo = db.query(Conversation).filter(Conversation.id == conversation_id).first()
            if not convo:
                convo = Conversation(org_id=org_id)
                db.add(convo)
                db.commit()
                db.refresh(convo)
        else:
            convo = Conversation(org_id=org_id)
            db.add(convo)
            db.commit()
            db.refresh(convo)

        # --- Build message history ---
        history = db.query(ConversationTurn).filter(
            ConversationTurn.conversation_id == convo.id
        ).order_by(ConversationTurn.created_at).all()

        messages: List[Dict[str, str]] = [
            {"role": "system", "content": _build_system_prompt()}
        ]
        messages.extend(_history_to_messages(history))
        messages.append({"role": "user", "content": _build_user_message(goal)})

        # --- Save user turn ---
        user_turn = ConversationTurn(
            conversation_id=convo.id,
            role="user",
            content=goal,
        )
        db.add(user_turn)
        db.commit()

        # --- First attempt ---
        try:
            raw = self._call_llm(messages)
            proposal, err = self._parse_and_validate(raw)
        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            raise RuntimeError(f"LLM call failed: {e}") from e

        # --- Retry once on validation failure ---
        if err:
            logger.warning(f"Validation failed on first attempt: {err}. Retrying...")
            retry_messages = messages + [
                {"role": "assistant", "content": json.dumps(raw)},
                {
                    "role": "user",
                    "content": (
                        f"Your previous response had a validation error: {err}. "
                        "Please fix it and respond with only the corrected JSON."
                    ),
                },
            ]
            try:
                raw = self._call_llm(retry_messages)
                proposal, err = self._parse_and_validate(raw)
            except Exception as e:
                logger.error(f"LLM retry call failed: {e}")
                raise RuntimeError(f"LLM retry failed: {e}") from e

            if err:
                raise RuntimeError(f"LLM produced invalid workflow after retry: {err}")

        # --- Save assistant turn ---
        assistant_turn = ConversationTurn(
            conversation_id=convo.id,
            role="assistant",
            content=proposal["reasoning"],
            proposal_json=proposal,
        )
        db.add(assistant_turn)
        db.commit()

        proposal["conversation_id"] = convo.id
        return proposal
