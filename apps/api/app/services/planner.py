import json
from typing import List, Dict, Any
import openai
import os

class WorkflowPlanner:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        # Initialize OpenAI client here if needed
        
    async def plan_workflow(self, message: str) -> Dict[str, Any]:
        # In a real MVP, this would call GPT-4 with a specialized system prompt
        # describing the available blocks and the required JSON format.
        
        system_prompt = """
        You are WorkLine AI, a senior automation architect. 
        Convert user intent into a graph-based workflow.
        Available Block Types:
        - Input: File Upload, API Trigger
        - Extract: OCR, Parse
        - Transform: Clean, Map Fields
        - Decide: Router, Score
        - AI: Classify, Recommend
        - Act: Store File, Notify
        
        Output valid JSON with "nodes" and "edges" suitable for React Flow.
        Each node should have: id, type, position (x, y), and data (label, config).
        Each edge should have: id, source, target.
        """
        
        # Mock response for "I want to classify PDFs and store by job number"
        if "classify" in message.lower() and "pdf" in message.lower():
            return {
                "nodes": [
                    {"id": "node_1", "type": "ocr", "position": {"x": 100, "y": 100}, "data": {"label": "PDF Upload & OCR", "config": {"file_type": "PDF"}}},
                    {"id": "node_2", "type": "classify", "position": {"x": 350, "y": 100}, "data": {"label": "Document Classification", "config": {"classes": ["Invoice", "PO", "Report"]}}},
                    {"id": "node_3", "type": "store", "position": {"x": 600, "y": 100}, "data": {"label": "Secure Storage", "config": {"folder_pattern": "Job_{job_number}"}}}
                ],
                "edges": [
                    {"id": "e1-2", "source": "node_1", "target": "node_2"},
                    {"id": "e2-3", "source": "node_2", "target": "node_3"}
                ],
                "reasoning": "I've designed a 3-step pipeline. First, we ingest the PDF and perform OCR to extract text. Then, we use a classification model to categorize the document. Finally, we store the file in a structured folder system based on the job number."
            }

        # Mock response for "Analyze mechanical drawings"
        if "mechanical" in message.lower() or "drawing" in message.lower():
            return {
                "nodes": [
                    {"id": "node_1", "type": "drawing_classifier", "position": {"x": 100, "y": 100}, "data": {"label": "Drawing Classifier", "config": {}}},
                    {"id": "node_2", "type": "duplicate_detector", "position": {"x": 350, "y": 100}, "data": {"label": "Duplicate Detection", "config": {}}},
                    {"id": "node_3", "type": "po_extractor", "position": {"x": 350, "y": 300}, "data": {"label": "PO Data Extraction", "config": {}}},
                    {"id": "node_4", "type": "team_leader_recommender", "position": {"x": 600, "y": 200}, "data": {"label": "Leader Recommendation", "config": {}}}
                ],
                "edges": [
                    {"id": "e1-2", "source": "node_1", "target": "node_2"},
                    {"id": "e1-3", "source": "node_1", "target": "node_3"},
                    {"id": "e2-4", "source": "node_2", "target": "node_4"},
                    {"id": "e3-4", "source": "node_3", "target": "node_4"}
                ],
                "reasoning": "For mechanical workflows, I've designed a hybrid graph. It first classifies the drawing, then runs parallel tasks: detecting duplicates and extracting PO information. Finally, it recommends a team leader based on the consolidated findings."
            }

        # Mock response for Human-in-the-loop
        if "approval" in message.lower() or "human" in message.lower() or "confidence" in message.lower():
            return {
                "nodes": [
                    {"id": "node_1", "type": "ocr", "position": {"x": 100, "y": 100}, "data": {"label": "Invoice Ingestion", "config": {}}},
                    {"id": "node_2", "type": "classify", "position": {"x": 350, "y": 100}, "data": {"label": "Confidence Check", "config": {"threshold": 0.85}}},
                    {"id": "node_3", "type": "human_review", "position": {"x": 600, "y": 100}, "data": {"label": "Supervisor Approval", "config": {}}},
                    {"id": "node_4", "type": "store", "position": {"x": 850, "y": 100}, "data": {"label": "Final Storage", "config": {}}}
                ],
                "edges": [
                    {"id": "e1-2", "source": "node_1", "target": "node_2"},
                    {"id": "e2-3", "source": "node_2", "target": "node_3"},
                    {"id": "e3-4", "source": "node_3", "target": "node_4"}
                ],
                "reasoning": "I've added a Human Review block. If the AI confidence falls below your threshold, the workflow pauses until a supervisor approves the extraction results."
            }

        # Mock response for API/Notify
        if "notify" in message.lower() or "api" in message.lower() or "form" in message.lower():
            return {
                "nodes": [
                    {"id": "node_1", "type": "ocr", "position": {"x": 100, "y": 100}, "data": {"label": "Form Parser", "config": {}}},
                    {"id": "node_2", "type": "classify", "position": {"x": 350, "y": 100}, "data": {"label": "Priority Sort", "config": {}}},
                    {"id": "node_3", "type": "act", "position": {"x": 600, "y": 100}, "data": {"label": "API Notification", "config": {"channel": "Tech Team"}}}
                ],
                "edges": [
                    {"id": "e1-2", "source": "node_1", "target": "node_2"},
                    {"id": "e2-3", "source": "node_2", "target": "node_3"}
                ],
                "reasoning": "This flow parses the incoming support forms, sorts them by priority level using AI, and then sends an automated notification to your technical team via API."
            }
        
        # Mock response for HR / Resume Filtering
        if "resume" in message.lower() or "hiring" in message.lower() or "candidate" in message.lower():
            return {
                "nodes": [
                    {"id": "node_1", "type": "ocr", "position": {"x": 100, "y": 100}, "data": {"label": "Resume Intake", "config": {}}},
                    {"id": "node_2", "type": "classify", "position": {"x": 350, "y": 100}, "data": {"label": "Skill Extraction", "config": {}}},
                    {"id": "node_3", "type": "team_leader_recommender", "position": {"x": 600, "y": 100}, "data": {"label": "Interviewer Match", "config": {}}},
                    {"id": "node_4", "type": "act", "position": {"x": 850, "y": 100}, "data": {"label": "Schedule Interview", "config": {}}}
                ],
                "edges": [
                    {"id": "e1-2", "source": "node_1", "target": "node_2"},
                    {"id": "e2-3", "source": "node_2", "target": "node_3"},
                    {"id": "e3-4", "source": "node_3", "target": "node_4"}
                ],
                "reasoning": "This HR tunnel extracts candidate skills from resumes, matches them with the best suited technical interviewer, and automatically triggers an invite via API."
            }

        # Mock response for Customer Support routing
        if "support" in message.lower() or "complaint" in message.lower() or "ticket" in message.lower():
            return {
                "nodes": [
                    {"id": "node_1", "type": "ocr", "position": {"x": 100, "y": 100}, "data": {"label": "Ticket Ingestion", "config": {}}},
                    {"id": "node_2", "type": "classify", "position": {"x": 350, "y": 100}, "data": {"label": "Sentiment Analysis", "config": {}}},
                    {"id": "node_3", "type": "human_review", "position": {"x": 600, "y": 100}, "data": {"label": "Priority Approval", "config": {}}},
                    {"id": "node_4", "type": "act", "position": {"x": 850, "y": 100}, "data": {"label": "Auto-Response", "config": {}}}
                ],
                "edges": [
                    {"id": "e1-2", "source": "node_1", "target": "node_2"},
                    {"id": "e2-3", "source": "node_2", "target": "node_3"},
                    {"id": "e3-4", "source": "node_3", "target": "node_4"}
                ],
                "reasoning": "For high-stakes support, I've designed a flow that analyzes ticket sentiment. If it detects extreme frustration, it routes to a human manager for a personal response."
            }
        
        return {
            "nodes": [],
            "edges": [],
            "reasoning": "I'm not sure how to handle that specific request yet. Could you try describing an automation for HR, Mechanical Engineering, or Document Processing?"
        }
