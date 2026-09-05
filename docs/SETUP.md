# 環境設置與執行

本文件的每個指令都已在乾淨的 `npm install` 後於本機實際執行驗證過（結果見
「驗證紀錄」章節）。若你的結果不同，請先比對 Node / npm 版本。

## 需求版本

| 工具 | 版本 |
| --- | --- |
| Node.js | `>= 20`（`package.json` `engines.node`；本文件驗證使用 v22.22.2） |
| npm | 隨 Node 附帶即可（本文件驗證使用 10.9.7），本專案用 **npm workspaces**，不支援 yarn/pnpm 的 workspace 語法差異 |
| Ollama（選用） | 若要體驗真正的 AI 生成 / AI 判定，需另外安裝 [Ollama](https://ollama.com)；不裝也能跑完整流程（見「示範模式」） |

不需要資料庫、Docker、或任何雲端帳號即可跑完整條路徑（AI 相關功能除外）。

## 安裝

```bash
git clone <此儲存庫網址>
cd civic-replay
npm install          # 在 repo 根目錄執行，會透過 workspaces 一次安裝 shared/server/web
```

**常見錯誤**：如果只在 `server/` 或 `web/` 子目錄執行 `npm install`，會出現
`Cannot find module 'zod'` 或 `Cannot find module '@civic-replay/shared'` 之類
的錯誤——一定要在 repo 根目錄跑 `npm install`，讓 npm workspaces 把
`shared/` 連結進 `server`、`web` 的 `node_modules`。

## 環境變數

```bash
cp .env.example .env
```

`.env.example` 內容（只有變數名稱與範例值，沒有任何金鑰）：

```bash
# Which AI provider the server uses. Only "ollama" is registered in the MVP.
AI_PROVIDER=ollama

# Ollama endpoint and model for the default provider.
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=gpt-oss:120b-cloud

# Server port (web dev server proxies /api here).
PORT=8787
```

| 變數 | 說明 |
| --- | --- |
| `AI_PROVIDER` | 選擇 AI provider。目前程式只註冊了 `ollama`（`server/src/ai/registry.ts`），填其他值會讓伺服器啟動時直接報錯並列出可用選項 |
| `OLLAMA_HOST` | Ollama 服務位址。本機預設安裝通常是 `http://localhost:11434` |
| `OLLAMA_MODEL` | 要使用的模型。預設 `gpt-oss:120b-cloud` 是 **Ollama 的雲端推論模型別名**，不是可以直接 `ollama pull` 的本機模型，需要 Ollama 帳號並開通雲端推論功能才能使用；若沒有這個功能或想完全離線跑，改成任何已 `ollama pull` 過的本機模型即可（例如 `ollama pull llama3.1` 後設 `OLLAMA_MODEL=llama3.1`），不用改任何程式碼 |
| `PORT` | Express 伺服器埠號，`web` 開發伺服器會把 `/api` 開頭的請求 proxy 到這個埠（見 `web/vite.config.ts`） |

沒有 `.env` 檔時，`server/src/config.ts` 會用上面列的預設值——`AI_PROVIDER`
預設就是 `ollama`，即使沒有建立 `.env` 也能啟動（只是 AI 功能會回報離線）。

## 資料初始化

不需要手動初始化資料。固定的示範資料（6 位居民、5 個範本、`heavy-rain-flooding`
完整沙盤）已經以 JSON 檔提交在 `data/seeds/`，伺服器啟動時直接讀取。使用者建立
的沙盤與預演結果會自動寫入 `data/sandboxes.json`、`data/replay-results.json`
（第一次寫入時自動建立檔案，這兩個檔案已加進 `.gitignore`，不會被提交）。

## 啟動

```bash
npm run dev
```

這個指令會先建置 `shared/`，再同時啟動：

- **server**：`http://localhost:8787`（`GET /api/health/ai` 可以確認伺服器有沒有
  起來）
- **web**：`http://localhost:5173`（瀏覽器打開這個網址）

也可以只跑其中一邊：

```bash
npm -w server run dev   # 只跑後端（tsx watch，改檔案會自動重啟）
npm -w web run dev      # 只跑前端（Vite dev server）
```

## 示範模式（沒有 Ollama / 沒有設定 API 金鑰時）

沒有可用的 Ollama 時，系統**不會整個掛掉**，而是自動降級：

- `GET /api/health/ai` 回傳 `{"available": false, "reason": "Cannot reach Ollama at ..."}`
- 介面右上角會顯示「AI：離線（降級模式）」
- **生成沙盤**：AI 呼叫失敗後自動退回範本內容——選「豪雨／淹水」範本會得到
  完整、手工建置的沙盤；其他 4 個範本或自由輸入文字會得到一份通用的 6 步驟骨架
  （細節見 `docs/ARCHITECTURE.md`）
- **執行預演**：介面偵測到 AI 離線時，會自動以「不呼叫 AI」的模式執行
  （對應 `POST /api/replay` 的 `useAi: false`）；規則引擎判不了的步驟一律記為
  `NEED_HELP`，原因寫「AI 未啟用」，並標記需人工確認
- **沙盤預覽面板**（風險 Top 5 / 建議介入措施 / 預估分布）本來就不呼叫 AI，
  有沒有 Ollama 都一樣可以用

也就是說：**不需要任何 API 金鑰或帳號，就能完整跑過「生成 → 預演 → 加介入措施 →
比較前後」這整個流程**，只是語意判斷的步驟會顯示為「需人工確認」而不是 AI 給出
具體理由。

## 示範情境操作步驟（豪雨／淹水）

以下每一步都是本文件撰寫時，在沒有 Ollama 的環境下透過 API 實際執行過的結果
（見下方「驗證紀錄」）：

1. 開啟 `http://localhost:5173`，點選範本卡片「豪雨／淹水」→ 按「✨ 生成沙盤」。
   預期畫面：中間出現 6 個服務步驟（知道警報 → 理解風險 → 選擇通報管道 →
   準備資料 → 確認身分 → 抵達避難所，實際文字以介面為準），下方出現 6 張居民
   卡片。
2. 按「▶ 執行預演」。因為沒有 Ollama，會自動以規則引擎模式執行。
   **實測結果**：6 位居民中，1 位 PASS（一般居民）、1 位 NEED_HELP（新住民）、
   4 位 BLOCKED（獨居長者、行動不便居民、無智慧手機居民、家人代辦）；彙總
   `{total: 6, reached: 3, ableToAct: 1, unresolved: 4}`。
3. 點開任一位 BLOCKED 的居民（例如「獨居長者」），預期看到逐步判定：在
   「知道警報」步驟被判 `BLOCKED`／`access`，原因是只靠居民不會用的管道通知、
   沒有備援，並附上 root cause 說明。
4. 在右側「建議介入措施」點「＋ 加入」加入電話備援、志工 / 里長人工確認、多語言
   說明（或自行從程式加入 `family_proxy_assistance`）。
5. 再次「執行預演」。**實測結果**：加入電話備援、志工協助、多語言說明三項後，
   彙總變成 `{reached: 5, ableToAct: 1, unresolved: 1}`（3 位居民從 BLOCKED
   → NEED_HELP，只剩「家人代辦」仍 BLOCKED，因為她需要的是
   `family_proxy_assistance`，跟前三項介入措施無關）；再補加
   `family_proxy_assistance` 後 `unresolved` 會降到 0（全部至少達到
   NEED_HELP）。
6. 按「⇄ 比較前後（Replay Diff）」，預期看到 Reached / Able to act / Unresolved
   三個數字的前後對比，以及每個介入措施「救到了哪些居民」的清單。

## 建置

```bash
npm run build       # 目前只建置 shared/（server 用 tsx 直接跑 TS，不需要預先建置）
npm -w web run build   # 建置前端正式版（tsc + vite build），輸出到 web/dist/
npm -w server run build  # 建置後端（tsc），輸出到 server/dist/
```

## 檢查

```bash
npm test            # 等同 npm run build 後跑 shared/server/web 三個 workspace 的 vitest
npm run typecheck   # 三個 workspace 各自 tsc --noEmit
```

## 驗證紀錄

以下是撰寫本文件時，在此環境（Node v22.22.2、無 Ollama）實際執行的結果：

| 指令 | 結果 |
| --- | --- |
| `npm install` | 成功（296 個套件） |
| `npm run build` | 成功 |
| `npm test` | 全數通過：`shared` 3 個測試、`server` 36 個測試（10 個測試檔）、`web` 22 個測試（8 個測試檔），共 **61 個測試** |
| `npm run typecheck` | 三個 workspace 皆通過，無錯誤 |
| `npm -w web run build` | 成功，`web/dist/assets/` 總大小約 1.1 MB |
| 啟動 server 後 `GET /api/health/ai` | 回傳 `available: false`（因為此環境沒有 Ollama），符合預期的降級行為 |
| `POST /api/generate`（描述＝豪雨情境原文）| 回傳 `generatedBy: "fallback"` 的完整豪雨沙盤，6 步驟、6 位居民 |
| 上述沙盤跑 `POST /api/replay {useAi:false}` | 見上方「示範情境操作步驟」第 2 步的實測數字 |
| 加入 3 項介入措施後重跑 replay + `POST /api/diff` | 見上方「示範情境操作步驟」第 5 步的實測數字 |

**未驗證的部分**：因為此環境沒有安裝 / 無法連線到真正的 Ollama 服務，本文件
沒有重新驗證「AI 在線時」的生成與預演行為；這部分的手動驗證紀錄（2026-09-04，
使用 `gpt-oss:120b-cloud`）留存在
`openspec/changes/archive/2026-09-04-civic-replay-mvp/notes.md`。若要自行驗證，
安裝並啟動 Ollama、設定好 `OLLAMA_MODEL` 後，重複上方「示範情境操作步驟」，
`decidedBy` 會出現 `"ai"`、`requiresHumanValidation: true` 的判定，且理由文字
會是模型生成的完整句子而非「AI 未啟用」。

## 常見錯誤處理

| 錯誤訊息 / 現象 | 原因 | 解法 |
| --- | --- | --- |
| `Cannot find module 'zod'`（build 時） | 只在子目錄跑了 `npm install`，workspace 沒連結好 | 回到 repo 根目錄重新 `npm install` |
| 伺服器啟動時直接印錯誤並結束（exit code 1） | `.env` 裡 `AI_PROVIDER` 填了未註冊的值 | 改回 `AI_PROVIDER=ollama`（目前唯一註冊的 provider） |
| `GET /api/health/ai` 回傳 `available:false`，`reason` 提到 `Model … not pulled` | 這是**預期行為**，不是錯誤：`gpt-oss:120b-cloud` 是雲端別名，不會出現在本機 `/api/tags` 清單裡；只要沒有其他錯誤，生成與預演仍會照常呼叫這個模型 | 若想讓健康檢查顯示「模型已就緒」，改用一個已 `ollama pull` 過的本機模型並設定 `OLLAMA_MODEL` |
| 前端打 `/api/...` 出現 CORS 或 404 | 沒有透過 `npm run dev` / `vite` 啟動，直接開靜態檔案 | 一定要用 `npm run dev` 或 `npm -w web run dev`，讓 Vite 的 proxy 生效 |
| `npm test` 在 `web` 部分失敗且訊息與 DOM / jsdom 有關 | Node 版本過舊或環境缺少對應相依 | 確認 Node `>= 20`，重新 `npm install` |
