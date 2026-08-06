import {
  PARALEGAL_EXPENSES,
  PARALEGAL_REVIEW_QUEUE,
  PARALEGAL_TASKS,
  PARALEGAL_TIME_ENTRIES,
  type ParalegalExpense,
  type ParalegalReviewItem,
  type ParalegalTask,
  type ParalegalTaskStatus,
  type ParalegalTimeEntry,
  type ReviewItemType,
  type ReviewStatus,
} from "@/lib/paralegal/demo-data";

export const PARALEGAL_WORKFLOW_STORAGE_KEY =
  "counselflow-paralegal-workflow-v1";
export const PARALEGAL_WORKFLOW_UPDATE_EVENT =
  "paralegal-workflow-updated";

export type ParalegalWorkflowState = {
  tasks: ParalegalTask[];
  reviews: ParalegalReviewItem[];
  timeEntries: ParalegalTimeEntry[];
  expenses: ParalegalExpense[];
};

function seedState(): ParalegalWorkflowState {
  return {
    tasks: structuredClone(PARALEGAL_TASKS),
    reviews: structuredClone(PARALEGAL_REVIEW_QUEUE),
    timeEntries: structuredClone(PARALEGAL_TIME_ENTRIES),
    expenses: structuredClone(PARALEGAL_EXPENSES),
  };
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PARALEGAL_WORKFLOW_UPDATE_EVENT));
}

function readState(): ParalegalWorkflowState {
  if (!canUseStorage()) return seedState();
  try {
    const raw = localStorage.getItem(PARALEGAL_WORKFLOW_STORAGE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw) as Partial<ParalegalWorkflowState>;
    const seed = seedState();
    return {
      tasks: parsed.tasks?.length ? parsed.tasks : seed.tasks,
      reviews: parsed.reviews?.length ? parsed.reviews : seed.reviews,
      timeEntries: parsed.timeEntries?.length
        ? parsed.timeEntries
        : seed.timeEntries,
      expenses: parsed.expenses?.length ? parsed.expenses : seed.expenses,
    };
  } catch {
    return seedState();
  }
}

function writeState(state: ParalegalWorkflowState) {
  if (!canUseStorage()) return;
  localStorage.setItem(PARALEGAL_WORKFLOW_STORAGE_KEY, JSON.stringify(state));
  notify();
}

export function getParalegalWorkflow(): ParalegalWorkflowState {
  return readState();
}

export function resetParalegalWorkflow(): ParalegalWorkflowState {
  const next = seedState();
  if (canUseStorage()) {
    localStorage.removeItem(PARALEGAL_WORKFLOW_STORAGE_KEY);
    notify();
  }
  return next;
}

export function updateParalegalTask(
  id: string,
  patch: Partial<Pick<ParalegalTask, "status" | "notes" | "priority">>,
): ParalegalWorkflowState {
  const state = readState();
  state.tasks = state.tasks.map((task) => {
    if (task.id !== id) return task;
    const next = { ...task, ...patch };
    if (
      patch.status &&
      patch.status !== "completed" &&
      task.status === "overdue"
    ) {
      // keep overdue unless explicitly completed/cleared
    }
    const today = new Date().toISOString().slice(0, 10);
    if (
      next.status !== "completed" &&
      next.dueDate < today &&
      next.status !== "blocked" &&
      next.status !== "waiting_on_attorney" &&
      next.status !== "waiting_on_client" &&
      next.status !== "submitted_for_review"
    ) {
      next.status = "overdue";
    }
    return next;
  });
  writeState(state);
  return state;
}

