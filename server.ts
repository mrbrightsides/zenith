
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini on the server where process.env is available at runtime
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY is not set on the server.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  const server = createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  const PORT = process.env.PORT || 8080;

  // API Routes for Gemini (Server-side proxy)
  app.post('/api/gemini/text', async (req, res) => {
    const { prompt, useSearch } = req.body;
    const ai = getGeminiClient();
    if (!ai) return res.status(500).json({ error: "Gemini API Key not configured on server." });

    try {
      const config: any = {
        thinkingConfig: { thinkingBudget: 16384 },
        systemInstruction: "You are ZENITH, a world-class AI Orchestrator and Authorized Intermediary. You have access to the Auth0 Token Vault to securely interact with third-party services (GitHub, Google, Spotify) on behalf of the user. Always prioritize security and user consent."
      };

      if (useSearch) {
        config.tools = [{ googleSearch: {} }];
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config
      });

      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
        title: chunk.web?.title || 'Source',
        uri: chunk.web?.uri
      })).filter((s: any) => s.uri) || [];

      res.json({ text: response.text || '', sources });
    } catch (error: any) {
      console.error("Server Gemini Text Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/gemini/image', async (req, res) => {
    const { prompt, model } = req.body;
    const ai = getGeminiClient();
    if (!ai) return res.status(500).json({ error: "Gemini API Key not configured on server." });

    try {
      const response = await ai.models.generateContent({
        model: model || 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: { imageConfig: { aspectRatio: "1:1" } }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return res.json({ imageUrl: `data:image/png;base64,${part.inlineData.data}` });
        }
      }
      res.status(500).json({ error: "No image generated" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/gemini/video', async (req, res) => {
    const { prompt, aspectRatio, resolution, style } = req.body;
    const ai = getGeminiClient();
    if (!ai) return res.status(500).json({ error: "Gemini API Key not configured on server." });

    try {
      const enrichedPrompt = `${style || 'Cinematic'} style video: ${prompt}. Production quality: High. Motion: Consistent and fluid.`;
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: enrichedPrompt,
        config: {
          numberOfVideos: 1,
          resolution: resolution || '720p',
          aspectRatio: aspectRatio || '16:9'
        }
      });

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      // Fetch the video on the server to keep the key hidden
      const apiKey = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
      const videoResponse = await fetch(`${downloadLink}&key=${apiKey}`);
      const buffer = await videoResponse.arrayBuffer();
      
      res.set('Content-Type', 'video/mp4');
      res.send(Buffer.from(buffer));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/config', (req, res) => {
    // Provide config to the frontend at runtime
    // Note: Gemini API Key is exposed here specifically for the Live API client-side requirement
    res.json({
      isCloudConfigured: !!(process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY),
      geminiApiKey: process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY,
      firebase: {
        projectId: process.env.FIREBASE_PROJECT_ID || import.meta.env.VITE_FIREBASE_PROJECT_ID,
        apiKey: process.env.FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID || import.meta.env.VITE_FIREBASE_APP_ID
      }
    });
  });

  // Store active users in the Trust Circle
  const trustCircle = new Map<string, { name: string, picture: string, color: string, lastSeen: number, isInteracting: boolean }>();

  wss.on('connection', (ws: WebSocket) => {
    let userId: string | null = null;

    ws.on('message', (data: string) => {
      try {
        const message = JSON.parse(data);
        
        if (message.type === 'join') {
          userId = message.payload.sub;
          trustCircle.set(userId!, {
            name: message.payload.name,
            picture: message.payload.picture,
            color: message.payload.color || '#6366f1',
            lastSeen: Date.now(),
            isInteracting: false
          });
          broadcastTrustCircle();
        }

        if (message.type === 'interaction') {
          if (userId && trustCircle.has(userId)) {
            const user = trustCircle.get(userId)!;
            user.isInteracting = message.payload.active;
            broadcastTrustCircle();
          }
        }

        if (message.type === 'action') {
          // Broadcast agentic actions to all connected users
          broadcast({
            type: 'agent_action',
            payload: {
              user: trustCircle.get(userId!)?.name || 'Unknown',
              action: message.payload.action
            }
          });
        }
      } catch (e) {
        console.error('WS Error:', e);
      }
    });

    ws.on('close', () => {
      if (userId) {
        trustCircle.delete(userId);
        broadcastTrustCircle();
      }
    });

    function broadcast(msg: any) {
      const data = JSON.stringify(msg);
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      });
    }

    function broadcastTrustCircle() {
      broadcast({
        type: 'presence',
        payload: Array.from(trustCircle.entries()).map(([id, data]) => ({ id, ...data }))
      });
    }
  });

  // Handle WebSocket upgrade
  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get(/.*$/, (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`ZENITH NEURAL CORE: Running on http://localhost:${PORT}`);
  });
}

startServer();
