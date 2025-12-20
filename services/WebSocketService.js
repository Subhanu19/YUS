
import { AppState } from "react-native";

const WS_URL = "wss://yus.kwscloud.in/yus/passenger-ws";

let ws = null;
let listeners = new Set();

/* 🔴 RAM CACHE */
let cachedPayload = null;

/* ---------------- CREATE WS ---------------- */
function createWS() {
  if (ws) return;

  console.log("🔌 creating websocket");
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log("🟢 ws connected");

    // 🔁 resend RAM payload
    if (cachedPayload) {
      ws.send(JSON.stringify(cachedPayload));
      console.log("📤 re-sent RAM payload");
    }
  };

  ws.onmessage = (e) => {
    let data;
    try {
      data = JSON.parse(e.data);
    } catch {
      data = e.data;
    }

    listeners.forEach((cb) => cb(data));
  };

  ws.onerror = (e) => {
    console.log("❌ ws error:", e.message);
  };

  ws.onclose = () => {
    console.log("⚠️ ws closed");
    ws = null;
  };
}

/* ---------------- CLOSE WS ---------------- */
function closeWS() {
  if (!ws) return;
  console.log("⛔ closing websocket");
  ws.close();
  ws = null;
}

/* ---------------- PUBLIC API ---------------- */
const WebSocketService = {
  /* call ONCE in App.js */
  init() {
    createWS();

    AppState.addEventListener("change", (state) => {
      console.log("📱 appState:", state);

      if (state === "background") {
        closeWS();
      }

      if (state === "active") {
        createWS();
      }
    });
  },

  /* send + cache in RAM */
  send(payload) {
    cachedPayload = payload; // 🧠 RAM only
    console.log("💾 payload stored in RAM");

    if (!ws) createWS();

    if (ws?.readyState === 1) {
      ws.send(JSON.stringify(payload));
      console.log("📤 payload sent");
    }
  },

  /* subscribe */
  subscribe(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
};

export default WebSocketService;
