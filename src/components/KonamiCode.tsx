import { useEffect, useRef, useState } from "react";
import "./KonamiCode.css";

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

function createConfetti() {
  const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#10b981", "#f59e0b", "#3b82f6"];
  const particles: HTMLDivElement[] = [];

  for (let i = 0; i < 120; i++) {
    const el = document.createElement("div");
    el.className = "confetti-particle";
    el.style.setProperty("--x", `${(Math.random() - 0.5) * 100}vw`);
    el.style.setProperty("--y", `${-Math.random() * 80 - 20}vh`);
    el.style.setProperty("--r", `${Math.random() * 720 - 360}deg`);
    el.style.setProperty("--d", `${Math.random() * 0.6 + 0.4}s`);
    el.style.left = `${Math.random() * 100}vw`;
    el.style.top = "-10px";
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.width = `${Math.random() * 8 + 4}px`;
    el.style.height = `${Math.random() * 8 + 4}px`;
    document.body.appendChild(el);
    particles.push(el);
  }

  setTimeout(() => particles.forEach((p) => p.remove()), 3500);
}

export default function KonamiCode() {
  const [triggered, setTriggered] = useState(false);
  const index = useRef(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === KONAMI[index.current]) {
        index.current++;
        if (index.current === KONAMI.length) {
          index.current = 0;
          setTriggered(true);
          createConfetti();
          setTimeout(() => setTriggered(false), 4000);
        }
      } else {
        index.current = 0;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!triggered) return null;

  return (
    <div className="konami-toast">
      You found the Easter egg! 🎉
    </div>
  );
}
