import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import type { Plugin, ViteDevServer } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 프로젝트 로컬 DB: {project_root}/.claude/kanban.db
const DB_PATH =
  process.env.KANBAN_DB ||
  path.resolve(__dirname, "..", "..", ".claude", "kanban.db");

function getDb(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT '중간',
      description TEXT,
      tags TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      started_at TEXT,
      completed_at TEXT
    );
  `);

  return db;
}

interface Task {
  id: number;
  project: string;
  title: string;
  status: string;
  priority: string;
  description: string | null;
  tags: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

interface Board {
  todo: Task[];
  inprogress: Task[];
  done: Task[];
  projects: string[];
}

export function kanbanApiPlugin(): Plugin {
  return {
    name: "kanban-api",
    configureServer(server: ViteDevServer) {
      // Parse JSON body helper
      function parseBody(req: any): Promise<any> {
        return new Promise((resolve) => {
          let body = "";
          req.on("data", (chunk: string) => (body += chunk));
          req.on("end", () => {
            try {
              resolve(JSON.parse(body));
            } catch {
              resolve({});
            }
          });
        });
      }

      server.middlewares.use(async (req, res, next) => {
        // GET /api/board?project=xxx
        if (req.url?.startsWith("/api/board")) {
          const url = new URL(req.url, "http://localhost");
          const project = url.searchParams.get("project");

          const db = getDb();
          try {
            let tasks: Task[];
            if (project) {
              tasks = db
                .prepare("SELECT * FROM tasks WHERE project = ? ORDER BY id")
                .all(project) as Task[];
            } else {
              tasks = db
                .prepare("SELECT * FROM tasks ORDER BY project, id")
                .all() as Task[];
            }

            const projects = (
              db
                .prepare("SELECT DISTINCT project FROM tasks ORDER BY project")
                .all() as { project: string }[]
            ).map((r) => r.project);

            const board: Board = {
              todo: tasks.filter((t) => t.status === "todo"),
              inprogress: tasks.filter((t) => t.status === "inprogress"),
              done: tasks.filter((t) => t.status === "done"),
              projects,
            };

            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(board));
          } finally {
            db.close();
          }
          return;
        }

        // GET /api/task/:id
        if (req.url?.match(/^\/api\/task\/\d+$/) && req.method === "GET") {
          const id = req.url.split("/").pop();
          const db = getDb();
          try {
            const task = db
              .prepare("SELECT * FROM tasks WHERE id = ?")
              .get(id) as Task | undefined;

            if (!task) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: "Not found" }));
              return;
            }

            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(task));
          } finally {
            db.close();
          }
          return;
        }

        // PATCH /api/task/:id  (move status, edit)
        if (req.url?.match(/^\/api\/task\/\d+$/) && req.method === "PATCH") {
          const id = req.url.split("/").pop();
          const body = await parseBody(req);
          const db = getDb();
          try {
            const sets: string[] = [];
            const values: any[] = [];

            if (body.status !== undefined) {
              sets.push("status = ?");
              values.push(body.status);
              if (body.status === "inprogress") {
                sets.push("started_at = datetime('now')");
              } else if (body.status === "done") {
                sets.push("completed_at = datetime('now')");
              } else if (body.status === "todo") {
                sets.push("started_at = NULL");
                sets.push("completed_at = NULL");
              }
            }
            if (body.title !== undefined) {
              sets.push("title = ?");
              values.push(body.title);
            }
            if (body.priority !== undefined) {
              sets.push("priority = ?");
              values.push(body.priority);
            }
            if (body.description !== undefined) {
              sets.push("description = ?");
              values.push(body.description);
            }
            if (body.tags !== undefined) {
              sets.push("tags = ?");
              values.push(
                typeof body.tags === "string"
                  ? body.tags
                  : JSON.stringify(body.tags)
              );
            }

            if (sets.length > 0) {
              values.push(id);
              db.prepare(
                `UPDATE tasks SET ${sets.join(", ")} WHERE id = ?`
              ).run(...values);
            }

            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ success: true }));
          } finally {
            db.close();
          }
          return;
        }

        next();
      });
    },
  };
}
