import { useState } from "react";
import { INTERVENTION_CATALOG, type Intervention, type InterventionType } from "@civic-replay/shared";
import { useStore } from "../store.js";
import { Donut } from "./Donut.js";
import { EmptyState } from "./EmptyState.js";
import { EMPTY_STATE_IMAGES, labels } from "../assets/index.js";

interface SuggestionRow {
  type: InterventionType;
  label: string;
  rationale: string;
}

/**
 * The server stops suggesting an intervention type once it's applied (it's
 * no longer a "suggestion"), so a checked row must be kept visible from the
 * currently-applied interventions too - otherwise checking it makes the row,
 * and its checkbox, disappear with no way to uncheck it.
 */
function mergeSuggestions(
  suggested: SuggestionRow[],
  applied: Intervention[],
): SuggestionRow[] {
  const rows = [...suggested];
  const seen = new Set(rows.map((r) => r.type));
  for (const iv of applied) {
    if (seen.has(iv.type)) continue;
    seen.add(iv.type);
    rows.push({ type: iv.type, label: iv.label, rationale: "已套用" });
  }
  return rows;
}

export function SandboxPreview({ aiDown }: { aiDown: boolean }) {
  const { sandbox, preview, addIntervention, removeIntervention, runReplay, busy } = useStore();
  const [togglingTypes, setTogglingTypes] = useState<Set<InterventionType>>(new Set());

  if (!sandbox) {
    return (
      <div className="panel">
        <h2>生成結果預覽</h2>
        <div className="hint">Sandbox Preview</div>
      </div>
    );
  }

  const toggleSuggestion = async (type: InterventionType, checked: boolean) => {
    setTogglingTypes((s) => new Set(s).add(type));
    try {
      if (checked) {
        await addIntervention(type, INTERVENTION_CATALOG[type].defaultStepRef);
      } else {
        const existing = sandbox.interventions.find((iv) => iv.type === type);
        if (existing) await removeIntervention(existing.id);
      }
    } finally {
      setTogglingTypes((s) => {
        const next = new Set(s);
        next.delete(type);
        return next;
      });
    }
  };

  const suggestionRows = mergeSuggestions(
    preview?.suggestedInterventions ?? [],
    sandbox.interventions,
  );

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
        <div
          className="label"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          建議介入措施
          <button
            className="ghost"
            disabled={busy === "replaying"}
            onClick={() => runReplay(!aiDown)}
          >
            {busy === "replaying" ? (
              <>
                <span className="spinner" aria-hidden="true" />
                模擬中…
              </>
            ) : (
              "重新模擬"
            )}
          </button>
        </div>
        {suggestionRows.length ? (
          suggestionRows.map((s) => {
            const applied = sandbox.interventions.some((iv) => iv.type === s.type);
            return (
              <div className="risk" key={s.type}>
                <label className="intervention-toggle">
                  <input
                    type="checkbox"
                    checked={applied}
                    disabled={togglingTypes.has(s.type) || busy === "replaying"}
                    onChange={(e) => toggleSuggestion(s.type, e.target.checked)}
                  />
                  <span>
                    {s.label} <span className="hint">— {s.rationale}</span>
                  </span>
                </label>
              </div>
            );
          })
        ) : (
          <div className="hint">目前沒有進一步建議</div>
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
