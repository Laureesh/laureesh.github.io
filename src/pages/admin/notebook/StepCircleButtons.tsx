import { useLayoutEffect, useRef, useState, type RefObject } from "react";

type Circle = { left: number; top: number; completed: boolean };

// Keep controls outside contentEditable so editing and exporting never include buttons.
export default function StepCircleButtons({ editorRef, onToggle }: {
  editorRef: RefObject<HTMLDivElement | null>;
  onToggle: (index: number) => void;
}) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [circles, setCircles] = useState<Circle[]>([]);
  useLayoutEffect(() => {
    const editor = editorRef.current;
    const layer = layerRef.current;
    if (!editor || !layer) return;
    const measure = () => {
      const origin = layer.getBoundingClientRect();
      const list = editor.querySelector("ol.notebook-steps");
      if (list) resize.observe(list);
      const next = list ? [...list.children].map(step => {
        resize.observe(step);
        const rect = step.getBoundingClientRect();
        const style = getComputedStyle(step, "::before");
        return {
          left: rect.left - origin.left + (parseFloat(style.left) || 0) + (parseFloat(style.width) || 32) / 2 - 22,
          top: rect.top - origin.top + (parseFloat(style.top) || 0) + (parseFloat(style.height) || 32) / 2 - 22,
          completed: step.getAttribute("data-completed") === "true",
        };
      }) : [];
      setCircles(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    const resize = new ResizeObserver(measure);
    measure();
    resize.observe(editor);
    const mutations = new MutationObserver(measure);
    mutations.observe(editor, { childList: true, subtree: true, attributes: true, characterData: true });
    window.addEventListener("resize", measure);
    editor.addEventListener("scroll", measure);
    return () => {
      resize.disconnect();
      mutations.disconnect();
      window.removeEventListener("resize", measure);
      editor.removeEventListener("scroll", measure);
    };
  }, [editorRef]);
  return <div ref={layerRef} className="step-circle-buttons">
    {circles.map((circle, index) => <button
      key={index}
      type="button"
      className="step-circle-button"
      style={{ left: circle.left, top: circle.top }}
      aria-label={`Step ${index + 1} complete`}
      aria-pressed={circle.completed}
      title={`Mark step ${index + 1} ${circle.completed ? "incomplete" : "complete"}`}
      onClick={() => onToggle(index)}
    />)}
  </div>;
}
