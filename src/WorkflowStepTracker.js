import React from "react";

const STEPS = [
  { number: 1, label: "Environments" },
  { number: 2, label: "Input Forms" },
  { number: 3, label: "Job Preview" },
];

function WorkflowStepTracker({ currentStep, onStepClick, isStepClickable, isStepDisabled }) {
  const defaultClickable = (stepNumber) => currentStep > stepNumber;
  const canClick = (stepNumber) =>
    onStepClick &&
    (isStepClickable ? isStepClickable(stepNumber, currentStep) : defaultClickable(stepNumber));

  return (
    <nav className="workflow-step-tracker workflow-step-tracker--compact" aria-label="Workflow progress">
      <ol className="workflow-step-tracker__list">
        {STEPS.map((step, index) => {
          const isActive = currentStep === step.number;
          const isCompleted = currentStep > step.number;
          const isClickable = canClick(step.number);
          const isDisabled = !isClickable || (isStepDisabled?.(step.number) ?? false);

          return (
            <li
              key={step.number}
              className={[
                "workflow-step-tracker__item",
                isActive && "workflow-step-tracker__item--active",
                isCompleted && "workflow-step-tracker__item--completed",
                isClickable && "workflow-step-tracker__item--clickable",
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
                disabled={isDisabled}
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
