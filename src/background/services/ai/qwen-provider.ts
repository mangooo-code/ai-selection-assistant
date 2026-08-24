import type { Source } from "../../../shared/models";
import type { CompletionProvider } from "./types";

/**
 * Diagnostic baseline: the official OpenAI-compatible Chat Completions request.
 * Keep this request deliberately minimal until the selected model is verified.
 */
export class QwenProvider implements CompletionProvider {
  constructor(private readonly apiKey: string, private readonly model: string) {}

  async complete(prompt: string, options: { webSearch?: boolean } = {}): Promise<{ content: string; sources: Source[] }> {
    const response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify(this.requestBody(prompt, options)),
    });

    const payload = await response.json() as QwenCompatibleResponse;
    if (!response.ok) {
      // Do not include the API key. Preserve the server's full diagnostic fields verbatim.
      throw new Error([
        "Qwen request failed",
        `code: ${payload.code ?? "(missing)"}`,
        `message: ${payload.message ?? "(missing)"}`,
        `request_id: ${payload.request_id ?? "(missing)"}`,
      ].join("\n"));
    }

    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("Qwen returned no usable content.");
    // Web search is intentionally disabled in this minimal-request verification step.
    return { content, sources: [] };
  }

  async stream(prompt: string, options: { webSearch?: boolean }, onToken: (token: string) => void): Promise<{ content: string; sources: Source[] }> {
    const fetchStartedAt = performance.now();
    const response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ ...this.requestBody(prompt, options), stream: true }),
    });
    const responseHeadersAt = performance.now();
    if (!response.ok) throw await this.toError(response);
    if (!response.body) throw new Error("Qwen returned an empty stream.");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let answer = "";
    let firstSseChunkAt: number | undefined;
    let firstTokenAt: number | undefined;
    for (;;) {
      const { done, value } = await reader.read();
      if (value?.byteLength && firstSseChunkAt === undefined) firstSseChunkAt = performance.now();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done }).replace(/\r/g, "");
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";
      for (const event of events) {
        const data = event.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
        if (!data || data === "[DONE]") continue;
        const chunk = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
        const token = chunk.choices?.[0]?.delta?.content;
        if (!token) continue;
        if (firstTokenAt === undefined) firstTokenAt = performance.now();
        answer += token;
        onToken(token);
      }
      if (done) break;
    }
    console.info("[AI Selection Assistant] Qwen stream performance", {
      model: this.model,
      webSearch: Boolean(options.webSearch),
      startedAt: new Date().toISOString(),
      fetchStartedAtMs: 0,
      responseHeadersMs: Math.round(responseHeadersAt - fetchStartedAt),
      firstSseChunkMs: firstSseChunkAt === undefined ? null : Math.round(firstSseChunkAt - fetchStartedAt),
      firstContentTokenMs: firstTokenAt === undefined ? null : Math.round(firstTokenAt - fetchStartedAt),
      totalMs: Math.round(performance.now() - fetchStartedAt),
    });
    if (!answer) throw new Error("Qwen returned no usable streamed content.");
    return { content: answer, sources: [] };
  }

  private requestBody(prompt: string, options: { webSearch?: boolean }): object {
    return {
      model: this.model,
      messages: [
        { role: "system", content: "You are a factual, concise AI assistant. Reply in Chinese." },
        { role: "user", content: prompt },
      ],
      // Qwen3.7 hybrid-thinking models default to thinking mode; disable it for instant explanations.
      enable_thinking: false,
      ...(options.webSearch ? { enable_search: true } : {}),
    };
  }

  private async toError(response: Response): Promise<Error> {
    const payload = await response.json() as QwenCompatibleResponse;
    return new Error([
      "Qwen request failed",
      `code: ${payload.code ?? "(missing)"}`,
      `message: ${payload.message ?? "(missing)"}`,
      `request_id: ${payload.request_id ?? "(missing)"}`,
    ].join("\n"));
  }
}

interface QwenCompatibleResponse {
  code?: string;
  message?: string;
  request_id?: string;
  choices?: Array<{ message?: { content?: string } }>;
}
