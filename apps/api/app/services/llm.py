import os
import json
import logging
from typing import Any, Dict, List, Optional
from groq import Groq

logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        if not self.api_key:
            logger.warning("GROQ_API_KEY not set. AI blocks will use mock mode.")
            self.client = None
        else:
            self.client = Groq(api_key=self.api_key)
        
        self.model = "llama-3.3-70b-versatile"

    async def chat_completion(self, messages: List[Dict[str, str]], json_mode: bool = True) -> Any:
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
            logger.error(f"LLM call failed: {e}")
            return {"error": str(e)}

    async def classify_text(self, text: str, categories: List[str]) -> Dict[str, Any]:
        prompt = f"""
        Classify the following text into one of these categories: {', '.join(categories)}.
        Text: {text}
        
        Respond with JSON: {{"category": "category_name", "confidence": 0.0-1.0, "reasoning": "short explanation"}}
        """
        messages = [{"role": "user", "content": prompt}]
        return await self.chat_completion(messages)

    async def extract_structured_data(self, text: str, schema: Dict[str, str]) -> Dict[str, Any]:
        schema_str = json.dumps(schema, indent=2)
        prompt = f"""
        Extract structured data from the text below according to this schema:
        {schema_str}
        
        Text: {text}
        
        Respond only with the JSON object containing the extracted fields.
        """
        messages = [{"role": "user", "content": prompt}]
        return await self.chat_completion(messages)
