
# ZENITH LIVE 🌌
### The Multimodal Agentic Orchestrator

**ZENITH LIVE** is an official entry for the **Gemini Live Agent Challenge**. It demonstrates the peak of real-time multimodal agency by unifying strategic reasoning, high-fidelity visual synthesis, and low-latency voice/vision interaction into a single agentic interface.

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
- **Frontend:** React 19 (ESNext), Tailwind CSS, Canvas 2D API
- **Persistence:** Google Cloud Firestore for agentic memory and session storage
- **Modality Handling:** Web Audio API, Raw PCM Encoding/Decoding

---

## 🤖 Automated Deployment (Infrastructure as Code)
To meet the challenge's bonus criteria, ZENITH LIVE features an automated deployment pipeline:

* **CI/CD Pipeline**: Integrated with **GitHub Actions** (see `.github/workflows`) to automate builds and deployments to Vercel upon every push to the `master` branch.
* **Automated Scripting**: Utilizing custom NPM scripts for one-click production builds and Firebase security rule deployments.
* **Environment Synchronization**: Automatic injection of `VITE_` prefixed environment variables during the build process to ensure secure and consistent agentic operations.

---

*Engineered for the Gemini Live Agent Challenge 2026*
