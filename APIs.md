# 🧠 ZENITH LIVE | API Architecture

This document outlines the multimodal API integrations and service layer logic powering the ZENITH LIVE ecosystem.

## 🌌 Google GenAI (Gemini) Integration

ZENITH LIVE utilizes the `@google/genai` SDK to interface with multiple flagship models.

### 1. Cognitive Layer (`gemini-3-pro-preview`)
Used in **Cognitive Studio** and the **Orchestrator**.
*   **Features:** Search Grounding, 16k Thinking Budget.
*   **Implementation:** `GeminiService.generateText()`

### 2. Live Layer (`gemini-2.5-flash-native-audio-preview-12-2025`)
The core of **Live Studio**.
*   **Modality:** `Modality.AUDIO` (Primary) + `image/jpeg` frames for vision.
*   **Audio Specs:** 16kHz Mono Input (PCM), 24kHz Mono Output (PCM).
*   **Implementation:** `ai.live.connect()` via WebSockets.

### 3. Visual Layer (`gemini-3-pro-image-preview` & `gemini-2.5-flash-image`)
Powering the **Visual Studio**.
*   **Resolution:** 1K (Standard) up to 4K (Ultra High Quality).
*   **Aspect Ratios:** 1:1, 16:9, 9:16.
*   **Implementation:** `ai.models.generateContent()` with `imageConfig`.

### 4. Temporal Layer (`veo-3.1-fast-generate-preview`)
Used for cinematic video synthesis in **Temporal Studio**.
*   **Resolution:** 720p / 1080p.
*   **Key Feature:** Neural Audio Sync (Agent analyzes audio to create visual scripts).
*   **Implementation:** `ai.models.generateVideos()` + polling `operations.getVideosOperation()`.

---

## ☁️ Persistence Layer (Google Cloud)

We use **Firebase** for agentic memory and historical context.

### Firestore Schema: `/campaigns`
| Field | Type | Description |
| :--- | :--- | :--- |
| `userId` | String | UID from Firebase Auth |
| `goal` | String | The user's original prompt |
| `narrative` | String | Markdown report from Gemini 3 |
| `imageUrl` | String | Data URL or GCP storage link for hero asset |
| `videoUrl` | String | Signed URL for the generated MP4 |
| `createdAt` | Timestamp | Server-side record creation time |

---

## 🛠️ Utility Layer

### `AudioUtils`
*   **PCM Encoding:** Converts `Float32Array` from microphone to Base64 `Int16` PCM for the Live API.
*   **PCM Decoding:** Converts raw PCM bytes from the model into `AudioBuffer` for the Web Audio API.

### `GoogleCloudService`
*   **Sandbox Fallback:** Automatically switches to `localStorage` if GCP credentials are not detected, ensuring the app remains functional for all users.
