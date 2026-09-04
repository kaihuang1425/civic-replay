import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FakeProvider } from "../src/ai/fakeProvider.js";

/** Point runtime persistence at a throwaway directory. */
export function useTempDataDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "civic-replay-"));
  process.env.CIVIC_DATA_DIR = dir;
  return dir;
}

/** A FakeProvider wired with sane answers for generation + step decisions. */
export function fakeProvider(): FakeProvider {
  return new FakeProvider()
    .on('"name"', {
      name: "測試沙盤",
      scenario: { theme: "測試", location: "Demo", event: "測試事件" },
      service: {
        steps: [
          { id: "learn", label: "知道服務", kind: "alert", intent: "接收資訊", channels: [], requiresTravel: false, jargon: [] },
          { id: "elig", label: "確認資格", kind: "understand", intent: "確認符合", channels: [], requiresTravel: false, jargon: ["排富"] },
          { id: "choose", label: "選擇管道", kind: "choose_channel", intent: "決定管道", channels: [], requiresTravel: false, jargon: [] },
          { id: "prep", label: "準備文件", kind: "prepare", intent: "備妥文件", channels: [], requiresTravel: false, jargon: [] },
          { id: "verify", label: "身分驗證", kind: "verify_identity", intent: "驗證身分", channels: [], requiresTravel: false, jargon: [] },
          { id: "result", label: "取得結果", kind: "obtain_result", intent: "入帳", channels: [], requiresTravel: false, jargon: [] },
        ],
        channels: [
          { id: "online", label: "線上", requires: ["has_internet"] },
          { id: "counter", label: "臨櫃", requires: [] },
        ],
        eligibilityRules: [{ id: "r1", text: "設籍國民" }],
        fallbackOptions: [],
      },
      highlights: {
        theme: "測試主題",
        serviceGoal: "協助居民完成申請",
        coreConstraints: ["資訊落差", "數位落差"],
        mainChannels: ["線上", "臨櫃"],
      },
    })
    .on("Decide whether THIS resident", (prompt: string) => ({
      status: prompt.includes('"chinese_reading":"limited"') ? "NEED_HELP" : "PASS",
      category: "comprehension",
      reason: "AI 判定",
      evidence: ["ai_reasoned = true"],
      stateChanges: { understands: true },
    }))
    .on("systemic gap", { rootCause: "服務缺乏替代管道，導致部分居民無法完成流程。" });
}
