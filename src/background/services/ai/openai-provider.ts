import type { CompletionProvider } from "./types";

export class OpenAIProvider implements CompletionProvider {
  constructor(private readonly apiKey: string, private readonly model: string) {}

  async complete(prompt: string): Promise<{ content: string; sources: [] }> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: this.model, messages: [{ role: "user", content: prompt }], temperature: 0.3 }),
    });
    if (!response.ok) throw new Error(`OpenAI 请求失败（${response.status}）`);
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenAI 没有返回可用内容");
    return { content, sources: [] };
  }
}
