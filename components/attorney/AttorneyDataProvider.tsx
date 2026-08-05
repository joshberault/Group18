"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEMO_ATTORNEYS,
  DEMO_PROFILE,
  INITIAL_ATTORNEY_DATA,
} from "@/lib/attorney/demo-data";
import { todayIsoDate } from "@/lib/attorney/dates";
import type {
  AttorneyNote,
  Deadline,
  DocumentChecklistItem,
  Matter,
  Task,
  TaskStatus,
  TimeEntry,
} from "@/types/database";

const STORAGE_KEY = "counselflow-attorney-data";

export type AttorneyDataState = {
  timeEntries: TimeEntry[];
  tasks: Task[];
  deadlines: Deadline[];
  notes: AttorneyNote[];
  checklistItems: DocumentChecklistItem[];
  matters: Matter[];
};

type AttorneyDataContextValue = AttorneyDataState & {
  profileId: string;
  attorneys: typeof DEMO_ATTORNEYS;
  addTimeEntry: (entry: Omit<TimeEntry, "id" | "status"> & { status?: TimeEntry["status"] }) => void;
  updateTimeEntry: (id: string, updates: Partial<TimeEntry>) => void;
  deleteTimeEntry: (id: string) => void;
  addTask: (task: Omit<Task, "id">) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  completeTask: (id: string) => void;
  deleteTask: (id: string) => void;
  addDeadline: (deadline: Omit<Deadline, "id">) => void;
  updateDeadline: (id: string, updates: Partial<Deadline>) => void;
  deleteDeadline: (id: string) => void;
  addNote: (note: Omit<AttorneyNote, "id" | "created_at">) => void;
  updateNote: (id: string, noteText: string) => void;
  deleteNote: (id: string) => void;
  toggleChecklistItem: (id: string) => void;
  addChecklistItem: (item: Omit<DocumentChecklistItem, "id">) => void;
  deleteChecklistItem: (id: string) => void;
  getMatterById: (id: string) => Matter | undefined;
  getTaskById: (id: string) => Task | undefined;
  getDeadlineById: (id: string) => Deadline | undefined;
  resetDemoData: () => void;
};

const AttorneyDataContext = createContext<AttorneyDataContextValue | null>(null);

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function matterTitle(matters: Matter[], matterId: string) {
  return matters.find((m) => m.id === matterId)?.title ?? "Unknown matter";
}

function loadState(): AttorneyDataState {
  if (typeof window === "undefined") return INITIAL_ATTORNEY_DATA;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_ATTORNEY_DATA;
    return { ...INITIAL_ATTORNEY_DATA, ...JSON.parse(raw) };
  } catch {
    return INITIAL_ATTORNEY_DATA;
  }
}

