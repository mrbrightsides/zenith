
# ZENITH LIVE 🌌
### The Multimodal Agentic Orchestrator

**ZENITH LIVE** is an official entry for the **Gemini Live Agent Challenge**. It demonstrates the peak of real-time multimodal agency by unifying strategic reasoning, high-fidelity visual synthesis, and low-latency voice/vision interaction into a single agentic interface.

Try it out live at: https://al-qalam-2265a.web.app/

---

## 👁️ Vision & Agentic Philosophy
In an era where the debate around AI often centers on restriction, ZENITH LIVE is built on the principle of Creative Sovereignty. We believe that Artificial Intelligence should not be a replacement for human thought, but a high-fidelity partner in creation.

While many still view AI through the lens of automated shortcuts, ZENITH LIVE demonstrates the power of Neural Orchestration:
- AI as a Partner, Not a Proxy: Zenith is designed to handle the heavy lifting of multimodal synthesis, allowing the human "Director" to focus on high-level narrative and strategic vision.
- The Future is Agentic: By bridging the gap between reasoning (Gemini 3.1 Pro) and real-time interaction, we are moving toward a world where technology feels alive, responsive, and deeply collaborative.
- Breaking the Silos: This project serves as a proof-of-concept that complex, production-grade AI systems can be built, secured, and deployed at scale using a unified Google Cloud infrastructure.

Zenith is more than an entry; it is a statement on the potential of the next generation of Indonesian developers to lead the global AI frontier.

---

## ⚡ Agent Orchestrator (Multimodal Agency)
The core feature demonstrating end-to-end agentic workflows. Instead of isolated prompts, ZENITH LIVE handles complex, multi-stage tasks:

1.  **Cognitive Narrative:** Gemini 3 Pro reasoning engine grounded with real-time Google Search.
2.  **Visual Asset Synthesis:** Seamless transition to Imagen 3 for cinematic-grade imagery.
3.  **Temporal Motion Synthesis:** Automatic generation of 1080p video sequences via the Veo 3.1 engine.

---

## 🚀 Live Studio (The Live Agent)
The centerpiece of the challenge submission, leveraging the **Gemini 2.5 Flash Native Audio** model:

- **Interactive Handshake:** A tactile neural core that provides contextual feedback when tapped.
- **Spatial Gaze Tracking:** Procedural visualizer that tracks user mouse movement to simulate eye contact and focus.
- **Multimodal Vision:** Real-time frame streaming allows the agent to "see" and respond to the environment synchronously with voice.

---

## 🛠 Challenge Modalities

### 🎙️ Live Modality (Agentic Presence)
- **Low Latency:** Optimized PCM streaming for human-like response times.
- **Dual Transcription:** Real-time logging of agent and user speech for complete transparency.

### 🧠 Cognitive Modality (Reasoning)
- **Think Budget:** Utilizing a 16k token thinking budget for high-complexity strategy.
- **Grounded Search:** Dynamic web integration to ensure the agent's intelligence is current.

### 🎥 Temporal Modality (Production)
- **Audio-to-Visual Sync:** A unique feature where the agent analyzes uploaded audio to synthesize matching cinematic video visuals automatically.

---

## ⚙️ Tech Stack & Topology

- **Engine:** @google/genai (Gemini 3 Pro, Gemini 2.5 Flash, Veo 3.1, Imagen 3)
- **Frontend:** React 19 (ESNext), Tailwind CSS, Canvas 2D API. Hosted on Firebase Hosting (Google Cloud Global CDN)
- **Persistence:** Google Cloud Firestore for agentic memory and session storage
- **Modality Handling:** Web Audio API, Raw PCM Encoding/Decoding
- **Backend Orchestrator:** Node.js 24 (Bleeding Edge). Google Cloud Run & Cloud Functions for Firebase
- **Security:** Server-side execution to protect GEMINI_API_KEY using Google Cloud Secret Manager
- **Memory Management:** State-persistent sessions via Cloud Firestore with a customized recentHistory context windowing

---

## 🤖 Automated Deployment (Infrastructure as Code)
To meet the challenge's bonus criteria, ZENITH LIVE features an automated deployment pipeline:

- **CI/CD Pipeline**: Integrated with **GitHub Actions** (see `.github/workflows`). Automated deployments to Google Cloud (Firebase Hosting).
- **Automated Scripting**: Utilizing custom NPM scripts for one-click production builds and Firebase security rule deployments.
- **Environment Synchronization**: Automatic injection of `VITE_` prefixed environment variables during the build process to ensure secure and consistent agentic operations.
- **Server-Side Scaling:** ZENITH LIVE utilizes Google Cloud Run (2nd Gen) with Startup CPU Boost enabled, ensuring low-latency cold starts (<2s) for generative tasks.
- **Regional Optimization:** Deployed in asia-southeast1 (Singapore) for optimal latency across the SEA region.
- **Resource Orchestration:** Allocated 1GiB RAM per instance to handle high-complexity multimodal reasoning without memory throttling.

---

**Note on Architecture:** Unlike traditional client-side implementations, ZENITH LIVE uses a Secure Gateway Pattern. All AI reasoning and database writes occur in a protected server-side environment (Node.js 24), preventing API key exposure and ensuring robust data integrity.

*Engineered for the Gemini Live Agent Challenge 2026*
