# 安裝與執行

先用內建豪雨情境走一次預演，再設定 AI 模型。需要 Node.js 20 以上與 npm；不需要資料庫。

## 安裝

在儲存庫根目錄執行：

```sh
git clone https://github.com/kaihuang1425/civic-replay.git
cd civic-replay
npm ci
npm run dev
```

`npm run dev` 先建置 `shared`，再啟動後端與前端。開啟 [http://localhost:5173](http://localhost:5173)，後端預設位於 [http://localhost:8787](http://localhost:8787)。PowerShell 若擋下 `npm.ps1`，使用 `npm.cmd` 即可。

## 設定環境變數

目前程式讀取程序的環境變數，**不會自動載入根目錄 `.env`**。`.env.example` 可作為設定參考；只複製成 `.env` 不會讓啟動指令套用內容。

PowerShell 範例：

```powershell
$env:AI_PROVIDER = 'ollama'
$env:OLLAMA_HOST = 'http://localhost:11434'
$env:OLLAMA_MODEL = 'gpt-oss:120b-cloud'
npm.cmd run dev
```

macOS／Linux shell 範例：

```sh
AI_PROVIDER=ollama OLLAMA_HOST=http://localhost:11434 OLLAMA_MODEL=gpt-oss:120b-cloud npm run dev
```

| 變數 | 預設值與用途 |
| --- | --- |
| `AI_PROVIDER` | `ollama`；目前唯一註冊的 provider |
| `OLLAMA_HOST`／`OLLAMA_MODEL` | `http://localhost:11434`／`gpt-oss:120b-cloud`；模型服務與模型名稱 |
| `PORT` | `8787`；後端埠號 |
| `SERVER_URL` | `http://localhost:8787`；Vite 轉送 `/api` 的目標。若改 `PORT`，也要在前端程序設定此值 |
| `CIVIC_DATA_DIR` | 預設為儲存庫的 `data/`；沙盤與預演結果的儲存位置 |

預設雲端模型透過 Ollama 使用。安裝、登入與執行方式依 [Ollama 雲端模型文件](https://docs.ollama.com/cloud)；若改用本機模型，先確認它能正常回應，再將名稱填入 `OLLAMA_MODEL`。

## 固定示範：豪雨／淹水

如果要重現下方數字，請使用新的終端機，讓此程序連到一個確定沒有服務監聽的本機埠。以下以 `127.0.0.1:1` 為例；啟動後仍要確認 AI 顯示離線。

```powershell
$env:OLLAMA_HOST = 'http://127.0.0.1:1'
npm.cmd run dev
```

macOS／Linux 可使用 `OLLAMA_HOST=http://127.0.0.1:1 npm run dev`。這只改本次啟動的連線目標，不必停止其他 Ollama 程序。關閉該終端機後，設定不會套用到新終端機。

1. 選「豪雨／淹水」，按「生成沙盤」。確認有六位居民與六個步驟。AI 生成失敗後才會載入固定範本。
2. 按「執行預演」。固定備援情境的結果為一位 `PASS`、一位 `NEED_HELP`、四位 `BLOCKED`。
3. 展開獨居長者，查看通知步驟的原因：居民沒有使用 LINE，流程又沒有適用的備援。
4. 加入「電話 fallback」、「志工 / 里長人工確認」與「多語言說明」。這些是目前介面中的名稱。
5. 再次預演，按「比較前後（Replay Diff）」。無法完成的人數由四位降為一位；其中三位轉為需要協助，可自行完成的人數仍是一位。

| 指標 | 修改前 | 加入三項措施後 |
| --- | --- | --- |
| `Reached` | 3 | 5 |
| `Able to act` | 1 | 1 |
| `Unresolved` | 4 | 1 |

`Reached` 不等於完成；它包含走到最後一步才卡住的居民。各指標算法見[系統架構](ARCHITECTURE.md)。使用 AI 生成內容、改過居民條件或套用不同措施時，結果可能不同。

## 儲存與備份

固定範本在 `data/seeds/`，不必初始化。執行時會建立 `sandboxes.json` 與 `replay-results.json`，存放於 `CIVIC_DATA_DIR` 或預設的 `data/`。這些執行資料不納入 Git。

要備份完整結果，請在停止寫入後備份這兩個檔案。介面的「匯出沙盤」只匯出情境設定，不包含所有預演紀錄。

## 建置與檢查

```sh
npm test
npm run typecheck
npm -w web run build
npm -w server run build
```

根目錄 `npm run build` 只建置 `shared`。前端正式版輸出到 `web/dist/`；後端建置到 `server/dist/`。現有 `npm -w server start` 仍使用 `tsx` 執行原始碼。

若要分開啟動，先執行 `npm run build`，再於兩個終端機執行 `npm -w server run dev` 和 `npm -w web run dev`。Vite 的開發代理設定不會自動變成正式部署設定。

## 常見問題

| 現象 | 檢查與處理 |
| --- | --- |
| 找不到 `tsc` 或 `@civic-replay/shared` | 在根目錄執行 `npm ci`，再執行 `npm run build` |
| 修改 `.env` 後沒變化 | 改用上方環境變數指令，重新啟動程序 |
| AI 顯示離線 | 查看 `/api/health/ai` 的 `reason`，確認 Ollama 位址與服務狀態；仍可使用備援示範 |
| 提示 `Model … not pulled` | 目前健康檢查只查看 `/api/tags`；模型未列出時仍可能回傳 `available: true`。另行確認模型能否推論 |
| 改後端埠後 API 失敗 | 同步設定前端的 `SERVER_URL`；檢查兩個程序是否使用相同位址 |

既有開發紀錄保留於 `openspec/changes/archive/2026-09-04-civic-replay-mvp/notes.md`。其中 AI 連線時間與測試數量是當時的紀錄，請以目前執行結果為準。

Windows 若在 exFAT 磁碟遇到 workspace 連結的 `EISDIR` 錯誤，可將儲存庫另行複製到 NTFS 磁碟後安裝。本次在 D 槽 exFAT 安裝失敗，相同程式在 C 槽 NTFS 可完成安裝、測試與建置。
