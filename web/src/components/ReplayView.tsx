import { useEffect, useMemo, useState } from "react";
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

const CATEGORY_LABEL: Record<string, string> = {
  access: "管道",
  comprehension: "理解",
  action: "行動",
};

const DECIDED_BY_LABEL: Record<string, string> = {
  ai: "AI 判讀",
  rule: "規則判定",
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
  const { sandbox, runs, busy } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const [diff, setDiff] = useState<ReplayDiff | null>(null);

  const latest = runs.at(-1)?.result;
  const needsValidation = useMemo(
    () => runs.some((r) => r.result.requiresHumanValidation),
    [runs],
  );

  const baseline = useMemo(
    () => [...runs].sort((a, b) => a.interventionCount - b.interventionCount)[0],
    [runs],
  );
  const baselineId = baseline?.result.id;
  const latestId = latest?.id;
  const sandboxId = sandbox?.id;

  // Diff the current run against the lowest-intervention-count run so far,
  // so each persona's row can show its before -> after transition inline.
  useEffect(() => {
    if (!sandboxId || !baselineId || !latestId || baselineId === latestId) {
      setDiff(null);
      return;
    }
    let cancelled = false;
    api
      .diff(sandboxId, baselineId, latestId)
      .then((d) => {
        if (!cancelled) setDiff(d);
      })
      .catch(() => {
        // Best-effort: fall back to showing plain current status per persona.
        if (!cancelled) setDiff(null);
      });
    return () => {
      cancelled = true;
    };
  }, [sandboxId, baselineId, latestId]);

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
          busy={busy === "replaying"}
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
          {latest.personas.map((p) => {
            const transition = diff?.personaTransitions.find(
              (t) => t.personaId === p.personaId,
            );
            return (
              <div key={p.personaId}>
                <div
                  className="results-row"
                  onClick={() => setOpen(open === p.personaId ? null : p.personaId)}
                >
                  <StatusIcon outcome={p.outcome} />
                  <strong>{p.personaName}</strong>
                  <span style={{ marginLeft: "auto" }}>
                    {transition && transition.changed ? (
                      <>
                        {OC_LABEL[transition.before]} → {OC_LABEL[transition.after]}
                      </>
                    ) : (
                      OC_LABEL[p.outcome]
                    )}
                  </span>
                  <span className="chevron" aria-hidden="true">
                    {open === p.personaId ? "▾" : "▸"}
                  </span>
                </div>
                {open === p.personaId && (
                  <div style={{ padding: "6px 0 10px 20px", fontSize: 13 }}>
                    {p.outcomes.map((o) => {
                      const step = sandbox.service.steps.find((s) => s.id === o.stepId);
                      return (
                        <div key={o.stepId} style={{ marginBottom: 4 }}>
                          <strong>{step?.label ?? o.stepId}</strong> —{" "}
                          {labels.status[STATUS_KEY[o.status]]}・
                          {CATEGORY_LABEL[o.category] ?? o.category}（
                          {DECIDED_BY_LABEL[o.decidedBy] ?? o.decidedBy}）
                          <div className="hint" style={{ margin: 0 }}>
                            {o.reason}
                            {o.evidence.length > 0 && ` ｜ ${o.evidence.join("；")}`}
                          </div>
                        </div>
                      );
                    })}
                    {p.rootCause && (
                      <div className="notice" style={{ marginTop: 6 }}>
                        根本原因：{p.rootCause}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {needsValidation && <div className="notice">※ {VALIDATION_NOTICE}</div>}
        </>
      )}
    </div>
  );
}
