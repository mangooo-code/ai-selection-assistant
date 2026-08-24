import type { ConversationTurn } from "./models";

export const explainPrompt = (text: string, context?: string) => `请用中文解释：“${text}”。适合小浮窗阅读：简短段落、最多三个小标题和要点列表；可适量使用 ✨、💡、📌。说明它是什么、解决什么问题和一个实际应用。不要编造事实。${context ? `\n上下文：${context}` : ""}`;
export const summarizePrompt = (text: string) => `请用中文凝练总结以下内容，格式为：\n## 📝 核心结论\n一到两句\n\n## 📌 关键要点\n- 要点\n- 要点\n- 要点\n\n原文：“${text}”`;
export const translatePrompt = (text: string) => `将以下内容直接翻译成自然、准确的中文。保留含义、语气和专业术语；不要解释或总结。\n\n原文：“${text}”`;
export const chatPrompt = (text: string, conversation: ConversationTurn[], question: string) => `你是网页阅读助手。原始文本：“${text}”\n\n此前对话：\n${conversation.map((turn) => `${turn.role === "user" ? "用户" : "助手"}：${turn.content}`).join("\n")}\n\n新问题：${question}\n\n请用简短段落和要点中文回答。`;
