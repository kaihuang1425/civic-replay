import { useStore } from "../store.js";
import { EMPTY_STATE_IMAGES, STATUS_ICONS, labels } from "../assets/index.js";
import { EmptyState } from "./EmptyState.js";

const OC_LABEL: Record<string, string> = labels.status
  ? {
      PASS: labels.status.completed,
      NEED_HELP: labels.status.blocker,
      BLOCKED: labels.status.failed,
    }
  : {};

export function SandboxFlow() {
  const { sandbox, viewMode, setViewMode, runs } = useStore();
  if (!sandbox) {
    const copy = labels.emptyStates.createScenario;
    return (
      <EmptyState
        image={EMPTY_STATE_IMAGES.createScenario}
        title={copy.title}
        body={copy.body}
        action={copy.action}
        onAction={() => document.getElementById("scenario-input")?.focus()}
      />
    );
  }

  // Show the most recent replay's per-step status for the first non-passing persona.
  const latest = runs.at(-1)?.result;
  const highlightPersona =
    latest?.personas.find((p) => p.outcome !== "PASS") ?? latest?.personas[0];
  const ocByStep = new Map(
    highlightPersona?.outcomes.map((o) => [o.stepId, o.status]) ?? [],
  );

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>AI 生成的服務沙盤</h2>
        <div className="tags">
          <button
            className={`chip ${viewMode === "flow" ? "active" : ""}`}
            onClick={() => setViewMode("flow")}
          >
            流程圖模式
          </button>
          <button
            className={`chip ${viewMode === "journey" ? "active" : ""}`}
            onClick={() => setViewMode("journey")}
          >
            旅程模式
          </button>
        </div>
      </div>
      <div className="hint">
        服務流程（{sandbox.scenario.theme}）
        {highlightPersona && ` — 顯示「${highlightPersona.personaName}」的逐步結果`}
      </div>

      <div className={`flow ${viewMode === "journey" ? "journey" : ""}`}>
        {sandbox.service.steps.map((step, i) => {
          const oc = ocByStep.get(step.id);
          return (
            <div className="step" key={step.id}>
              <div className="step-head">
                <span className="n">{i + 1}</span>
                <span className="lbl">{step.label}</span>
              </div>
              <div className="intent">{step.intent}</div>
              {step.jargon.length > 0 && (
                <div className="tags">
                  {step.jargon.map((j) => (
                    <span className="tag" key={j}>
                      {j}
                    </span>
                  ))}
                </div>
              )}
              {oc && (
                <div className="oc">
                  <img src={STATUS_ICONS[oc]} alt="" className="status-icon-sm" />{" "}
                  {OC_LABEL[oc] ?? oc}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
