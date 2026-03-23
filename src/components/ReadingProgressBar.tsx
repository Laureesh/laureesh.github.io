import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import "./ReadingProgressBar.css";

export default function ReadingProgressBar() {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const slug =
    location.pathname.startsWith("/blog/") && location.pathname !== "/blog/archive"
      ? location.pathname.replace("/blog/", "")
      : "";
  const isBlogPost = Boolean(slug);

  useEffect(() => {
    if (!isBlogPost) {
      return undefined;
    }

    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const viewportHeight = window.innerHeight;
      const scrollHeight = document.documentElement.scrollHeight - viewportHeight;

      if (scrollHeight <= 0) {
        setProgress(0);
        return;
      }

      setProgress(Math.min(scrollTop / scrollHeight, 1));
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, [isBlogPost, location.pathname]);

  if (!isBlogPost) {
    return null;
  }

  return (
    <div className="reading-progress" aria-hidden="true">
      <div
        className="reading-progress-bar"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
}
