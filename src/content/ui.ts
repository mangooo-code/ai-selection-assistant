import type { ConversationTurn, RequestAction, Source } from "../shared/models";
import { positionNearSelection } from "./positioning";
import { sendStreamingMessage } from "./messaging";

interface SelectionState { text: string; rect: DOMRect; context: string }
interface DisplayMessage { role: "user" | "assistant"; content: string; sources?: Source[]; error?: boolean; streaming?: boolean }

const css = `
:host { all: initial; } *, *::before, *::after { box-sizing: border-box; }
.ai-root { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1d1d1f; font-size: 14px; line-height: 1.45; }
.floating { position: fixed; z-index: 2147483647; } button, input { font: inherit; } button { border: 0; cursor: pointer; }
.trigger { background: rgba(30,30,35,.94); color:#fff; border-radius:999px; padding:7px 11px; box-shadow:0 6px 24px rgba(0,0,0,.22); font-weight:650; }
.menu,.card { background:rgba(255,255,255,.94); backdrop-filter:blur(18px); border:1px solid rgba(0,0,0,.1); box-shadow:0 12px 40px rgba(0,0,0,.18); border-radius:15px; overflow:hidden; }
.menu { width:168px; padding:6px; }.menu-title { font-weight:700; padding:8px 10px; border-bottom:1px solid #e8e8ed; margin-bottom:4px; }.menu button { display:block; width:100%; text-align:left; padding:8px 10px; border-radius:8px; background:transparent; color:#222; }.menu button:hover { background:#f1f1f4; }
.card { width:min(380px, calc(100vw - 24px)); min-height:180px; max-height:min(520px, calc(100vh - 24px)); display:flex; flex-direction:column; }.card-header { display:flex; justify-content:space-between; align-items:center; padding:12px 14px; border-bottom:1px solid #e8e8ed; cursor:move; font-weight:700; }.close { background:transparent; color:#777; font-size:20px; line-height:1; padding:0 3px; }
.card-body { padding:14px; overflow-y:auto; white-space:pre-wrap; flex:1; }.turn { padding:0 0 14px; margin:0 0 14px; border-bottom:1px solid #e8e8ed; }.turn:last-child { border-bottom:0; margin-bottom:0; }.turn-label { color:#6e6e73; font-size:12px; font-weight:700; margin-bottom:5px; }.turn.user .turn-label { color:#5947bd; }.turn.error .turn-content { color:#b42318; }.turn-content { white-space:pre-wrap; }
.turn-content h1,.turn-content h2,.turn-content h3 { font-size:14px; margin:12px 0 6px; }.turn-content p { margin:0 0 8px; }.turn-content ul { margin:4px 0 8px; padding-left:18px; }.turn-content blockquote { margin:8px 0; padding-left:9px; color:#666; border-left:3px solid #d8d4ff; }.turn-content code { background:#f0eef8; border-radius:4px; padding:1px 4px; font-family:ui-monospace,monospace; font-size:12px; }.turn-content a { color:#2f218d; }.turn-content hr { border:0; border-top:1px solid #e8e8ed; margin:10px 0; }
.loading { color:#6e6e73; display:flex; gap:8px; align-items:center; }.dot { width:7px; height:7px; background:#7c5cff; border-radius:50%; animation:pulse 1s infinite alternate; } @keyframes pulse { to { opacity:.25; transform:scale(.7); } }
.sources { margin-top:12px; border-top:1px solid #e8e8ed; padding-top:9px; }.sources-title { font-size:12px; font-weight:700; color:#6e6e73; margin-bottom:7px; }.source { display:block; text-decoration:none; color:#2f218d; margin:7px 0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }.source small { color:#777; margin-left:5px; }
.followup { border-top:1px solid #e8e8ed; display:flex; padding:9px; gap:7px; }.followup input { min-width:0; flex:1; border:1px solid #d7d7dc; border-radius:9px; padding:8px 10px; outline:none; }.followup input:focus { border-color:#8067f2; }.send { border-radius:9px; background:#29272f; color:#fff; width:34px; }
`;