export function submitTaskForReview(
  taskId: string,
  options?: { title?: string; itemType?: ReviewItemType },
): ParalegalWorkflowState {
  const state = readState();
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return state;

  state.tasks = state.tasks.map((t) =>
    t.id === taskId
      ? {
          ...t,
          status: "submitted_for_review" as ParalegalTaskStatus,
          notes: t.notes
            ? `${t.notes} · Submitted for attorney review`
            : "Submitted for attorney review",
        }
      : t,
  );

  const existing = state.reviews.find((r) => r.relatedTaskId === taskId);
  if (existing) {
    state.reviews = state.reviews.map((r) =>
      r.relatedTaskId === taskId
        ? {
            ...r,
            status: "submitted" as ReviewStatus,
            submittedAt: new Date().toISOString().slice(0, 10),
            urgent: task.priority === "critical" || task.priority === "high",
          }
        : r,
    );
  } else {
    state.reviews = [
      {
        id: `prev-${crypto.randomUUID()}`,
        title: options?.title ?? task.title,
        itemType: options?.itemType ?? "task",
        clientName: task.clientName,
        matterTitle: task.matterTitle,
        attorneyName: task.attorneyName,
        submittedAt: new Date().toISOString().slice(0, 10),
        status: "submitted",
        relatedTaskId: taskId,
        urgent: task.priority === "critical" || task.priority === "high",
      },
      ...state.reviews,
    ];
  }

  writeState(state);
  return state;
}

export function createReviewRequest(input: {
  title: string;
  itemType: ReviewItemType;
  clientName: string;
  matterTitle: string;
  attorneyName: string;
  relatedTaskId?: string;
  urgent?: boolean;
  status?: ReviewStatus;
}): ParalegalWorkflowState {
  const state = readState();
  state.reviews = [
    {
      id: `prev-${crypto.randomUUID()}`,
      title: input.title,
      itemType: input.itemType,
      clientName: input.clientName,
      matterTitle: input.matterTitle,
      attorneyName: input.attorneyName,
      submittedAt: new Date().toISOString().slice(0, 10),
      status: input.status ?? "submitted",
      relatedTaskId: input.relatedTaskId,
      urgent: input.urgent,
    },
    ...state.reviews,
  ];
  writeState(state);
  return state;
}

export function resubmitReview(reviewId: string): ParalegalWorkflowState {
  const state = readState();
  state.reviews = state.reviews.map((r) =>
    r.id === reviewId
      ? {
          ...r,
          status: "submitted" as ReviewStatus,
          submittedAt: new Date().toISOString().slice(0, 10),
        }
      : r,
  );
  const review = state.reviews.find((r) => r.id === reviewId);
  if (review?.relatedTaskId) {
    state.tasks = state.tasks.map((t) =>
      t.id === review.relatedTaskId
        ? { ...t, status: "submitted_for_review" as ParalegalTaskStatus }
        : t,
    );
  }
  writeState(state);
  return state;
}

export function addParalegalTimeEntry(
  entry: Omit<ParalegalTimeEntry, "id">,
): ParalegalWorkflowState {
  const state = readState();
  state.timeEntries = [
    { ...entry, id: `ptime-${crypto.randomUUID()}` },
    ...state.timeEntries,
  ];
  writeState(state);
  return state;
}

export function updateParalegalTimeEntry(
  id: string,
  patch: Partial<ParalegalTimeEntry>,
): ParalegalWorkflowState {
  const state = readState();
  const current = state.timeEntries.find((e) => e.id === id);
  if (current?.status === "invoiced") return state;
  state.timeEntries = state.timeEntries.map((e) =>
    e.id === id ? { ...e, ...patch } : e,
  );
  writeState(state);
  return state;
}

export function addParalegalExpense(
  expense: Omit<ParalegalExpense, "id">,
): ParalegalWorkflowState {
  const state = readState();
  state.expenses = [
    { ...expense, id: `pexp-${crypto.randomUUID()}` },
    ...state.expenses,
  ];
  writeState(state);
  return state;
}

export function updateParalegalExpense(
  id: string,
  patch: Partial<ParalegalExpense>,
): ParalegalWorkflowState {
  const state = readState();
  state.expenses = state.expenses.map((e) =>
    e.id === id ? { ...e, ...patch } : e,
  );
  writeState(state);
  return state;
}
