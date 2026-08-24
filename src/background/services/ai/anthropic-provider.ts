import type { CompletionProvider } from "./types";

export class AnthropicProvider implements CompletionProvider {
  constructor(private readonly apiKey: string, private readonly model: string) {}

  async complete(prompt: string): Promise<{ content: string; sources: [] }> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": this.apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: this.model, max_tokens: 2048, messages: [{ role: "user", content: prompt }] }),
    });
    const payload = await response.json() as { content?: Array<{ type?: string; text?: string }>; error?: { message?: string } };
    if (!response.ok) throw new Error(payload.error?.message || `Anthropic request failed (${response.status})`);
    const content = payload.content?.filter((part) => part.type === "text").map((part) => part.text ?? "").join("\n").trim();
    if (!content) throw new Error("Anthropic returned no usable content.");
    return { content, sources: [] };
  }
}
