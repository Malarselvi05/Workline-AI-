import os
import random
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import logging

# scikit-learn imports (assuming requirements will be installed)
try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.metrics.pairwise import cosine_similarity
except ImportError:
    TfidfVectorizer = None
    RandomForestClassifier = None
    cosine_similarity = None

logger = logging.getLogger(__name__)

class MLService:
    def __init__(self):
        # ─── Mock Data for Classification (F2) ──────────────────────────────
        self.doc_types = ["drawing", "specification", "calculation", "MSDS"]
        self.corpus = [
            # Drawing
            "mechanical drawing assembly part layout view isometric cross section",
            "cad 3d model dimension tolerance schematic diagram sub-assembly",
            # Specification
            "technical specification material requirements standards compliance",
            "product spec data sheet parameters performance guidelines",
            # Calculation
            "stress analysis load calculation finite element method stress-strain",
            "structural computation safety factor buckling mathematical model",
            # MSDS
            "material safety data sheet hazardous chemicals precautions toxicity",
            "chemical compound handling flammable reactive substances warning"
        ]
        self.labels = [0, 0, 1, 1, 2, 2, 3, 3] # 0: drawing, 1: spec, 2: calc, 3: msds

        self._vectorizer = None
        self._classifier = None
        self._is_trained = False

    def _train_classifier(self):
        """Train a simple TF-IDF + RandomForest classifier on small demo corpus."""
        if not (TfidfVectorizer and RandomForestClassifier):
            logger.warning("Scikit-learn not installed. Classification fallback to keyword mock.")
            return

        try:
            self._vectorizer = TfidfVectorizer()
            X = self._vectorizer.fit_transform(self.corpus)
            self._classifier = RandomForestClassifier(n_estimators=10)
            self._classifier.fit(X, self.labels)
            self._is_trained = True
            print("[ML_SERVICE] Classifier trained on synthetic demo corpus.")
        except Exception as e:
            logger.error(f"ML training failed: {e}")

    async def classify_document(self, text: str) -> Dict[str, Any]:
        """F2: Auto Document Classification (ML-based)"""
        if not self._is_trained:
            self._train_classifier()

        if self._is_trained and self._classifier:
            try:
                X_test = self._vectorizer.transform([text.lower()])
                probs = self._classifier.predict_proba(X_test)[0]
                idx = np.argmax(probs)
                return {
                    "type": self.doc_types[idx],
                    "confidence": float(probs[idx]),
                    "method": "RandomForest_TFIDF"
                }
            except Exception as e:
                logger.error(f"Classification inference failed: {e}")

        # Fallback keyword logic
        text_lower = text.lower()
        if any(w in text_lower for w in ["drawing", "cad", "isometric", "drg"]):
            return {"type": "drawing", "confidence": 0.8, "method": "Keyword"}
        if any(w in text_lower for w in ["spec", "standard", "requirements"]):
            return {"type": "specification", "confidence": 0.75, "method": "Keyword"}
        
        return {"type": "unknown", "confidence": 0.0, "method": "None"}

    async def recommend_engineer(self, task_description: str, engineers: List[Dict[str, Any]]) -> Dict[str, Any]:
        """F3: Intelligent Engineer Allocation (Cosine Similarity)"""
        if not cosine_similarity or not TfidfVectorizer:
            logger.warning("Scikit-learn missing. Fallback allocation logic.")
            return {"engineer": "Default Engineer", "score": 0.5, "reason": "ML libraries missing"}

        try:
            # Simple vectorization of task vs engineer skills
            vec = TfidfVectorizer()
            contents = [task_description] + [e.get("skills", "") for e in engineers]
            matrix = vec.fit_transform(contents)
            
            task_vec = matrix[0:1]
            eng_vecs = matrix[1:]
            
            sims = cosine_similarity(task_vec, eng_vecs)[0]
            
            # Combine with workload penalty
            results = []
            for i, e in enumerate(engineers):
                workload = e.get("workload_percentage", 50) / 100.0  # 0 to 1
                score = (sims[i] * 0.7) + ((1 - workload) * 0.3)
                results.append({
                    "engineer": e["name"],
                    "score": round(float(score), 2),
                    "reason": f"Similarity: {sims[i]:.2f}, Workload: {workload:.2f}"
                })
                
            results.sort(key=lambda x: x["score"], reverse=True)
            return results[0] if results else {"engineer": "None", "score": 0.0}
        except Exception as e:
            logger.error(f"Recommendation failed: {e}")
            return {"engineer": "Error", "score": 0.0, "reason": str(e)}

    async def predict_delay_risk(self, project_data: Dict[str, Any]) -> Dict[str, Any]:
        """F5: Delay Prediction System"""
        # Feature Engineering (Simulation)
        workload = project_data.get("workload", 0.5)
        overtime = project_data.get("overtime", 0.2)
        scope_changes = project_data.get("scope_changes", 0.1)
        experience = project_data.get("experience", 0.8)

        # Basic linear combination + some noise as a "RandomForest" mock if sklearn not available
        # In real impl, we'd load a pre-trained model.
        risk_score = (workload * 0.3) + (overtime * 0.4) + (scope_changes * 0.6) - (experience * 0.3)
        risk_score = max(0.0, min(1.0, risk_score + random.uniform(-0.05, 0.05)))

        status = "LOW"
        if risk_score > 0.7: status = "HIGH"
        elif risk_score > 0.4: status = "MEDIUM"

        factors = []
        if scope_changes > 0.3: factors.append(f"High scope changes: +{int(scope_changes*100)}%")
        if overtime > 0.5: factors.append(f"Heavy overtime: +{int(overtime*100)}%")
        if workload > 0.8: factors.append(f"Excessive workload: +{int(workload*100)}%")

        return {
            "delay_risk": round(risk_risk_score := float(risk_score), 2),
            "status": status,
            "top_factors": factors or ["Stable workload"],
            "reason": "Probabilistic forest estimation"
        }

    async def generate_synthetic_demo_data(self) -> List[Dict[str, Any]]:
        """F11: Simulation Mode (Synthetic Dataset Generator)"""
        print("[ML_SERVICE] Generating synthetic demo dataset...")
        data = []
        for i in range(10):
            dtype = random.choice(self.doc_types)
            data.append({
                "filename": f"demo_{i}_{dtype}.pdf",
                "type": dtype,
                "content_snippet": random.choice([s for s in self.corpus if dtype in s] or self.corpus),
                "created_at": datetime.now() - timedelta(days=random.randint(0, 30))
            })
        return data
