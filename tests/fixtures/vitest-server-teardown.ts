import fs from "fs";
import path from "path";

const PID_FILE = path.join(process.cwd(), ".test-server.pid");

export default async function teardown(): Promise<void> {
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
}
