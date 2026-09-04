# Civic Replay — 公共服務情境預演

在公共服務上線、政策變更或事件真正發生以前，先讓 AI 替不同現實條件的居民
「走一次」完整流程，找出哪些人會被現有服務漏掉、以及修改服務後哪些人因此被接住。

自然語言描述服務 → AI 生成沙盤（服務流程 ＋ Persona ＋ 規則）→ 逐一預演每位居民
→ **PASS / NEED HELP / BLOCKED** → 加入介入措施 → 比較前後 Replay Diff。

## Stack

npm workspace monorepo：

| 套件 | 內容 |
| --- | --- |
| `shared/` | zod schema ＋ 型別、介入措施 catalog |
| `server/` | Express API、JSON 檔持久化（無 DB）、Rule Engine ＋ AI Engine、AI provider 抽象層 |
| `web/` | Vite ＋ React Console（單畫面三欄式介面） |
| `data/seeds/` | 6 個固定 Persona、5 個情境範本、固定驗證情境 `heavy-rain-flooding` |

**Replay Engine**：能 deterministic 判斷的條件先走 Rule Engine；語意 / 理解類判斷才
交給 AI Engine，且所有 AI 判定都標記 `requiresHumanValidation`。

**AI provider**：預設接本機 [Ollama](https://ollama.com)（模型 `gpt-oss:120b-cloud`），
抽象層設計為之後可換成 OpenAI API 而不動引擎程式碼。

## 開發

```bash
cp .env.example .env        # 視需要調整 OLLAMA_HOST / OLLAMA_MODEL / AI_PROVIDER
npm install
npm run dev                 # server :8787、web :5173
```

```bash
npm test        # shared / server / web 全部測試
npm run typecheck
npm run build
```

沒有 Ollama 也能跑：沙盤生成會退回範本、預演步驟以規則引擎降級並標記需人工確認。

## 規格

行為規格以 [OpenSpec](https://github.com/Fission-AI/OpenSpec) 管理，位於
`openspec/specs/`（capabilities：`sandbox-generation`、`replay-engine`、
`interventions`、`console-ui`、`ai-provider`）。首次實作的變更封存於
`openspec/changes/archive/`。

## Scope

Hackathon MVP。不含：真實政府帳號 / 居民資料、operate production 政府網站、
大量 browser agent、PDF parser、資料庫、法規判定。AI 為模擬結果，仍需真人／
地方單位驗證。
