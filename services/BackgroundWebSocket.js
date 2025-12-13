// services/BackgroundWebSocket.js
import BackgroundService from "react-native-background-actions";
import { NativeEventEmitter, NativeModules } from "react-native";

const sleep = (ms = 0) => new Promise((res) => setTimeout(res, ms));

class BackgroundWebSocket {
  constructor() {
    this.ws = null;
    this.listeners = new Set();
    this.queue = [];
    this.isRunning = false;
    this.taskStarted = false;

    this.options = {
      taskName: "YUS-WebSocket",
      taskTitle: "Yelloh Bus Live Updates",
      taskDesc: "Receiving real-time bus locations",
      taskIcon: {
        name: "ic_launcher",
        type: "mipmap",
      },
      color: "#ffcc00",
      // optional: parameters to pass into task
      parameters: { delay: 1000 },
    };
  }

  // -------------------------
  // START BACKGROUND SERVICE
  // -------------------------
  async start() {
    
    console.log("🔥 BackgroundService.start() CALLED");
console.log("🔥 BackgroundService.start CALLED");

    if (this.isRunning || this.taskStarted) return;
    this.isRunning = true;

    const websocketTask = async (taskData) => {
      console.log("🔥 BG TASK STARTED");
      console.log("🔥 BG TASK STARTED");
      
      console.log("BG Task started", taskData);
      this.taskStarted = true;

      // main reconnect loop inside background task
      while (this.isRunning) {
        try {
          await this._connectOnce();
        } catch (err) {
          console.log("BG connectOnce error", err);
        }
        // small delay before next reconnect attempt
        await sleep(3000);
      }

      console.log("BG Task loop ended");
      this.taskStarted = false;
    };

    // start background service with the task function
    try {
      await BackgroundService.start(websocketTask, this.options);
      console.log("BackgroundService started");
    } catch (err) {
      console.log("BackgroundService.start error:", err);
      this.isRunning = false;
    }
  }

  // -------------------------
  // STOP background service
  // -------------------------
  async stop() {
    this.isRunning = false;
    try {
      if (this.ws) {
        try { this.ws.close(); } catch (e) {}
        this.ws = null;
      }
      await BackgroundService.stop();
      console.log("BackgroundService stopped");
    } catch (err) {
      console.log("BackgroundService.stop error:", err);
    }
  }

  // -------------------------
  // CONNECT once (resolves when socket closes)
  // -------------------------
  _connectOnce() {

    return new Promise((resolve) => {
      console.log("🔌 Trying WS connect…");
          console.log("🔌 WS connecting…");
    
      try {
        const url = "wss://yus.kwscloud.in/yus/passenger-ws"; // <-- use your URL
        console.log("BG connecting to", url);

        // Create a fresh WebSocket each time
        this.ws = new WebSocket(url);

        
        // onopen
        this.ws.onopen = () => {
          console.log("🟢 WS OPENED");
          console.log("🟢 WS CONNECTED");

          console.log("🟢 BG WS Connected");
          // flush queued messages
          while (this.queue.length) {
            const p = this.queue.shift();
            this.send(p);
          }
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("📡 BG WS message:", data);
            // notify in-process listeners
            this.listeners.forEach((cb) => {
              try { cb(data); } catch(_) {}
            });
          } catch (e) {
            console.log("BG WS bad message:", event.data);
          }
        };

        this.ws.onerror = (err) => {
          console.log("❌ BG WS error", err && err.message ? err.message : err);
        };

        this.ws.onclose = (ev) => {
          console.log("⚠️ WS CLOSED");

          console.log("⚠️ BG WS closed", ev && ev.code);
          this.ws = null;
          resolve(); // resolve to allow reconnect loop to retry
        };

      } catch (e) {
        console.log("BG WS init failed", e);
        // short delay then resolve to retry
        setTimeout(resolve, 1000);
      }
    });
  }

  // -------------------------
  // SEND MESSAGE (queue if closed)
  // -------------------------
  send(payload) {
    try {
      const msg = typeof payload === "string" ? payload : JSON.stringify(payload);

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(msg);
      } else {
        this.queue.push(payload);
      }
    } catch (e) {
      console.log("BG send error", e);
      this.queue.push(payload);
    }
  }

  // -------------------------
  // SUBSCRIBE to incoming messages
  // -------------------------
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}

export default new BackgroundWebSocket();
