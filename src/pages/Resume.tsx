import { Download, ExternalLink } from "lucide-react";
import "./Resume.css";

const timeline = [
  {
    type: "education" as const,
    title: "B.S. Software Development & B.S. Systems & Cybersecurity",
    org: "Georgia Gwinnett College, Lawrenceville, GA",
    date: "Aug 2023 — May 2027 (Expected)",
    details: ["GPA: 3.93 / 4.00", "Dual degree in Software Development and Systems & Cybersecurity"],
  },
  {
    type: "work" as const,
    title: "Certified Medication Aide",
    org: "Northridge Health & Rehabilitation",
    date: "July 2023 — March 2025",
    details: [
      "Administered 100+ daily medication doses with zero documentation errors",
      "Maintained 100% compliance with HIPAA and healthcare safety standards",
      "Collaborated with 5+ healthcare professionals to improve workflow efficiency",
    ],
  },
  {
    type: "work" as const,
    title: "Fulfillment Center Warehouse Associate",
    org: "Amazon",
    date: "June 2021 — August 2022",
    details: [
      "Achieved high productivity targets while maintaining accuracy",
      "Operated warehouse tracking systems and handheld scanners for inventory management",
    ],
  },
  {
    type: "cert" as const,
    title: "IT Specialist in Networking",
    org: "Certiport",
    date: "November 2024",
    details: ["Routing, VLANs, ACLs, Firewalls"],
  },
  {
    type: "cert" as const,
    title: "IT Specialist in Cybersecurity",
    org: "Certiport",
    date: "Expected April 2026",
    details: ["Security fundamentals, threat analysis, network defense"],
  },
];

export default function Resume() {
  return (
    <section className="resume section">
      <div className="container">
        <p className="section-label">My Background</p>
        <h2 className="section-title">Resume</h2>

        <div className="resume-actions">
          <a
            href="https://docs.google.com/document/d/1dlpvPCyLOCa0QEr2od7zmgeclC80N68E/edit?usp=sharing&ouid=115099727412203064487&rtpof=true&sd=true"
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary"
          >
            <Download size={18} /> Download Full Resume
          </a>
          <a
            href="https://docs.google.com/document/d/1dlpvPCyLOCa0QEr2od7zmgeclC80N68E/edit?usp=sharing&ouid=115099727412203064487&rtpof=true&sd=true"
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline"
          >
            <ExternalLink size={18} /> View on Google Docs
          </a>
        </div>

        <div className="timeline">
          {timeline.map((item, i) => (
            <div className={`timeline-item ${item.type}`} key={i}>
              <div className="timeline-dot" />
              <div className="card timeline-card">
                <span className="timeline-type">{item.type}</span>
                <h3>{item.title}</h3>
                <p className="timeline-org">{item.org}</p>
                <p className="timeline-date">{item.date}</p>
                <ul>
                  {item.details.map((d, j) => (
                    <li key={j}>{d}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
