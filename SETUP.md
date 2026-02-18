# 🛠️ ZENITH LIVE | Setup Guide

This guide will walk you through the process of deploying and running the **ZENITH LIVE** agentic orchestrator in your local or cloud environment.

## 📋 Prerequisites

Before you begin, ensure you have the following ready:

1.  **Google AI Studio API Key:** Obtain from [Google AI Studio](https://aistudio.google.com/). Ensure you have access to Gemini 3 and 2.5 series models.
2.  **Firebase Project:** Create a project in the [Firebase Console](https://console.firebase.google.com/).
    *   Enable **Firestore Database** in test mode.
    *   Enable **Anonymous Authentication**.
3.  **Development Environment:** Node.js (v18+) and an ESM-capable browser.

## 🚀 Local Installation

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/mrbrightsides/zenith.git
    cd zenith
    ```

2.  **Environment Configuration:**
    Create a `.env` file in the root directory and populate it with your specific credentials:

    ```env
    # Google AI Studio
    API_KEY=your_gemini_api_key_here

    # Firebase Configuration
    FIREBASE_API_KEY=your_fb_api_key
    FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
    FIREBASE_PROJECT_ID=your-project-id
    FIREBASE_STORAGE_BUCKET=your-project.appspot.com
    FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    FIREBASE_APP_ID=your_app_id
    ```

3.  **Install Dependencies:**
    ```bash
    npm install
    ```

4.  **Run Development Server:**
    ```bash
    npm run dev
    ```

## 🌐 Deployment (Vercel)

ZENITH LIVE is optimized for Vercel deployment.

1.  Push your code to GitHub.
2.  Connect your repository to [Vercel](https://vercel.com/).
3.  Import the environment variables from your `.env` file into the Vercel Project Settings.
4.  Deploy. The live app will be accessible at your-project.vercel.app.

**Live Demo Reference:** [zenith-live.vercel.app](https://zenith-live.vercel.app)

## ⚠️ Regional Note
The Gemini Multimodal Live API may have regional restrictions (e.g., UK/EEA). If you encounter "Handshake Failed" errors in the Live Studio, ensure you are testing from a supported region or use a VPN directed to the USA.