export function AttorneyDataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AttorneyDataState>(INITIAL_ATTORNEY_DATA);

  useEffect(() => {
    setState(loadState());
  }, []);

  const persist = useCallback((next: AttorneyDataState) => {
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const resetDemoData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(INITIAL_ATTORNEY_DATA);
  }, []);

  const addTimeEntry = useCallback(
    (entry: Omit<TimeEntry, "id" | "status"> & { status?: TimeEntry["status"] }) => {
      const newEntry: TimeEntry = {
        ...entry,
        id: createId("time"),
        status: entry.status ?? "pending",
        matter: { title: matterTitle(state.matters, entry.matter_id) },
      };
      persist({ ...state, timeEntries: [newEntry, ...state.timeEntries] });
    },
    [persist, state],
  );

  const updateTimeEntry = useCallback(
    (id: string, updates: Partial<TimeEntry>) => {
      persist({
        ...state,
        timeEntries: state.timeEntries.map((entry) =>
          entry.id === id
            ? {
                ...entry,
                ...updates,
                matter: updates.matter_id
                  ? { title: matterTitle(state.matters, updates.matter_id) }
                  : entry.matter,
              }
            : entry,
        ),
      });
    },
    [persist, state],
  );

  const deleteTimeEntry = useCallback(
    (id: string) => {
      persist({
        ...state,
        timeEntries: state.timeEntries.filter((entry) => entry.id !== id),
      });
    },
    [persist, state],
  );

  const addTask = useCallback(
    (task: Omit<Task, "id">) => {
      const newTask: Task = {
        ...task,
        id: createId("task"),
        matter: { title: matterTitle(state.matters, task.matter_id) },
      };
      persist({ ...state, tasks: [newTask, ...state.tasks] });
    },
    [persist, state],
  );

  const updateTask = useCallback(
    (id: string, updates: Partial<Task>) => {
      persist({
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === id
            ? {
                ...task,
                ...updates,
                matter: updates.matter_id
                  ? { title: matterTitle(state.matters, updates.matter_id) }
                  : task.matter,
              }
            : task,
        ),
      });
    },
    [persist, state],
  );

  const completeTask = useCallback(
    (id: string) => {
      updateTask(id, { status: "completed" as TaskStatus });
    },
    [updateTask],
  );

  const deleteTask = useCallback(
    (id: string) => {
      persist({ ...state, tasks: state.tasks.filter((task) => task.id !== id) });
    },
    [persist, state],
  );

  const addDeadline = useCallback(
    (deadline: Omit<Deadline, "id">) => {
      const newDeadline: Deadline = {
        ...deadline,
        id: createId("deadline"),
        matter: { title: matterTitle(state.matters, deadline.matter_id) },
      };
      persist({ ...state, deadlines: [newDeadline, ...state.deadlines] });
    },
    [persist, state],
  );

  const updateDeadline = useCallback(
    (id: string, updates: Partial<Deadline>) => {
      persist({
        ...state,
        deadlines: state.deadlines.map((deadline) =>
          deadline.id === id
            ? {
                ...deadline,
                ...updates,
                matter: updates.matter_id
                  ? { title: matterTitle(state.matters, updates.matter_id) }
                  : deadline.matter,
              }
            : deadline,
        ),
      });
    },
    [persist, state],
  );

  const deleteDeadline = useCallback(
    (id: string) => {
      persist({
        ...state,
        deadlines: state.deadlines.filter((deadline) => deadline.id !== id),
      });
    },
    [persist, state],
  );

  const addNote = useCallback(
    (note: Omit<AttorneyNote, "id" | "created_at">) => {
      const newNote: AttorneyNote = {
        ...note,
        id: createId("note"),
        created_at: new Date().toISOString(),
        matter: { title: matterTitle(state.matters, note.matter_id) },
        author: { full_name: DEMO_PROFILE.full_name },
      };
      persist({ ...state, notes: [newNote, ...state.notes] });
    },
    [persist, state],
  );

  const updateNote = useCallback(
    (id: string, noteText: string) => {
      persist({
        ...state,
        notes: state.notes.map((note) =>
          note.id === id ? { ...note, note_text: noteText } : note,
        ),
      });
    },
    [persist, state],
  );

  const deleteNote = useCallback(
    (id: string) => {
      persist({ ...state, notes: state.notes.filter((note) => note.id !== id) });
    },
    [persist, state],
  );

  const toggleChecklistItem = useCallback(
    (id: string) => {
      persist({
        ...state,
        checklistItems: state.checklistItems.map((item) =>
          item.id === id ? { ...item, completed: !item.completed } : item,
        ),
      });
    },
    [persist, state],
  );

  const addChecklistItem = useCallback(
    (item: Omit<DocumentChecklistItem, "id">) => {
      const newItem: DocumentChecklistItem = { ...item, id: createId("check") };
      persist({ ...state, checklistItems: [...state.checklistItems, newItem] });
    },
    [persist, state],
  );

  const deleteChecklistItem = useCallback(
    (id: string) => {
      persist({
        ...state,
        checklistItems: state.checklistItems.filter((item) => item.id !== id),
      });
    },
    [persist, state],
  );

  const getMatterById = useCallback(
    (id: string) => state.matters.find((matter) => matter.id === id),
    [state.matters],
  );

  const getTaskById = useCallback(
    (id: string) => state.tasks.find((task) => task.id === id),
    [state.tasks],
  );

  const getDeadlineById = useCallback(
    (id: string) => state.deadlines.find((deadline) => deadline.id === id),
    [state.deadlines],
  );

  const value = useMemo<AttorneyDataContextValue>(
    () => ({
      ...state,
      profileId: DEMO_PROFILE.id,
      attorneys: DEMO_ATTORNEYS,
      addTimeEntry,
      updateTimeEntry,
      deleteTimeEntry,
      addTask,
      updateTask,
      completeTask,
      deleteTask,
      addDeadline,
      updateDeadline,
      deleteDeadline,
      addNote,
      updateNote,
      deleteNote,
      toggleChecklistItem,
      addChecklistItem,
      deleteChecklistItem,
      getMatterById,
      getTaskById,
      getDeadlineById,
      resetDemoData,
    }),
    [
      state,
      addTimeEntry,
      updateTimeEntry,
      deleteTimeEntry,
      addTask,
      updateTask,
      completeTask,
      deleteTask,
      addDeadline,
      updateDeadline,
      deleteDeadline,
      addNote,
      updateNote,
      deleteNote,
      toggleChecklistItem,
      addChecklistItem,
      deleteChecklistItem,
      getMatterById,
      getTaskById,
      getDeadlineById,
      resetDemoData,
    ],
  );

  return (
    <AttorneyDataContext.Provider value={value}>{children}</AttorneyDataContext.Provider>
  );
}

export function useAttorneyData() {
  const context = useContext(AttorneyDataContext);
  if (!context) {
    throw new Error("useAttorneyData must be used within AttorneyDataProvider");
  }
  return context;
}

export function useTodaysTasks() {
  const { tasks } = useAttorneyData();
  const today = todayIsoDate();
  return tasks.filter(
    (task) => task.status !== "completed" && task.due_date && task.due_date <= today,
  );
}
