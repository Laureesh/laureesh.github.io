import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Copy,
  ExternalLink,
  Github,
  Linkedin,
  Mail,
  MapPin,
  MessageCircleMore,
  Phone,
  QrCode,
  Send,
  type LucideIcon,
} from "lucide-react";
import { usePageContent } from "../hooks/useContentCatalog";
import { getPageSection } from "../services/pageContent";
import "./Contact.css";

const portfolioUrl = "https://laureesh.github.io";
const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(portfolioUrl)}`;

interface ContactMethod {
  label: string;
  value: string;
  detail: string;
  href: string;
  badge: string;
  icon: LucideIcon;
  external?: boolean;
}

const contactMethods: ContactMethod[] = [
  {
    label: "Email",
    value: "laureesh1@gmail.com",
    detail: "Best first contact for hiring, freelance work, and project details.",
    href: "mailto:laureesh1@gmail.com",
    badge: "Preferred",
    icon: Mail,
  },
  {
    label: "LinkedIn",
    value: "linkedin.com/in/laureesh",
    detail: "Best for recruiter outreach, networking, and role context.",
    href: "https://linkedin.com/in/laureesh",
    badge: "Best for hiring",
    icon: Linkedin,
    external: true,
  },
  {
    label: "Phone",
    value: "(678) 755-9200",
    detail: "Best after scheduling or when you want to move quickly.",
    href: "tel:6787559200",
    badge: "Call-ready",
    icon: Phone,
  },
  {
    label: "GitHub",
    value: "github.com/laureesh",
    detail: "Useful when you want to review code, commits, and shipped work.",
    href: "https://github.com/laureesh",
    badge: "Code proof",
    icon: Github,
    external: true,
  },
];

const hireHighlights = [
  {
    title: "UI that feels deliberate",
    copy: "Strongest on polished React interfaces, navigation clarity, and responsive front-end structure.",
  },
  {
    title: "Real coursework turned into working demos",
    copy: "Projects are not just screenshots. They are interactive builds with code, routes, and context.",
  },
  {
    title: "Student-level speed with production-minded habits",
    copy: "Comfortable iterating quickly while still caring about accessibility, structure, and maintainability.",
  },
];

const chatTopics = [
  {
    id: "availability",
    question: "Are you open to opportunities?",
    answer:
      "Yes. I am open to internships, junior developer roles, and freelance work where I can contribute on front-end, full-stack class-style builds, or portfolio-style product work.",
  },
  {
    id: "best-way",
    question: "What is the best way to reach you?",
    answer:
      "Email is the fastest and most reliable first move. If you are reaching out about a role, adding the company, position, and timeline helps me respond faster.",
  },
  {
    id: "call",
    question: "Can we book a call?",
    answer:
      "Call booking is coming soon. For now, email me and I can coordinate a time manually if a live conversation makes sense.",
  },
];

const socialProofItems = [
  {
    label: "Portfolio update",
    title: "Expanded the site with guided navigation, project-rich cards, and stronger interaction design.",
    href: "/projects",
    internal: true,
  },
  {
    label: "Learning note",
    title: "Wrote through the Firebase vs MongoDB decision from the perspective of a student portfolio build.",
    href: "/blog/why-i-chose-firebase-for-my-portfolio",
    internal: true,
  },
  {
    label: "Career story",
    title: "Documented the move from healthcare into software development and what that shift changed.",
    href: "/blog/my-journey-into-software-development",
    internal: true,
  },
];

const faqItems = [
  {
    question: "What kind of roles are you looking for?",
    answer:
      "Internships, junior software roles, and freelance work where I can keep sharpening front-end and full-stack skills while contributing to real product work.",
  },
  {
    question: "Do you only do front-end work?",
    answer:
      "Front-end is the strongest lane right now, but I also have backend and database experience through Java, PHP, Firebase, and SQL-backed class projects.",
  },
  {
    question: "How quickly do you respond?",
    answer:
      "Usually within 24 hours by email. LinkedIn is also monitored, but email is still the cleanest path for detailed conversations.",
  },
  {
    question: "Can you share code samples before a call?",
    answer:
      "Yes. GitHub and the Projects page are the fastest places to review code quality, shipped UI, and how I explain the work behind each build.",
  },
];

export default function Contact() {
  const { content: contactPageContent } = usePageContent("contact");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [activeChatTopicId, setActiveChatTopicId] = useState(chatTopics[0].id);
  const [copiedQr, setCopiedQr] = useState(false);

  const activeChatTopic =
    chatTopics.find((topic) => topic.id === activeChatTopicId) ?? chatTopics[0];
  const headerSection = getPageSection(contactPageContent, "header");
  const hireSection = getPageSection(contactPageContent, "hire");
  const formSection = getPageSection(contactPageContent, "form");
  const calendarSection = getPageSection(contactPageContent, "calendar");
  const faqSection = getPageSection(contactPageContent, "faq");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(false);
    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const response = await fetch("https://formspree.io/f/mgvzgnrl", {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });

      if (response.ok) {
        setSubmitted(true);
        form.reset();
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    }
  };

  const handleCopyPortfolioUrl = async () => {
    try {
      await navigator.clipboard.writeText(portfolioUrl);
      setCopiedQr(true);
      window.setTimeout(() => setCopiedQr(false), 1800);
    } catch {
      setCopiedQr(false);
    }
  };

  return (
    <section className="contact section">
      <div className="container">
        <div className="contact-header">
          <div className="contact-header-left">
            <p className="section-label">{headerSection?.eyebrow ?? "Get In Touch"}</p>
            <h2 className="section-title">{headerSection?.title ?? "Contact Me"}</h2>
            <p className="contact-header-copy">
              {headerSection?.body ??
                "If you are hiring, collaborating, or just want to talk through a build, this page is set up to make the fastest next step obvious."}
            </p>
          </div>
          <div className="contact-info-cards">
            <div className="info-card">
              <div className="info-card-icon">
                <MapPin size={20} />
              </div>
              <div className="info-card-content">
                <h4>Location</h4>
                <p className="info-card-highlight">Georgia, USA</p>
                <p className="info-card-detail">Open to remote work and local opportunities</p>
              </div>
            </div>
            <div className="info-card">
              <div className="info-card-icon">
                <Clock size={20} />
              </div>
              <div className="info-card-content">
                <h4>Response time</h4>
                <p className="info-card-highlight">Usually within 24 hours</p>
                <p className="info-card-detail">Email is the fastest first move</p>
              </div>
            </div>
            <div className="info-card">
              <div className="info-card-icon">
                <Mail size={20} />
              </div>
              <div className="info-card-content">
                <h4>Preferred contact</h4>
                <p className="info-card-highlight">Email, then LinkedIn</p>
                <p className="info-card-detail">Phone works best after scheduling</p>
              </div>
            </div>
          </div>
        </div>

        <section className="contact-hire card">
          <div className="contact-card-head">
            <div>
              <p className="contact-kicker">
                <BriefcaseBusiness size={14} />
                {hireSection?.eyebrow ?? "Hire me"}
              </p>
              <h3>{hireSection?.title ?? "Front-end focused developer with working demos, clear communication, and real build context."}</h3>
              <p>{hireSection?.body ?? "Best fit for teams that want someone who can ship UI, explain tradeoffs, and keep improving quickly across the stack."}</p>
            </div>
          </div>
          <div className="contact-value-grid">
            {hireHighlights.map((highlight) => (
              <article key={highlight.title} className="contact-value-card">
                <h4>{highlight.title}</h4>
                <p>{highlight.copy}</p>
              </article>
            ))}
          </div>
          <div className="contact-hire-actions">
            <Link to="/resume" className="btn btn-primary">
              View Resume
              <ArrowRight size={16} />
            </Link>
            <a href="mailto:laureesh1@gmail.com" className="btn btn-outline">
              Start with email
            </a>
          </div>
        </section>

        <div className="contact-grid">
          <div className="contact-side-stack">
            <section className="contact-info card">
              <div className="contact-card-head">
                <div>
                  <p className="contact-kicker">
                    <Mail size={14} />
                    Contact channels
                  </p>
                  <h3>Pick the channel that matches the conversation.</h3>
                </div>
              </div>
              <p className="contact-intro">
                Email is the best path for job opportunities and project details.
                LinkedIn works well for recruiter outreach. Phone is best once a call
                makes sense.
              </p>
              <div className="contact-items">
                {contactMethods.map((method) => {
                  const Icon = method.icon;

                  return (
                    <a
                      key={method.label}
                      href={method.href}
                      target={method.external ? "_blank" : undefined}
                      rel={method.external ? "noreferrer" : undefined}
                      className="contact-item"
                    >
                      <div className="contact-item-icon">
                        <Icon size={18} />
                      </div>
                      <div className="contact-item-copy">
                        <strong>{method.label}</strong>
                        <span>{method.value}</span>
                        <small>{method.detail}</small>
                      </div>
                      <span className="contact-item-badge">{method.badge}</span>
                    </a>
                  );
                })}
              </div>
            </section>

            <section className="contact-chat card">
              <div className="contact-card-head">
                <div>
                  <p className="contact-kicker">
                    <MessageCircleMore size={14} />
                    Live chat widget
                  </p>
                  <h3>Quick answers before you reach out.</h3>
                  <p>
                    This is a lightweight on-page chat helper so hiring questions do not
                    need a third-party widget to get moving.
                  </p>
                </div>
                <span className="contact-chat-status">Online</span>
              </div>

              <div className="contact-chat-window" data-no-swipe="true">
                <div className="contact-chat-bubble system">
                  Hi. If you want the fastest path: email me for detailed hiring outreach,
                  or book a short call if you already know you want to talk live.
                </div>
                <div className="contact-chat-options">
                  {chatTopics.map((topic) => (
                    <button
                      key={topic.id}
                      type="button"
                      className={`contact-chat-option ${activeChatTopicId === topic.id ? "active" : ""}`}
                      onClick={() => setActiveChatTopicId(topic.id)}
                    >
                      {topic.question}
                    </button>
                  ))}
                </div>
                <div className="contact-chat-bubble user">{activeChatTopic.question}</div>
                <div className="contact-chat-bubble system">{activeChatTopic.answer}</div>
                <div className="contact-chat-actions">
                  <a href="mailto:laureesh1@gmail.com" className="contact-inline-link">
                    Email me
                  </a>
                  <span className="contact-inline-link is-muted">Call booking coming soon</span>
                  <a
                    href="https://linkedin.com/in/laureesh"
                    target="_blank"
                    rel="noreferrer"
                    className="contact-inline-link"
                  >
                    LinkedIn
                  </a>
                </div>
              </div>
            </section>
          </div>

          <div className="contact-form-stack">
            <form className="contact-form card" onSubmit={handleSubmit}>
              <div className="contact-card-head">
                <div>
                  <p className="contact-kicker">
                    <Send size={14} />
                    {formSection?.eyebrow ?? "Send a message"}
                  </p>
                  <h3>{formSection?.title ?? "Use the form if email is your preferred route."}</h3>
                  {formSection?.body ? <p>{formSection.body}</p> : null}
                </div>
              </div>
              {submitted ? (
                <div className="form-success">
                  <p>Message sent successfully. I will get back to you soon.</p>
                </div>
              ) : (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="firstname">First Name</label>
                      <input type="text" id="firstname" name="firstname" placeholder="Your name" required />
                    </div>
                    <div className="form-group">
                      <label htmlFor="lastname">Last Name</label>
                      <input type="text" id="lastname" name="lastname" placeholder="Your last name" required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input type="email" id="email" name="email" placeholder="your@email.com" required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="subject">Message</label>
                    <textarea id="subject" name="subject" placeholder="Write your message..." rows={5} required />
                  </div>
                  {error && <p className="form-error">Something went wrong. Please try again.</p>}
                  <button type="submit" className="btn btn-primary">
                    <Send size={18} />
                    Send Message
                  </button>
                </>
              )}
            </form>

            <section className="contact-calendar card">
              <div className="contact-card-head">
                <div>
                  <p className="contact-kicker">
                    <CalendarDays size={14} />
                    {calendarSection?.eyebrow ?? "Book a call"}
                  </p>
                  <h3>{calendarSection?.title ?? "Coming soon"}</h3>
                  <p>{calendarSection?.body ?? "Direct call scheduling is not live yet. If you want to talk, email me and I can set up a time manually."}</p>
                </div>
              </div>
              <div className="contact-coming-soon">
                <span className="contact-coming-soon-badge">Coming soon</span>
                <h4>Call scheduling will be added here.</h4>
                <p>
                  Until then, send an email with your company, role, or project details and I can coordinate a time directly.
                </p>
                <a href="mailto:laureesh1@gmail.com" className="btn btn-outline">
                  Email instead
                </a>
              </div>
            </section>
          </div>
        </div>

        <div className="contact-proof-grid">
          <section className="contact-feed card">
            <div className="contact-card-head">
              <div>
                <p className="contact-kicker">
                  <Linkedin size={14} />
                  Social proof
                </p>
                <h3>LinkedIn activity highlights</h3>
                <p>
                  A quick scan of the kinds of updates and proof points that support the portfolio.
                </p>
              </div>
              <a
                href="https://linkedin.com/in/laureesh"
                target="_blank"
                rel="noreferrer"
                className="contact-inline-link"
              >
                View LinkedIn
                <ExternalLink size={14} />
              </a>
            </div>
            <div className="contact-feed-list">
              {socialProofItems.map((item) => (
                <article key={item.title} className="contact-feed-item">
                  <span className="contact-feed-label">{item.label}</span>
                  <h4>{item.title}</h4>
                  {item.internal ? (
                    <Link to={item.href} className="contact-feed-link">
                      Open proof
                      <ArrowRight size={14} />
                    </Link>
                  ) : (
                    <a href={item.href} target="_blank" rel="noreferrer" className="contact-feed-link">
                      Open proof
                      <ExternalLink size={14} />
                    </a>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className="contact-qr card">
            <div className="contact-card-head">
              <div>
                <p className="contact-kicker">
                  <QrCode size={14} />
                  Share the portfolio
                </p>
                <h3>QR code</h3>
                <p>
                  Scan it on another device or send the portfolio URL without typing it manually.
                </p>
              </div>
            </div>
            <div className="contact-qr-wrap">
              <img
                src={qrCodeUrl}
                alt="QR code for the portfolio website"
                width={180}
                height={180}
                className="contact-qr-image"
              />
              <div className="contact-qr-meta">
                <code>{portfolioUrl}</code>
                <div className="contact-qr-actions">
                  <button type="button" className="btn btn-outline contact-copy-button" onClick={handleCopyPortfolioUrl}>
                    {copiedQr ? <Check size={16} /> : <Copy size={16} />}
                    {copiedQr ? "Copied" : "Copy URL"}
                  </button>
                  <a href={portfolioUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
                    Open site
                  </a>
                </div>
              </div>
            </div>

            <div className="contact-preferred-methods">
              <p className="contact-preferred-title">Preferred contact order</p>
              <div className="contact-preferred-list">
                {contactMethods.slice(0, 3).map((method, index) => (
                  <div key={method.label} className="contact-preferred-item">
                    <span className="contact-preferred-rank">0{index + 1}</span>
                    <div>
                      <strong>{method.label}</strong>
                      <p>{method.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <section className="contact-faq card">
          <div className="contact-card-head">
            <div>
              <p className="contact-kicker">
                <MessageCircleMore size={14} />
                {faqSection?.eyebrow ?? "Hiring FAQ"}
              </p>
              <h3>{faqSection?.title ?? "Questions that usually come up before a conversation."}</h3>
              {faqSection?.body ? <p>{faqSection.body}</p> : null}
            </div>
          </div>
          <div className="contact-faq-list">
            {faqItems.map((item, index) => {
              const isOpen = activeFaq === index;

              return (
                <article key={item.question} className={`contact-faq-item ${isOpen ? "open" : ""}`}>
                  <button
                    type="button"
                    className="contact-faq-trigger"
                    aria-expanded={isOpen}
                    onClick={() => setActiveFaq(isOpen ? null : index)}
                  >
                    <span>{item.question}</span>
                    <ChevronDown size={18} />
                  </button>
                  <div className="contact-faq-panel">
                    <p>{item.answer}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </section>
  );
}
