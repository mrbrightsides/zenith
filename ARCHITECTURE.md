# Mindmap Product Ecosystem

<img width="5209" height="2467" alt="Gantt Task Schedule Flow-2026-03-12-045545" src="https://github.com/user-attachments/assets/42027b95-8888-4e8c-9502-9de60eb7c5dd" />

# Architecture System Topology

<img width="5338" height="6365" alt="Gantt Task Schedule Flow-2026-03-12-045710" src="https://github.com/user-attachments/assets/9bf8dce2-bc43-4756-9344-4de103eb8ba4" />

# AI Generation Process Orchestrator Handshake

<img width="8191" height="4734" alt="Gantt Task Schedule Flow-2026-03-12-045813" src="https://github.com/user-attachments/assets/317430d8-1fec-4352-b4ed-d000df13d788" />

# User Journey Map

<img width="8191" height="1249" alt="Gantt Task Schedule Flow-2026-03-12-045841" src="https://github.com/user-attachments/assets/1dabf259-8687-45a3-8f73-d9866d8cd0d1" />

# Dataflow Multimodal Pipeline

<img width="2363" height="4471" alt="Dataflow Multimodal Pipeline" src="https://github.com/user-attachments/assets/c6221389-0b52-4310-89eb-fc965250f77a" />

# Class Diagram Service Structure

<img width="3770" height="3820" alt="Gantt Task Schedule Flow-2026-03-12-050029" src="https://github.com/user-attachments/assets/472d751b-8ce2-4847-bb9b-c7dec0d6ccc1" />

# Secure Gateway Pattern

<img width="5426" height="5642" alt="Secure Gateway Pattern" src="https://github.com/user-attachments/assets/e5e24c92-de05-4952-8e47-c13be4a0bf39" />

To ensure production-grade security for the Gemini Live Agent Challenge, ZENITH LIVE bypasses traditional client-side API calls in favor of a Secure Gateway Pattern:
- Secret Management: All sensitive credentials, including the GEMINI_API_KEY, are never exposed to the frontend. They are stored and managed using Google Cloud Secret Manager.
- Server-Side Execution: Multimodal reasoning and high-complexity agentic tasks are orchestrated within a protected Node.js 24 environment.
- Data Integrity: By utilizing Cloud Functions for Firebase, every request is authenticated and validated before interacting with the Gemini API or GCP Firestore.

Key Technical Specifications:
- Runtime: Node.js 24 (Bleeding Edge) on Google Cloud Run.
- Latency Optimization: Startup CPU Boost enabled for sub-2s cold starts.
- Regional Deployment: asia-southeast1 (Singapore) to minimize latency for SEA-based interaction.
