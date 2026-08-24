import { readSelection } from "./selection";
import { FloatingAssistant } from "./ui";

const assistant = new FloatingAssistant();
let selectionTimer: number | undefined;
const CONTENT_SCRIPT_VERSION = "0.2.0";

void chrome.runtime.sendMessage({ type: "GET_RUNTIME_VERSION" }).then((response: { ok?: boolean; version?: string }) => {
  if (response.ok && response.version && response.version !== CONTENT_SCRIPT_VERSION) showRefreshNotice();
}).catch(() => undefined);

function showRefreshNotice(): void {
  if (document.getElementById("ai-selection-update-notice")) return;
  const notice = document.createElement("div"); notice.id = "ai-selection-update-notice";
  notice.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:2147483647;background:#fff;border:1px solid #ddd;border-radius:12px;padding:12px;box-shadow:0 8px 28px rgba(0,0,0,.18);font:13px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif";
  notice.innerHTML = "<b>✨ AI 划词助手已更新</b><br><span>刷新当前网页即可使用最新版本。</span><br>";
  const button = document.createElement("button"); button.textContent = "刷新网页"; button.style.cssText = "margin-top:8px;border:0;border-radius:7px;padding:6px 9px;background:#29272f;color:#fff;cursor:pointer"; button.onclick = () => location.reload(); notice.append(button); document.documentElement.append(notice);
}

document.addEventListener("mouseup", (event) => {
  if (assistant.isInside(event.target)) return;
  window.clearTimeout(selectionTimer);
  selectionTimer = window.setTimeout(() => {
    const selected = readSelection();
    if (selected) assistant.showTrigger(selected);
    else assistant.hide();
  }, 40);
});

document.addEventListener("selectionchange", () => {
  if (!window.getSelection()?.toString().trim()) assistant.hideTransient();
});
