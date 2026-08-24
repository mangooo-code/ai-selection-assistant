# AI 划词助手（MVP）

Chrome Manifest V3 扩展：在普通网页中选中文字，点击 `✨ AI` 后进行解释、搜索与连续追问。

## 运行

```powershell
npm install
npm run build
```

若 PowerShell 的执行策略阻止 npm 脚本，可在项目目录中使用：

```powershell
node_modules\.bin\tsc.cmd --noEmit
node scripts\build.mjs
```

在 Chrome 打开 `chrome://extensions`，启用“开发者模式”，选择“加载已解压的扩展程序”，并选择本项目的 `dist` 目录。

点击浏览器工具栏中的扩展图标，选择“千问（Qwen）”、填写 API Key 与模型（默认 `qwen-plus`），然后保存。API Key 仅保存在 `chrome.storage.local`，不会进入本仓库。

## 当前范围

- 已实现：划词、浮动 Trigger、AI 解释、总结、翻译、错误/加载状态、可拖动且持久的结果卡、继续追问、Popup 配置。
- 联网解释：开启“允许联网搜索”后，千问会按需联网搜索；若 API 返回搜索来源，结果卡将显示可点击来源。

## 安全说明

Content Script 无法访问 API Key；只有扩展 Background Service Worker 会读取浏览器本地扩展存储并请求模型 API。
