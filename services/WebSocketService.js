// // /services/WebSocketService.js
// class WebSocketService {
//   constructor() {
//     this.ws = null;
//     this.listeners = new Set();
//     this.queue = []; // queue messages until connection opens
//   }

//   connect() {
//     if (this.ws) return; // already connected

//     this.ws = new WebSocket("wss://yus.kwscloud.in/yus/passenger-ws");

//     this.ws.onopen = () => {
//       console.log("✅ WebSocket connected");
//       // send queued messages
//       while (this.queue.length) {
//         this.send(this.queue.shift());
//       }
//     };

//     this.ws.onclose = (e) => console.warn("⚠️ WebSocket closed", e.code, e.reason);

//     this.ws.onmessage = (event) => {
//       try {
//         const data = JSON.parse(event.data);
//         console.log("Driver's Current location: ",data);
//         this.listeners.forEach((listener) => listener(data));
//       } catch (err) {
//         console.warn("Invalid WS message:", event.data);
//       }
//     };
//   }

//   disconnect() {
//     if (this.ws) {
//       this.ws.close();
//       this.ws = null;
//       this.listeners.clear();
//       console.log("WebSocket disconnected");
//     }
//   }

//   send(payload) {
//     if (this.ws && this.ws.readyState === WebSocket.OPEN) {
//       this.ws.send(JSON.stringify(payload));
//     } else {
//       console.warn("⚠️ WebSocket not connected, queuing message", payload);
//       this.queue.push(payload);
//     }
//   }

//   subscribe(callback) {
//     this.listeners.add(callback);
//     return () => this.listeners.delete(callback); // unsubscribe
//   }
// }

// // Singleton instance
// const webSocketService = new WebSocketService();
// export default webSocketService;
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
