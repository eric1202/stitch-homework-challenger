class EventBus {
  constructor() {
    this.listeners = {};
  }

  addEventListener(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => this.removeEventListener(event, callback);
  }

  removeEventListener(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  dispatchEvent(event) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => callback());
  }
}

export const eventBus = new EventBus();
