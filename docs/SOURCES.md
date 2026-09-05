# 來源與授權說明

本文件整理專案實際使用的開源套件、AI 模型、資料與素材來源。分類方式：

- **官方 / 上游來源**：有公開連結可查證授權的開源套件、模型、圖示庫。
- **團隊整理／自訂**：團隊自行撰寫的示範資料、UI 文案、規則設定。
- **待確認**：repo 中找不到來源或授權說明，未查證前不應假設可自由使用。

## 開源套件（npm 相依套件）

以下版本與授權皆直接讀取自各套件安裝後的 `package.json` `license` 欄位，非憑印象
列出。完整版本鎖定於 `package-lock.json`。

| 套件 | 用途 | 授權 |
| --- | --- | --- |
| [express](https://expressjs.com/) | 後端 HTTP 框架 | MIT |
| [zod](https://zod.dev/) | Schema 驗證，同時作為 AI 結構化輸出的 schema | MIT |
| [tsx](https://github.com/privatenumber/tsx) | 開發期直接執行 TypeScript | MIT |
| [vitest](https://vitest.dev/) | 測試框架（shared / server / web 共用） | MIT |
| [supertest](https://github.com/ladjs/supertest) | API 整合測試 | MIT |
| [react](https://react.dev/) / [react-dom](https://react.dev/) | 前端 UI 框架 | MIT |
| [vite](https://vitejs.dev/) / `@vitejs/plugin-react` | 前端建置工具 | MIT |
| [@tanstack/react-query](https://tanstack.com/query) | 伺服器狀態管理 | MIT |
| [zustand](https://github.com/pmndrs/zustand) | 前端 UI 狀態管理 | MIT |
| [@testing-library/react](https://testing-library.com/) / `@testing-library/dom` | 前端元件測試 | MIT |
| [jsdom](https://github.com/jsdom/jsdom) | 測試用瀏覽器環境模擬 | MIT |
| [typescript](https://www.typescriptlang.org/) | 型別檢查與編譯 | Apache-2.0 |
| [concurrently](https://github.com/open-cli-tools/concurrently) | 同時啟動 server / web 的開發腳本 | MIT |

## AI 模型與服務

| 項目 | 說明 | 授權 / 存取方式 |
| --- | --- | --- |
| [Ollama](https://ollama.com) | 本機 / 雲端模型推論執行環境，程式透過其 `/api/chat`、`/api/tags` HTTP 介面呼叫（`server/src/ai/providers/ollama.ts`） | Ollama 執行環境本身為 MIT 授權；詳細條款請以 [ollama/ollama](https://github.com/ollama/ollama) 官方頁面為準 |
| `gpt-oss:120b-cloud` | 預設使用的模型（`OLLAMA_MODEL` 環境變數），為 OpenAI 釋出的開源權重模型，透過 Ollama 的雲端推論功能存取，本機不需下載權重檔 | 據公開資訊為 Apache License 2.0；實際條款請以模型發布方（OpenAI）與 Ollama 模型頁面公告為準——本專案未逐字核對授權全文，標示為**建議自行複核** |

生成式 AI 只用於：(1) 生成沙盤的服務流程與重點摘要（`generation/generate.ts`），
(2) 預演時判斷語意理解類的步驟結果與系統性原因說明（`engine/aiEngine.ts`）。
沒有把任何居民真實資料、政府系統帳密或機密資訊送給模型——送出的內容只有
使用者輸入的情境描述、程式產生的結構化居民條件，以及本機固定的服務規則文字。

## 圖示與視覺素材（`web/src/assets/`）

| 素材 | 說明 | 授權 |
| --- | --- | --- |
| `web/src/assets/icons/*.svg`（服務步驟圖示） | 衍生自 [Lucide](https://lucide.dev) 圖示集 | ISC License；其中源自 Feather 的子集另附 MIT 條款。完整授權文字見 `web/src/assets/third-party/LUCIDE-LICENSE.txt`，出處說明見 `web/src/assets/THIRD_PARTY_NOTICES.md` |
| `web/src/assets/logo/mark.png`（品牌標誌） | 團隊設計的專案標誌 | [待確認：原始設計者與授權方式] |
| `web/src/assets/personas/*.png`（6 位居民插畫頭像） | 6 種居民原型的插畫頭像 | [待確認：原始素材來源與授權] |
| `web/src/assets/status/*.png`（PASS / NEED HELP / BLOCKED 狀態圖示） | 結果狀態圖示 | [待確認：原始素材來源與授權] |
| `web/src/assets/categories/*.png`（服務分類圖示） | 範本卡片的分類圖示 | [待確認：原始素材來源與授權] |
| `web/src/assets/empty-states/*.png`（空狀態插畫） | 三種空狀態卡片插畫 | [待確認：原始素材來源與授權] |

上述標示「待確認」的素材，來自開發過程中一份未併入本儲存庫版本控制的設計素材包
（在已封存的變更記錄
`openspec/changes/archive/2026-09-04-civic-replay-visual-assets/` 中被引用為
`reference/Civic-Replay-assets/`，該目錄本身被 `.gitignore` 排除、不在 repo
歷史中）。除了 Lucide 圖示已在 `THIRD_PARTY_NOTICES.md` 註明來源與授權外，其餘
PNG 素材目前找不到原始作者或授權聲明，**繳交前應由提供素材的團隊成員補上來源
與授權，或替換成已知授權的素材**。

## 文案

`web/src/assets/labels.zh-TW.json`（介面繁體中文文案，如居民類別名稱、服務分類
名稱、狀態文字、空狀態文案）為團隊自行撰寫。

## 資料（`data/seeds/`）

| 檔案 | 內容 | 性質 |
| --- | --- | --- |
| `personas.json` | 6 種居民原型（一般居民、獨居長者、新住民、行動不便居民、無智慧手機居民、家人代辦），含結構化條件 | **團隊自訂的合成示範資料**，非真實居民資料，也非任何官方人口統計或案例 |
| `templates.json` | 5 個情境範本的名稱、描述與生成設定（災害救助、育兒補助、疫苗預約、租屋補貼、豪雨／淹水） | **團隊自訂的示範假設**——服務管道、資格規則文字是團隊依常見公共服務流程撰寫的示範內容，不是任何特定機關的正式規定或政策文件節錄 |
| `scenario.heavy-rain-flooding.json` | 固定驗證情境的完整沙盤（6 步驟服務流程 + 6 位居民 + 資格規則） | **團隊自訂的示範情境**，非真實災害事件紀錄 |

AI 生成的沙盤內容（服務流程、highlights）在沒有點選範本、由使用者自由輸入情境時
產生，內容為**模型生成**，未經團隊逐字審核，僅供示範判定邏輯使用，不代表任何
真實政策內容。

## 開發工具（非專案相依套件）

- **OpenSpec**（[Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec)）
  用於管理行為規格與變更提案（`openspec/` 目錄），為開發流程工具，不是執行期
  相依套件，不會被打包進 `web/dist` 或 `server` 的執行檔。授權請見其官方
  GitHub 頁面。
- **Playwright**：在 `openspec/changes/archive/` 的實作記錄中提到，曾用於本機
  手動視覺驗證（截圖比對介面），**明確不是本專案的相依套件**
  （`package.json` 未列出），不會隨 `npm install` 安裝。

## 待確認清單

- [待確認] `web/src/assets/logo/`、`personas/`、`status/`、`categories/`、
  `empty-states/` 內 PNG 素材的原始作者與授權條款。
- [待確認] `gpt-oss:120b-cloud` 模型授權條款全文核對（初步標示為 Apache-2.0，
  未逐字核對官方公告）。
- [待確認] 根目錄 `LICENSE` 檔案——目前不存在，見 README「授權」章節。
