import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Pencil,
  Save,
  MessageSquareText,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { Button, Input, Select, Checkbox, Textarea } from "../../components/ui";
import "./AdminJobsPage.css";

type JobEntry = {
  id: number;
  company: string;
  title: string;
  link: string;
  applied: boolean;
  recruiterName: string;
  recruiterLinkedIn: string;
  contacted: boolean;
  followUpDate: string;
  response: string;
  notes: string;
};

const STORAGE_KEY = "admin-jobs";

const DEFAULT_RESPONSE_OPTIONS = ["No response", "Interview", "Rejected"];
const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getCalendarDays(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function formatMonthTitle(date: Date) {
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(date);
}

function formatShortDate(value: string) {
  const date = parseDateKey(value);

  if (!date) {
    return "No date";
  }

  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

export default function AdminJobsPage() {
  const getDefaultFollowUp = (days = 6) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  const defaultFollowUp = getDefaultFollowUp(6);

  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const [draft, setDraft] = useState<Partial<JobEntry>>({ applied: false, contacted: false, response: "No response", followUpDate: defaultFollowUp });
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<JobEntry | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setJobs(JSON.parse(raw));
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
    } catch (e) {
      // ignore
    }
  }, [jobs]);

  const handleAdd = () => {
    const entry: JobEntry = {
      id: Date.now(),
      company: draft.company ?? "",
      title: draft.title ?? "",
      link: draft.link ?? "",
      applied: !!draft.applied,
      recruiterName: draft.recruiterName ?? "",
      recruiterLinkedIn: draft.recruiterLinkedIn ?? "",
      contacted: !!draft.contacted,
      followUpDate: draft.followUpDate ?? defaultFollowUp,
      response: draft.response ?? "No response",
      notes: draft.notes ?? "",
    };

    setJobs((cur) => [entry, ...cur]);
    setDraft({ applied: false, contacted: false, response: "No response", followUpDate: defaultFollowUp });
  };

  const handleDelete = (id: number) => setJobs((cur) => cur.filter((j) => j.id !== id));

  const handleStartEdit = (job: JobEntry) => {
    setEditingJobId(job.id);
    setEditDraft({ ...job });
  };

  const handleCancelEdit = () => {
    setEditingJobId(null);
    setEditDraft(null);
  };

  const handleSaveEdit = () => {
    if (!editDraft) {
      return;
    }

    setJobs((cur) => cur.map((job) => (job.id === editDraft.id ? editDraft : job)));
    handleCancelEdit();
  };

  const toggleNotes = (id: number) => {
    setExpandedNotes((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const todayKey = toDateKey(new Date());

  const jobsByFollowUpDate = useMemo(() => {
    return jobs.reduce<Record<string, JobEntry[]>>((groups, job) => {
      if (!job.followUpDate) {
        return groups;
      }

      groups[job.followUpDate] = [...(groups[job.followUpDate] ?? []), job];
      return groups;
    }, {});
  }, [jobs]);

  const focusJobs = useMemo(() => {
    return jobs
      .filter((job) => job.followUpDate && job.response !== "Rejected")
      .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate))
      .slice(0, 6);
  }, [jobs]);

  const overdueCount = jobs.filter(
    (job) => job.followUpDate && job.followUpDate < todayKey && job.response !== "Rejected",
  ).length;
  const todayCount = jobsByFollowUpDate[todayKey]?.length ?? 0;
  const calendarDays = getCalendarDays(calendarMonth);

  const shiftCalendarMonth = (amount: number) => {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  return (
    <div className="admin-panel-stack admin-jobs-page">
      <section className="admin-panel admin-panel--hero">
        <p className="admin-panel__eyebrow">Jobs</p>
        <div className="admin-panel__title-row">
          <h2>Application Tracker</h2>
        </div>
        <p>
          Simple local tracker for job applications, recruiters, follow-ups, and notes.
        </p>
      </section>

      <section className="admin-panel">
        <div className="admin-panel__header">
          <h3>Add job application</h3>
        </div>

        <div className="admin-content-form">
          <div className="admin-content-form-grid">
            <Input label="Company" value={draft.company ?? ""} onChange={(e) => setDraft((d) => ({ ...d, company: e.target.value }))} />
            <Input label="Job Title" value={draft.title ?? ""} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
            <Input label="Job Link" value={draft.link ?? ""} onChange={(e) => setDraft((d) => ({ ...d, link: e.target.value }))} />
            <Input label="Recruiter Name" value={draft.recruiterName ?? ""} onChange={(e) => setDraft((d) => ({ ...d, recruiterName: e.target.value }))} />
            <Input label="Recruiter LinkedIn" value={draft.recruiterLinkedIn ?? ""} onChange={(e) => setDraft((d) => ({ ...d, recruiterLinkedIn: e.target.value }))} />
            <Input label="Follow-Up Date" type="date" value={draft.followUpDate ?? ""} onChange={(e) => setDraft((d) => ({ ...d, followUpDate: e.target.value }))} />
            <Select label="Response" value={draft.response ?? "No response"} onChange={(e) => setDraft((d) => ({ ...d, response: e.target.value }))} options={DEFAULT_RESPONSE_OPTIONS.map((r) => ({ value: r, label: r }))} />
            <div className="admin-jobs-form__notes">
              <Textarea label="Notes" rows={4} value={draft.notes ?? ""} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
            </div>
            <div>
              <Checkbox
                label="Applied?"
                checked={!!draft.applied}
                onChange={(e) => setDraft((d) => ({ ...d, applied: e.target.checked }))}
              />
            </div>
            <div>
              <Checkbox
                label="Contacted?"
                checked={!!draft.contacted}
                onChange={(e) => setDraft((d) => ({ ...d, contacted: e.target.checked }))}
              />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <Button onClick={handleAdd}>Add application</Button>
          </div>
        </div>
      </section>

      <section className="admin-panel admin-jobs-calendar-panel">
        <div className="admin-jobs-calendar-header">
          <div>
            <p className="admin-panel__eyebrow">Focus Calendar</p>
            <h3>{formatMonthTitle(calendarMonth)}</h3>
            <p>Follow-up dates decide which applications need attention first.</p>
          </div>
          <div className="admin-jobs-calendar-controls">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={<ChevronLeft size={16} />}
              onClick={() => shiftCalendarMonth(-1)}
            >
              Prev
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={<CalendarDays size={16} />}
              onClick={() => setCalendarMonth(new Date())}
            >
              Today
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={<ChevronRight size={16} />}
              onClick={() => shiftCalendarMonth(1)}
            >
              Next
            </Button>
          </div>
        </div>

        <div className="admin-jobs-focus-grid">
          <div className="admin-jobs-focus-summary">
            <div className="admin-job-focus-stat is-overdue">
              <span>Overdue</span>
              <strong>{overdueCount}</strong>
            </div>
            <div className="admin-job-focus-stat is-today">
              <span>Today</span>
              <strong>{todayCount}</strong>
            </div>
            <div className="admin-job-focus-list">
              <h4>Focus next</h4>
              {focusJobs.length ? (
                focusJobs.map((job) => {
                  const isOverdue = job.followUpDate < todayKey;
                  const isToday = job.followUpDate === todayKey;

                  return (
                    <button
                      key={job.id}
                      type="button"
                      className={`admin-job-focus-item ${isOverdue ? "is-overdue" : ""} ${isToday ? "is-today" : ""}`}
                      onClick={() => handleStartEdit(job)}
                    >
                      <span>
                        {isOverdue ? <AlertCircle size={14} /> : <CalendarDays size={14} />}
                        {isOverdue ? "Overdue" : isToday ? "Today" : formatShortDate(job.followUpDate)}
                      </span>
                      <strong>{job.company || "Untitled company"}</strong>
                      <small>{job.title || "Untitled role"}</small>
                    </button>
                  );
                })
              ) : (
                <p>No follow-ups to focus on.</p>
              )}
            </div>
          </div>

          <div className="admin-jobs-calendar">
            {weekdayLabels.map((day) => (
              <div key={day} className="admin-jobs-calendar__weekday">
                {day}
              </div>
            ))}
            {calendarDays.map((date) => {
              const dateKey = toDateKey(date);
              const dayJobs = jobsByFollowUpDate[dateKey] ?? [];
              const isCurrentMonth = getMonthKey(date) === getMonthKey(calendarMonth);
              const isToday = dateKey === todayKey;
              const isOverdue = dateKey < todayKey && dayJobs.some((job) => job.response !== "Rejected");

              return (
                <div
                  key={dateKey}
                  className={`admin-jobs-calendar__day ${isCurrentMonth ? "" : "is-muted"} ${isToday ? "is-today" : ""} ${isOverdue ? "is-overdue" : ""}`}
                >
                  <span className="admin-jobs-calendar__date">{date.getDate()}</span>
                  <div className="admin-jobs-calendar__events">
                    {dayJobs.slice(0, 3).map((job) => (
                      <button key={job.id} type="button" onClick={() => handleStartEdit(job)}>
                        {job.company || "Untitled"}
                      </button>
                    ))}
                    {dayJobs.length > 3 ? <small>+{dayJobs.length - 3} more</small> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel__header">
          <h3>Applications</h3>
          <p>{jobs.length} saved locally</p>
        </div>

        {jobs.length ? (
          <div className="admin-jobs-list">
            {jobs.map((job) => {
              const isEditing = editingJobId === job.id && editDraft;
              const isNotesExpanded = expandedNotes.has(job.id);
              const hasLongNotes = job.notes.trim().length > 180;

              return (
                <article key={job.id} className={`admin-job-card ${isEditing ? "is-editing" : ""}`}>
                  {isEditing ? (
                    <div className="admin-job-edit">
                      <div className="admin-content-form-grid">
                        <Input label="Company" value={editDraft.company} onChange={(e) => setEditDraft((d) => (d ? { ...d, company: e.target.value } : d))} />
                        <Input label="Job Title" value={editDraft.title} onChange={(e) => setEditDraft((d) => (d ? { ...d, title: e.target.value } : d))} />
                        <Input label="Job Link" value={editDraft.link} onChange={(e) => setEditDraft((d) => (d ? { ...d, link: e.target.value } : d))} />
                        <Input label="Recruiter Name" value={editDraft.recruiterName} onChange={(e) => setEditDraft((d) => (d ? { ...d, recruiterName: e.target.value } : d))} />
                        <Input label="Recruiter LinkedIn" value={editDraft.recruiterLinkedIn} onChange={(e) => setEditDraft((d) => (d ? { ...d, recruiterLinkedIn: e.target.value } : d))} />
                        <Input label="Follow-Up Date" type="date" value={editDraft.followUpDate} onChange={(e) => setEditDraft((d) => (d ? { ...d, followUpDate: e.target.value } : d))} />
                        <Select label="Response" value={editDraft.response} onChange={(e) => setEditDraft((d) => (d ? { ...d, response: e.target.value } : d))} options={DEFAULT_RESPONSE_OPTIONS.map((r) => ({ value: r, label: r }))} />
                        <div>
                          <Checkbox
                            label="Applied?"
                            checked={editDraft.applied}
                            onChange={(e) => setEditDraft((d) => (d ? { ...d, applied: e.target.checked } : d))}
                          />
                        </div>
                        <div>
                          <Checkbox
                            label="Contacted?"
                            checked={editDraft.contacted}
                            onChange={(e) => setEditDraft((d) => (d ? { ...d, contacted: e.target.checked } : d))}
                          />
                        </div>
                        <div className="admin-jobs-form__notes">
                          <Textarea label="Notes" rows={6} value={editDraft.notes} onChange={(e) => setEditDraft((d) => (d ? { ...d, notes: e.target.value } : d))} />
                        </div>
                      </div>
                      <div className="admin-job-edit__actions">
                        <Button type="button" size="sm" icon={<Save size={15} />} onClick={handleSaveEdit}>
                          Save
                        </Button>
                        <Button type="button" variant="ghost" size="sm" icon={<X size={15} />} onClick={handleCancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="admin-job-card__main">
                        <div className="admin-job-card__title">
                          <span className="admin-job-card__icon">
                            <Building2 size={18} />
                          </span>
                          <div>
                            <h3>{job.company || "Untitled company"}</h3>
                            <p>{job.title || "Untitled role"}</p>
                          </div>
                        </div>

                        <div className="admin-job-card__chips">
                          <span className={`admin-job-chip ${job.applied ? "is-success" : ""}`}>
                            <CheckCircle2 size={14} />
                            {job.applied ? "Applied" : "Not applied"}
                          </span>
                          <span className={`admin-job-chip ${job.contacted ? "is-success" : ""}`}>
                            <UserRound size={14} />
                            {job.contacted ? "Contacted" : "Not contacted"}
                          </span>
                          <span className="admin-job-chip">
                            <MessageSquareText size={14} />
                            {job.response || "No response"}
                          </span>
                          <span className="admin-job-chip">
                            <CalendarDays size={14} />
                            {job.followUpDate || "No follow-up"}
                          </span>
                        </div>
                      </div>

                      <div className="admin-job-card__details">
                        <div className="admin-job-detail">
                          <span>Recruiter</span>
                          <strong>{job.recruiterName || "Not added"}</strong>
                        </div>
                        <div className={`admin-job-detail admin-job-detail--notes ${isNotesExpanded ? "is-expanded" : ""}`}>
                          <span>Notes</span>
                          <p>{job.notes || "No notes yet."}</p>
                          {hasLongNotes ? (
                            <button type="button" className="admin-job-notes-toggle" onClick={() => toggleNotes(job.id)}>
                              {isNotesExpanded ? "Show less" : "Show more"}
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div className="admin-job-card__actions">
                        {job.link ? (
                          <a className="admin-job-link" href={job.link} target="_blank" rel="noreferrer">
                            Job
                            <ExternalLink size={14} />
                          </a>
                        ) : null}
                        {job.recruiterLinkedIn ? (
                          <a className="admin-job-link" href={job.recruiterLinkedIn} target="_blank" rel="noreferrer">
                            LinkedIn
                            <ExternalLink size={14} />
                          </a>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          icon={<Pencil size={15} />}
                          onClick={() => handleStartEdit(job)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          icon={<Trash2 size={15} />}
                          onClick={() => handleDelete(job.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="admin-empty-state">No applications saved</div>
        )}
      </section>
    </div>
  );
}
