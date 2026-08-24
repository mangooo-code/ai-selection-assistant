import type { Source } from "../../../shared/models";

export interface CompletionResult {
  content: string;
  sources: Source[];
}

export interface CompletionProvider {
  complete(prompt: string, options?: { webSearch?: boolean }): Promise<CompletionResult>;
  stream?(prompt: string, options: { webSearch?: boolean }, onToken: (token: string) => void): Promise<CompletionResult>;
}
