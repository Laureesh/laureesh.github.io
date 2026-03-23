import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react";
import { getVisibleTourTarget, type GuidedTourStep } from "./GuidedTourData";
import "./GuidedTour.css";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

type GuidedTourProps = {
  steps: GuidedTourStep[];
  onDismiss: () => void;
};

export default function GuidedTour({ steps, onDismiss }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const highlightRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onDismiss();
        return;
      }

      if (event.key === "ArrowRight" && currentStep < steps.length - 1) {
        setCurrentStep((value) => Math.min(value + 1, steps.length - 1));
      }

      if (event.key === "ArrowLeft" && currentStep > 0) {
        setCurrentStep((value) => Math.max(value - 1, 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep, onDismiss, steps.length]);

  useEffect(() => {
    const highlight = highlightRef.current;
    const panel = panelRef.current;

    if (!highlight || !panel || !step) return undefined;

    let frameId = 0;

    const updatePosition = () => {
      const viewportPadding = 20;
      const highlightPadding = 10;

      frameId = window.requestAnimationFrame(() => {
        const activeTarget = getVisibleTourTarget(step.selectors);

        if (!highlightRef.current || !panelRef.current) return;

        const nextHighlight = highlightRef.current;
        const nextPanel = panelRef.current;

        if (!activeTarget) {
          nextHighlight.style.opacity = "0";
          nextPanel.style.top = "50%";
          nextPanel.style.left = "50%";
          nextPanel.style.transform = "translate(-50%, -50%)";
          return;
        }

        const rect = activeTarget.getBoundingClientRect();
        const highlightTop = clamp(rect.top - highlightPadding, 8, window.innerHeight - 24);
        const highlightLeft = clamp(rect.left - highlightPadding, 8, window.innerWidth - 24);
        const highlightWidth = Math.min(rect.width + highlightPadding * 2, window.innerWidth - 16);
        const highlightHeight = Math.min(rect.height + highlightPadding * 2, window.innerHeight - 16);

        nextHighlight.style.opacity = "1";
        nextHighlight.style.top = `${highlightTop}px`;
        nextHighlight.style.left = `${highlightLeft}px`;
        nextHighlight.style.width = `${highlightWidth}px`;
        nextHighlight.style.height = `${highlightHeight}px`;

        const panelWidth = nextPanel.offsetWidth;
        const panelHeight = nextPanel.offsetHeight;
        const centeredLeft = rect.left + rect.width / 2 - panelWidth / 2;
        const topBelow = rect.bottom + 20;
        const topAbove = rect.top - panelHeight - 20;
        const top = topBelow + panelHeight <= window.innerHeight - viewportPadding
          ? topBelow
          : topAbove >= viewportPadding
            ? topAbove
            : clamp(window.innerHeight - panelHeight - viewportPadding, viewportPadding, window.innerHeight - panelHeight - viewportPadding);
        const left = clamp(centeredLeft, viewportPadding, Math.max(viewportPadding, window.innerWidth - panelWidth - viewportPadding));

        nextPanel.style.top = `${top}px`;
        nextPanel.style.left = `${left}px`;
        nextPanel.style.transform = "translate(0, 0)";
      });
    };

    const initialTarget = getVisibleTourTarget(step.selectors);
    if (initialTarget) {
      initialTarget.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [step]);

  if (!step) return null;

  return createPortal(
    <div className="tour-overlay">
      <div ref={highlightRef} className="tour-highlight" aria-hidden="true" />
      <div
        ref={panelRef}
        className="tour-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <button
          type="button"
          className="tour-close"
          onClick={onDismiss}
          aria-label="Close guided tour"
        >
          <X size={16} />
        </button>

        <div className="tour-kicker">
          <Sparkles size={14} />
          Start Here
        </div>
        <div className="tour-progress">
          Step {currentStep + 1} of {steps.length}
        </div>
        <h3 id={titleId}>{step.title}</h3>
        <p id={descriptionId}>{step.description}</p>

        <div className="tour-actions">
          <button
            type="button"
            className="tour-button tour-button-secondary"
            onClick={onDismiss}
          >
            Skip tour
          </button>

          <div className="tour-nav">
            <button
              type="button"
              className="tour-button tour-button-secondary"
              onClick={() => setCurrentStep((value) => Math.max(value - 1, 0))}
              disabled={currentStep === 0}
            >
              <ArrowLeft size={16} />
              Back
            </button>

            <button
              type="button"
              className="tour-button tour-button-primary"
              onClick={() => {
                if (isLastStep) {
                  onDismiss();
                  return;
                }

                setCurrentStep((value) => Math.min(value + 1, steps.length - 1));
              }}
            >
              {isLastStep ? "Finish" : "Next"}
              {!isLastStep && <ArrowRight size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
