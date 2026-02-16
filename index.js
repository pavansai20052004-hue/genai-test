import dotenv from "dotenv";
dotenv.config();

import { GoogleGenerativeAI } from "@google/generative-ai";

const KEY = process.env.GEMINI_API_KEY;

if (!KEY) {
  console.error("❌ GEMINI_API_KEY missing in .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRateLimitError(err) {
  const msg = String(err || "");
  return msg.includes("429") || msg.toLowerCase().includes("too many requests");
}

async function generateWithRetry(prompt) {
  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      if (isRateLimitError(err) && attempt < maxAttempts) {
        const waitMs = 4000 * attempt; // 4s, 8s, 12s
        console.log(`⚠️ Rate limit (429). Waiting ${waitMs / 1000}s...`);
        await sleep(waitMs);
        continue;
      }
      throw err;
    }
  }
}

(async () => {
  try {
    console.log("✅ Key loaded (len):", KEY.length);

    const prompt = "Say hello in 1 line";
    const text = await generateWithRetry(prompt);

    console.log("\n✅ Gemini response:\n");
    console.log(text);
  } catch (err) {
    console.error("\n❌ Error:");
    console.error(String(err));
  }
})();