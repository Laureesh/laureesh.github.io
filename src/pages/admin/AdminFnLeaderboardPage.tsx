import { useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import fnLeaderboardHtml from "../../assets/admin/fn-lb.html?raw";
import "./AdminFnLeaderboardPage.css";

function cloneNodeWithExecutableScripts(node: Node) {
  if (node.nodeName.toLowerCase() !== "script") {
    return node.cloneNode(true);
  }

  const source = node as HTMLScriptElement;
  const script = document.createElement("script");

  for (const attribute of Array.from(source.attributes)) {
    script.setAttribute(attribute.name, attribute.value);
  }

  script.textContent = source.textContent;
  return script;
}

export default function AdminFnLeaderboardPage() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const toolWindow = window as Window & { __fnLbCleanup?: () => void };
    const mountNode = mountRef.current;

    if (!mountNode) {
      return undefined;
    }

    const parsed = new DOMParser().parseFromString(fnLeaderboardHtml, "text/html");
    const previousTitle = document.title;
    const injectedHeadNodes: HTMLElement[] = [];

    parsed.head.querySelectorAll("style, link[rel='stylesheet']").forEach((node) => {
      const clone = node.cloneNode(true) as HTMLElement;
      clone.setAttribute("data-admin-private-tool", "fn-leaderboard");
      document.head.appendChild(clone);
      injectedHeadNodes.push(clone);
    });

    mountNode.replaceChildren();

    Array.from(parsed.body.childNodes).forEach((node) => {
      mountNode.appendChild(cloneNodeWithExecutableScripts(node));
    });

    document.title = parsed.title || "UEFN Leaderboard Manager";
    document.body.classList.add("admin-standalone-tool-route");
    document.body.classList.remove("display-active");
    window.scrollTo(0, 0);

    return () => {
      toolWindow.__fnLbCleanup?.();
      document.title = previousTitle;
      document.body.classList.remove("admin-standalone-tool-route", "display-active");
      injectedHeadNodes.forEach((node) => node.remove());
      mountNode.replaceChildren();
    };
  }, []);

  return (
    <div className="admin-standalone-tool-shell">
      <Link
        to="/admin-dashboard/private-pages"
        className="admin-standalone-tool__back"
      >
        <ArrowLeft size={16} />
        Back to private pages
      </Link>

      <div ref={mountRef} className="admin-standalone-tool__mount" />
    </div>
  );
}
