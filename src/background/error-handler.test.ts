import { describe, expect, it } from "vitest";
import { friendlyError, shouldRetry } from "./error-handler";

describe("friendlyError", () => {
  it("maps provider and network failures to user-safe copy", () => {
    expect(friendlyError(new Error("401 unauthorized"))).toContain("API Key无效");
    expect(friendlyError(new Error("429 busy"))).toContain("服务暂时繁忙");
    expect(friendlyError(new Error("timeout"))).toContain("响应超时");
    expect(friendlyError(new Error("Failed to fetch"))).toContain("网络连接失败");
    expect(friendlyError(new Error("model not found"))).toContain("模型不可用");
  });
  it("retries only transient or empty responses", () => {
    expect(shouldRetry(new Error("429"))).toBe(true);
    expect(shouldRetry(new Error("no usable content"))).toBe(true);
    expect(shouldRetry(new Error("401 unauthorized"))).toBe(false);
    expect(shouldRetry(new Error("Failed to fetch"))).toBe(false);
  });
});
