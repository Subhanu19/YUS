// /services/WebSocketService.js
class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Set();
    this.queue = []; // queue messages until connection opens
  }

  connect() {
    if (this.ws) return; // already connected

    this.ws = new WebSocket("wss://yus.kwscloud.in/yus/passenger-ws");

    this.ws.onopen = () => {
      console.log("✅ WebSocket connected");
      // send queued messages
      while (this.queue.length) {
        this.send(this.queue.shift());
      }
    };

    this.ws.onclose = (e) => console.warn("⚠️ WebSocket closed", e.code, e.reason);

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Driver's Current location: ",data);
        this.listeners.forEach((listener) => listener(data));
      } catch (err) {
        console.warn("Invalid WS message:", event.data);
      }
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.listeners.clear();
      console.log("WebSocket disconnected");
    }
  }

  send(payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    } else {
      console.warn("⚠️ WebSocket not connected, queuing message", payload);
      this.queue.push(payload);
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback); // unsubscribe
  }
}

// Singleton instance
const webSocketService = new WebSocketService();
export default webSocketService;