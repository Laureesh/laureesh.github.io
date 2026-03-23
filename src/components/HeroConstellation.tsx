import { useEffect, useRef } from "react";
import { useTheme } from "./themeContext";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  twinkle: number;
  phase: number;
  depth: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function colorToRgbTriplet(value: string, fallback: string) {
  const trimmed = value.trim();

  if (!trimmed) return fallback;

  if (trimmed.startsWith("#")) {
    const hex = trimmed.slice(1);
    const normalized = hex.length === 3
      ? hex.split("").map((segment) => `${segment}${segment}`).join("")
      : hex;

    if (normalized.length === 6) {
      const red = Number.parseInt(normalized.slice(0, 2), 16);
      const green = Number.parseInt(normalized.slice(2, 4), 16);
      const blue = Number.parseInt(normalized.slice(4, 6), 16);

      return `${red}, ${green}, ${blue}`;
    }
  }

  const rgbMatch = trimmed.match(/rgba?\(([^)]+)\)/i);

  if (rgbMatch) {
    return rgbMatch[1]
      .split(",")
      .slice(0, 3)
      .map((segment) => segment.trim())
      .join(", ");
  }

  return fallback;
}

function createParticles(width: number, height: number, reducedMotion: boolean) {
  const count = clamp(Math.round((width * height) / 32000), 18, 42);

  return Array.from({ length: count }, () => {
    const speed = reducedMotion ? 0 : 0.05 + Math.random() * 0.18;
    const angle = Math.random() * Math.PI * 2;

    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 1 + Math.random() * 1.8,
      twinkle: 0.6 + Math.random() * 1.4,
      phase: Math.random() * Math.PI * 2,
      depth: 0.75 + Math.random() * 0.65,
    };
  });
}

export default function HeroConstellation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { accent, style, theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;

    if (!canvas || !host) return undefined;

    const context = canvas.getContext("2d");
    if (!context) return undefined;

    const rootStyles = window.getComputedStyle(document.documentElement);
    const accentRgb = colorToRgbTriplet(
      rootStyles.getPropertyValue("--accent"),
      theme === "dark" ? "129, 140, 248" : "99, 102, 241",
    );
    const accentHoverRgb = colorToRgbTriplet(
      rootStyles.getPropertyValue("--accent-hover"),
      theme === "dark" ? "199, 210, 254" : "67, 56, 202",
    );
    const textPrimaryRgb = colorToRgbTriplet(
      rootStyles.getPropertyValue("--text-primary"),
      theme === "dark" ? "250, 250, 250" : "24, 24, 27",
    );
    const glowColor = rootStyles.getPropertyValue("--accent-glow").trim() || (
      theme === "dark" ? "rgba(129, 140, 248, 0.3)" : "rgba(99, 102, 241, 0.16)"
    );

    const palette = theme === "dark"
      ? {
          node: textPrimaryRgb,
          accent: accentHoverRgb,
          flare: accentRgb,
          linkAlpha: 0.22,
          nodeAlpha: 0.72,
          glow: glowColor,
        }
      : {
          node: accentRgb,
          accent: accentHoverRgb,
          flare: accentHoverRgb,
          linkAlpha: 0.14,
          nodeAlpha: 0.52,
          glow: glowColor,
        };

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = reducedMotionQuery.matches;
    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let particles: Particle[] = [];
    const deviceScale = Math.min(window.devicePixelRatio || 1, 2);

    const resizeCanvas = () => {
      width = host.clientWidth;
      height = host.clientHeight;

      canvas.width = Math.floor(width * deviceScale);
      canvas.height = Math.floor(height * deviceScale);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);

      particles = createParticles(width, height, reducedMotion);
    };

    const drawFrame = (time: number) => {
      const seconds = time * 0.001;
      const maxLinkDistance = Math.min(180, Math.max(120, width * 0.16));
      const maxLinkDistanceSquared = maxLinkDistance * maxLinkDistance;

      context.clearRect(0, 0, width, height);

      for (const particle of particles) {
        if (!reducedMotion) {
          particle.x += particle.vx * particle.depth;
          particle.y += particle.vy * particle.depth;

          if (particle.x < -32 || particle.x > width + 32) {
            particle.vx *= -1;
          }
          if (particle.y < -32 || particle.y > height + 32) {
            particle.vy *= -1;
          }
        }
      }

      for (let index = 0; index < particles.length; index += 1) {
        const start = particles[index];

        for (let nextIndex = index + 1; nextIndex < particles.length; nextIndex += 1) {
          const end = particles[nextIndex];
          const deltaX = end.x - start.x;
          const deltaY = end.y - start.y;
          const distanceSquared = deltaX * deltaX + deltaY * deltaY;

          if (distanceSquared > maxLinkDistanceSquared) continue;

          const distance = Math.sqrt(distanceSquared);
          const alpha = ((maxLinkDistance - distance) / maxLinkDistance) ** 2 * palette.linkAlpha;

          context.beginPath();
          context.moveTo(start.x, start.y);
          context.lineTo(end.x, end.y);
          context.strokeStyle = `rgba(${palette.accent}, ${alpha})`;
          context.lineWidth = 0.85;
          context.stroke();
        }
      }

      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];
        const pulse = 0.7 + ((Math.sin(seconds * particle.twinkle + particle.phase) + 1) / 2) * 0.6;
        const radius = particle.radius * pulse;
        const particleColor = index % 7 === 0 ? palette.flare : palette.node;
        const alpha = palette.nodeAlpha * (0.7 + pulse * 0.25);

        context.beginPath();
        context.fillStyle = `rgba(${particleColor}, ${alpha})`;
        context.shadowBlur = 18;
        context.shadowColor = palette.glow;
        context.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
        context.fill();

        context.beginPath();
        context.fillStyle = `rgba(255, 255, 255, ${theme === "dark" ? 0.6 : 0.35})`;
        context.shadowBlur = 0;
        context.arc(particle.x, particle.y, Math.max(0.55, radius * 0.38), 0, Math.PI * 2);
        context.fill();
      }

      if (!reducedMotion) {
        animationFrame = window.requestAnimationFrame(drawFrame);
      }
    };

    const render = () => {
      resizeCanvas();
      drawFrame(window.performance.now());

      if (!reducedMotion) {
        animationFrame = window.requestAnimationFrame(drawFrame);
      }
    };

    const handleResize = () => {
      window.cancelAnimationFrame(animationFrame);
      render();
    };

    const handleReducedMotionChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      handleResize();
    };

    render();

    window.addEventListener("resize", handleResize);
    reducedMotionQuery.addEventListener("change", handleReducedMotionChange);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", handleResize);
      reducedMotionQuery.removeEventListener("change", handleReducedMotionChange);
    };
  }, [accent, style, theme]);

  return (
    <div className="hero-constellation" aria-hidden="true">
      <canvas ref={canvasRef} className="hero-constellation-canvas" />
    </div>
  );
}
