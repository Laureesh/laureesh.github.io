import { useEffect, useLayoutEffect, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

export default function PageTransition({
  children,
  disableAnimation = false,
}: {
  children: ReactNode;
  disableAnimation?: boolean;
}) {
  const location = useLocation();

  useEffect(() => {
    if (!("scrollRestoration" in window.history)) {
      return undefined;
    }

    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    const frameId = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [location.pathname]);

  return (
    <div
      key={location.pathname}
      style={disableAnimation ? undefined : {
        animation: "fadeInUp 0.35s ease both",
      }}
    >
      {children}
    </div>
  );
}
