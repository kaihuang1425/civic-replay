import { useMemo, useState } from "react";
import type { OutcomeStatus, ReplayDiff } from "@civic-replay/shared";
import { api } from "../api.js";
import { useStore } from "../store.js";
import { EMPTY_STATE_IMAGES, STATUS_ICONS, labels } from "../assets/index.js";
import { EmptyState } from "./EmptyState.js";

const OC_LABEL: Record<string, string> = {
  PASS: "🟢 順利完成",
  NEED_HELP: "🟠 需要協助",
  BLOCKED: "🔴 無法完成",
};

const STATUS_KEY: Record<OutcomeStatus, keyof typeof labels.status> = {
  PASS: "completed",
  NEED_HELP: "blocker",
  BLOCKED: "failed",
};

function StatusIcon({ outcome }: { outcome: OutcomeStatus }) {
  return (
    <img
      src={STATUS_ICONS[outcome]}
      alt={labels.status[STATUS_KEY[outcome]]}
      title={labels.status[STATUS_KEY[outcome]]}
      className="status-icon-sm"
    />
  );
}

const VALIDATION_NOTICE = "AI 模擬結果，仍需真人／地方單位驗證。";

export function ReplayView({ aiDown }: { aiDown: boolean }) {
  const { sandbox, runs } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const [diff, setDiff] = useState<ReplayDiff | null>(null);
  const [diffErr, setDiffErr] = useState<string | null>(null);

  const latest = runs.at(-1)?.result;
  const needsValidation = useMemo(
    () => runs.some((r) => r.result.requiresHumanValidation),
    [runs],
  );

  const baseline = useMemo(
    () => [...runs].sort((a, b) => a.interventionCount - b.interventionCount)[0],
    [runs],
  );
  const canDiff = runs.length >= 2 && baseline && latest && baseline.result.id !== latest.id;

  if (!sandbox) return null;

  return (
    <div className="panel">
      <h2>預演結果</h2>
      {!latest && (
        <EmptyState
          image={EMPTY_STATE_IMAGES.startSimulation}
          title={labels.emptyStates.startSimulation.title}
          body={labels.emptyStates.startSimulation.body}
          action={labels.emptyStates.startSimulation.action}
          onAction={() => useStore.getState().runReplay(!aiDown)}
        />
      )}

      {aiDown && (
        <div className="notice">
          ⚠ AI 提供者離線，目前以規則引擎進行降級預演；語意判讀步驟會標記為需人工確認。
        </div>
      )}

      {latest && (
        <>
          <div className="hint">
            整體：到達 {latest.aggregate.reached}/{latest.aggregate.total}、
            可自行完成 {latest.aggregate.ableToAct}/{latest.aggregate.total}、
            無法完成 {latest.aggregate.unresolved}
          </div>
          {latest.personas.map((p) => (
            <div key={p.personaId}>
              <div
                className="results-row"
                onClick={() => setOpen(open === p.personaId ? null : p.personaId)}
              >
                <span className={`dot ${p.outcome}`} />
                <StatusIcon outcome={p.outcome} />
                <strong>{p.personaName}</strong>
                <span style={{ marginLeft: "auto" }}>{OC_LABEL[p.outcome]}</span>
              </div>
              {open === p.personaId && (
                <div style={{ padding: "6px 0 10px 20px", fontSize: 13 }}>
                  {p.outcomes.map((o) => {
                    const step = sandbox.service.steps.find((s) => s.id === o.stepId);
                    return (
                      <div key={o.stepId} style={{ marginBottom: 4 }}>
                        <strong>{step?.label ?? o.stepId}</strong> — {o.status} ·{" "}
                        {o.category} {o.decidedBy === "ai" ? "(AI)" : "(rule)"}
                        <div className="hint" style={{ margin: 0 }}>
                          {o.reason}
                          {o.evidence.length > 0 && ` ｜ ${o.evidence.join("；")}`}
                        </div>
                      </div>
                    );
                  })}
                  {p.rootCause && (
                    <div className="notice" style={{ marginTop: 6 }}>
                      Root cause：{p.rootCause}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {needsValidation && <div className="notice">※ {VALIDATION_NOTICE}</div>}
        </>
      )}

      {canDiff && (
        <div style={{ marginTop: 14 }}>
          <button
            className="ghost"
            onClick={async () => {
              setDiffErr(null);
              try {
                setDiff(
                  await api.diff(sandbox.id, baseline!.result.id, latest!.id),
                );
              } catch (e) {
                setDiffErr((e as Error).message);
              }
            }}
          >
            ⇄ 比較前後（Replay Diff）
          </button>
          {diffErr && <div className="banner">⚠ {diffErr}</div>}
          {diff && <DiffPanel diff={diff} />}
        </div>
      )}
    </div>
  );
}

function DiffPanel({ diff }: { diff: ReplayDiff }) {
  const cell = (label: string, before: number, after: number) => (
    <div className="diff-cell">
      <div className="hint" style={{ margin: 0 }}>
        {label}
      </div>
      <div className="big">
        {before} <span className="arrow">→</span> {after}
      </div>
    </div>
  );

  return (
    <div style={{ marginTop: 10 }}>
      <div className="diff-grid">
        {cell("Reached", diff.baseline.aggregate.reached, diff.after.aggregate.reached)}
        {cell(
          "Able to act",
          diff.baseline.aggregate.ableToAct,
          diff.after.aggregate.ableToAct,
        )}
        {cell(
          "Unresolved",
          diff.baseline.aggregate.unresolved,
          diff.after.aggregate.unresolved,
        )}
      </div>

      <div className="label">Persona 變化</div>
      {diff.personaTransitions.map((t) => (
        <div className="trans" key={t.personaId}>
          {t.improved ? <span className="up">▲</span> : t.changed ? "▼" : "＝"}{" "}
          {t.personaName}：{t.before} → {t.after}
        </div>
      ))}

      <div className="label" style={{ marginTop: 8 }}>
        介入措施影響
      </div>
      {diff.interventionImpacts.map((i) => (
        <div className="trans" key={i.interventionId}>
          <strong>{i.label}</strong> — {i.summary}
        </div>
      ))}

      {diff.requiresHumanValidation && (
        <div className="notice">※ {VALIDATION_NOTICE}</div>
      )}
    </div>
  );
}
