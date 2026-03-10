
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  const PORT = process.env.PORT || 8080;

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
