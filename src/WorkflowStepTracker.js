import React from "react";

const STEPS = [
  { number: 1, label: "Environments" },
  { number: 2, label: "Input Forms" },
  { number: 3, label: "Job Preview" },
];

function WorkflowStepTracker({ currentStep, onStepClick }) {
  return (
    <nav className="workflow-step-tracker" aria-label="Workflow progress">
      <ol className="workflow-step-tracker__list">
        {STEPS.map((step, index) => {
          const isActive = currentStep === step.number;
          const isCompleted = currentStep > step.number;
          const isClickable = isCompleted && onStepClick;

          return (
            <li
              key={step.number}
              className={[
                "workflow-step-tracker__item",
                isActive && "workflow-step-tracker__item--active",
                isCompleted && "workflow-step-tracker__item--completed",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {index > 0 && (
                <span
                  className={[
                    "workflow-step-tracker__connector",
                    isCompleted && "workflow-step-tracker__connector--completed",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-hidden="true"
                />
              )}
              <button
                type="button"
                className="workflow-step-tracker__step"
                onClick={isClickable ? () => onStepClick(step.number) : undefined}
                disabled={!isClickable}
                aria-current={isActive ? "step" : undefined}
              >
                <span className="workflow-step-tracker__circle">
                  {isCompleted ? (
                    <span className="workflow-step-tracker__check" aria-hidden="true">
                      ✓
                    </span>
                  ) : (
                    step.number
                  )}
                </span>
                <span className="workflow-step-tracker__label">{step.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default WorkflowStepTracker;
