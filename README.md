
# ZENITH LIVE 🌌
### The Multimodal Agentic Orchestrator

**ZENITH LIVE** is an official entry for the **Gemini Live Agent Challenge**. It demonstrates the peak of real-time multimodal agency by unifying strategic reasoning, high-fidelity visual synthesis, and low-latency voice/vision interaction into a single agentic interface.

Now officially **LIVE on Google Cloud**, Zenith has evolved from a standalone agent into a collaborative, governed, and authorized agentic ecosystem.

---

## ⚡ Neural Orchestration (Multimodal Agency)
ZENITH LIVE handles complex, multi-stage tasks by orchestrating the world's most advanced AI models:

1.  **Cognitive Narrative:** **Gemini 3.1 Pro** reasoning engine grounded with real-time Google Search.
2.  **Visual Asset Synthesis:** Seamless transition to **Imagen 3** for cinematic-grade imagery.
3.  **Temporal Motion Synthesis:** Automatic generation of 1080p video sequences via the **Veo 3.1** engine.
4.  **Live Interaction:** **Gemini 2.5 Flash (Native Audio)** for ultra-low latency voice/vision handshakes.

---

## 🚀 Key Modules & Ecosystem

### 🎙️ Live Studio (The Live Agent)
The centerpiece of the challenge, featuring:
- **Spatial Gaze Tracking:** Procedural visualizer that tracks user focus.
- **Multimodal Vision:** Real-time frame streaming for synchronous voice/vision response.
- **Neural Core:** A tactile interface providing contextual haptic-style feedback.

### 🛡️ Vault Studio (Authorized to Act)
Zenith is now an **Intermediary Agent** capable of acting on your behalf:
- **Auth0 Identity:** Secure, industry-standard authentication.
- **Token Vault:** Secure management of scoped tokens for **GitHub**, **Google Calendar**, and **Spotify**.
- **Neural Link:** The agent can manage issues, schedule sessions, and curate media with explicit user consent.

### 🧠 Governance Studio (Neural FGA)
Implementing **Fine-Grained Authorization (OpenFGA)**:
- **Relationship Tuples:** Visualizing complex policy decisions and agentic permissions.
- **Policy-Based Agency:** Defining exactly what the agent can do on specific resources.
- **Biometric Handshake:** Mock WebAuthn integration for high-stakes operations.

### 🤝 The Trust Circle (Collaborative Agency)
A real-time presence layer powered by **WebSockets**:
- **Multi-User Handshake:** See other authenticated operators in real-time.
- **Interaction Indicators:** Visual cues showing who is currently engaging with the AI.
- **Synchronized Agency:** Shared agentic actions across the entire Trust Circle.

### 🎬 Morning Briefing (Cinematic Onboarding)
A personalized start to your day:
- **Auth0 Actions:** Triggers a cinematic summary upon the first login of the day.
- **Temporal Synthesis:** Uses **Veo 3.1** to generate a briefing video summarizing your digital delta (GitHub/Calendar).

---

## ⚙️ Tech Stack & Topology

- **AI Engine:** @google/genai (Gemini 3.1 Pro, Gemini 2.5 Flash, Veo 3.1, Imagen 3)
- **Backend:** Node.js 24, Express 5, WebSocket (ws), Google Cloud Functions (2nd Gen)
- **Frontend:** React 19, Tailwind CSS, Canvas 2D API, Framer Motion
- **Infrastructure:** Google Cloud Run (Singapore), Firestore (Agentic Memory), Secret Manager
- **Identity & Auth:** Auth0, OpenFGA

---

## 🧪 Reproducible Testing Instructions

To verify the multimodal and agentic capabilities of **ZENITH LIVE**, follow these steps:

### 1. Environment Setup
Clone the repository and create a `.env` file based on `.env.example`. You will need:
- **Gemini API Key:** From [Google AI Studio](https://aistudio.google.com/).
- **Auth0 Tenant:** For identity and the "Authorized to Act" flow.
- **Firebase Project:** For agentic memory persistence.
- **OpenFGA (Auth0 FGA):** For fine-grained governance.
  - `FGA_API_URL`: Your FGA API endpoint.
  - `FGA_STORE_ID`: Your specific FGA store.
  - `FGA_CLIENT_ID` & `FGA_CLIENT_SECRET`: Scoped API credentials.
  - `FGA_API_TOKEN_ISSUER`: Your Auth0 domain (e.g., `fga.us.auth0.com`).

### 2. Installation & Startup
```bash
npm install
npm run dev
```
The application will be available at `http://localhost:8080`.

### 3. Testing Key Modalities

#### 🎙️ Live Modality (Live Studio)
1. Navigate to the **Live Studio** tab.
2. Click the **Neural Core** (the pulsing center) to initialize the handshake.
3. Grant microphone and camera permissions.
4. **Test Voice:** Say "Hello Zenith, can you hear me?" and wait for the low-latency response.
5. **Test Vision:** Show an object to your camera and ask "What am I holding?".

#### 🛡️ Authorized Agency (Vault Studio)
1. Navigate to **Vault Studio**.
2. Click **Login** to authenticate via Auth0.
3. Once logged in, click **"Connect GitHub"** or **"Connect Google"**.
4. Verify that the agent successfully acquires a scoped token (displayed in the Vault HUD).
5. Ask the agent: "Check my latest GitHub issues" to verify the "Authorized to Act" flow.

#### 🤝 Collaborative Presence (Trust Circle)
1. Open the application in **two different browser tabs** (or two different browsers).
2. Log in with different accounts (or one as guest).
3. Observe the **Trust Circle** HUD in the bottom corner.
4. Verify that both "Agents" (users) appear in real-time and show interaction pulses when one speaks to the AI.

#### 🧠 Neural Governance (Governance Studio)
1. Navigate to **Governance Studio**.
2. View the **Relationship Tuples** visualization.
3. Verify that the agent's permissions (e.g., `operator:can_read_repo`) are correctly mapped and enforced by the OpenFGA logic.

#### 🎬 Morning Briefing
1. On your first login of the day, the **Morning Briefing** modal will trigger automatically.
2. Observe the **Veo 3.1** generated cinematic summary of your digital delta.

---

*Engineered for the Gemini Live Agent Challenge 2026*  
*Engineered by mrbrightsides*
