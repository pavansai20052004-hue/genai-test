import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// ✅ HOME ROUTE
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Server is running 🚀" });
});

// ✅ DEBUG ROUTE
app.get("/debug", (req, res) => {
  res.json({
    ok: true,
    node: process.version,
    hasKey: !!process.env.GEMINI_API_KEY,
    keyLen: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0,
  });
});

// ✅ ASK AI ROUTE
app.post("/ask-ai", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "prompt is required (string)" });
    }

    const KEY = process.env.GEMINI_API_KEY;

    if (!KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY missing on server (Render env vars)",
      });
    }

    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
      KEY;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Gemini API error",
        details: data,
      });
    }

    const answer =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response";

    res.json({ answer });
  } catch (err) {
    res.status(500).json({
      error: "Internal server error",
      details: String(err),
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});