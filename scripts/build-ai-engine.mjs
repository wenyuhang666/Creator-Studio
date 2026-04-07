import { execSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function readHostTargetTriple() {
  const raw = execSync("rustc -vV", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  const match = raw.match(/^host:\s*(.+)$/m);
  return match?.[1]?.trim() ?? "";
}

function resolveTargetTriple() {
  const fromEnv = (process.env.TARGET ?? process.env.TAURI_ENV_TARGET_TRIPLE ?? "").trim();
  if (fromEnv) return fromEnv;
  return readHostTargetTriple();
}

function run(command, args, options = {}) {
  const cmd = [command, ...args].join(" ");
  console.log(`[ai-engine] ${cmd}`);
  execSync(cmd, { stdio: "inherit", ...options });
}

function runPkg() {
  // pkg 打包：将 ai-engine.js 编译为独立可执行文件
  // 这样 MSI 安装后就不需要 Node.js 运行时了
  const pkgCmd = process.platform === "win32" ? "pkg.cmd" : "pkg";
  const pkgExePath = path.resolve(aiEngineDir, "node_modules", ".bin", pkgCmd);
  const exeOutPath = path.resolve(outExePath);

  // 优先使用已存在的 ai-engine.js（可能已用 esbuild 构建）
  const sourcePath = existsSync(scriptOutPath) ? scriptOutPath : builtCliPath;

  if (!existsSync(sourcePath)) {
    console.log("[ai-engine] cli.js not found, skipping pkg build");
    return;
  }

  // 删除旧的可执行文件
  if (existsSync(exeOutPath)) {
    try { unlinkSync(exeOutPath); } catch {}
  }

  // 检查 pkg 是否安装
  if (!existsSync(pkgExePath)) {
    console.log("[ai-engine] pkg not found, installing...");
    run("npm", ["install", "--no-package-lock", "pkg"], { cwd: aiEngineDir });
  }

  console.log(`[ai-engine] Building standalone exe with pkg...`);
  console.log(`[ai-engine] source: ${sourcePath}`);
  console.log(`[ai-engine] output: ${exeOutPath}`);

  // 使用 execSync 执行 pkg 命令（Windows 下需要 shell）
  const cmd = `"${pkgExePath}" "${sourcePath}" --targets node18-win-x64 --output "${exeOutPath}"`;
  console.log(`[ai-engine] running: ${cmd}`);
  
  try {
    execSync(cmd, {
      stdio: "inherit",
      shell: true,
      cwd: process.cwd()
    });
    console.log(`[ai-engine] pkg build succeeded: ${exeOutPath}`);
  } catch (error) {
    console.log(`[ai-engine] pkg build failed, fallback to js bundle`);
  }
}

const target = resolveTargetTriple();
if (!target) {
  throw new Error("Failed to resolve Rust target triple (TARGET / rustc -vV).");
}

const exeSuffix = target.includes("windows") ? ".exe" : "";
const outPath = path.join("src-tauri", "bin", `ai-engine-${target}${exeSuffix}`);
const scriptOutPath = path.join("src-tauri", "bin", "ai-engine.js");
const localReleaseScriptOutPath = path.join("src-tauri", "target", "release", "ai-engine.js");
const outExePath = path.join("src-tauri", "bin", `ai-engine${exeSuffix}`); // pkg 输出的 exe 路径
const aiEngineDir = path.join("packages", "ai-engine");
const builtCliPath = path.join(aiEngineDir, "dist", "cli.js");

mkdirSync(path.dirname(outPath), { recursive: true });
mkdirSync(path.join(aiEngineDir, "dist"), { recursive: true });

run("npm", ["install", "--no-package-lock"], { cwd: aiEngineDir });

const esbuildModulePath = pathToFileURL(
  path.resolve(aiEngineDir, "node_modules", "esbuild", "lib", "main.js"),
).href;
const { build } = await import(esbuildModulePath);

console.log("[ai-engine] bundle cli with esbuild");
await build({
  entryPoints: [path.resolve(aiEngineDir, "src", "cli.ts")],
  outfile: path.resolve(builtCliPath),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node18",
  minify: true,
  sourcemap: false,
  legalComments: "none",
  packages: "bundle",
});

const normalizedCli = readFileSync(builtCliPath, "utf8").replace(/^#!.*\r?\n/, "");
writeFileSync(builtCliPath, normalizedCli);

console.log(`[ai-engine] copy ${builtCliPath} -> ${outPath}`);
copyFileSync(builtCliPath, outPath);
console.log(`[ai-engine] copy ${builtCliPath} -> ${scriptOutPath}`);
copyFileSync(builtCliPath, scriptOutPath);
if (existsSync(path.join("src-tauri", "target", "release"))) {
  console.log(`[ai-engine] copy ${builtCliPath} -> ${localReleaseScriptOutPath}`);
  copyFileSync(builtCliPath, localReleaseScriptOutPath);
}

// pkg 打包：将 ai-engine.js 编译为独立的可执行文件
// 这样 MSI 安装后就不需要 Node.js 运行时了
if (target.includes("windows")) {
  runPkg();
}
