import os
import json
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

WORKLINE_MODE = os.getenv("WORKLINE_MODE", "cloud").lower()  # "cloud" | "onprem"


class LLMService:
    def __init__(self):
        print(f"[PY] llm.py | __init__ | L12: Code alive")
        print(f"[PY] llm.py | __init__ | L12: Keep it up")
        self._mode = WORKLINE_MODE
        if self._mode == "onprem":
            # On-prem: talk directly to Ollama
            self._ollama_base = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
            logger.info("LLMService: on-prem mode — Ollama at %s", self._ollama_base)
            self.client = None
            self.model = "llama3.2:3b"
        else:
            # Cloud: Groq
            from groq import Groq
            self.api_key = os.getenv("GROQ_API_KEY")
            if not self.api_key:
                logger.warning("GROQ_API_KEY not set. AI blocks will use mock mode.")
                self.client = None
            else:
                self.client = Groq(api_key=self.api_key)
            self.model = "llama-3.3-70b-versatile"

    async def chat_completion(self, messages: List[Dict[str, str]], json_mode: bool = True) -> Any:
        print(f"[PY] llm.py | chat_completion | L32: System checking in")
        if self._mode == "onprem":
            return await self._call_ollama(messages, json_mode)
        return await self._call_groq(messages, json_mode)

    async def _call_groq(self, messages: List[Dict[str, str]], json_mode: bool) -> Any:
        print(f"[PY] llm.py | _call_groq | L37: Keep it up")
        if not self.client:
            return {"error": "Groq client not initialized"}
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.1,
                response_format={"type": "json_object"} if json_mode else {"type": "text"},
                max_tokens=4096,
            )
            content = response.choices[0].message.content
            if json_mode:
                return json.loads(content)
            return content
        except Exception as e:
            logger.error(f"Groq LLM call failed: {e}")
            return {"error": str(e)}

    async def _call_ollama(self, messages: List[Dict[str, str]], json_mode: bool) -> Any:
        print(f"[PY] llm.py | _call_ollama | L56: System checking in")
        """Call Ollama's OpenAI-compatible chat endpoint (zero external network)."""
        import asyncio
        import urllib.request

        payload = json.dumps({
            "model": self.model,
            "messages": messages,
            "stream": False,
            "format": "json" if json_mode else None,
            "options": {"temperature": 0.1},
        }).encode()
        try:
            def _sync_call():
                print(f"[PY] llm.py | _sync_call | L69: Data processing")
                print(f"[PY] llm.py | _sync_call | L68: Keep it up")
                req = urllib.request.Request(
                    f"{self._ollama_base}/api/chat",
                    data=payload,
                    headers={"Content-Type": "application/json"},
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=120) as resp:
                    result = json.loads(resp.read().decode())
                return result["message"]["content"]

            content = await asyncio.get_event_loop().run_in_executor(None, _sync_call)
            if json_mode:
                return json.loads(content)
            return content
        except Exception as e:
            logger.error(f"Ollama LLM call failed: {e}")
            return {"error": str(e)}

    async def classify_text(self, text: str, categories: List[str]) -> Dict[str, Any]:
        print(f"[PY] llm.py | classify_text | L89: Antigravity active")
        prompt = f"""
        Classify the following text into one of these categories: {', '.join(categories)}.
        Text: {text}
        
        Respond with JSON: {{"category": "category_name", "confidence": 0.0-1.0, "reasoning": "short explanation"}}
        """
        messages = [{"role": "user", "content": prompt}]
        return await self.chat_completion(messages)

    async def extract_structured_data(self, text: str, schema: Dict[str, str]) -> Dict[str, Any]:
        print(f"[PY] llm.py | extract_structured_data | L99: Logic flowing")
        schema_str = json.dumps(schema, indent=2)
        prompt = f"""
        Extract structured data from the text below according to this schema:
        {schema_str}
        
        Text: {text}
        
        Respond only with the JSON object containing the extracted fields.
        """
        messages = [{"role": "user", "content": prompt}]
        return await self.chat_completion(messages)

    # ── Embedding generation ──────────────────────────────────────────────────

    async def get_embeddings(self, text: str) -> List[float]:
        print(f"[PY] llm.py | get_embeddings | L114: Code alive")
        """
        Generate text embeddings.
        cloud:  placeholder (Groq doesn't provide embeddings — use LiteLLM or OpenAI directly)
        onprem: calls BGE embedding inference server at EMBEDDING_URL
        """
        if self._mode == "onprem":
            return await self._get_bge_embeddings(text)
        # Cloud fallback: random mock (replace with real embedding provider in prod)
        import random
        logger.warning("get_embeddings: cloud mode has no embedding provider — returning mock")
        return [random.random() for _ in range(1024)]

    async def _get_bge_embeddings(self, text: str) -> List[float]:
        print(f"[PY] llm.py | _get_bge_embeddings | L127: Antigravity active")
        import asyncio
        import urllib.request
        embedding_url = os.getenv("EMBEDDING_URL", "http://localhost:8080")
        payload = json.dumps({"inputs": text}).encode()

        def _sync_call():
            print(f"[PY] llm.py | _sync_call | L133: System checking in")
            print(f"[PY] llm.py | _sync_call | L131: Data processing")
            req = urllib.request.Request(
                f"{embedding_url}/embed",
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                result = json.loads(resp.read().decode())
            # TEI returns [[...embedding...]]
            return result[0] if isinstance(result, list) and isinstance(result[0], list) else result

        try:
            return await asyncio.get_event_loop().run_in_executor(None, _sync_call)
        except Exception as e:
            logger.error("BGE embedding call failed: %s", e)
            return []