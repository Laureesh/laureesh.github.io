import { useEffect, useState } from "react";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  MessageSquareText,
  Trash2,
  UserRound,
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

export default function AdminJobsPage() {
  const getDefaultFollowUp = (days = 6) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  const defaultFollowUp = getDefaultFollowUp(6);

  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const [draft, setDraft] = useState<Partial<JobEntry>>({ applied: false, contacted: false, response: "No response", followUpDate: defaultFollowUp });

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

      <section className="admin-panel">
        <div className="admin-panel__header">
          <h3>Applications</h3>
          <p>{jobs.length} saved locally</p>
        </div>

        {jobs.length ? (
          <div className="admin-jobs-list">
            {jobs.map((job) => (
              <article key={job.id} className="admin-job-card">
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
                  <div className="admin-job-detail admin-job-detail--notes">
                    <span>Notes</span>
                    <p>{job.notes || "No notes yet."}</p>
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
                    variant="secondary"
                    size="sm"
                    icon={<Trash2 size={15} />}
                    onClick={() => handleDelete(job.id)}
                  >
                    Delete
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-empty-state">No applications saved</div>
        )}
      </section>
    </div>
  );
}
