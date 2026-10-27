export type ReactPaintCallback = () => void;

// React's Scheduler creates a MessageChannel and uses `port2.postMessage(null)` /
// `port1.onmessage` to yield and resume. Subclassing MessageChannel lets us register
// a `message` listener on port1 alongside React's own handler — it fires at the
// moment React resumes from a yield, i.e. right after the browser had a chance to
// paint.
export function onReactPaint(callback: ReactPaintCallback) {
  const Original = MessageChannel;

  globalThis.MessageChannel = class extends Original {
    constructor() {
      super();
      this.port1.addEventListener("message", () => callback());
    }
  };
}
