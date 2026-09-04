import { INTERVENTION_CATALOG } from "@civic-replay/shared";
import { useStore } from "../store.js";
import { Donut } from "./Donut.js";
import { EmptyState } from "./EmptyState.js";
import { EMPTY_STATE_IMAGES, labels } from "../assets/index.js";

export function SandboxPreview() {
  const { sandbox, preview, addIntervention, busy } = useStore();
  if (!sandbox) {
    return (
      <div className="panel">
        <h2>生成結果預覽</h2>
        <div className="hint">Sandbox Preview</div>
      </div>
    );
  }

  const h = sandbox.highlights;
  return (
    <div className="panel">
      <h2>生成結果預覽</h2>
      <div className="hint">Sandbox Preview</div>

      <div className="section">
        <div className="label">AI 提取重點</div>
        <p style={{ margin: "6px 0" }}>
          <strong>情境主題</strong>：{h.theme}
        </p>
        <p style={{ margin: "6px 0" }}>
          <strong>服務目標</strong>：{h.serviceGoal}
        </p>
        <div>
          <strong>核心限制</strong>
          <div className="tags">
            {h.coreConstraints.map((c) => (
              <span className="tag" key={c}>
                {c}
              </span>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 6 }}>
          <strong>主要管道</strong>
          <div className="tags">
            {h.mainChannels.map((c) => (
              <span className="tag" key={c}>
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="section">
        <div className="label">風險偵測 Top 5</div>
        {preview?.risks.length ? (
          preview.risks.map((r, i) => (
            <div className="risk" key={r.id}>
              <span>
                {i + 1}. {r.title}
              </span>
              <span className={`sev ${r.severity}`}>{sevLabel(r.severity)}</span>
            </div>
          ))
        ) : (
          <EmptyState
            image={EMPTY_STATE_IMAGES.noResults}
            title={labels.emptyStates.noResults.title}
            body={labels.emptyStates.noResults.body}
          />
        )}
      </div>

      <div className="section">
        <div className="label">建議介入措施</div>
        {preview?.suggestedInterventions.length ? (
          preview.suggestedInterventions.map((s) => (
            <div className="risk" key={s.type}>
              <span>
                {s.label} <span className="hint">— {s.rationale}</span>
              </span>
              <button
                className="chip"
                disabled={busy === "intervention"}
                onClick={() =>
                  addIntervention(s.type, INTERVENTION_CATALOG[s.type].defaultStepRef)
                }
              >
                ＋ 加入
              </button>
            </div>
          ))
        ) : (
          <div className="hint">目前沒有進一步建議</div>
        )}
        {sandbox.interventions.length > 0 && (
          <div className="tags" style={{ marginTop: 8 }}>
            {sandbox.interventions.map((iv) => (
              <span className="tag" key={iv.id}>
                ✓ {iv.label} @ {iv.stepRef}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="section">
        <div className="label">模擬結果總覽（預估）</div>
        {preview && (
          <>
            <div className="donut">
              <Donut
                slices={[
                  { value: preview.estimatedDistribution.pass, color: "var(--green)" },
                  { value: preview.estimatedDistribution.needHelp, color: "var(--amber)" },
                  { value: preview.estimatedDistribution.blocked, color: "var(--red)" },
                ]}
              />
              <div className="legend">
                <div>
                  <i style={{ background: "var(--green)" }} /> 順利完成{" "}
                  {pct(preview.estimatedDistribution.pass)}
                </div>
                <div>
                  <i style={{ background: "var(--amber)" }} /> 需協助完成{" "}
                  {pct(preview.estimatedDistribution.needHelp)}
                </div>
                <div>
                  <i style={{ background: "var(--red)" }} /> 中途放棄{" "}
                  {pct(preview.estimatedDistribution.blocked)}
                </div>
              </div>
            </div>
            <div className="hint" style={{ marginTop: 6 }}>
              ※ {preview.estimateLabel}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function sevLabel(s: string): string {
  return { high: "高風險", "medium-high": "中高風險", medium: "中風險", low: "低風險" }[
    s
  ] ?? s;
}
