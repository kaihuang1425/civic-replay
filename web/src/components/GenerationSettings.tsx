import type { Sandbox, Template } from "@civic-replay/shared";
import { useStore } from "../store.js";

interface Props {
  description: string;
  setDescription: (v: string) => void;
  templates: Template[];
}

const LIST_FIELDS: Array<{
  key: keyof Sandbox["settings"];
  label: string;
}> = [
  { key: "channels", label: "Service channels / 服務管道" },
  { key: "eligibilityRules", label: "Eligibility rules / 資格規則" },
  { key: "fallbackOptions", label: "Fallback options / 備援方案" },
];

export function GenerationSettings({
  description,
  setDescription,
  templates,
}: Props) {
  const { sandbox, patchSandbox, regenerate, busy } = useStore();

  const updateList = (key: keyof Sandbox["settings"], value: string) => {
    if (!sandbox) return;
    const items = value
      .split(/[,，\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    patchSandbox(
      { ...sandbox, settings: { ...sandbox.settings, [key]: items } },
      [`settings.${key}`],
    );
  };

  return (
    <div className="panel">
      <h2>生成設定</h2>
      <div className="hint">AI 已根據你的描述自動產生下列設定，可編輯後重新生成。</div>

      {sandbox ? (
        <>
          <div className="section">
            <div className="label">Scenario type / 情境類型</div>
            <input
              value={sandbox.settings.scenarioType}
              onChange={(e) =>
                patchSandbox(
                  {
                    ...sandbox,
                    settings: { ...sandbox.settings, scenarioType: e.target.value },
                  },
                  ["settings.scenarioType"],
                )
              }
            />
          </div>

          {LIST_FIELDS.map(({ key, label }) => (
            <div className="section" key={key}>
              <div className="label">{label}</div>
              <textarea
                rows={2}
                defaultValue={(sandbox.settings[key] as string[]).join("、")}
                onBlur={(e) => updateList(key, e.target.value)}
              />
            </div>
          ))}

          <div className="section">
            <div className="label">Persona count</div>
            <input
              type="number"
              min={1}
              max={12}
              value={sandbox.settings.personaCount}
              onChange={(e) =>
                patchSandbox(
                  {
                    ...sandbox,
                    settings: {
                      ...sandbox.settings,
                      personaCount: Number(e.target.value) || 6,
                    },
                  },
                  ["settings.personaCount"],
                )
              }
            />
          </div>

          <button
            className="primary"
            style={{ width: "100%", marginBottom: 14 }}
            disabled={busy === "generating"}
            onClick={() => regenerate(description || sandbox.description)}
          >
            {busy === "generating" ? "重新生成中…" : "↻ 重新生成"}
          </button>
        </>
      ) : (
        <div className="hint">尚未生成沙盤。</div>
      )}

      <div className="label" style={{ color: "var(--muted)" }}>
        快速套用情境範本
      </div>
      <div className="tags" style={{ marginTop: 8 }}>
        {templates.map((t) => (
          <button
            key={t.id}
            className="chip"
            onClick={() => {
              setDescription(t.scenarioDescription);
              useStore.getState().generate(t.scenarioDescription, t.settings);
            }}
          >
            {t.name}
          </button>
        ))}
      </div>
    </div>
  );
}
