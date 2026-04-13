export type ReactPaintCallback = () => void;

// Experimental: this global patch can cause side effects and only observes React
// paint-yield signals when React pauses work through MessageChannel.
export function onReactPaint(callback: ReactPaintCallback) {
  const original = MessagePort.prototype.postMessage;

  MessagePort.prototype.postMessage = function (...args) {
    callback();
    // @ts-ignore
    return original.apply(this, args);
  };
}
