export const MATTER_DETAIL_TASKS_UPDATE_EVENT = "matter-detail-tasks-updated";

const STORAGE_KEY = "counselflow-matter-detail-tasks-v1";

export type MatterDetailTask = {
  id: string;
  matterId: string;
  title: string;
  description?: string;
  assignedTo: string;
  percentComplete: number;
  dueDate?: string;
};

export const MATTER_TASK_ASSIGNEES = [
  "Morgan Counsel",
  "Avery Counsel",
  "Parker Legal",
  "Bailey Ledger",
  "Jordan Admin",
] as const;

function readAll(): MatterDetailTask[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MatterDetailTask[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(tasks: MatterDetailTask[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  window.dispatchEvent(new Event(MATTER_DETAIL_TASKS_UPDATE_EVENT));
}

function defaultTasksForMatter(
  matterId: string,
  attorneyName: string | null,
): MatterDetailTask[] {
  const lead = attorneyName ?? "Avery Counsel";
  return [
    {
      id: `mdt-${matterId}-1`,
      matterId,
      title: "Finalize engagement letter",
      description: "Confirm scope, fee terms, and signature blocks.",
      assignedTo: lead,
      percentComplete: 100,
      dueDate: "2026-08-01",
    },
    {
      id: `mdt-${matterId}-2`,
      matterId,
      title: "Collect diligence materials",
      description: "Request corporate records, contracts, and financials.",
      assignedTo: "Parker Legal",
      percentComplete: 60,
      dueDate: "2026-08-10",
    },
    {
      id: `mdt-${matterId}-3`,
      matterId,
      title: "Draft case strategy memo",
      description: "Outline legal theories, risks, and next milestones.",
      assignedTo: lead,
      percentComplete: 20,
      dueDate: "2026-08-14",
    },
  ];
}

export function ensureMatterDetailTasks(
  matterId: string,
  attorneyName: string | null,
): MatterDetailTask[] {
  const all = readAll();
  const existing = all.filter((task) => task.matterId === matterId);
  if (existing.length > 0) return existing;

  const seeded = defaultTasksForMatter(matterId, attorneyName);
  writeAll([...all, ...seeded]);
  return seeded;
}

export function getMatterDetailTasks(matterId: string): MatterDetailTask[] {
  return readAll().filter((task) => task.matterId === matterId);
}

export function createMatterDetailTask(
  input: Omit<MatterDetailTask, "id">,
): MatterDetailTask {
  const task: MatterDetailTask = {
    ...input,
    id: `mdt-${input.matterId}-${Date.now()}`,
    percentComplete: Math.min(100, Math.max(0, input.percentComplete)),
  };
  writeAll([task, ...readAll()]);
  return task;
}

export function updateMatterDetailTask(
  taskId: string,
  patch: Partial<
    Pick<
      MatterDetailTask,
      "title" | "description" | "assignedTo" | "percentComplete" | "dueDate"
    >
  >,
): MatterDetailTask | null {
  let updated: MatterDetailTask | null = null;
  const next = readAll().map((task) => {
    if (task.id !== taskId) return task;
    updated = {
      ...task,
      ...patch,
      percentComplete:
        patch.percentComplete == null
          ? task.percentComplete
          : Math.min(100, Math.max(0, patch.percentComplete)),
    };
    return updated;
  });
  if (!updated) return null;
  writeAll(next);
  return updated;
}

export function reassignMatterDetailTask(
  taskId: string,
  assignedTo: string,
): MatterDetailTask | null {
  return updateMatterDetailTask(taskId, { assignedTo });
}
