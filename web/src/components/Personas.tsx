import { useStore } from "../store.js";
import { canonicalConditionEntries } from "../conditions.js";
import { PERSONA_AVATARS, STATUS_ICONS } from "../assets/index.js";

function PersonaAvatar({ id, name }: { id: string; name: string }) {
  const avatar = PERSONA_AVATARS[id];
  if (avatar) {
    return <img src={avatar} alt="" className="persona-avatar" />;
  }
  // Non-canonical persona (custom-added or future AI-generated id): no
  // illustrated avatar is guessed — show an initials placeholder instead.
  const initials = name.trim().slice(0, 1) || "?";
  return (
    <span className="persona-avatar persona-avatar-initial" aria-hidden="true">
      {initials}
    </span>
  );
}

export function Personas() {
  const { sandbox, runs, patchSandbox } = useStore();
  if (!sandbox) return <div className="hint">生成沙盤後顯示使用者樣本。</div>;

  const latest = runs.at(-1)?.result;

  const addPersona = () => {
    const n = sandbox.personas.length + 1;
    patchSandbox(
      {
        ...sandbox,
        personas: [
          ...sandbox.personas,
          {
            id: `custom_${n}_${Date.now()}`,
            name: `自訂居民 ${n}`,
            descriptor: "新增樣本",
            primaryChannel: sandbox.service.channels[0]?.id ?? "in_person",
            tags: [],
            conditions: { digital_literacy: "normal", mobility: "normal" },
          },
        ],
        settings: { ...sandbox.settings, personaCount: n },
      },
      ["personas"],
    );
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2>AI 生成的使用者樣本 (Persona)</h2>
        <span className="hint">{sandbox.personas.length} 位主要樣本</span>
      </div>

      <div className="persona-grid">
        {sandbox.personas.map((p) => {
          const pr = latest?.personas.find((x) => x.personaId === p.id);
          return (
            <div className="persona" key={p.id}>
              <div className="persona-head">
                <PersonaAvatar id={p.id} name={p.name} />
                <div className="persona-text">
                  <h3>
                    {p.name}
                    {pr && <span className={`dot ${pr.outcome}`} title={pr.outcome} />}
                  </h3>
                  <div className="desc">{p.descriptor}</div>
                </div>
              </div>
              <div className="tags">
                {p.tags.map((t) => (
                  <span className="tag" key={t}>
                    {t}
                  </span>
                ))}
              </div>
              <div className="chan">主要管道：{channelLabel(sandbox, p.primaryChannel)}</div>

              <details>
                <summary>條件與逐步結果</summary>
                <ul>
                  {canonicalConditionEntries(p.conditions).map(([k, v]) => (
                    <li key={k}>
                      {k} = {String(v)}
                    </li>
                  ))}
                </ul>
                {pr && (
                  <ul>
                    {pr.outcomes.map((o) => {
                      const step = sandbox.service.steps.find((s) => s.id === o.stepId);
                      return (
                        <li key={o.stepId}>
                          <img src={STATUS_ICONS[o.status]} alt="" className="status-icon-sm" />{" "}
                          {step?.label ?? o.stepId} — {o.reason}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </details>
            </div>
          );
        })}
      </div>

      <button className="ghost" style={{ width: "100%", marginTop: 10 }} onClick={addPersona}>
        ＋ 新增或調整 Persona
      </button>
    </>
  );
}

function channelLabel(
  sandbox: { service: { channels: { id: string; label: string }[] } },
  id: string,
): string {
  return sandbox.service.channels.find((c) => c.id === id)?.label ?? id;
}
