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

const COLUMNS = [
  { key: "todo", label: "To Do", icon: "📋" },
  { key: "inprogress", label: "In Progress", icon: "🔨" },
  { key: "done", label: "Done", icon: "✅" },
];

let currentProject: string | null = null;

function priorityClass(priority: string): string {
  if (priority.includes("높음")) return "high";
  if (priority.includes("중간")) return "medium";
  if (priority.includes("낮음")) return "low";
  return "";
}

function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  try {
    return JSON.parse(tags);
  } catch {
    return [];
  }
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr + "Z");
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days === 0) return "오늘";
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;
  if (days < 30) return `${Math.floor(days / 7)}주 전`;
  return dateStr.slice(0, 10);
}

function renderCard(task: Task): string {
  const pClass = priorityClass(task.priority);
  const priorityBadge = pClass
    ? `<span class="badge ${pClass}">${task.priority}</span>`
    : "";

  const dateBadge = task.completed_at
    ? `<span class="badge date">${task.completed_at.slice(0, 10)}</span>`
    : task.created_at
      ? `<span class="badge created">${timeAgo(task.created_at)}</span>`
      : "";

  const projectBadge =
    !currentProject && task.project
      ? `<span class="badge project">${task.project}</span>`
      : "";

  const tags = parseTags(task.tags)
    .map((t) => `<span class="tag">${t}</span>`)
    .join("");

  const desc = task.description
    ? task.description.split("\n")[0].slice(0, 80)
    : "";

  return `
    <div class="card" draggable="true" data-id="${task.id}" data-status="${task.status}">
      <div class="card-header">
        <span class="card-id">#${task.id}</span>
        ${priorityBadge}
      </div>
      <div class="card-title">${task.title}</div>
      ${desc ? `<div class="card-desc">${desc}</div>` : ""}
      <div class="card-footer">
        ${projectBadge}
        ${dateBadge}
      </div>
      ${tags ? `<div class="card-tags">${tags}</div>` : ""}
    </div>
  `;
}

function renderColumn(
  key: string,
  label: string,
  icon: string,
  tasks: Task[]
): string {
  const cardsHtml = tasks.map(renderCard).join("");
  return `
    <div class="column ${key}" data-column="${key}">
      <div class="column-header">
        <span>${icon} ${label}</span>
        <span class="count">${tasks.length}</span>
      </div>
      <div class="column-body" data-column="${key}">
        ${cardsHtml || '<div class="empty">비어있음</div>'}
      </div>
    </div>
  `;
}

function simpleMarkdownToHtml(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, (match) => {
      const code = match.replace(/```\w*\n?/, "").replace(/```$/, "");
      return `<pre><code>${code}</code></pre>`;
    })
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>")
    .replace(/^[-*]\s+(.+)$/gm, "<li>$1</li>")
    .replace(/\n\n/g, "<br><br>")
    .replace(/\n/g, "<br>");
}

async function showTaskDetail(id: number) {
  const overlay = document.getElementById("modal-overlay")!;
  const content = document.getElementById("modal-content")!;
  content.innerHTML = '<div style="color:#94a3b8">로딩 중...</div>';
  overlay.classList.remove("hidden");

  try {
    const res = await fetch(`/api/task/${id}`);
    const task: Task = await res.json();

    const tags = parseTags(task.tags);
    const tagsHtml = tags.length
      ? `<div class="modal-tags">${tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>`
      : "";

    const meta = [
      `<strong>프로젝트:</strong> ${task.project}`,
      `<strong>상태:</strong> ${task.status}`,
      `<strong>우선순위:</strong> ${task.priority}`,
      `<strong>생성일:</strong> ${task.created_at?.slice(0, 10) || "-"}`,
      task.started_at
        ? `<strong>시작일:</strong> ${task.started_at.slice(0, 10)}`
        : "",
      task.completed_at
        ? `<strong>완료일:</strong> ${task.completed_at.slice(0, 10)}`
        : "",
    ]
      .filter(Boolean)
      .join(" &nbsp;|&nbsp; ");

    const descHtml = task.description
      ? simpleMarkdownToHtml(task.description)
      : '<span style="color:#64748b">설명 없음</span>';

    content.innerHTML = `
      <h1>#${task.id} ${task.title}</h1>
      <div class="modal-meta">${meta}</div>
      ${tagsHtml}
      <div class="modal-body">${descHtml}</div>
    `;
  } catch {
    content.innerHTML = '<div style="color:#ef4444">불러올 수 없습니다</div>';
  }
}

