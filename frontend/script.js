// ✅ PUT YOUR BACKEND URL HERE (Render)
const API_URL = "https://genai-test-pihy.onrender.com/ask-ai";

const chat = document.getElementById("chat");
const form = document.getElementById("chatForm");
const input = document.getElementById("promptInput");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearBtn");
const themeBtn = document.getElementById("themeBtn");

// --- local storage for chat
const STORE_KEY = "genai_chat_history_v1";
const THEME_KEY = "genai_theme_v1";

// Load theme
const savedTheme = localStorage.getItem(THEME_KEY);
if (savedTheme === "light") document.body.classList.add("light");
themeBtn.textContent = document.body.classList.contains("light") ? "🌙" : "☀️";

themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("light");
  const isLight = document.body.classList.contains("light");
  localStorage.setItem(THEME_KEY, isLight ? "light" : "dark");
  themeBtn.textContent = isLight ? "🌙" : "☀️";
});

// Helpers
function timeNow() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function addMsg(role, text, meta = "") {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.innerHTML = `
    <div class="meta">${meta}</div>
    <div class="text"></div>
  `;
  div.querySelector(".text").textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  return div;
}

function addTyping() {
  const div = document.createElement("div");
  div.className = "msg bot";
  div.innerHTML = `
    <div class="meta">Bot • ${timeNow()}</div>
    <div class="typing">
      <span class="dot"></span><span class="dot"></span><span class="dot"></span>
    </div>
  `;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  return div;
}

function saveHistory() {
  const items = [];
  chat.querySelectorAll(".msg").forEach((m) => {
    const role = m.classList.contains("user") ? "user" : "bot";
    const meta = m.querySelector(".meta")?.textContent || "";
    const text = m.querySelector(".text")?.textContent || (m.querySelector(".typing") ? "__typing__" : "");
    if (text !== "__typing__") items.push({ role, meta, text });
  });
  localStorage.setItem(STORE_KEY, JSON.stringify(items));
}

function loadHistory() {
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) {
    addMsg("bot", "Hi! Ask me anything 😄", `Bot • ${timeNow()}`);
    return;
  }
  try {
    const items = JSON.parse(raw);
    if (!items.length) {
      addMsg("bot", "Hi! Ask me anything 😄", `Bot • ${timeNow()}`);
      return;
    }
    items.forEach((x) => addMsg(x.role, x.text, x.meta));
  } catch {
    addMsg("bot", "Hi! Ask me anything 😄", `Bot • ${timeNow()}`);
  }
}

clearBtn.addEventListener("click", () => {
  localStorage.removeItem(STORE_KEY);
  chat.innerHTML = "";
  addMsg("bot", "Chat cleared ✅ Ask me again 😄", `Bot • ${timeNow()}`);
});

// Load old chat on start
loadHistory();

async function askAI(prompt) {
  const resp = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  const data = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    const msg = data?.details || data?.error || `HTTP ${resp.status}`;
    throw new Error(msg);
  }

  return data?.answer || "(No answer returned)";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const prompt = input.value.trim();
  if (!prompt) return;

  addMsg("user", prompt, `You • ${timeNow()}`);
  input.value = "";
  saveHistory();

  const typing = addTyping();
  sendBtn.disabled = true;

  try {
    const answer = await askAI(prompt);
    typing.remove();
    addMsg("bot", answer, `Bot • ${timeNow()}`);
  } catch (err) {
    typing.remove();
    addMsg("bot", `⚠️ Error: ${err.message}`, `Bot • ${timeNow()}`);
  } finally {
    sendBtn.disabled = false;
    input.focus();
    saveHistory();
  }
});