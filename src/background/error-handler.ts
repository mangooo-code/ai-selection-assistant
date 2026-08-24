export function friendlyError(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  if (/timed? ?out|abort/i.test(text)) return "⏱️ AI响应超时，当前模型可能繁忙";
  if (/401|403|invalid.*key|authentication|unauthorized/i.test(text)) return "🔑 API Key无效，请检查配置";
  if (/quota|insufficient|billing|balance/i.test(text)) return "💳 API额度已用完，请检查额度或更换模型";
  if (/model.*(not|invalid|unavailable)|not.*model|invalidparameter|model.*permission|404/i.test(text)) return "🤖 当前模型不可用，请检查模型配置";
  if (/429|5\d\d|busy|overload/i.test(text)) return "💤 AI服务暂时繁忙，请稍后再试";
  if (/network.*disconnect|offline/i.test(text)) return "🌐 网络连接已断开，请恢复网络后重试";
  if (/network|failed to fetch|connection/i.test(text)) return "🌐 网络连接失败";
  if (/no usable|empty/i.test(text)) return "✨ AI 暂时没有生成有效回答，请重新生成。";
  return "AI 暂时无法响应，请重试。";
}

export function shouldRetry(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error);
  return /429|5\d\d|busy|overload|no usable|empty/i.test(text);
}
