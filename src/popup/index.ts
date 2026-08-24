import "./style.css";
import { providerDefinitions, supportsWebSearch, type AIProvider, type Settings } from "../shared/models";
import type { ExtensionResponse } from "../shared/messages";

const app = document.querySelector<HTMLElement>("#app")!;
const message = <T extends ExtensionResponse>(payload: object) => chrome.runtime.sendMessage(payload) as Promise<T>;

async function init(): Promise<void> {
  const response = await message({ type: "GET_SETTINGS" });
  if (response.ok && "settings" in response) render(response.settings);
}

function render(settings: Settings): void {
  app.innerHTML = `<header><h1>✨ AI 划词助手</h1><p>AI 配置中心</p></header><section><h2>🤖 AI 配置</h2><label>AI Provider</label><select id="provider">${Object.entries(providerDefinitions).map(([id, def]) => `<option value="${id}">${def.label}</option>`).join("")}</select><label>模型</label><select id="model"></select><label>自定义 Model Code</label><input id="custom" placeholder="可选"/><label>API Key</label><input id="key" type="password" placeholder="请输入 API Key"/><div class="toggle"><span>联网搜索</span><input id="search" type="checkbox"/></div><small id="hint"></small></section><button id="save" class="save">保存设置</button><p id="status"></p>`;
  const provider = app.querySelector<HTMLSelectElement>("#provider")!; const model = app.querySelector<HTMLSelectElement>("#model")!; const custom = app.querySelector<HTMLInputElement>("#custom")!; const key = app.querySelector<HTMLInputElement>("#key")!; const search = app.querySelector<HTMLInputElement>("#search")!; const hint = app.querySelector<HTMLElement>("#hint")!;
  provider.value = settings.provider; key.value = settings.apiKey; custom.value = settings.customModelCode; search.checked = settings.webSearchEnabled;
  const refresh = (wanted?: string) => { const def = providerDefinitions[provider.value as AIProvider]; model.replaceChildren(...def.models.map((item) => new Option(item.label, item.code))); model.value = def.models.some((item) => item.code === wanted) ? wanted! : def.models[0].code; const allowed = supportsWebSearch({ ...settings, provider: provider.value as AIProvider, model: model.value, customModelCode: custom.value }); search.disabled = !allowed; if (!allowed) search.checked = false; hint.textContent = allowed ? "此模型支持已接入的原生联网搜索。" : "该模型的原生联网搜索未接入。"; };
  refresh(settings.model); provider.onchange = () => refresh(); model.onchange = () => refresh(model.value); custom.oninput = () => refresh(model.value);
  app.querySelector<HTMLButtonElement>("#save")!.onclick = async () => { const next: Settings = { ...settings, provider: provider.value as AIProvider, model: model.value, customModelCode: custom.value.trim(), apiKey: key.value.trim(), webSearchEnabled: search.checked }; await message({ type: "SAVE_SETTINGS", settings: next }); app.querySelector("#status")!.textContent = "当前配置已保存"; };
}
void init();
