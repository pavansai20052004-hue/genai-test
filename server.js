// server.js  (ESM)
// Works on Render + Express 5 (no app.all("*") crash)
// Uses global fetch (Node 18+ / Node 20 OK)

import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// ---------- Middlewares ----------
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ---------- Health ----------
app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

// ---------- Debug: check env + node ----------
app.get("/debug", (req, res) => {
  const key = process.env.GEMINI_API_KEY || "";
  res.json({
    ok: true,
    node: process.version,
    hasKey: Boolean(key),
    keyLen: key.length,
  });
});

// ---------- List routes (safe for Express 4/5) ----------
app.get("/routes", (req, res) => {
  try {
    const stack = app?.router?.stack || app?._router?.stack || [];
    const routes = [];

    for (const layer of stack) {
      if (layer?.route?.path) {
        const methods = Object.keys(layer.route.methods || {})
          .map((m) => m.toUpperCase())
          .sort();
        routes.push({ path: layer.route.path, methods });
      }
    }

    res.json(routes);
  } catch (e) {
    res.status(500).json({ error: "routes list failed", details: String(e) });
  }
});

// ---------- Gemini call ----------
async function callGemini(prompt) {
  const KEY = process.env.GEMINI_API_KEY;
  if (!KEY) {
    throw new Error("GEMINI_API_KEY missing on server (Render env vars)");
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${KEY}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  const data = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    // show real google error
    throw new Error(
      `Gemini API failed (${resp.status}): ${JSON.stringify(data)}`
    );
  }

  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    "No text returned from Gemini";
  return text;
}

// ---------- API route ----------
app.post("/ask-ai", async (req, res, next) => {
  try {
    const { prompt } = req.body || {};

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "prompt is required (string)" });
    }

    const answer = await callGemini(prompt);
    res.json({ answer });
  } catch (err) {
    next(err);
  }
});

// ---------- Error handler (prevents random 500 crashes) ----------
app.use((err, req, res, next) => {
  const msg = err?.message ? String(err.message) : String(err);
  console.error("❌ ERROR:", msg);

  res.status(500).json({
    error: "Server error",
    details: msg,
  });
});

// ---------- Catch-all LAST (Express 5 safe) ----------
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    method: req.method,
    path: req.path,
  });
});

// ---------- Listen (Render uses PORT) ----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});