import { createApp } from "./app.js";
import { config } from "./config.js";
import { getProvider, REGISTERED_PROVIDERS } from "./ai/registry.js";

// Fail fast on an unknown AI_PROVIDER.
try {
  getProvider();
} catch (err) {
  console.error(`[civic-replay] ${(err as Error).message}`);
  process.exit(1);
}

const app = createApp();
app.listen(config.port, () => {
  console.log(
    `[civic-replay] server on :${config.port} — AI provider "${config.aiProvider}" ` +
      `(registered: ${REGISTERED_PROVIDERS.join(", ")})`,
  );
});
