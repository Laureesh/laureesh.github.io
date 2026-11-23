import { Download, ExternalLink } from "lucide-react";
import "./Resume.css";

const timeline = [
  {
    type: "work" as const,
    title: "Software Developer Intern",
    org: "Georgia Gwinnett College, Paid Internship — Lawrenceville, GA",
    date: "August 2026 — November 2026",
    details: [
      "Developed and maintained a nonprofit dashboard using React, Next.js, TypeScript, and Firebase",
      "Collaborated with faculty and nonprofit partners to gather requirements and plan features",
      "Improved interactive maps, dashboard navigation, and data visualizations",
      "Built admin-role features and improved API validation and error handling",
      "Debugged application issues, wrote unit tests, and checked functionality and access",
      "Configured Docker-based development environments and HTTPS support",
      "Used Git and GitHub to merge team contributions and resolve merge conflicts",
      "Organized tasks in Jira and documented progress, technical decisions, and setup instructions",
    ],
  },
  {
    type: "work" as const,
    title: "Student Software Developer for SHPE Georgia Professional Chapter",
    org: "Georgia Gwinnett College, Academic Client Project — Lawrenceville, GA",
    date: "January 2026 — May 2026",
    details: [
      "Architected scalable database models and entity relationships across 4 core modules: users, events, resumes, and sponsors",
      "Collaborated with teammates and nonprofit stakeholders to translate client requirements into functional features throughout a 5-month Agile development project",
      "Developed responsive React interfaces and integrated backend APIs supporting user authentication, role-based access control, and content management",
      "Implemented navigation, dashboards, event calendars, and sponsor components using GitHub workflows, Postman API testing, debugging, and Agile sprint planning",
    ],
  },
  {
    type: "education" as const,
    title: "B.S. Software Development & B.S. Systems & Cybersecurity",
    org: "Georgia Gwinnett College, Lawrenceville, GA",
    date: "Aug 2021 — May 2027 (Expected)",
    details: ["GPA: 3.94 / 4.00", "Dual degree in Software Development and Systems & Cybersecurity"],
  },
  {
    type: "work" as const,
    title: "FC Associate",
    org: "Amazon — Georgia",
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
    date: "April 2026",
    details: ["Security fundamentals, threat analysis, network defense"],
  },
  {
    type: "cert" as const,
    title: "AWS Certified Cloud Practitioner",
    org: "Amazon Web Services",
    date: "November 2026",
    details: ["Cloud concepts, AWS core services, security, and cloud economics"],
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
