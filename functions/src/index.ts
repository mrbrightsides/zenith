import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";

admin.initializeApp();
const db = admin.firestore();

export const zenithAgent = onRequest(
  {
    region: "asia-southeast1",
    secrets: ["GEMINI_API_KEY"],
    cors: true,
  },
  async (req, res) => {
    try {
      if (req.method === "GET") {
        res.json({
          status: "ZENITH alive",
          region: "asia-southeast1",
          time: new Date().toISOString(),
        });
        return;
      }

      const { uid, message, sessionId } = req.body;

      if (!uid || !message || !sessionId) {
        res.status(400).json({
          error: "uid, message, sessionId required",
        });
        return;
      }

      logger.info("ZENITH request received", {
        uid,
        sessionId,
      });

      // =========================
      // 1️⃣ FETCH SESSION MEMORY
      // =========================
      const sessionRef = db
        .collection("users")
        .doc(uid)
        .collection("sessions")
        .doc(sessionId);

      const sessionSnap = await sessionRef.get();

      const history =
        sessionSnap.exists ?
          sessionSnap.data()?.messages || [] :
          [];

      const recentHistory = history.slice(-10);

      // =========================
      // 2️⃣ GEMINI CALL
      // =========================
      const genAI = new GoogleGenerativeAI(
        process.env.GEMINI_API_KEY!,
      );

      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
      });

      const chat = model.startChat({
        history: recentHistory.map((m: any) => ({
          role: m.role,
          parts: [{ text: m.text }],
        })),
      });

      const result = await chat.sendMessage(message);
      const reply = result.response.text();

      // =========================
      // 3️⃣ SAVE INTERACTION
      // =========================
      const updatedMessages = [
        ...history,
        {
          role: "user",
          text: message,
          ts: new Date().toISOString(),
        },
        {
          role: "model",
          text: reply,
          ts: new Date().toISOString(),
        },
      ];

      await sessionRef.set(
        {
          messages: updatedMessages,
          updatedAt:
            admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      // =========================
      // 4️⃣ RESPONSE
      // =========================
      res.json({
        status: "ok",
        reply,
        memory_used: recentHistory.length,
      });

    } catch (err: any) {
      logger.error("ZENITH ERROR", err);

      res.status(500).json({
        status: "error",
        message: err.message,
      });
    }
  },
);
