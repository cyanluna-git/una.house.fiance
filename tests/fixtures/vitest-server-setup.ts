import { spawn } from "child_process";
import path from "path";
import fs from "fs";

const PID_FILE = path.join(process.cwd(), ".test-server.pid");

async function waitForServer(url: string, timeoutMs = 60_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Server at ${url} did not start within ${timeoutMs}ms`);
}

export default async function setup(): Promise<() => Promise<void>> {
  const server = spawn("node_modules/.bin/next", ["dev", "-p", "3105"], {
    env: {
      ...process.env,
      UNAHOUSE_DB_PATH: path.resolve("test.db"),
      UNAHOUSE_ACCESS_KEY_BASE64: "test-key-base64",
      NODE_ENV: "test",
    },
    stdio: "pipe",
    detached: true,
  });
  server.unref();

  fs.writeFileSync(PID_FILE, String(server.pid ?? 0));

  // Log server output for debugging
  server.stderr?.on("data", (d: Buffer) => {
    if (process.env.DEBUG_SERVER) process.stderr.write(d);
  });

  await waitForServer("http://localhost:3105");

  return async function teardown(): Promise<void> {
    // Kill server
    if (fs.existsSync(PID_FILE)) {
      const pid = parseInt(fs.readFileSync(PID_FILE, "utf-8").trim(), 10);
      try {
        process.kill(pid, "SIGTERM");
        // Also kill any child processes
        process.kill(-pid, "SIGTERM");
      } catch {}
      fs.unlinkSync(PID_FILE);
    }

    // Clean test DB
    const dbPath = process.env.UNAHOUSE_DB_PATH
      ? path.resolve(process.env.UNAHOUSE_DB_PATH)
      : path.join(process.cwd(), "test.db");

    for (const suffix of ["", "-shm", "-wal"]) {
      try {
        fs.unlinkSync(dbPath + suffix);
      } catch {}
    }
  };
}
