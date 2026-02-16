import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

// Debug: confirms env + node version
app.get("/debug", (req, res) => {
  const key = process.env.GEMINI_API_KEY || "";
  res.json({
    ok: true,
    node: process.version,
    hasKey: Boolean(key),
    keyLen: key.length,
    model: process.env.GEMINI_MODEL || "gemini-3-flash-preview",
  });
});

// List routes (safe)
app.get("/routes", (req, res) => {
  try {
    const routes = [];
    const stack = app?.router?.stack || app?._router?.stack || [];
    for (const layer of stack) {
      if (layer?.route?.path) {
        const methods = Object.keys(layer.route.methods || {}).map((m) =>
          m.toUpperCase()
        );
        routes.push({ path: layer.route.path, methods });
      }
    }
    res.json(routes);
  } catch (e) {
    res.status(500).json({ error: "Could not read routes", details: String(e) });
  }
});

// ---- Gemini call (Node 20+ has global fetch) ----
async function callGemini(prompt) {
  const KEY = process.env.GEMINI_API_KEY;
  if (!KEY) throw new Error("GEMINI_API_KEY missing in Render Environment");

  const MODEL = process.env.GEMINI_MODEL || "gemini-3-flash-preview";

  // Official REST endpoint style: /v1beta/models/{model}:generateContent
  // API key in header: x-goog-api-key :contentReference[oaicite:1]{index=1}
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

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

  const data = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    // Show the REAL Google error response
    const msg = data?.error?.message || JSON.stringify(data);
    const status = data?.error?.code || resp.status;
    const err = new Error(msg);
    err.status = status;
    err.google = data;
    throw err;
  }

  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "No text returned";
  return text;
}

// API route
app.post("/ask-ai", async (req, res) => {
  try {
    const { prompt } = req.body || {};

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "prompt is required (string)" });
    }

    const answer = await callGemini(prompt);
    res.json({ answer });
  } catch (err) {
    res.status(err?.status || 500).json({
      error: "Gemini request failed",
      details: String(err?.message || err),
      // (optional) include google object for debugging:
      google: err?.google || undefined,
    });
  }
});

// ✅ Express 5-safe 404 handler (DON'T use app.all("*") here)
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    method: req.method,
    path: req.path,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));