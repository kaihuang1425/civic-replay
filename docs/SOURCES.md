# 來源與授權

## 專案程式碼與文件

Civic Replay 的程式碼與文件採 [MIT 授權](../LICENSE)。授權方式由專案維護者於 2026 年 9 月 5 日確認；第三方套件、模型與圖示各自保留原授權。

MIT 條文來源可查閱 [Open Source Initiative](https://opensource.org/license/mit)。

## 視覺素材

黃奕凱（Eric）確認，`web/src/assets/` 中非 Lucide 的視覺素材由他生成並提供，包括品牌標誌、居民頭像、狀態圖示、分類圖示與空狀態插畫。這份來源說明以提供者的確認為依據；未指定生成工具或模型，因此不另行填寫。

| 位置 | 內容 | 來源與適用說明 |
| --- | --- | --- |
| `logo/mark.png`、`personas/*.png` | 品牌標誌與六位居民頭像 | 黃奕凱生成並提供 |
| `status/*.png`、`categories/*.png` | 狀態與服務分類圖示 | 黃奕凱生成並提供 |
| `empty-states/*.png` | 空狀態插畫 | 黃奕凱生成並提供 |
| `icons/*.svg` | 服務步驟圖示 | 衍生自 Lucide，依原有 ISC 與所附 Feather MIT 聲明使用 |
| `labels.zh-TW.json` | 圖片替代文字與介面文字 | 專案隨附文案 |

上述團隊提供的素材隨專案提供使用，在提供者可授權的範圍內適用根目錄 MIT。這不改變第三方素材或生成服務原有的條款，也不表示已確認每張生成圖片的著作權地位。

Lucide 完整聲明保留於 [LUCIDE-LICENSE.txt](../web/src/assets/third-party/LUCIDE-LICENSE.txt)，素材目錄另附[來源說明](../web/src/assets/THIRD_PARTY_NOTICES.md)。

README 的介面設計示意圖由黃奕凱提供，存放於 `docs/images/civic-replay-interface-concept.png`，依上述團隊素材說明隨專案提供。這是設計示意，並非目前版本的實際操作截圖。

## 套件

版本以 `package-lock.json` 為準。下表涵蓋主要直接依賴；個別套件的完整聲明仍以其隨附授權檔為準。

| 套件 | 用途 | 授權 |
| --- | --- | --- |
| Express、Zod | API 與資料驗證 | MIT |
| React、React DOM、Zustand、TanStack Query | 前端介面與狀態管理 | MIT |
| Vite、@vitejs/plugin-react、tsx、concurrently | 開發與建置 | MIT |
| Vitest、Supertest、Testing Library、jsdom | 測試 | MIT |
| TypeScript | 型別檢查與編譯 | Apache-2.0 |

## 模型與執行服務

| 項目 | 本專案如何使用 | 官方來源 |
| --- | --- | --- |
| Ollama | 透過 HTTP 呼叫模型；目前唯一實作的 provider | [Ollama MIT 授權](https://github.com/ollama/ollama/blob/main/LICENSE) |
| OpenAI gpt-oss | 預設以 `gpt-oss:120b-cloud` 名稱透過 Ollama 存取 | [gpt-oss Apache-2.0 授權](https://github.com/openai/gpt-oss/blob/main/LICENSE) |
| Ollama 雲端推論 | 雲端模型的登入、執行與服務使用方式 | [官方操作文件](https://docs.ollama.com/cloud) |

模型授權與雲端服務使用條款是不同事項。切換模型或服務時，應以該版本的官方條款為準。本儲存庫不包含模型權重。

## 示範資料與生成內容

`data/seeds/personas.json` 的六種居民是合成示範資料；`templates.json` 與 `scenario.heavy-rain-flooding.json` 的流程、規則與事件也是示範假設，並非真實居民紀錄或政府正式政策。

有 AI 可用時，流程與摘要由模型生成，仍需使用者確認。送往模型的資料包含輸入的情境、服務內容與居民條件；程式沒有自動移除使用者輸入的個資。使用雲端模型時，提示內容會傳送至該服務。

## 開發文件工具

`openspec/` 使用 OpenSpec 的規格與變更格式；它不是應用程式執行時的依賴。封存紀錄也提到 Playwright 視覺檢查，但專案的 `package.json` 沒有將 Playwright 列為依賴。
