import { onSnapshot, writeBatch, type Unsubscribe } from "firebase/firestore";
import { db } from "../firebase/app";
import { timestampNow } from "../firebase/firestore";
import type { TaskColumn, TaskPriority, TaskRecord } from "../types/models";
import { logAdminActivity } from "./adminActivity";
import { taskDocument, tasksCollection } from "./collections";
import { assertCurrentUserCanAccessAdmin } from "./adminSecurity";
import { createRecord, deleteRecord, updateRecord } from "./repository";

export interface AdminTaskDraft {
  title: string;
  description: string;
  column: TaskColumn;
  priority: TaskPriority;
  assignedTo: string | null;
  dueAt: TaskRecord["dueAt"];
}

export interface AdminTaskUpdate extends Partial<AdminTaskDraft> {
  order?: number;
}

export interface AdminTaskBoardUpdate extends AdminTaskUpdate {
  id: string;
}

const TASK_COLUMN_ORDER: Record<TaskColumn, number> = {
  todo: 0,
  in_progress: 1,
  completed: 2,
};

function normalizeTaskDraft(input: AdminTaskDraft) {
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    column: input.column,
    priority: input.priority,
    assignedTo: input.assignedTo?.trim() || null,
    dueAt: input.dueAt ?? null,
  };
}

function getTimestampValue(value: TaskRecord["createdAt"] | TaskRecord["updatedAt"] | null | undefined) {
  try {
    return value?.toMillis() ?? 0;
  } catch {
    return 0;
  }
}

export function sortAdminTasks(tasks: TaskRecord[]) {
  return [...tasks].sort((left, right) => {
    const columnDifference = TASK_COLUMN_ORDER[left.column] - TASK_COLUMN_ORDER[right.column];

    if (columnDifference !== 0) {
      return columnDifference;
    }

    if (left.order !== right.order) {
      return left.order - right.order;
    }

    const createdDifference = getTimestampValue(left.createdAt) - getTimestampValue(right.createdAt);

    if (createdDifference !== 0) {
      return createdDifference;
    }

    return left.title.localeCompare(right.title);
  });
}

export function subscribeAdminTasks(
  onTasks: (tasks: TaskRecord[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    tasksCollection(),
    (snapshot) => {
      const tasks = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      }));

      onTasks(sortAdminTasks(tasks));
    },
    (error) => {
      onError?.(error);
    },
  );
}

export async function createAdminTask(input: AdminTaskDraft, createdBy: string, order: number) {
  await assertCurrentUserCanAccessAdmin();
  const normalized = normalizeTaskDraft(input);
  const now = timestampNow();

  const documentReference = await createRecord(tasksCollection(), {
    ...normalized,
    order,
    createdBy,
    createdAt: now,
    updatedAt: now,
  });

  await logAdminActivity({
    actorId: createdBy,
    action: "create",
    entityType: "task",
    entityId: documentReference.id,
    entityLabel: normalized.title,
    summary: `Created task "${normalized.title}" in ${normalized.column.replace("_", " ")}.`,
  });
}

export async function updateAdminTask(taskId: string, updates: AdminTaskUpdate) {
  const { currentUser } = await assertCurrentUserCanAccessAdmin();
  const nextUpdates: AdminTaskUpdate = {
    ...updates,
  };

  if (typeof nextUpdates.title === "string") {
    nextUpdates.title = nextUpdates.title.trim();
  }

  if (typeof nextUpdates.description === "string") {
    nextUpdates.description = nextUpdates.description.trim();
  }

  if (typeof nextUpdates.assignedTo === "string") {
    nextUpdates.assignedTo = nextUpdates.assignedTo.trim() || null;
  }

  await updateRecord(taskDocument(taskId), {
    ...nextUpdates,
    updatedAt: timestampNow(),
  });

  await logAdminActivity({
    actorId: currentUser.uid,
    action: "update",
    entityType: "task",
    entityId: taskId,
    entityLabel: typeof nextUpdates.title === "string" ? nextUpdates.title : taskId,
    summary: `Updated task "${typeof nextUpdates.title === "string" ? nextUpdates.title : taskId}".`,
  });
}

export async function persistAdminTaskBoardChanges(updates: AdminTaskBoardUpdate[]) {
  if (!updates.length) {
    return;
  }

  const { currentUser } = await assertCurrentUserCanAccessAdmin();
  const batch = writeBatch(db);
  const updatedAt = timestampNow();

  updates.forEach((update) => {
    const { id, ...changes } = update;

    batch.update(taskDocument(id), {
      ...changes,
      updatedAt,
    });
  });

  await batch.commit();
  await logAdminActivity({
    actorId: currentUser.uid,
    action: "reorder",
    entityType: "task",
    entityId: null,
    entityLabel: null,
    summary: `Reordered ${updates.length} task card${updates.length === 1 ? "" : "s"} on the board.`,
  });
}

export async function deleteAdminTask(taskId: string) {
  const { currentUser } = await assertCurrentUserCanAccessAdmin();
  await deleteRecord(taskDocument(taskId));
  await logAdminActivity({
    actorId: currentUser.uid,
    action: "delete",
    entityType: "task",
    entityId: taskId,
    entityLabel: taskId,
    summary: `Deleted task ${taskId}.`,
  });
}
