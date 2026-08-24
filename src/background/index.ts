import { getSettings, saveSettings } from "./config-service";
import { friendlyError, shouldRetry } from "./error-handler";
import { createCompletionProvider } from "./services/ai/ai-service";
import { chatPrompt, explainPrompt, summarizePrompt, translatePrompt } from "../shared/prompts";
import type { ExtensionMessage, ExtensionResponse } from "../shared/messages";
import { supportsWebSearch } from "../shared/models";

const MAX_SELECTED_TEXT_LENGTH = 6000;

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse: (response: ExtensionResponse) => void) => {
  void handleMessage(message).then(sendResponse);
  return true;
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "ai-selection-stream") return;
  port.onMessage.addListener((message: ExtensionMessage) => {
    if (message.type !== "RUN_AI") return;
    void handleStream(message, (event) => port.postMessage(event)).finally(() => port.disconnect());
  });
});

async function handleMessage(message: ExtensionMessage): Promise<ExtensionResponse> {
  if (message.type === "GET_SETTINGS") return { ok: true, settings: await getSettings() };
  if (message.type === "SAVE_SETTINGS") {
    await saveSettings(message.settings);
    return { ok: true, settings: message.settings };
  }
  if (message.type === "GET_STATUS") {
    const settings = await getSettings();
    return { ok: true, configured: Boolean(settings.apiKey.trim()) };
  }
  if (message.type === "GET_RUNTIME_VERSION") return { ok: true, version: chrome.runtime.getManifest().version };
  if (message.type !== "RUN_AI") return { ok: false, error: "不支持的请求" };
  if (message.selectedText.length > MAX_SELECTED_TEXT_LENGTH) return { ok: false, code: "TEXT_TOO_LONG", error: "选中的内容太长了，请缩短后再试。" };

  const settings = await getSettings();
  if (!settings.apiKey.trim()) return { ok: false, code: "NOT_CONFIGURED", error: "🔑 尚未配置API Key，请前往设置" };

  try {
    const ai = createCompletionProvider(settings);
    if (message.action === "explain") {
      const result = await ai.complete(explainPrompt(message.selectedText, message.pageContext), { webSearch: settings.webSearchEnabled && supportsWebSearch(settings) });
      return { ok: true, data: { answer: result.content, sources: result.sources } };
    }
    if (message.action === "summarize") {
      const result = await ai.complete(summarizePrompt(message.selectedText));
      return { ok: true, data: { answer: result.content, sources: [] } };
    }
    if (message.action === "translate") {
      if (isMostlyChinese(message.selectedText)) return { ok: true, data: { answer: "当前内容已经是中文", sources: [] } };
      const result = await ai.complete(translatePrompt(message.selectedText));
      return { ok: true, data: { answer: result.content, sources: [] } };
    }
    const result = await ai.complete(chatPrompt(message.selectedText, message.conversation ?? [], message.question ?? ""), { webSearch: settings.webSearchEnabled && supportsWebSearch(settings) });
    return { ok: true, data: { answer: result.content, sources: result.sources } };
  } catch (error) {
    return { ok: false, code: "REQUEST_FAILED", error: friendlyError(error) };
  }
}

function isMostlyChinese(text: string): boolean {
  const letters = text.match(/[\p{L}\p{N}]/gu) ?? [];
  if (!letters.length) return false;
  const chinese = text.match(/[\u4E00-\u9FFF]/g) ?? [];
  return chinese.length / letters.length >= 0.6;
}

async function handleStream(message: Extract<ExtensionMessage, { type: "RUN_AI" }>, emit: (event: import("../shared/messages").StreamEvent) => void): Promise<void> {
  if (message.selectedText.length > MAX_SELECTED_TEXT_LENGTH) {
    emit({ type: "ERROR", code: "TEXT_TOO_LONG", error: "选中的内容太长了，请缩短后再试。" });
    return;
  }
  const settings = await getSettings();
  if (!settings.apiKey.trim()) {
    emit({ type: "ERROR", code: "NOT_CONFIGURED", error: "🔑 尚未配置API Key，请前往设置" });
    return;
  }
  try {
    if (message.action === "translate" && isMostlyChinese(message.selectedText)) {
      emit({ type: "DONE", data: { answer: "当前内容已经是中文", sources: [] } });
      return;
    }
    const prompt = message.action === "explain" ? explainPrompt(message.selectedText, message.pageContext)
      : message.action === "summarize" ? summarizePrompt(message.selectedText)
      : message.action === "translate" ? translatePrompt(message.selectedText)
      : chatPrompt(message.selectedText, message.conversation ?? [], message.question ?? "");
    const searchText = message.action === "chat" ? message.question ?? "" : message.selectedText;
    const webSearch = (message.action === "explain" || message.action === "chat")
      && settings.webSearchEnabled
      && supportsWebSearch(settings)
      && needsWebSearch(searchText);
    const ai = createCompletionProvider(settings);
    let emittedToken = false;
    const call = () => ai.stream
      ? ai.stream(prompt, { webSearch }, (token) => { emittedToken = true; emit({ type: "TOKEN", token }); })
      : ai.complete(prompt, { webSearch });
    let result;
    try { result = await withTimeout(call(), 20_000); }
    catch (firstError) {
      if (emittedToken || !shouldRetry(firstError)) throw firstError;
      result = await withTimeout(call(), 20_000);
    }
    if (!ai.stream) emit({ type: "TOKEN", token: result.content });
    emit({ type: "DONE", data: { answer: result.content, sources: result.sources } });
  } catch (error) {
    emit({ type: "ERROR", code: "REQUEST_FAILED", error: friendlyError(error) });
  }
}

function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> { return Promise.race([promise, new Promise<T>((_resolve, reject) => setTimeout(() => reject(new Error("timeout")), milliseconds))]); }

function needsWebSearch(text: string): boolean {
  return /最新|最近|近日|今天|昨天|明天|当前|实时|新闻|更新|发布|价格|汇率|天气|股价|行情|latest|recent|today|yesterday|tomorrow|current|real[ -]?time|news|update|released|price|weather|stock/i.test(text);
}
