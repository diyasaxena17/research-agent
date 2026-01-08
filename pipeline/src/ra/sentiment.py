from __future__ import annotations

from dataclasses import dataclass
from typing import List, Dict, Any

import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification


MODEL_NAME = "ProsusAI/finbert"
LABEL_MAP = {0: "negative", 1: "neutral", 2: "positive"}


@dataclass(frozen=True)
class SentimentResult:
    label: str
    score: float


class FinBertSentiment:
    """
    Teaching note:
    - We load the model ONCE and reuse it.
    - This is important for performance and is how you'd do it in production.
    """

    def __init__(self, model_name: str = MODEL_NAME):
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForSequenceClassification.from_pretrained(model_name)
        self.model.eval()

    @torch.no_grad()
    def score_texts(self, texts: List[str], max_length: int = 64) -> List[SentimentResult]:
        """
        Score a list of short texts (headlines).
        Returns label + probability for the predicted label.
        """
        if not texts:
            return []

        enc = self.tokenizer(
            texts,
            padding=True,
            truncation=True,
            max_length=max_length,
            return_tensors="pt",
        )
        logits = self.model(**enc).logits
        probs = torch.softmax(logits, dim=-1)

        results: List[SentimentResult] = []
        for p in probs:
            idx = int(torch.argmax(p).item())
            results.append(SentimentResult(label=LABEL_MAP[idx], score=float(p[idx].item())))
        return results


def summarize_sentiment(scored: List[SentimentResult]) -> Dict[str, Any]:
    """
    Convert a list of predictions into a simple summary for the UI.
    """
    counts = {"positive": 0, "neutral": 0, "negative": 0}
    for r in scored:
        counts[r.label] += 1

    total = max(1, sum(counts.values()))
    return {
        "counts": counts,
        "ratios": {k: v / total for k, v in counts.items()},
        "total": sum(counts.values()),
    }
