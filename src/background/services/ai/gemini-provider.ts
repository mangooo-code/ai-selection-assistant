import type { CompletionProvider } from "./types";

export class GeminiProvider implements CompletionProvider {
  constructor(private readonly apiKey: string, private readonly model: string) {}

  async complete(prompt: string): Promise<{ content: string; sources: [] }> {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3 } }),
    });
    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: { message?: string } };
    if (!response.ok) throw new Error(payload.error?.message || `Gemini request failed (${response.status})`);
    const content = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n").trim();
    if (!content) throw new Error("Gemini returned no usable content.");
    return { content, sources: [] };
  }
}