function renderMarkdown(target: HTMLElement, value: string): void {
  const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (text: string) => escape(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  const lines = value.split("\n"); const html: string[] = []; let list = false;
  const closeList = () => { if (list) { html.push("</ul>"); list = false; } };
  for (const line of lines) {
    if (/^#{1,3}\s+/.test(line)) { closeList(); const level = Math.min(3, line.match(/^#+/)![0].length); html.push(`<h${level}>${inline(line.replace(/^#+\s+/, ""))}</h${level}>`); }
    else if (/^\s*[-*]\s+/.test(line)) { if (!list) { html.push("<ul>"); list = true; } html.push(`<li>${inline(line.replace(/^\s*[-*]\s+/, ""))}</li>`); }
    else if (/^>\s?/.test(line)) { closeList(); html.push(`<blockquote>${inline(line.replace(/^>\s?/, ""))}</blockquote>`); }
    else if (/^---+$/.test(line.trim())) { closeList(); html.push("<hr>"); }
    else if (line.trim()) { closeList(); html.push(`<p>${inline(line)}</p>`); }
    else closeList();
  }
  closeList(); target.innerHTML = html.join("");
}

export class FloatingAssistant {
  private readonly host = document.createElement("div");
  private readonly root: HTMLDivElement;
  private selection: SelectionState | null = null;
  private mode: "hidden" | "trigger" | "menu" | "card" = "hidden";
  private conversation: ConversationTurn[] = [];
  private messages: DisplayMessage[] = [];
  private activeAction: RequestAction = "explain";
  private dragging = false;
  private cardHasCustomPosition = false;
  private conversationBody: HTMLDivElement | null = null;
  private streamingContent: HTMLDivElement | null = null;
  private offset = { x: 0, y: 0 };

  constructor() {
    const shadow = this.host.attachShadow({ mode: "closed" });
    const style = document.createElement("style"); style.textContent = css;
    this.root = document.createElement("div"); this.root.className = "ai-root";
    shadow.append(style, this.root); document.documentElement.append(this.host);
    document.addEventListener("mousedown", (event) => { if (!this.host.contains(event.target as Node)) this.hideTransient(); }, true);
    window.addEventListener("resize", () => this.reposition());
  }

  showTrigger(selection: SelectionState): void { if (this.mode !== "card") { this.selection = selection; this.mode = "trigger"; this.render(); } }
  hide(): void { this.mode = "hidden"; this.selection = null; this.conversation = []; this.messages = []; this.cardHasCustomPosition = false; this.root.replaceChildren(); }
  hideTransient(): void { if (this.mode === "trigger" || this.mode === "menu") this.hide(); }
  isInside(target: EventTarget | null): boolean { return this.host.contains(target as Node); }

  private render(): void {
    this.root.replaceChildren();
    if (this.mode === "hidden" || !this.selection) return;
    const floating = document.createElement("div"); floating.className = "floating";
    if (this.mode === "trigger") {
      const button = document.createElement("button"); button.className = "trigger"; button.textContent = "✨ AI";
      button.onclick = () => { this.mode = "menu"; this.render(); }; floating.append(button); this.place(floating, 76, 36);
    } else if (this.mode === "menu") this.renderMenu(floating);
    else this.renderCard(floating);
    this.root.append(floating);
  }

  private renderMenu(floating: HTMLDivElement): void {
    const menu = document.createElement("div"); menu.className = "menu"; menu.innerHTML = '<div class="menu-title">✨ AI</div>';
    ([ ["💡 AI 解释", "explain"], ["📝 总结", "summarize"], ["🌐 翻译", "translate"] ] as const).forEach(([label, action]) => {
      const button = document.createElement("button"); button.textContent = label; button.onclick = () => void this.run(action); menu.append(button);
    });
    floating.append(menu); this.place(floating, 168, 190);
  }

  private renderCard(floating: HTMLDivElement): void {
    const card = document.createElement("section"); card.className = "card";
    const header = document.createElement("div"); header.className = "card-header";
    const titles: Record<Exclude<RequestAction, "chat">, string> = { explain: "✨ AI 解释", summarize: "📝 AI 总结", translate: "🌐 AI 翻译" };
    header.append(document.createTextNode(titles[this.activeAction as Exclude<RequestAction, "chat">]));
    const close = document.createElement("button"); close.className = "close"; close.textContent = "×"; close.onclick = () => this.hide(); header.append(close); card.append(header); this.makeDraggable(header, floating);
    const body = document.createElement("div"); body.className = "card-body"; this.conversationBody = body;
    this.messages.forEach((message) => body.append(this.renderMessage(message)));
    card.append(body, this.followUp()); floating.append(card);
    if (!this.cardHasCustomPosition) this.place(floating, 380, 420);
    this.scrollToLatest();
  }

  private renderMessage(message: DisplayMessage): HTMLElement {
    const turn = document.createElement("section"); turn.className = `turn ${message.role}${message.error ? " error" : ""}`;
    const label = document.createElement("div"); label.className = "turn-label"; label.textContent = message.role === "user" ? "👤 你" : "✨ AI";
    const content = document.createElement("div"); content.className = "turn-content";
    if (message.streaming && !message.content) content.innerHTML = '<span class="loading"><i class="dot"></i>AI 正在思考...</span>';
    else renderMarkdown(content, message.content);
    if (message.streaming) this.streamingContent = content;
    turn.append(label, content);
    if (message.sources?.length) turn.append(this.sources(message.sources));
    return turn;
  }

  private sources(sources: Source[]): HTMLElement {
    const section = document.createElement("div"); section.className = "sources"; section.innerHTML = '<div class="sources-title">🔗 来源</div>';
    sources.forEach((source) => { const link = document.createElement("a"); link.className = "source"; link.href = source.url; link.target = "_blank"; link.rel = "noopener noreferrer"; link.textContent = source.title; const site = document.createElement("small"); site.textContent = source.siteName; link.append(site); section.append(link); });
    return section;
  }

  private followUp(): HTMLElement {
    const form = document.createElement("form"); form.className = "followup";
    const input = document.createElement("input"); input.placeholder = "继续问 AI..."; input.maxLength = 1000;
    const submit = document.createElement("button"); submit.className = "send"; submit.type = "submit"; submit.textContent = "↑";
    form.append(input, submit); form.onsubmit = (event) => { event.preventDefault(); const question = input.value.trim(); if (question) { input.value = ""; void this.run("chat", question); } }; return form;
  }

  private async run(action: RequestAction, question?: string): Promise<void> {
    if (!this.selection) return;
    this.mode = "card"; this.activeAction = action === "chat" ? this.activeAction : action;
    if (action === "chat" && question) this.messages.push({ role: "user", content: question });
    const assistant: DisplayMessage = { role: "assistant", content: "", streaming: true };
    this.messages.push(assistant); this.render();
    const response = await sendStreamingMessage({ type: "RUN_AI", action, selectedText: this.selection.text, pageContext: this.selection.context, conversation: this.conversation, question }, (event) => {
      if (event.type !== "TOKEN") return;
      assistant.content += event.token;
      if (this.streamingContent?.isConnected) renderMarkdown(this.streamingContent, assistant.content);
      this.scrollToLatest();
    });
    assistant.streaming = false;
    if (!response.ok || !("data" in response)) {
      assistant.error = true;
      assistant.content = assistant.content || (!response.ok ? response.error : "AI request failed.");
      this.render();
      return;
    }
    assistant.content = response.data.answer;
    assistant.sources = response.data.sources;
    if (action === "chat" && question) this.conversation.push({ role: "user", content: question });
    if (action !== "chat" && this.conversation.length === 0) this.conversation.push({ role: "user", content: this.activeAction === "explain" ? "请解释选中的内容。" : this.activeAction === "summarize" ? "请总结选中的内容。" : "请翻译选中的内容。" });
    this.conversation.push({ role: "assistant", content: assistant.content });
    this.render();
  }

  private scrollToLatest(): void { requestAnimationFrame(() => { if (this.conversationBody) this.conversationBody.scrollTop = this.conversationBody.scrollHeight; }); }
  private place(element: HTMLElement, width: number, height: number): void { if (!this.selection) return; const point = positionNearSelection(this.selection.rect, width, height); element.style.left = `${point.left}px`; element.style.top = `${point.top}px`; }
  private reposition(): void { const floating = this.root.querySelector<HTMLElement>(".floating"); if (floating && this.selection && !this.dragging) this.place(floating, floating.offsetWidth || 380, floating.offsetHeight || 250); }
  private makeDraggable(header: HTMLElement, floating: HTMLElement): void { header.onpointerdown = (event) => { if ((event.target as HTMLElement).closest("button")) return; this.dragging = true; this.offset = { x: event.clientX - floating.offsetLeft, y: event.clientY - floating.offsetTop }; header.setPointerCapture(event.pointerId); header.onpointermove = (move) => { if (!this.dragging) return; floating.style.left = `${Math.max(8, Math.min(window.innerWidth - floating.offsetWidth - 8, move.clientX - this.offset.x))}px`; floating.style.top = `${Math.max(8, Math.min(window.innerHeight - floating.offsetHeight - 8, move.clientY - this.offset.y))}px`; }; header.onpointerup = () => { this.dragging = false; this.cardHasCustomPosition = true; header.onpointermove = null; }; }; }
}
