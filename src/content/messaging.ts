import type { ExtensionMessage, ExtensionResponse, StreamEvent } from "../shared/messages";

export function sendMessage(message: ExtensionMessage): Promise<ExtensionResponse> {
  return chrome.runtime.sendMessage(message) as Promise<ExtensionResponse>;
}

export function sendStreamingMessage(message: Extract<ExtensionMessage, { type: "RUN_AI" }>, onEvent: (event: StreamEvent) => void): Promise<ExtensionResponse> {
  return new Promise((resolve) => {
    if (!navigator.onLine) {
      resolve({ ok: false, error: "🌐 当前网络不可用，请连接网络后重试", code: "REQUEST_FAILED" });
      return;
    }
    const port = chrome.runtime.connect({ name: "ai-selection-stream" });
    let settled = false;
    const finish = (response: ExtensionResponse) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("offline", onOffline);
      resolve(response);
    };
    const onOffline = () => { try { port.disconnect(); } catch { /* already disconnected */ } finish({ ok: false, error: "🌐 网络连接已断开，请恢复网络后重试", code: "REQUEST_FAILED" }); };
    window.addEventListener("offline", onOffline, { once: true });
    port.onMessage.addListener((event: StreamEvent) => {
      onEvent(event);
      if (event.type === "DONE") finish({ ok: true, data: event.data });
      if (event.type === "ERROR") finish({ ok: false, error: event.error, code: event.code });
    });
    port.onDisconnect.addListener(() => finish({ ok: false, error: "🌐 网络连接已断开，请恢复网络后重试", code: "REQUEST_FAILED" }));
    port.postMessage(message);
  });
}
