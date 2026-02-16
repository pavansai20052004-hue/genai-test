import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const KEY = process.env.GEMINI_API_KEY;

// ✅ Health check
app.get("/", (req, res) => res.json({ status: "ok" }));

// ✅ Debug route (to check Render env key)
app.get("/debug", (req, res) => {
  res.json({
    ok: true,
    node: process.version,
    hasKey: !!KEY,
    keyLen: KEY ? KEY.length : 0,
  });
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function is429(errText) {
  const msg = String(errText || "");
  return msg.includes("429") || msg.toLowerCase().includes("too many requests");
}

// ✅ Main API
app.post("/ask-ai", async (req, res) => {
  try {
    const { prompt } = req.body;

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

    // retry for 429 (rate limit)
    for (let attempt = 1; attempt <= 3; attempt++) {
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

      if (resp.ok) {
        const answer =
          data?.candidates?.[0]?.content?.parts
            ?.map((p) => p.text)
            .join("") || "No response";
        return res.json({ answer });
      }

      const msg = data?.error?.message || JSON.stringify(data);

      // if 429, wait and retry
      if (resp.status === 429 || is429(msg)) {
        await sleep(3000 * attempt);
        continue;
      }

      // other errors
      return res.status(resp.status).json({
        error: "Gemini API error",
        details: data,
      });
    }

    return res.status(429).json({
      error: "Rate limit (429). Wait 30-60 seconds and try again.",
    });
  } catch (e) {
    return res.status(500).json({ error: "Server error", details: String(e) });
  }
});

app.listen(PORT, () => {
  console.log("✅ Server running on port", PORT);
});