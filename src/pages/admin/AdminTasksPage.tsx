import { useEffect, useId, useState, type DragEvent, type FormEvent, type KeyboardEvent } from "react";
import { Timestamp } from "firebase/firestore";
import {
  CalendarRange,
  Clock3,
  GripVertical,
  ListTodo,
  PencilLine,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import { Button, Input, Modal, Select, Textarea } from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";
import {
  createAdminTask,
  deleteAdminTask,
  persistAdminTaskBoardChanges,
  sortAdminTasks,
  subscribeAdminTasks,
  updateAdminTask,
  type AdminTaskBoardUpdate,
} from "../../services/adminTasks";
import type { TaskColumn, TaskPriority, TaskRecord } from "../../types/models";
import { getAuthPhotoURL } from "../../utils/authUserProfile";

type StatusTone = "success" | "error" | null;
type EditorMode = "create" | "edit";

interface TaskColumnDefinition {
  value: TaskColumn;
  label: string;
  description: string;
  toneClassName: string;
}

interface TaskFormState {
  title: string;
  description: string;
  column: TaskColumn;
  priority: TaskPriority;
  assignedTo: string;
  dueDate: string;
}

interface DropTarget {
  column: TaskColumn;
  index: number;
}

const TASK_COLUMNS: TaskColumnDefinition[] = [
  {
    value: "todo",
    label: "To do",
    description: "Tasks waiting to be pulled into motion.",
    toneClassName: "is-todo",
  },
  {
    value: "in_progress",
    label: "In progress",
    description: "Active work that is currently being pushed forward.",
    toneClassName: "is-progress",
  },
  {
    value: "completed",
    label: "Completed",
    description: "Closed work that is done and out of the queue.",
    toneClassName: "is-completed",
  },
];

const TASK_PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const TASK_COLUMN_OPTIONS = TASK_COLUMNS.map((column) => ({
  value: column.value,
  label: column.label,
}));

const EMPTY_TASK_FORM: TaskFormState = {
  title: "",
  description: "",
  column: "todo",
  priority: "medium",
  assignedTo: "",
  dueDate: "",
};

function formatTaskDate(value: TaskRecord["dueAt"] | TaskRecord["createdAt"] | TaskRecord["updatedAt"] | null) {
  if (!value) {
    return null;
  }

  try {
    return value.toDate().toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

function getColumnTasks(tasks: TaskRecord[], column: TaskColumn) {
  return tasks.filter((task) => task.column === column);
}

function getColumnDefinition(column: TaskColumn) {
  return TASK_COLUMNS.find((option) => option.value === column) ?? TASK_COLUMNS[0];
}

function toTaskFormState(task: TaskRecord): TaskFormState {
  return {
    title: task.title,
    description: task.description,
    column: task.column,
    priority: task.priority,
    assignedTo: task.assignedTo ?? "",
    dueDate: task.dueAt ? task.dueAt.toDate().toISOString().slice(0, 10) : "",
  };
}

function parseDueDate(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = new Date(`${value}T12:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return Timestamp.fromDate(parsed);
}

function normalizeTaskPositions(tasks: TaskRecord[]) {
  const normalized = TASK_COLUMNS.flatMap((column) =>
    getColumnTasks(tasks, column.value).map((task, index) => ({
      ...task,
      column: column.value,
      order: index,
    })),
  );

  return sortAdminTasks(normalized);
}

function moveTaskToPosition(
  tasks: TaskRecord[],
  taskId: string,
  targetColumn: TaskColumn,
  targetIndex: number,
) {
  const task = tasks.find((currentTask) => currentTask.id === taskId);

  if (!task) {
    return tasks;
  }

  const columns = {
    todo: getColumnTasks(tasks, "todo").filter((currentTask) => currentTask.id !== taskId),
    in_progress: getColumnTasks(tasks, "in_progress").filter((currentTask) => currentTask.id !== taskId),
    completed: getColumnTasks(tasks, "completed").filter((currentTask) => currentTask.id !== taskId),
  };

  const destination = columns[targetColumn];
  const insertionIndex = Math.max(0, Math.min(targetIndex, destination.length));

  destination.splice(insertionIndex, 0, {
    ...task,
    column: targetColumn,
  });

  return normalizeTaskPositions([
    ...columns.todo,
    ...columns.in_progress,
    ...columns.completed,
  ]);
}

function getBoardPositionChanges(previousTasks: TaskRecord[], nextTasks: TaskRecord[]) {
  const previousTasksById = new Map(
    previousTasks
      .filter((task): task is TaskRecord & { id: string } => Boolean(task.id))
      .map((task) => [task.id, task]),
  );

  return nextTasks.reduce<AdminTaskBoardUpdate[]>((changes, task) => {
    if (!task.id) {
      return changes;
    }

    const previousTask = previousTasksById.get(task.id);

    if (!previousTask) {
      return changes;
    }

    if (previousTask.column !== task.column || previousTask.order !== task.order) {
      changes.push({
        id: task.id,
        column: task.column,
        order: task.order,
      });
    }

    return changes;
  }, []);
}

function mergeBoardChange(
  updates: AdminTaskBoardUpdate[],
  taskId: string,
  patch: Omit<AdminTaskBoardUpdate, "id">,
) {
  const existingUpdate = updates.find((update) => update.id === taskId);

  if (existingUpdate) {
    Object.assign(existingUpdate, patch);
    return updates;
  }

  return [...updates, { id: taskId, ...patch }];
}

function previousTasksWithCurrentEditorValues(
  tasks: TaskRecord[],
  taskId: string,
  updates: {
    title: string;
    description: string;
    priority: TaskPriority;
    assignedTo: string | null;
    dueAt: TaskRecord["dueAt"];
  },
) {
  return sortAdminTasks(
    tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            title: updates.title,
            description: updates.description,
            priority: updates.priority,
            assignedTo: updates.assignedTo,
            dueAt: updates.dueAt,
          }
        : task,
    ),
  );
}

function getPriorityTone(priority: TaskPriority) {
  if (priority === "high") {
    return "is-high";
  }

  if (priority === "low") {
    return "is-low";
  }

  return "is-medium";
}

function getTaskShortId(task: TaskRecord) {
  if (task.id) {
    return task.id.slice(0, 6).toUpperCase();
  }

  return `CARD-${task.order + 1}`;
}

function getAssigneeInitials(value: string | null) {
  if (!value?.trim()) {
    return "NA";
  }

  const parts = value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return parts || "NA";
}

function isTaskOverdue(task: TaskRecord) {
  if (task.column === "completed" || !task.dueAt) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    return task.dueAt.toDate().getTime() < today.getTime();
  } catch {
    return false;
  }
}

export default function AdminTasksPage() {
  const { user, userProfile } = useAuth();
  const editorFormId = useId();
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>("create");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [formState, setFormState] = useState<TaskFormState>(EMPTY_TASK_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [quickAddColumn, setQuickAddColumn] = useState<TaskColumn | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [quickAddError, setQuickAddError] = useState<string | null>(null);
  const [quickAddSubmittingColumn, setQuickAddSubmittingColumn] = useState<TaskColumn | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<StatusTone>(null);

  const editingTask = tasks.find((task) => task.id === editingTaskId) ?? null;
  const currentUserAvatarSrc = userProfile?.photoURL || getAuthPhotoURL(user) || null;
  const currentUserCardLabel = userProfile?.username?.trim()
    ? `@${userProfile.username.trim()}`
    : userProfile?.displayName || user?.displayName || user?.email?.split("@")[0] || "You";
  const currentUserInitials = getAssigneeInitials(
    userProfile?.displayName || userProfile?.username || user?.displayName || user?.email || "Me",
  );
  const totalTasks = tasks.length;
  const inFlightTasks = tasks.filter((task) => task.column !== "completed").length;
  const completedTasks = tasks.filter((task) => task.column === "completed").length;

  useEffect(() => {
    const unsubscribe = subscribeAdminTasks(
      (records) => {
        setTasks(records);
        setLoading(false);
      },
      () => {
        setStatusMessage("Unable to load the admin task board right now.");
        setStatusTone("error");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (editorOpen && editorMode === "edit" && editingTaskId && !editingTask) {
      resetEditorState();
    }
  }, [editingTask, editingTaskId, editorMode, editorOpen]);

  const resetEditorState = () => {
    setEditorOpen(false);
    setEditorMode("create");
    setEditingTaskId(null);
    setFormState(EMPTY_TASK_FORM);
    setFormError(null);
  };

  const closeQuickAdd = () => {
    setQuickAddColumn(null);
    setQuickAddTitle("");
    setQuickAddError(null);
  };

  const openCreateTask = (column: TaskColumn = "todo", title = "") => {
    setStatusMessage(null);
    setStatusTone(null);
    setEditorMode("create");
    setEditingTaskId(null);
    setFormState({
      ...EMPTY_TASK_FORM,
      column,
      title,
    });
    setFormError(null);
    setEditorOpen(true);
  };

  const openEditTask = (task: TaskRecord) => {
    setStatusMessage(null);
    setStatusTone(null);
    setEditorMode("edit");
    setEditingTaskId(task.id ?? null);
    setFormState(toTaskFormState(task));
    setFormError(null);
    setEditorOpen(true);
  };

  const handleTaskDrop = async (targetColumn: TaskColumn, targetIndex: number) => {
    if (!draggingTaskId) {
      return;
    }

    const previousTasks = tasks;
    const nextTasks = moveTaskToPosition(previousTasks, draggingTaskId, targetColumn, targetIndex);
    const changes = getBoardPositionChanges(previousTasks, nextTasks);

    setDraggingTaskId(null);
    setDropTarget(null);

    if (!changes.length) {
      return;
    }

    setTasks(nextTasks);
    setMovingTaskId(draggingTaskId);
    setStatusMessage(null);
    setStatusTone(null);

    try {
      await persistAdminTaskBoardChanges(changes);
      setStatusMessage("Board order updated.");
      setStatusTone("success");
    } catch {
      setTasks(previousTasks);
      setStatusMessage("Unable to save that board move right now.");
      setStatusTone("error");
    } finally {
      setMovingTaskId(null);
    }
  };

  const handleColumnDragOver = (event: DragEvent<HTMLElement>, column: TaskColumn) => {
    if (!draggingTaskId) {
      return;
    }

    event.preventDefault();

    const columnTasks = getColumnTasks(tasks, column);
    const nextTarget = {
      column,
      index: columnTasks.length,
    };

    if (dropTarget?.column !== nextTarget.column || dropTarget.index !== nextTarget.index) {
      setDropTarget(nextTarget);
    }
  };

  const handleCardDragOver = (
    event: DragEvent<HTMLElement>,
    column: TaskColumn,
    index: number,
  ) => {
    if (!draggingTaskId) {
      return;
    }

    event.preventDefault();

    const bounds = event.currentTarget.getBoundingClientRect();
    const insertAfter = event.clientY > bounds.top + bounds.height / 2;
    const nextTarget = {
      column,
      index: insertAfter ? index + 1 : index,
    };

    if (dropTarget?.column !== nextTarget.column || dropTarget.index !== nextTarget.index) {
      setDropTarget(nextTarget);
    }
  };

  const handleQuickAddSubmit = async (event: FormEvent<HTMLFormElement>, column: TaskColumn) => {
    event.preventDefault();

    if (!user) {
      setStatusMessage("You need an active admin session before creating tasks.");
      setStatusTone("error");
      return;
    }

    const title = quickAddTitle.trim();

    if (!title) {
      setQuickAddError("Task title is required.");
      return;
    }

    setQuickAddSubmittingColumn(column);
    setQuickAddError(null);
    setStatusMessage(null);
    setStatusTone(null);

    try {
      await createAdminTask(
        {
          title,
          description: "",
          column,
          priority: "medium",
          assignedTo: null,
          dueAt: null,
        },
        user.uid,
        getColumnTasks(tasks, column).length,
      );
      closeQuickAdd();
      setStatusMessage("Card added to the board.");
      setStatusTone("success");
    } catch {
      setStatusMessage("Unable to create that task right now.");
      setStatusTone("error");
    } finally {
      setQuickAddSubmittingColumn(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      setStatusMessage("You need an active admin session before editing tasks.");
      setStatusTone("error");
      return;
    }

    const trimmedTitle = formState.title.trim();

    if (!trimmedTitle) {
      setFormError("Task title is required.");
      return;
    }

    setSaving(true);
    setFormError(null);
    setStatusMessage(null);
    setStatusTone(null);

    const sharedUpdates = {
      title: trimmedTitle,
      description: formState.description.trim(),
      column: formState.column,
      priority: formState.priority,
      assignedTo: formState.assignedTo.trim() || null,
      dueAt: parseDueDate(formState.dueDate),
    } as const;

    try {
      if (editorMode === "edit" && editingTask?.id) {
        if (editingTask.column !== formState.column) {
          const fieldUpdatedTasks = previousTasksWithCurrentEditorValues(tasks, editingTask.id, {
            title: sharedUpdates.title,
            description: sharedUpdates.description,
            priority: sharedUpdates.priority,
            assignedTo: sharedUpdates.assignedTo,
            dueAt: sharedUpdates.dueAt,
          });
          const appendedIndex = getColumnTasks(fieldUpdatedTasks, formState.column).length;
          const nextTasks = moveTaskToPosition(
            fieldUpdatedTasks,
            editingTask.id,
            formState.column,
            appendedIndex,
          );
          let changes = getBoardPositionChanges(tasks, nextTasks);

          changes = mergeBoardChange(changes, editingTask.id, {
            title: sharedUpdates.title,
            description: sharedUpdates.description,
            priority: sharedUpdates.priority,
            assignedTo: sharedUpdates.assignedTo,
            dueAt: sharedUpdates.dueAt,
          });

          await persistAdminTaskBoardChanges(changes);
        } else {
          await updateAdminTask(editingTask.id, sharedUpdates);
        }

        setStatusMessage("Task updated.");
        setStatusTone("success");
      } else {
        await createAdminTask(sharedUpdates, user.uid, getColumnTasks(tasks, formState.column).length);
        setStatusMessage("Task added to the board.");
        setStatusTone("success");
      }

      resetEditorState();
    } catch {
      setStatusMessage("Unable to save task changes right now.");
      setStatusTone("error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (task: TaskRecord) => {
    if (!task.id) {
      return;
    }

    const confirmed = window.confirm(`Delete "${task.title}" from the board?`);

    if (!confirmed) {
      return;
    }

    setDeletingTaskId(task.id);
    setStatusMessage(null);
    setStatusTone(null);

    try {
      await deleteAdminTask(task.id);
      resetEditorState();
      setStatusMessage("Task deleted.");
      setStatusTone("success");
    } catch {
      setStatusMessage("Unable to delete that task right now.");
      setStatusTone("error");
    } finally {
      setDeletingTaskId(null);
    }
  };

  return (
    <div className="admin-panel-stack">
      <section className="admin-panel admin-panel--hero">
        <div className="admin-panel__header">
          <p className="admin-panel__eyebrow">Operations</p>
          <div className="admin-panel__title-row">
            <ListTodo size={18} />
            <h2>Admin Kanban board</h2>
          </div>
          <p>
            The board now behaves like a Kanban surface first: cards live in their lanes, quick add starts
            inside the lane itself, and task details open in a focused editor instead of pushing the board
            down the page.
          </p>
        </div>

        <div className="admin-stat-grid">
          <div className="admin-stat-card">
            <span className="admin-stat-card__label">Total cards</span>
            <strong>{totalTasks}</strong>
            <span>Every admin task currently stored in Firestore</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-card__label">Active work</span>
            <strong>{inFlightTasks}</strong>
            <span>Cards still sitting in the working queue</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-card__label">Done</span>
            <strong>{completedTasks}</strong>
            <span>Completed cards already moved out of active flow</span>
          </div>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel__header">
          <div className="admin-panel__title-row">
            <Clock3 size={18} />
            <h2>Board</h2>
          </div>
          <p>
            Click a card to open details, drag cards to reorder them, and add new work directly from the
            lane where it belongs.
          </p>
        </div>

        <div className="admin-task-toolbar">
          <div className="admin-task-toolbar__info">
            <span className="admin-status-pill">Live Firestore board</span>
            <span className="admin-task-toolbar__hint">
              Another admin can change the board and this view will update in place.
            </span>
          </div>
          <div className="admin-task-toolbar__actions">
            <Button
              type="button"
              variant="secondary"
              icon={<Plus size={16} />}
              onClick={() => openCreateTask("todo")}
            >
              New task
            </Button>
          </div>
        </div>

        {statusMessage ? (
          <div className={`admin-inline-status ${statusTone ? `is-${statusTone}` : ""}`}>
            {statusMessage}
          </div>
        ) : null}

        {loading ? (
          <div className="admin-empty-state">Loading the Firestore task board...</div>
        ) : (
          <div className="admin-task-board-shell">
            <div className="admin-task-board">
              {TASK_COLUMNS.map((column) => {
                const columnTasks = getColumnTasks(tasks, column.value);
                const highPriorityCount = columnTasks.filter((task) => task.priority === "high").length;
                const laneFill = totalTasks
                  ? `${Math.max((columnTasks.length / totalTasks) * 100, columnTasks.length ? 14 : 0)}%`
                  : "0%";

                return (
                  <section
                    key={column.value}
                    className={`admin-task-column ${
                      dropTarget?.column === column.value ? "is-drop-active" : ""
                    }`}
                    onDragOver={(event) => handleColumnDragOver(event, column.value)}
                    onDrop={(event) => {
                      event.preventDefault();
                      void handleTaskDrop(
                        column.value,
                        dropTarget?.column === column.value ? dropTarget.index : columnTasks.length,
                      );
                    }}
                  >
                    <div className="admin-task-column__header">
                      <div className={`admin-task-column__eyebrow ${column.toneClassName}`}>
                        <span className="admin-task-column__dot" />
                        <strong>{column.label}</strong>
                        <span className="admin-task-column__count">{columnTasks.length}</span>
                      </div>
                      <button
                        type="button"
                        className="admin-task-column__add"
                        onClick={() => {
                          setQuickAddColumn((currentColumn) =>
                            currentColumn === column.value ? null : column.value,
                          );
                          setQuickAddTitle("");
                          setQuickAddError(null);
                        }}
                      >
                        <Plus size={14} />
                        Add card
                      </button>
                    </div>

                    <p className="admin-task-column__copy">{column.description}</p>

                    <div className="admin-task-column__meta">
                      <span>{columnTasks.length} cards</span>
                      {highPriorityCount > 0 && column.value !== "completed" ? (
                        <span>{highPriorityCount} high priority</span>
                      ) : null}
                    </div>

                    <div className="admin-task-column__meter" aria-hidden="true">
                      <span style={{ width: laneFill }} />
                    </div>

                    {quickAddColumn === column.value ? (
                      <form
                        className="admin-task-composer"
                        onSubmit={(event) => void handleQuickAddSubmit(event, column.value)}
                      >
                        <Input
                          value={quickAddTitle}
                          onChange={(event) => {
                            setQuickAddTitle(event.target.value);
                            if (quickAddError) {
                              setQuickAddError(null);
                            }
                          }}
                          placeholder={`Add a ${column.label.toLowerCase()} card`}
                          error={quickAddError ?? undefined}
                        />
                        <div className="admin-task-composer__actions">
                          <Button
                            type="submit"
                            size="sm"
                            loading={quickAddSubmittingColumn === column.value}
                          >
                            Add
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              openCreateTask(column.value, quickAddTitle.trim());
                              closeQuickAdd();
                            }}
                          >
                            More details
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={closeQuickAdd}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : null}

                    <div className="admin-task-column__body">
                      {columnTasks.length === 0 ? (
                        <div className="admin-empty-state admin-empty-state--compact">
                          Nothing here yet. Add a card or drop one into this lane.
                        </div>
                      ) : null}

                      {columnTasks.map((task, index) => {
                        const dueDate = formatTaskDate(task.dueAt);
                        const updatedDate = formatTaskDate(task.updatedAt);
                        const overdue = isTaskOverdue(task);
                        const toneClassName = getColumnDefinition(task.column).toneClassName;
                        const createdByCurrentUser = task.createdBy === user?.uid;
                        const assignedToCurrentUser = Boolean(
                          createdByCurrentUser &&
                          task.assignedTo?.trim() &&
                          [
                            userProfile?.displayName,
                            userProfile?.username,
                            userProfile?.username ? `@${userProfile.username}` : null,
                            user?.displayName,
                            user?.email,
                            user?.email?.split("@")[0],
                          ]
                            .filter((value): value is string => Boolean(value?.trim()))
                            .some(
                              (value) =>
                                value.trim().toLowerCase() === task.assignedTo?.trim().toLowerCase(),
                            ),
                        );

                        return (
                          <div key={task.id ?? `${task.column}-${task.order}-${task.title}`}>
                            {dropTarget?.column === column.value && dropTarget.index === index ? (
                              <div className="admin-task-drop-indicator" />
                            ) : null}

                            <article
                              className={`admin-task-card ${toneClassName} ${
                                editorOpen && editingTaskId === task.id ? "is-open" : ""
                              } ${draggingTaskId === task.id ? "is-dragging" : ""}`}
                              draggable={Boolean(task.id && !saving && !movingTaskId)}
                              role="button"
                              tabIndex={0}
                              aria-label={`Open task ${task.title}`}
                              onClick={() => openEditTask(task)}
                              onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  openEditTask(task);
                                }
                              }}
                              onDragStart={(event) => {
                                if (!task.id) {
                                  event.preventDefault();
                                  return;
                                }

                                event.dataTransfer.effectAllowed = "move";
                                event.dataTransfer.setData("text/plain", task.id);
                                setDraggingTaskId(task.id);
                                setDropTarget({
                                  column: task.column,
                                  index,
                                });
                              }}
                              onDragEnd={() => {
                                setDraggingTaskId(null);
                                setDropTarget(null);
                              }}
                              onDragOver={(event) => handleCardDragOver(event, column.value, index)}
                              onDrop={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                const nextIndex = dropTarget?.column === column.value ? dropTarget.index : index;
                                void handleTaskDrop(column.value, nextIndex);
                              }}
                            >
                              <div className="admin-task-card__top">
                                <div className="admin-task-card__eyebrow">
                                  <span className="admin-task-card__drag" aria-hidden="true">
                                    <GripVertical size={15} />
                                  </span>
                                  <span className="admin-task-card__id">#{getTaskShortId(task)}</span>
                                </div>
                                <span className={`admin-status-pill admin-task-priority ${getPriorityTone(task.priority)}`}>
                                  {task.priority}
                                </span>
                              </div>

                              <div className="admin-task-card__copy">
                                <h3>{task.title}</h3>
                                <p className={task.description ? undefined : "is-empty"}>
                                  {task.description || "No details yet. Open the card to add scope, links, or notes."}
                                </p>
                              </div>

                              <div className="admin-task-card__meta">
                                {createdByCurrentUser ? (
                                  <span className="admin-task-chip admin-task-chip--avatar">
                                    {currentUserAvatarSrc ? (
                                      <img
                                        src={currentUserAvatarSrc}
                                        alt=""
                                        className="admin-task-chip__avatar-image"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <span className="admin-task-chip__avatar">{currentUserInitials}</span>
                                    )}
                                    <span>{currentUserCardLabel}</span>
                                  </span>
                                ) : null}
                                {!assignedToCurrentUser ? (
                                  <span className="admin-task-chip admin-task-chip--avatar">
                                    <span className="admin-task-chip__avatar">{getAssigneeInitials(task.assignedTo)}</span>
                                    <span>
                                      <UserRound size={13} />
                                      {task.assignedTo || "Unassigned"}
                                    </span>
                                  </span>
                                ) : null}
                                {dueDate ? (
                                  <span className={`admin-task-chip ${overdue ? "is-overdue" : ""}`}>
                                    <CalendarRange size={13} />
                                    {overdue ? "Overdue" : "Due"} {dueDate}
                                  </span>
                                ) : null}
                              </div>

                              <div className="admin-task-card__footer">
                                <span>{updatedDate ? `Updated ${updatedDate}` : "Task details"}</span>
                                <span>Open details</span>
                              </div>
                            </article>
                          </div>
                        );
                      })}

                      {dropTarget?.column === column.value && dropTarget.index === columnTasks.length ? (
                        <div className="admin-task-drop-indicator" />
                      ) : null}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <Modal
        open={editorOpen}
        onClose={() => {
          if (!saving && deletingTaskId !== editingTask?.id) {
            resetEditorState();
          }
        }}
        title={editorMode === "edit" ? "Task details" : "Create task"}
        size="lg"
        footer={(
          <>
            {editorMode === "edit" && editingTask ? (
              <Button
                type="button"
                variant="danger"
                loading={deletingTaskId === editingTask.id}
                icon={<Trash2 size={16} />}
                onClick={() => {
                  void handleDeleteTask(editingTask);
                }}
              >
                Delete
              </Button>
            ) : null}
            <Button type="button" variant="secondary" onClick={resetEditorState}>
              Cancel
            </Button>
            <Button
              type="submit"
              form={editorFormId}
              loading={saving}
              icon={editorMode === "edit" ? <PencilLine size={16} /> : <Plus size={16} />}
            >
              {editorMode === "edit" ? "Save changes" : "Create task"}
            </Button>
          </>
        )}
      >
        <form id={editorFormId} className="admin-content-form admin-task-editor" onSubmit={handleSubmit}>
          <div className="admin-task-editor__intro">
            <p>
              {editorMode === "edit" && editingTask
                ? "Update the card details here. You can still drag the card on the board when you close this modal."
                : "Create a full card with description, priority, assignee, and due date."}
            </p>
          </div>

          {statusTone === "error" && statusMessage ? (
            <div className="admin-inline-status is-error admin-task-modal-status">{statusMessage}</div>
          ) : null}

          <div className="admin-content-form-grid">
            <Input
              label="Task title"
              value={formState.title}
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  title: event.target.value,
                }))
              }
              placeholder="Ship profile editor polish"
              error={formError ?? undefined}
            />
            <Select
              label="Column"
              value={formState.column}
              options={TASK_COLUMN_OPTIONS}
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  column: event.target.value as TaskColumn,
                }))
              }
            />
          </div>

          <Textarea
            label="Details"
            value={formState.description}
            onChange={(event) =>
              setFormState((currentState) => ({
                ...currentState,
                description: event.target.value,
              }))
            }
            rows={6}
            hint="Document enough context that another admin can pick the card up quickly."
            placeholder="Scope, acceptance criteria, links, or implementation notes."
          />

          <div className="admin-content-form-grid admin-content-form-grid--three">
            <Select
              label="Priority"
              value={formState.priority}
              options={TASK_PRIORITY_OPTIONS}
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  priority: event.target.value as TaskPriority,
                }))
              }
            />
            <Input
              label="Assigned to"
              value={formState.assignedTo}
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  assignedTo: event.target.value,
                }))
              }
              placeholder="Laureesh"
            />
            <Input
              label="Due date"
              type="date"
              value={formState.dueDate}
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  dueDate: event.target.value,
                }))
              }
            />
          </div>

          {editingTask ? (
            <div className="admin-task-editor__details">
              <div className="admin-task-editor__detail">
                <span>Created</span>
                <strong>{formatTaskDate(editingTask.createdAt) ?? "Unavailable"}</strong>
              </div>
              <div className="admin-task-editor__detail">
                <span>Updated</span>
                <strong>{formatTaskDate(editingTask.updatedAt) ?? "Unavailable"}</strong>
              </div>
              <div className="admin-task-editor__detail">
                <span>Created by</span>
                <strong>{editingTask.createdBy}</strong>
              </div>
            </div>
          ) : null}
        </form>
      </Modal>
    </div>
  );
}
