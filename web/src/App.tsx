import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api.js";
import { useStore } from "./store.js";
import { GenerationSettings } from "./components/GenerationSettings.js";
import { SandboxFlow } from "./components/SandboxFlow.js";
import { Personas } from "./components/Personas.js";
import { SandboxPreview } from "./components/SandboxPreview.js";
import { ReplayView } from "./components/ReplayView.js";
import { MySandboxes } from "./components/MySandboxes.js";
import { LOGO_MARK } from "./assets/index.js";

const PLACEHOLDER = "例如：普發現金、災害救助、育兒補助、疫苗預約";

export function App() {
  const [description, setDescription] = useState("");
  const {
    sandbox,
    busy,
    error,
    savedAt,
    generate,
    runReplay,
    save,
    loadSandbox,
  } = useStore();

  const health = useQuery({ queryKey: ["health"], queryFn: api.health });
  const templates = useQuery({ queryKey: ["templates"], queryFn: api.templates });

  useEffect(() => {
    if (sandbox && !description) setDescription(sandbox.description);
  }, [sandbox]);

  const aiDown = health.data && !health.data.available;

  return (
    <>
      <header className="app-header">
        <div className="brand">
          <img src={LOGO_MARK} alt="" className="brand-mark" />
          Civic Replay<small>公共服務情境預演</small>
        </div>
        <div className="scenario-bar">
          <textarea
            id="scenario-input"
            placeholder={PLACEHOLDER}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-label="模擬情境描述"
          />
          <button
            className="ghost"
            disabled={!description || busy === "generating"}
            onClick={() => generate(description)}
          >
            {busy === "generating" ? "生成中…" : "✨ 生成沙盤"}
          </button>
          <button
            className="primary"
            disabled={!sandbox || busy === "replaying"}
            onClick={() => runReplay(!aiDown)}
          >
            {busy === "replaying" ? "預演中…" : "▶ 執行預演"}
          </button>
        </div>
        <MySandboxes onLoad={loadSandbox} />
      </header>

      <div className="subheader">
        {sandbox ? (
          <>
            <span>當前沙盤：</span>
            <span className="name">{sandbox.name}</span>
            <span className="pill">可編輯 ✎</span>
            <span>✨ 由自然語言自動轉成規則與模擬流程</span>
            <span style={{ marginLeft: "auto" }}>
              {savedAt ? `已儲存 · ${new Date(savedAt).toLocaleTimeString()}` : "尚未儲存"}
            </span>
            <button className="ghost" onClick={() => save()}>
              儲存
            </button>
            <a href={api.exportUrl(sandbox.id)} target="_blank" rel="noreferrer">
              <button className="ghost" disabled={!savedAt}>
                ⬇ 匯出沙盤
              </button>
            </a>
          </>
        ) : (
          <span>輸入情境並按「生成沙盤」，或從範本 / 我的沙盤載入。</span>
        )}
        <span
          className={`pill ${health.data?.available ? "ok" : "bad"}`}
          title={health.data?.reason ?? ""}
        >
          AI：{health.data?.available ? health.data.model ?? "可用" : "離線（降級模式）"}
        </span>
      </div>

      {error && <div className="banner">⚠ {error}</div>}

      <div className="layout">
        <GenerationSettings
          description={description}
          setDescription={setDescription}
          templates={templates.data ?? []}
        />

        <div>
          <div className="panel" style={{ marginBottom: 16 }}>
            <SandboxFlow />
          </div>
          <div className="panel" style={{ marginBottom: 16 }}>
            <Personas />
          </div>
          <ReplayView aiDown={!!aiDown} />
        </div>

        <SandboxPreview />
      </div>
    </>
  );
}
