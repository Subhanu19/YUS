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

let ws = null;
let cachedMeta = null;
let currentState = AppState.currentState;

function createWS() {
  console.log("🔌 creating websocket");

  ws = new WebSocket("wss://yus.kwscloud.in/yus/passenger-ws");

  ws.onopen = () => {
    console.log("🟢 ws connected");

    if (cachedMeta) {
      ws.send(JSON.stringify(cachedMeta));
      console.log("📤 meta re-sent");
    }
  };

  ws.onmessage = (e) => {
    console.log("📡 message:", e.data);
  };

  ws.onerror = (e) => {
    console.log("❌ ws error:", e.message);
  };

  ws.onclose = () => {
    console.log("⚠️ ws closed");
    ws = null;
  };
}

function closeWS() {
  if (!ws) return;
  console.log("⛔ closing websocket");
  ws.close();
  ws = null;
}

/* -------- APP STATE HANDLER -------- */
export function initWS(meta) {
  cachedMeta = meta;

  // initial connect
  createWS();

  AppState.addEventListener("change", (nextState) => {
    console.log("📱 appState:", nextState);

    // BACKGROUND
    if (nextState === "background") {
      console.log("💾 storing meta & disconnecting");
      closeWS();
    }

    // FOREGROUND
    if (nextState === "active") {
      console.log("🔄 reconnecting websocket");
      createWS();
    }

    currentState = nextState;
  });
}
