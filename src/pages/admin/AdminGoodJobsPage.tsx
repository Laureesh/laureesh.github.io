import { useEffect, useState } from "react";
import { Button, Input, Table } from "../../components/ui";

type GoodJob = {
  id: number;
  company: string;
  position: string;
  salary?: string;
  location?: string;
  link?: string;
  notes?: string;
};

const STORAGE_KEY = "admin-good-jobs";

export default function AdminGoodJobsPage() {
  const [items, setItems] = useState<GoodJob[]>([]);
  const [draft, setDraft] = useState<Partial<GoodJob>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      // ignore
    }
  }, [items]);

  const handleAdd = () => {
    const entry: GoodJob = {
      id: Date.now(),
      company: draft.company ?? "",
      position: draft.position ?? "",
      salary: draft.salary ?? "",
      location: draft.location ?? "",
      link: draft.link ?? "",
      notes: draft.notes ?? "",
    };

    setItems((cur) => [entry, ...cur]);
    setDraft({});
  };

  const handleDelete = (id: number) => setItems((cur) => cur.filter((i) => i.id !== id));

  const columns = [
    { key: "company", label: "Company" },
    { key: "position", label: "Position" },
    { key: "salary", label: "Salary" },
    { key: "location", label: "Location" },
    {
      key: "link",
      label: "Link",
      render: (v: unknown) => (v ? <a href={String(v)} target="_blank" rel="noreferrer">Open</a> : ""),
    },
    { key: "notes", label: "Notes" },
    { key: "actions", label: "", render: (_v: unknown, row: Record<string, unknown>) => (
      <Button variant="secondary" onClick={() => handleDelete(Number(row.id))}>Delete</Button>
    ) },
  ];

  return (
    <div className="admin-panel-stack">
      <section className="admin-panel admin-panel--hero">
        <p className="admin-panel__eyebrow">Good Jobs</p>
        <div className="admin-panel__title-row">
          <h2>Curated Positions</h2>
        </div>
        <p>Save well-paid or otherwise notable roles with salary and quick notes for prioritization.</p>
      </section>

      <section className="admin-panel">
        <div className="admin-panel__header">
          <h3>Add good job</h3>
        </div>

        <div className="admin-content-form">
          <div className="admin-content-form-grid">
            <Input label="Company" value={draft.company ?? ""} onChange={(e) => setDraft((d) => ({ ...d, company: e.target.value }))} />
            <Input label="Position" value={draft.position ?? ""} onChange={(e) => setDraft((d) => ({ ...d, position: e.target.value }))} />
            <Input label="Salary" value={draft.salary ?? ""} onChange={(e) => setDraft((d) => ({ ...d, salary: e.target.value }))} />
            <Input label="Location" value={draft.location ?? ""} onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))} />
            <Input label="Link" value={draft.link ?? ""} onChange={(e) => setDraft((d) => ({ ...d, link: e.target.value }))} />
            <Input label="Notes" value={draft.notes ?? ""} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
          </div>

          <div style={{ marginTop: 12 }}>
            <Button onClick={handleAdd}>Add position</Button>
          </div>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel__header">
          <h3>Saved positions</h3>
          <p>{items.length} saved locally</p>
        </div>

        <div className="admin-content-list">
          <Table columns={columns as any} data={items as any} emptyMessage="No saved positions" />
        </div>
      </section>
    </div>
  );
}
