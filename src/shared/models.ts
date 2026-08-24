export type AIProvider = "qwen" | "openai" | "anthropic" | "deepseek" | "gemini";
export type SearchProvider = "mock";

export interface ModelOption {
  code: string;
  label: string;
  supportsWebSearch: boolean;
}

export interface ProviderDefinition {
  label: string;
  models: ModelOption[];
}

export const providerDefinitions: Record<AIProvider, ProviderDefinition> = {
  qwen: { label: "阿里云百炼 / Qwen", models: [
    { code: "qwen3.7-flash-2026-07-15", label: "Qwen 3.7 Flash（推荐）", supportsWebSearch: true },
    { code: "qwen-plus", label: "Qwen Plus", supportsWebSearch: true },
    { code: "qwen3-max", label: "Qwen 3 Max", supportsWebSearch: true },
  ] },
  openai: { label: "OpenAI", models: [
    { code: "gpt-5-mini", label: "GPT-5 mini", supportsWebSearch: false },
    { code: "gpt-4.1-mini", label: "GPT-4.1 mini", supportsWebSearch: false },
  ] },
  anthropic: { label: "Anthropic Claude", models: [
    { code: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", supportsWebSearch: false },
    { code: "claude-haiku-4-5", label: "Claude Haiku 4.5", supportsWebSearch: false },
  ] },
  deepseek: { label: "DeepSeek", models: [
    { code: "deepseek-chat", label: "DeepSeek Chat", supportsWebSearch: false },
    { code: "deepseek-reasoner", label: "DeepSeek Reasoner", supportsWebSearch: false },
  ] },
  gemini: { label: "Google Gemini", models: [
    { code: "gemini-3.5-flash", label: "Gemini 3.5 Flash", supportsWebSearch: false },
    { code: "gemini-2.5-flash", label: "Gemini 2.5 Flash", supportsWebSearch: false },
  ] },
};

export interface Settings {
  provider: AIProvider;
  apiKey: string;
  model: string;
  customModelCode: string;
  searchProvider: SearchProvider;
  webSearchEnabled: boolean;
}

export const defaultSettings: Settings = {
  provider: "qwen",
  apiKey: "",
  model: "qwen3.7-flash-2026-07-15",
  customModelCode: "",
  searchProvider: "mock",
  webSearchEnabled: false,
};

export interface Source {
  title: string;
  siteName: string;
  url: string;
  snippet?: string;
}

export interface AIAnswer {
  answer: string;
  sources: Source[];
}

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export type RequestAction = "explain" | "summarize" | "translate" | "chat";

export function getConfiguredModel(settings: Settings): string {
  return settings.customModelCode.trim() || settings.model;
}

export function supportsWebSearch(settings: Settings): boolean {
  if (settings.customModelCode.trim()) return false;
  return providerDefinitions[settings.provider].models.find((model) => model.code === settings.model)?.supportsWebSearch ?? false;
}
