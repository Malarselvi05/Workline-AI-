# ADR 0001: Adoption of LiteLLM for Model Routing

**Status:** Accepted
**Date:** 2026-04-07

## Context
WorkLine AI needs to support both cloud-native LLM backends (like Groq, OpenAI) and on-premises local setups (like Ollama) for enterprises with strict data sovereignty rules (our `WORKLINE_MODE="onprem"`). This requires a unified interface for routing requests without re-writing our blocks or the planning pipeline for each individual provider SDK.

## Decision
We chose **LiteLLM** to act as a proxy layer. 
LiteLLM exposes a unified, OpenAI-compatible API interface that seamlessly forwards inference requests to different backend LLM or embeddings providers.

## Consequences
**Pros:**
- **Zero code changes** across the `GroqPlanner` or `DuplicateDrawingDetectorBlock` when the deployment mode switches from Cloud to On-Premise.
- Configuration for routing is externalised efficiently in `infra/litellm_config.yaml`.
- Fast provider switching avoids vendor lock-in.

**Cons:**
- Adds an intermediate network hop / dependency in the core execution loop.
- Occasionally lags behind esoteric new model parameters, although standard completion APIs are stable.
