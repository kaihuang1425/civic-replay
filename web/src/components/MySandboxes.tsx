import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Sandbox } from "@civic-replay/shared";
import { api } from "../api.js";

export function MySandboxes({ onLoad }: { onLoad: (sb: Sandbox) => void }) {
  const [open, setOpen] = useState(false);
  const list = useQuery({
    queryKey: ["sandboxes"],
    queryFn: api.listSandboxes,
    enabled: open,
  });

  return (
    <div style={{ position: "relative" }}>
      <button className="ghost" onClick={() => setOpen((o) => !o)}>
        📁 我的沙盤
      </button>
      {open && (
        <div
          className="panel"
          style={{
            position: "absolute",
            right: 0,
            top: "110%",
            width: 280,
            zIndex: 10,
          }}
        >
          {list.isLoading && <div className="hint">載入中…</div>}
          {list.data?.length === 0 && <div className="hint">尚無已儲存的沙盤</div>}
          {list.data?.map((s) => (
            <div key={s.id} className="results-row" style={{ cursor: "default" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{s.name}</div>
                <div className="hint" style={{ margin: 0 }}>
                  {s.scenarioType} · {s.personaCount} personas · {s.interventionCount} 介入
                </div>
              </div>
              <button
                className="chip"
                onClick={async () => {
                  onLoad(await api.getSandbox(s.id));
                  setOpen(false);
                }}
              >
                載入
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
