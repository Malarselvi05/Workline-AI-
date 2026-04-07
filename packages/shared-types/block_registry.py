"""
packages/shared-types/block_registry.py
Single source of truth for all WorkLine AI block types.
Used by: ai/planner.py (server-side validation), workflow engine (block dispatch).

This file is authoritative — if you add a block here, also add it to
block_registry.ts for the frontend.
"""
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class BlockCategory(str, Enum):
    INPUT = "Input"
    EXTRACT = "Extract"
    TRANSFORM = "Transform"
    DECIDE = "Decide"
    AI = "AI"
    HUMAN = "Human"
    ACT = "Act"
    OUTPUT = "Output"
    MECHANICAL = "Mechanical"


class BlockConfigField(BaseModel):
    """Describes a single config field on a block."""
    name: str
    type: str           # "string" | "number" | "boolean" | "select"
    label: str
    required: bool = False
    default: Optional[Any] = None
    options: Optional[List[str]] = None   # for type="select"


class BlockDefinition(BaseModel):
    type: str
    category: BlockCategory
    label: str
    description: str
    icon: str                              # Lucide icon name (used by frontend)
    input_types: List[str] = []            # accepted upstream output types
    output_type: str = "any"              # what this block produces
    config_fields: List[BlockConfigField] = []
    allow_retry: bool = True
    max_retries: int = 3


