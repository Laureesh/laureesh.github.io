import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

type Block = { element: HTMLPreElement; top: number; right: number };

function CopyButton({ block }: { block: Block }) {
  const [status, setStatus] = useState("Copy");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    clearTimeout(timer.current);
    try {
      // innerText preserves line breaks introduced by editing, without visual wrapping.
      await navigator.clipboard.writeText(block.element.innerText);
      setStatus("Copied!");
    } catch {
      setStatus("Copy failed");
    }
    timer.current = setTimeout(() => setStatus("Copy"), 2500);
  };
  return <button type="button" className="code-copy-button"
    style={{ top: block.top, right: block.right }}
    aria-label={status === "Copy" ? "Copy code" : status}
    onClick={() => void copy()}><span aria-live="polite">{status}</span></button>;
}

// Overlay controls stay out of saved HTML and the editable code itself.
export default function CodeCopyButtons({ editorRef }: { editorRef: RefObject<HTMLDivElement | null> }) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  useLayoutEffect(() => {
    const editor = editorRef.current;
    const layer = layerRef.current;
    if (!editor || !layer) return;
    const measure = () => {
      const origin = layer.getBoundingClientRect();
      const next = [...editor.querySelectorAll("pre")].map(element => {
        const rect = element.getBoundingClientRect();
        return { element, top: rect.top - origin.top + 8, right: origin.right - rect.right + 8 };
      });
      setBlocks(previous => previous.length === next.length && previous.every((block, i) =>
        block.element === next[i].element && block.top === next[i].top && block.right === next[i].right
      ) ? previous : next);
    };
    const resize = new ResizeObserver(measure);
    const observe = () => {
      resize.disconnect();
      resize.observe(editor);
      editor.querySelectorAll("pre").forEach(block => resize.observe(block));
      measure();
    };
    const mutations = new MutationObserver(observe);
    mutations.observe(editor, { childList: true, subtree: true, characterData: true, attributes: true });
    observe();
    window.addEventListener("resize", measure);
    editor.addEventListener("scroll", measure);
    return () => {
      resize.disconnect();
      mutations.disconnect();
      window.removeEventListener("resize", measure);
      editor.removeEventListener("scroll", measure);
    };
  }, [editorRef]);
  return <div ref={layerRef} className="code-copy-buttons">
    {blocks.map((block, index) => <CopyButton key={index} block={block} />)}
  </div>;
}
