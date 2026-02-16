import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// ---------- Helpers ----------
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function callGemini(prompt) {
  const KEY = process.env.GEMINI_API_KEY;
  if (!KEY) throw new Error("GEMINI_API_KEY missing in Render env vars");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${KEY}`;

  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const data = await resp.json().catch(() => ({}));

    if (resp.ok) {
      return (
        data?.candidates?.[0]?.content?.parts?.[0]?.text || "No text returned"
      );
    }

    // Retry on 429
    if (resp.status === 429 && attempt < maxAttempts) {
      await sleep(3000 * attempt);
      continue;
    }

    throw new Error(`Gemini Error ${resp.status}: ${JSON.stringify(data)}`);
  }

  throw new Error("Rate limit retries exhausted");
}

// ---------- Routes ----------
app.get("/", (req, res) => res.json({ status: "ok" }));

app.get("/debug", (req, res) => {
  const key = process.env.GEMINI_API_KEY || "";
  res.json({
    ok: true,
    node: process.version,
    hasKey: Boolean(key),
    keyLen: key ? key.length : 0,
  });
});

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

app.post("/ask-ai", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "prompt is required (string)" });
    }

    const answer = await callGemini(prompt);
    return res.json({ answer });
  } catch (err) {
    const msg = String(err?.message || err);

    if (msg.includes("429") || msg.toLowerCase().includes("too many requests")) {
      return res.status(429).json({
        error: "Rate limit",
        details: msg,
        tip: "Wait 30–60 seconds and try again.",
      });
    }

    return res.status(500).json({
      error: "Server error",
      details: msg,
    });
  }
});

// ✅ Express 5 safe 404 handler (MUST be last)
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    method: req.method,
    path: req.path,
  });
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));