BLOCK_REGISTRY: Dict[str, BlockDefinition] = {
    # ── Input ────────────────────────────────────────────────────────────────
    "file_upload": BlockDefinition(
        type="file_upload", category=BlockCategory.INPUT,
        label="File Upload", icon="Upload",
        description="Accepts uploaded files (PDF, image, CSV, etc.)",
        input_types=[], output_type="file",
        config_fields=[
            BlockConfigField(name="accepted_types", type="string", label="Accepted file types", default="*"),
            BlockConfigField(name="max_size_mb", type="number", label="Max file size (MB)", default=50),
        ],
    ),
    "api_trigger": BlockDefinition(
        type="api_trigger", category=BlockCategory.INPUT,
        label="API Trigger", icon="Webhook",
        description="Starts the workflow via an external HTTP API call",
        input_types=[], output_type="json",
        config_fields=[
            BlockConfigField(name="auth_required", type="boolean", label="Require API key", default=True),
        ],
    ),
    "form_input": BlockDefinition(
        type="form_input", category=BlockCategory.INPUT,
        label="Form Input", icon="FormInput",
        description="Collects structured data from a web form",
        input_types=[], output_type="json",
        config_fields=[
            BlockConfigField(name="fields", type="string", label="Field names (comma-separated)", required=True),
        ],
    ),
    "scheduled_trigger": BlockDefinition(
        type="scheduled_trigger", category=BlockCategory.INPUT,
        label="Scheduled Trigger", icon="Clock",
        description="Fires the workflow automatically on a cron schedule (e.g. '0 9 * * 1-5' = weekdays at 9 AM)",
        input_types=[], output_type="json",
        allow_retry=False, max_retries=0,
        config_fields=[
            BlockConfigField(name="cron_expression", type="string", label="Cron Expression", required=True,
                             default="0 9 * * *"),
            BlockConfigField(name="timezone", type="string", label="Timezone", default="UTC"),
        ],
    ),

    # ── Extract ───────────────────────────────────────────────────────────────
    "ocr": BlockDefinition(
        type="ocr", category=BlockCategory.EXTRACT,
        label="OCR", icon="ScanText",
        description="Extracts text from scanned images or PDFs (PaddleOCR + Tesseract fallback)",
        input_types=["file"], output_type="text",
        config_fields=[
            BlockConfigField(name="language", type="string", label="Language code", default="en"),
        ],
    ),
    "parse": BlockDefinition(
        type="parse", category=BlockCategory.EXTRACT,
        label="Parse", icon="FileCode",
        description="Parses structured data from text (dates, names, tables)",
        input_types=["text", "json"], output_type="json",
        config_fields=[
            BlockConfigField(name="schema", type="string", label="Target JSON schema (optional)"),
        ],
    ),

    # ── Transform ─────────────────────────────────────────────────────────────
    "clean": BlockDefinition(
        type="clean", category=BlockCategory.TRANSFORM,
        label="Clean", icon="Eraser",
        description="Cleans and normalises raw text or data",
        input_types=["text", "json"], output_type="text",
        config_fields=[
            BlockConfigField(name="strip_html", type="boolean", label="Strip HTML tags", default=True),
            BlockConfigField(name="lowercase", type="boolean", label="Convert to lowercase", default=False),
        ],
    ),
    "map_fields": BlockDefinition(
        type="map_fields", category=BlockCategory.TRANSFORM,
        label="Map Fields", icon="ArrowLeftRight",
        description="Maps input field names to a target schema",
        input_types=["json"], output_type="json",
        config_fields=[
            BlockConfigField(name="mapping", type="string", label="Field mapping JSON", required=True),
        ],
    ),

    # ── Decide ────────────────────────────────────────────────────────────────
    "router": BlockDefinition(
        type="router", category=BlockCategory.DECIDE,
        label="Router", icon="GitFork",
        description="Routes data down condition_true / condition_false edges based on a rule",
        input_types=["any"], output_type="any",
        config_fields=[
            BlockConfigField(name="condition", type="string", label="Condition expression", required=True),
        ],
    ),
    "score": BlockDefinition(
        type="score", category=BlockCategory.DECIDE,
        label="Score", icon="BarChart2",
        description="Assigns a numeric confidence/priority score to each item",
        input_types=["json", "text"], output_type="json",
        config_fields=[
            BlockConfigField(name="threshold", type="number", label="Score threshold", default=0.5),
        ],
    ),

    # ── AI ────────────────────────────────────────────────────────────────────
    "classify": BlockDefinition(
        type="classify", category=BlockCategory.AI,
        label="Classify", icon="Tag",
        description="Zero-shot document/text classification (BART-large-mnli)",
        input_types=["text", "json"], output_type="json",
        config_fields=[
            BlockConfigField(name="classes", type="string", label="Classes (comma-separated)", required=True),
            BlockConfigField(name="threshold", type="number", label="Confidence threshold", default=0.85),
        ],
    ),
    "recommend": BlockDefinition(
        type="recommend", category=BlockCategory.AI,
        label="Recommend", icon="Sparkles",
        description="XGBoost-based recommendation / ranking model",
        input_types=["json"], output_type="json",
        config_fields=[
            BlockConfigField(name="top_k", type="number", label="Top-K results", default=3),
        ],
    ),

    # ── Human ─────────────────────────────────────────────────────────────────
    "human_review": BlockDefinition(
        type="human_review", category=BlockCategory.HUMAN,
        label="Human Review", icon="UserCheck",
        description="Pauses the workflow and waits for a human to approve/reject",
        input_types=["any"], output_type="any",
        allow_retry=False, max_retries=0,
        config_fields=[
            BlockConfigField(name="reviewer_role", type="string", label="Reviewer role", default="editor"),
            BlockConfigField(name="timeout_hours", type="number", label="Timeout (hours)", default=48),
        ],
    ),

    # ── Act ───────────────────────────────────────────────────────────────────
    "store": BlockDefinition(
        type="store", category=BlockCategory.ACT,
        label="Store File", icon="HardDrive",
        description="Persists a file or record to MinIO / DB storage",
        input_types=["file", "json", "text"], output_type="json",
        config_fields=[
            BlockConfigField(name="bucket", type="string", label="Storage bucket", default="workline-files"),
            BlockConfigField(name="folder_pattern", type="string", label="Folder pattern", default="{workflow_id}/{run_id}"),
        ],
    ),
    "notify": BlockDefinition(
        type="notify", category=BlockCategory.ACT,
        label="Notify", icon="Bell",
        description="Sends an email, Slack, or webhook notification",
        input_types=["any"], output_type="json",
        config_fields=[
            BlockConfigField(name="channel", type="select", label="Channel", options=["email", "slack", "webhook"], default="email"),
            BlockConfigField(name="recipient", type="string", label="Recipient", required=True),
        ],
    ),
    "create_task": BlockDefinition(
        type="create_task", category=BlockCategory.ACT,
        label="Create Task", icon="CheckSquare",
        description="Creates a task in an external project management tool",
        input_types=["json"], output_type="json",
        config_fields=[
            BlockConfigField(name="system", type="select", label="System", options=["jira", "asana", "linear"], default="jira"),
            BlockConfigField(name="project_key", type="string", label="Project key", required=True),
        ],
    ),

    # ── Output ────────────────────────────────────────────────────────────────
    "dashboard_out": BlockDefinition(
        type="dashboard_out", category=BlockCategory.OUTPUT,
        label="Dashboard Output", icon="LayoutDashboard",
        description="Publishes a result to the WorkLine dashboard summary view",
        input_types=["json"], output_type="json",
        config_fields=[
            BlockConfigField(name="metric_name", type="string", label="Metric name", required=True),
        ],
    ),
    "export": BlockDefinition(
        type="export", category=BlockCategory.OUTPUT,
        label="Export", icon="Download",
        description="Exports data as CSV, PDF, or JSON for download",
        input_types=["json", "text"], output_type="file",
        config_fields=[
            BlockConfigField(name="format", type="select", label="Format", options=["csv", "pdf", "json"], default="csv"),
        ],
    ),

    # ── Mechanical Domain Pack ─────────────────────────────────────────────────
    "drawing_classifier": BlockDefinition(
        type="drawing_classifier", category=BlockCategory.MECHANICAL,
        label="Drawing Classifier", icon="Layers",
        description="Classifies mechanical drawings by type using a CLIP vision model",
        input_types=["file"], output_type="json",
        config_fields=[
            BlockConfigField(name="classes", type="string", label="Drawing types (comma-separated)", required=True),
        ],
    ),
    "po_extractor": BlockDefinition(
        type="po_extractor", category=BlockCategory.MECHANICAL,
        label="PO Extractor", icon="FileSearch",
        description="Extracts Purchase Order fields from engineering documents (PaddleOCR + LLM)",
        input_types=["file", "text"], output_type="json",
    ),
    "duplicate_detector": BlockDefinition(
        type="duplicate_detector", category=BlockCategory.MECHANICAL,
        label="Duplicate Drawing Detector", icon="Copy",
        description="Detects duplicate drawings using embedding cosine similarity (BGE / text-embedding-3-large)",
        input_types=["file"], output_type="json",
        config_fields=[
            BlockConfigField(name="threshold", type="number", label="Similarity threshold", default=0.95),
        ],
    ),
    "team_leader_recommender": BlockDefinition(
        type="team_leader_recommender", category=BlockCategory.MECHANICAL,
        label="Team Leader Recommender", icon="Users",
        description="Recommends the best team leader for a drawing using an XGBoost model",
        input_types=["json"], output_type="json",
    ),
}

# Convenience set used by planner validation
VALID_BLOCK_TYPES = set(BLOCK_REGISTRY.keys())