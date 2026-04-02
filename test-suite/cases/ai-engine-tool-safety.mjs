import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

function fail(message) {
  console.error(`[ai-engine-tool-safety] FAIL: ${message}`);
  process.exit(1);
}

function pass(message) {
  console.log(`[ai-engine-tool-safety] PASS: ${message}`);
}

export async function runAiEngineToolSafetySuite({ rootDir }) {
  const cwd = fileURLToPath(rootDir);

  const cargoResult = spawnSync(
    "cargo",
    ["test", "--manifest-path", join(cwd, "src-tauri", "Cargo.toml"), "--", "security", "--nocapture"],
    {
      timeout: 120000,
      encoding: "utf8",
      cwd,
    },
  );

  if (cargoResult.status !== 0) {
    console.error(cargoResult.stderr);
    console.error(cargoResult.stdout);
    fail("Rust security module tests failed");
  }
  pass("Rust security module path validation tests pass");

  const testOutput = cargoResult.stdout + cargoResult.stderr;
  const expectedTests = [
    "rejects_absolute",
    "rejects_parent_traversal",
  ];
  for (const testName of expectedTests) {
    if (!testOutput.includes(testName)) {
      console.log(`[ai-engine-tool-safety] WARNING: Expected test '${testName}' not found in output`);
    }
  }

  console.log("[ai-engine-tool-safety] All tool safety tests passed.");
}
