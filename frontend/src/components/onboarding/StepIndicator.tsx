import { Check } from "lucide-react";

type Step = {
  key: string;
  label: string;
};

const STEPS: Step[] = [
  { key: "github", label: "GitHub" },
  { key: "repos", label: "Repos" },
  { key: "aws", label: "AWS" },
  { key: "environments", label: "Environments" },
];

type StepIndicatorProps = {
  active: Step["key"];
};

export default function StepIndicator({ active }: StepIndicatorProps) {
  const activeIndex = Math.max(0, STEPS.findIndex((step) => step.key === active));

  return (
    <div className="steps-wrap" role="list" aria-label="Onboarding steps">
      {STEPS.map((step, index) => {
        const completed = index < activeIndex;
        const isActive = index === activeIndex;

        return (
          <div key={step.key} className="step-item" role="listitem">
            <div className={`step-circle ${completed ? "step-completed" : isActive ? "step-active" : "step-upcoming"}`}>
              {completed ? <Check size={14} /> : <span>{index + 1}</span>}
            </div>
            <div className={`step-label ${isActive ? "step-label-active" : ""}`}>{step.label}</div>
            {index < STEPS.length - 1 ? (
              <div className="step-line-wrap">
                <div className="step-line" />
                <div className={`step-line-fill ${completed ? "step-line-filled" : ""}`} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
