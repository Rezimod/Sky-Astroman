import { TraderRuntime } from "./runtime.js";

const runtime = new TraderRuntime();

runtime.start().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    runtime
      .stop()
      .catch((error) => {
        console.error(error);
        process.exitCode = 1;
      })
      .finally(() => {
        process.exit();
      });
  });
}
