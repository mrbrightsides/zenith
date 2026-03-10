# 🛠️ ZENITH LIVE | Setup Guide

This guide will walk you through the process of deploying and running the **ZENITH LIVE** agentic orchestrator.

## 📋 Prerequisites

Before you begin, ensure you have the following ready:

1.  **Google AI Studio API Key:** Obtain from [Google AI Studio](https://aistudio.google.com/).
2.  **Auth0 Account:** Create a tenant and a "Single Page Application" for the frontend, and configure Social Connections (GitHub/Google).
3.  **Firebase Project:** Enable **Firestore** and **Anonymous Auth**.
4.  **Development Environment:** Node.js (v20+) and an ESM-capable browser.

## 🚀 Local Installation

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/mrbrightsides/zenith.git
    cd zenith
    ```

2.  **Environment Configuration:**
    Copy `.env.example` to `.env` and populate it with your credentials:
    ```bash
    cp .env.example .env
    ```

3.  **Install Dependencies:**
    ```bash
    npm install
    ```

4.  **Run Development Server:**
    ```bash
    npm run dev
    ```
    The app runs on a custom Express server with Vite middleware on port 8080.

## 🌐 Deployment (Google Cloud Run)

ZENITH LIVE is optimized for **Google Cloud Run**.

1.  **Build the Container:**
    ```bash
    gcloud builds submit --tag gcr.io/[PROJECT_ID]/zenith
    ```

2.  **Deploy to Cloud Run:**
    ```bash
    gcloud run deploy zenith --image gcr.io/[PROJECT_ID]/zenith --platform managed --region asia-southeast1 --allow-unauthenticated
    ```

3.  **Secrets:** Use **Google Cloud Secret Manager** to store `VITE_GEMINI_API_KEY` and other sensitive variables.

## ⚠️ Regional Note
The Gemini Multimodal Live API may have regional restrictions. If you encounter "Handshake Failed" errors, ensure you are testing from a supported region.
