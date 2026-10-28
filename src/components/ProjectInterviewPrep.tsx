import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { canAccessRole } from "../utils/authGuards";
import { importInterviewPrep, loadInterviewPrep } from "../services/projectInterviewPrep";
import type { InterviewPrep } from "../utils/projectInterviewPrep";

export default function ProjectInterviewPrep({ projectId }: { projectId: string }) {
  const { user, userProfile, loading } = useAuth();
  if (loading || !user?.emailVerified || !canAccessRole(user, userProfile, "admin")) return null;
  // Remount when the account changes so a previous account's private data is cleared.
  return <AdminInterviewPrep key={`${user.uid}:${projectId}`} projectId={projectId} />;
}

function AdminInterviewPrep({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="project-interview-prep">
      <button type="button" className="project-detail-tab" aria-expanded={open}
        onClick={() => setOpen((value) => !value)}>
        <span className="project-detail-tab-label">Interview practice</span>
        <span className="project-detail-tab-meta">Admin only · 10 Q&As</span>
      </button>
      {open && <InterviewContent projectId={projectId} />}
    </section>
  );
}

function InterviewContent({ projectId }: { projectId: string }) {
  const [prep, setPrep] = useState<InterviewPrep | null>(null);
  const [busy, setBusy] = useState(true);
  const [status, setStatus] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    loadInterviewPrep().then((data) => { if (active) setPrep(data); })
      .catch(() => { if (active) setStatus("Could not load private interview notes. Check your admin session and retry."); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [retry]);
  const questions = prep?.projects[projectId];
  return (
    <div className="project-panel-body">
      <p className="project-panel-copy">Practice answers: adapt these to your own work. Only claim contributions and results you can explain.</p>
      {busy ? <p role="status">Loading private notes…</p> : questions ? (
        <ol className="project-interview-list">
          {questions.map((item) => <li key={item.question}><details>
            <summary>{item.question}</summary><p>{item.answer}</p>
          </details></li>)}
        </ol>
      ) : <p>No interview notes saved for this project yet. Import the prepared JSON file once to add all nine projects.</p>}
      {status && <p role="status">{status}</p>}
      <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => {
        setBusy(true); setStatus(""); setRetry((value) => value + 1);
      }}>Reload notes</button>
      <details className="project-interview-import">
        <summary>Import / replace interview notes</summary>
        <p>This replaces the saved interview collection for all admins with the projects in your JSON file.</p>
        <input aria-label="Import private interview questions JSON" type="file" accept=".json,application/json" disabled={busy}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setBusy(true); setStatus("");
            try {
              if (file.size > 750_000) throw new Error("Choose a JSON file smaller than 750 KB.");
              const data = await importInterviewPrep(JSON.parse(await file.text()));
              setPrep(data);
              setStatus(`Saved private interview notes for ${Object.keys(data.projects).length} projects.`);
            } catch (error) {
              setStatus(error instanceof Error ? error.message : "Import failed. Please retry.");
            } finally { setBusy(false); }
          }} />
      </details>
    </div>
  );
}
