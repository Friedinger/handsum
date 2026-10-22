import { spawn } from "node:child_process";
import { stdout } from "node:process";

const SERVICES = [
  { name: "server", script: "server:dev", color: 35 },
  { name: "client", script: "client:dev", color: 36 },
];

const IS_WINDOWS = process.platform === "win32";
const USE_COLOR = stdout.isTTY && !process.env.NO_COLOR;

const children = SERVICES.map(startService);
let stopping = false;

function startService(service) {
  /* On Windows npm is a .cmd file, which only a shell can start. Elsewhere each service gets its
     own process group, so stopping it also stops the server that npm started underneath. */
  const child = spawn("npm", ["run", "--silent", service.script], {
    stdio: ["inherit", "pipe", "pipe"],
    shell: IS_WINDOWS,
    detached: !IS_WINDOWS,
  });
  const prefix = prefixFor(service);
  prefixLines(child.stdout, process.stdout, prefix);
  prefixLines(child.stderr, process.stderr, prefix);
  child.on("exit", (code) => {
    if (!stopping) {
      console.error(`${prefix} exited with code ${String(code)}`);
      stopAll(code ?? 1);
    }
  });
  return child;
}

function prefixFor({ name, color }) {
  const label = `[${name}]`;
  return USE_COLOR ? `\u001b[${String(color)}m${label}\u001b[0m` : label;
}

function prefixLines(input, output, prefix) {
  let rest = "";
  input.setEncoding("utf8");
  input.on("data", (chunk) => {
    const lines = (rest + chunk).split(/\r?\n/);
    rest = lines.pop() ?? "";
    for (const line of lines) {
      output.write(`${prefix} ${line}\n`);
    }
  });
}

/* Killing only the npm process would leave the actual server running, so the whole tree goes. */
function stopService(child) {
  if (child.pid === undefined || child.exitCode !== null) {
    return;
  }
  if (IS_WINDOWS) {
    spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"]);
    return;
  }
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    // The group is already gone.
  }
}

/* One crashing service would otherwise leave the other one running in the background. */
function stopAll(exitCode) {
  stopping = true;
  for (const child of children) {
    stopService(child);
  }
  process.exitCode = exitCode;
}

process.on("SIGINT", () => {
  stopAll(0);
});
process.on("SIGTERM", () => {
  stopAll(0);
});
