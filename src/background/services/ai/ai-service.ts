import { getConfiguredModel, type AIProvider, type Settings } from "../../../shared/models";
import { AnthropicProvider } from "./anthropic-provider";
import { DeepSeekProvider } from "./deepseek-provider";
import { GeminiProvider } from "./gemini-provider";
import type { CompletionProvider } from "./types";
import { OpenAIProvider } from "./openai-provider";
import { QwenProvider } from "./qwen-provider";

export function createCompletionProvider(settings: Settings): CompletionProvider {
  const model = getConfiguredModel(settings);
  const provider: Record<AIProvider, () => CompletionProvider> = {
    qwen: () => new QwenProvider(settings.apiKey, model),
    openai: () => new OpenAIProvider(settings.apiKey, model),
    anthropic: () => new AnthropicProvider(settings.apiKey, model),
    deepseek: () => new DeepSeekProvider(settings.apiKey, model),
    gemini: () => new GeminiProvider(settings.apiKey, model),
  };
  return provider[settings.provider]();
}
