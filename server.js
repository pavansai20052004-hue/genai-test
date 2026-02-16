import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) {
  console.error("❌ GEMINI_API_KEY missing in .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // stable

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function is429(err) {
  const msg = String(err || "");
  return msg.includes("429") || msg.toLowerCase().includes("too many requests");
}

async function generateWithRetry(prompt) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      if (is429(err) && attempt < 3) {
        await sleep(3000 * attempt); // 3s, 6s
        continue;
      }
      throw err;
    }
  }
}

app.get("/", (req, res) => res.json({ status: "ok" }));

app.post("/ask-ai", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "prompt is required (string)" });
    }

    const answer = await generateWithRetry(prompt);
    res.json({ answer });
  } catch (err) {
    const msg = String(err || "");
    if (is429(err)) {
      return res.status(429).json({
        error: "Rate limit (429). Wait 30-60 seconds and try again."
      });
    }
    res.status(500).json({ error: "Server error", details: msg });
  }
});

app.listen(process.env.PORT || 5000, () => {
  console.log("✅ Server running on port", process.env.PORT || 5000);
});