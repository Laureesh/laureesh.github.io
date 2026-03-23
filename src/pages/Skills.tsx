import type { CSSProperties } from "react";
import { getAreaSkills, skillAreas, skillsCatalog } from "../data/skillsShowcase";
import "./Skills.css";

export default function Skills() {
  return (
    <section className="skills section">
      <div className="container">
        <p className="section-label">What I Work With</p>
        <h2 className="section-title">Skills & Expertise</h2>
        <p className="skills-subtitle">
          <strong>{skillsCatalog.length}</strong> core skills, grouped by area.
          Each tile shows the logo, name, and a short description.
        </p>

        <div className="skills-basic-layout">
          {skillAreas.map((area) => {
            const areaSkills = getAreaSkills(area.id);

            return (
              <section
                key={area.id}
                className="skills-group"
                style={{ "--skills-accent": area.accent } as CSSProperties}
              >
                <div className="skills-group-head">
                  <p className="skills-group-kicker">{area.shortLabel}</p>
                  <h3>{area.title}</h3>
                </div>

                <div className="skills-tile-grid">
                  {areaSkills.map((skill) => (
                    <article key={skill.id} className="skills-tile">
                      <div className="skills-tile-front">
                        <img src={skill.icon} alt="" width={34} height={34} loading="lazy" />
                        <span>{skill.name}</span>
                      </div>
                      <p className="skills-tile-desc">{skill.desc}</p>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </section>
  );
}
