import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

function fail(message) {
  console.error(`[ai-engine-error-recovery] FAIL: ${message}`);
  process.exit(1);
}

function pass(message) {
  console.log(`[ai-engine-error-recovery] PASS: ${message}`);
}

export async function runAiEngineErrorRecoverySuite({ rootDir }) {
  const cwd = fileURLToPath(rootDir);

  const cargoResult = spawnSync(
    "cargo",
    [
      "test",
      "--manifest-path", join(cwd, "src-tauri", "Cargo.toml"),
      "--",
      "ai_bridge",
      "--nocapture",
    ],
    {
      timeout: 180000,
      encoding: "utf8",
      cwd,
    },
  );

  if (cargoResult.status !== 0) {
    if (cargoResult.stderr.includes("could not compile")) {
      fail("Rust compilation failed — check src-tauri/src/ai_bridge.rs");
    }
    console.error(cargoResult.stderr?.slice(-2000));
    fail("Rust ai_bridge tests failed");
  }
  pass("Rust ai_bridge integration tests pass");

  const output = cargoResult.stdout + cargoResult.stderr;
  const criticalTests = [
    "discussion_mode_blocks",
    "continue_mode_blocks_write",
  ];
  for (const testName of criticalTests) {
    if (output.includes(testName)) {
      pass(`Critical test '${testName}' found and ran`);
    }
  }

  console.log("[ai-engine-error-recovery] All error recovery tests passed.");
}
