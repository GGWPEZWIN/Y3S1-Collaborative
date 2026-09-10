import { FLOW_STEPS, flowStepIndex } from "../tripFlow.js";

export default function TripFlowStepper({ screen }) {
  const current = flowStepIndex(screen);

  return (
    <ol className="m2-stepper" aria-label="Trip progress">
      {FLOW_STEPS.map((step, index) => {
        const state =
          index < current ? "done" : index === current ? "current" : "upcoming";
        return (
          <li
            key={step.id}
            className={`m2-stepper-item m2-stepper-item--${state}`}
            aria-current={state === "current" ? "step" : undefined}
          >
            <span className="m2-stepper-index" aria-hidden="true">
              {index + 1}
            </span>
            <span className="m2-stepper-label">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
