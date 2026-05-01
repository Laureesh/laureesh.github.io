import { useEffect, useState } from "react";
import { Button, Input, Select, Checkbox, Table } from "../../components/ui";

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
  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const [draft, setDraft] = useState<Partial<JobEntry>>({ applied: false, contacted: false, response: "No response" });

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
      followUpDate: draft.followUpDate ?? "",
      response: draft.response ?? "No response",
      notes: draft.notes ?? "",
    };

    setJobs((cur) => [entry, ...cur]);
    setDraft({ applied: false, contacted: false, response: "No response" });
  };

  const handleDelete = (id: number) => setJobs((cur) => cur.filter((j) => j.id !== id));

  const columns = [
    { key: "company", label: "Company", sortable: true },
    { key: "title", label: "Job Title", sortable: true },
    {
      key: "link",
      label: "Job Link",
      render: (value: unknown) => (
        <a href={String(value ?? "#")} target="_blank" rel="noreferrer">
          Open
        </a>
      ),
    },
    { key: "applied", label: "Applied?", render: (v: unknown) => (v ? "Yes" : "No") },
    { key: "recruiterName", label: "Recruiter Name" },
    {
      key: "recruiterLinkedIn",
      label: "Recruiter LinkedIn",
      render: (value: unknown) => (
        value ? (
          <a href={String(value)} target="_blank" rel="noreferrer">
            Profile
          </a>
        ) : (
          ""
        )
      ),
    },
    { key: "contacted", label: "Contacted?", render: (v: unknown) => (v ? "Yes" : "No") },
    { key: "followUpDate", label: "Follow-Up Date" },
    { key: "response", label: "Response" },
    { key: "notes", label: "Notes" },
    {
      key: "actions",
      label: "",
      render: (_v: unknown, row: Record<string, unknown>) => (
        <Button variant="secondary" onClick={() => handleDelete(Number(row.id))}>
          Delete
        </Button>
      ),
    },
  ];

  return (
    <div className="admin-panel-stack">
      <section className="admin-panel admin-panel--hero">
        <p className="admin-panel__eyebrow">Jobs</p>
        <div className="admin-panel__title-row">
          <h2>Application Tracker</h2>
        </div>
        <p>Simple local tracker for job applications. Columns: Company | Job Title | Job Link | Applied? | Recruiter Name | Recruiter LinkedIn | Contacted? | Follow-Up Date | Response | Notes</p>
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
            <Input label="Notes" value={draft.notes ?? ""} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
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

        <div className="admin-content-list">
          <Table columns={columns as any} data={jobs as any} emptyMessage="No applications saved" />
        </div>
      </section>
    </div>
  );
}