async function moveTask(id: number, newStatus: string) {
  await fetch(`/api/task/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: newStatus }),
  });
  loadBoard();
}

async function loadBoard() {
  const board = document.getElementById("board")!;
  const params = currentProject ? `?project=${encodeURIComponent(currentProject)}` : "";

  try {
    const res = await fetch(`/api/board${params}`);
    const data: Board = await res.json();

    // Render project filter
    renderProjectFilter(data.projects);

    // Render columns
    board.innerHTML = COLUMNS.map((col) =>
      renderColumn(
        col.key,
        col.label,
        col.icon,
        data[col.key as keyof Pick<Board, "todo" | "inprogress" | "done">]
      )
    ).join("");

    // Count summary
    const total = data.todo.length + data.inprogress.length + data.done.length;
    document.getElementById("count-summary")!.textContent =
      `${data.done.length}/${total} completed`;

    // Card click → detail modal
    board.querySelectorAll(".card").forEach((el) => {
      el.addEventListener("click", () => {
        const id = parseInt((el as HTMLElement).dataset.id!);
        showTaskDetail(id);
      });
    });

    // Drag & Drop
    setupDragAndDrop();
  } catch {
    board.innerHTML = `
      <div style="grid-column:1/-1;display:flex;align-items:center;justify-content:center;color:#ef4444;font-size:0.9rem;padding:48px">
        ~/.claude/kanban.db 를 찾을 수 없습니다
      </div>
    `;
  }
}

function renderProjectFilter(projects: string[]) {
  const container = document.getElementById("project-filter")!;
  if (projects.length <= 1) {
    container.innerHTML = projects[0]
      ? `<span class="project-label">${projects[0]}</span>`
      : "";
    return;
  }

  const options = projects
    .map(
      (p) =>
        `<option value="${p}" ${p === currentProject ? "selected" : ""}>${p}</option>`
    )
    .join("");

  container.innerHTML = `
    <select id="project-select">
      <option value="">전체 프로젝트</option>
      ${options}
    </select>
  `;

  document.getElementById("project-select")!.addEventListener("change", (e) => {
    currentProject = (e.target as HTMLSelectElement).value || null;
    loadBoard();
  });
}

function setupDragAndDrop() {
  const cards = document.querySelectorAll(".card");
  const columns = document.querySelectorAll(".column-body");

  cards.forEach((card) => {
    card.addEventListener("dragstart", (e) => {
      const ev = e as DragEvent;
      ev.dataTransfer!.setData("text/plain", (card as HTMLElement).dataset.id!);
      (card as HTMLElement).classList.add("dragging");
    });
    card.addEventListener("dragend", () => {
      (card as HTMLElement).classList.remove("dragging");
    });
  });

  columns.forEach((col) => {
    col.addEventListener("dragover", (e) => {
      e.preventDefault();
      (col as HTMLElement).classList.add("drag-over");
    });
    col.addEventListener("dragleave", () => {
      (col as HTMLElement).classList.remove("drag-over");
    });
    col.addEventListener("drop", (e) => {
      e.preventDefault();
      (col as HTMLElement).classList.remove("drag-over");
      const ev = e as DragEvent;
      const id = parseInt(ev.dataTransfer!.getData("text/plain"));
      const newStatus = (col as HTMLElement).dataset.column!;
      moveTask(id, newStatus);
    });
  });
}

// Init
loadBoard();

// Refresh button
document.getElementById("refresh-btn")!.addEventListener("click", loadBoard);

// Close modal
document.getElementById("modal-close")!.addEventListener("click", () => {
  document.getElementById("modal-overlay")!.classList.add("hidden");
});
document.getElementById("modal-overlay")!.addEventListener("click", (e) => {
  if (e.target === e.currentTarget) {
    document.getElementById("modal-overlay")!.classList.add("hidden");
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.getElementById("modal-overlay")!.classList.add("hidden");
  }
});
