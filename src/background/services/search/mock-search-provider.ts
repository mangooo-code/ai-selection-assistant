import type { Source } from "../../../shared/models";
import type { SearchProvider } from "./types";

/** A deterministic placeholder until Tavily/Brave or another real search API is configured. */
export class MockSearchProvider implements SearchProvider {
  async search(query: string): Promise<Source[]> {
    const safeQuery = encodeURIComponent(query);
    return [
      { title: `关于「${query}」的检索入口`, siteName: "Google", url: `https://www.google.com/search?q=${safeQuery}`, snippet: "当前为 Mock Search：请在设置真实搜索服务后获取网页检索摘要。" },
      { title: "Wikipedia", siteName: "Wikipedia", url: `https://en.wikipedia.org/w/index.php?search=${safeQuery}`, snippet: "Mock 搜索示例来源；AI 将依据可用资料作答。" },
    ];
  }
}
