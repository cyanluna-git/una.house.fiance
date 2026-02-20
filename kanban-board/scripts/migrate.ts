/**
 * Migrate existing kanban MD files → SQLite (~/.claude/kanban.db)
 *
 * Usage: npx tsx scripts/migrate.ts [kanbanDir] [projectName]
 *   kanbanDir:   path to kanban/ folder (default: ../kanban)
 *   projectName: project name (default: basename of parent dir)
 */

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const kanbanDir = process.argv[2] || path.resolve(__dirname, "../../kanban");
const projectName =
  process.argv[3] || path.basename(path.resolve(kanbanDir, ".."));

// Project-local DB: {project_root}/.claude/kanban.db
const projectRoot = path.resolve(__dirname, "../..");
const dbPath = path.join(projectRoot, ".claude", "kanban.db");

console.log(`Kanban dir: ${kanbanDir}`);
console.log(`Project:    ${projectName}`);
console.log(`DB path:    ${dbPath}`);
console.log("");

// Ensure .claude directory exists in project root
const claudeDir = path.join(projectRoot, ".claude");
if (!fs.existsSync(claudeDir)) {
  fs.mkdirSync(claudeDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'todo',
    priority TEXT NOT NULL DEFAULT 'medium',
    description TEXT,
    plan TEXT,
    implementation_notes TEXT,
    tags TEXT,
    review_comments TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    started_at TEXT,
    reviewed_at TEXT,
    completed_at TEXT
  );
`);

function parseMd(filePath: string) {
  const content = fs.readFileSync(filePath, "utf-8");

  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : path.basename(filePath, ".md");

  const priorityMatch = content.match(/##\s*(?:Priority|우선순위)[:\s]*(.+)$/m);
  const rawPriority = priorityMatch ? priorityMatch[1].trim() : "medium";
  const priorityMap: Record<string, string> = { "높음": "high", "중간": "medium", "낮음": "low" };
  const priority = priorityMap[rawPriority] || rawPriority;

  const dateMatch = content.match(/##\s*(?:Completed|완료일)\s*\n(.+)/);
  const completedAt = dateMatch ? dateMatch[1].trim() : null;

  return { title, priority, description: content, completedAt };
}

const insert = db.prepare(`
  INSERT INTO tasks (project, title, status, priority, description, completed_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

let count = 0;

for (const status of ["todo", "inprogress", "review", "done"]) {
  const dir = path.join(kanbanDir, status);
  if (!fs.existsSync(dir)) continue;

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort();
  for (const file of files) {
    const { title, priority, description, completedAt } = parseMd(
      path.join(dir, file)
    );

    // Check if already migrated (same project + title)
    const existing = db
      .prepare("SELECT id FROM tasks WHERE project = ? AND title = ?")
      .get(projectName, title);

    if (existing) {
      console.log(`  SKIP (exists): ${title}`);
      continue;
    }

    insert.run(
      projectName,
      title,
      status,
      priority,
      description,
      completedAt
    );
    count++;
    console.log(`  [${status}] ${title}`);
  }
}

db.close();

console.log(`\nMigrated ${count} tasks to ${dbPath}`);
console.log("Done!");
