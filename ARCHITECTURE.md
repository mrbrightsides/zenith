# Mindmap Product Ecosystem

<img width="5033" height="2138" alt="Mindmap Product Ecosystem" src="https://github.com/user-attachments/assets/febc4309-c28d-49d7-9060-1feb198bee7a" />

# Architecture System Topology

<img width="5531" height="4647" alt="Architecture System Topology" src="https://github.com/user-attachments/assets/009feefb-8226-40b2-9d7b-bb9fd53ba000" />

# AI Generation Process Orchestrator Handshake

<img width="7555" height="4145" alt="AI Generation Process Orchestrator Handshake" src="https://github.com/user-attachments/assets/ef69cd08-e3ef-4dc8-8f82-9320fa67ed1a" />

# User Journey Map

<img width="8191" height="1504" alt="User Journey Map" src="https://github.com/user-attachments/assets/08b04305-990b-4690-ac8f-830f0fb79fad" />

# Dataflow Multimodal Pipeline

<img width="2363" height="4471" alt="Dataflow Multimodal Pipeline" src="https://github.com/user-attachments/assets/c6221389-0b52-4310-89eb-fc965250f77a" />

# Class Diagram Service Structure

<img width="3935" height="3715" alt="Class Diagram Service Structure" src="https://github.com/user-attachments/assets/4de7227d-c9f2-481f-b507-fc2913c81cf9" />

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
