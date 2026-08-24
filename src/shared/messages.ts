import type { AIAnswer, ConversationTurn, RequestAction, Settings } from "./models";

export type ExtensionMessage =
  | { type: "RUN_AI"; action: RequestAction; selectedText: string; pageContext?: string; conversation?: ConversationTurn[]; question?: string }
  | { type: "GET_SETTINGS" }
  | { type: "SAVE_SETTINGS"; settings: Settings }
  | { type: "GET_STATUS" }
  | { type: "GET_RUNTIME_VERSION" };

export type StreamEvent =
  | { type: "TOKEN"; token: string }
  | { type: "DONE"; data: AIAnswer }
  | { type: "ERROR"; error: string; code?: "NOT_CONFIGURED" | "REQUEST_FAILED" | "TEXT_TOO_LONG" };

export type ExtensionResponse =
  | { ok: true; data: AIAnswer }
  | { ok: true; settings: Settings }
  | { ok: true; configured: boolean }
  | { ok: true; version: string }
  | { ok: false; error: string; code?: "NOT_CONFIGURED" | "REQUEST_FAILED" | "TEXT_TOO_LONG" };
