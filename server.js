import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const KEY = process.env.GEMINI_API_KEY;

// ✅ Health check
app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

// ✅ Debug route (open in browser)
app.get("/debug", (req, res) => {
  res.json({
    ok: true,
    node: process.version,
    hasKey: !!KEY,
    keyLen: KEY ? KEY.length : 0,
  });
});

app.post("/ask-ai", async (req, res) => {
  try {
    const prompt = req.body?.prompt;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "prompt is required (string)" });
    }

    if (!KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY missing on server (Render env vars)",
      });
    }

    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      return res.status(resp.status).json({
        error: "Gemini API error",
        details: data,
      });
    }

    const answer =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "(no text)";

    res.json({ answer });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: String(err) });
  }
});

app.listen(PORT, () => console.log("Server running on port", PORT));