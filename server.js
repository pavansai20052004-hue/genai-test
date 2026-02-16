import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ List all registered routes (debug)
app.get("/routes", (req, res) => {
  const routes = [];
  app._router.stack.forEach((m) => {
    if (m.route && m.route.path) {
      const methods = Object.keys(m.route.methods).map((x) => x.toUpperCase());
      routes.push({ path: m.route.path, methods });
    }
  });
  res.json(routes);
});

// ✅ Catch-all (so we can see what path is hitting)
app.all("*", (req, res) => {
  res.status(404).json({
    error: "Not Found",
    method: req.method,
    path: req.path,
  });
});

const PORT = process.env.PORT || 5000;

// Health
app.get("/", (req, res) => res.json({ status: "ok" }));

// Debug (checks env var present on Render)
app.get("/debug", (req, res) => {
  const key = process.env.GEMINI_API_KEY || "";
  res.json({
    ok: true,
    node: process.version,
    hasKey: Boolean(key),
    keyLen: key ? key.length : 0,
  });
});

// Gemini call
async function callGemini(prompt) {
  const KEY = process.env.GEMINI_API_KEY;
  if (!KEY) throw new Error("GEMINI_API_KEY missing on server (Render env vars)");

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${KEY}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  const data = await resp.json();

  if (!resp.ok) {
    // Return the real Google error message
    throw new Error(JSON.stringify(data));
  }

  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "No text returned";
  return text;
}

// API route
app.post("/ask-ai", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "prompt is required (string)" });
    }

    const answer = await callGemini(prompt);
    res.json({ answer });
  } catch (err) {
    res.status(500).json({
      error: "Server error",
      details: String(err?.message || err),
    });
  }
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));