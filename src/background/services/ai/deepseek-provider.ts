import type { CompletionProvider } from "./types";

export class DeepSeekProvider implements CompletionProvider {
  constructor(private readonly apiKey: string, private readonly model: string) {}

  async complete(prompt: string): Promise<{ content: string; sources: [] }> {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: this.model, messages: [{ role: "user", content: prompt }], temperature: 0.3 }),
    });
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
    if (!response.ok) throw new Error(payload.error?.message || `DeepSeek request failed (${response.status})`);
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("DeepSeek returned no usable content.");
    return { content, sources: [] };
  }
}
