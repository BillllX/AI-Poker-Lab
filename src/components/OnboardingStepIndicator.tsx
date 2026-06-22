import styles from "./OnboardingStepIndicator.module.css";

type OnboardingStepIndicatorProps = {
  ariaLabel: string;
  currentStep: number;
  steps: string[];
};

export function OnboardingStepIndicator({ ariaLabel, currentStep, steps }: OnboardingStepIndicatorProps) {
  const progressPercent =
    steps.length <= 1 ? 100 : Math.round(((currentStep - 1) / (steps.length - 1)) * 100);

  return (
    <div className={styles.wrap}>
      {steps.length > 1 ? (
        <div aria-hidden="true" className={styles.progressTrack}>
          <span className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
        </div>
      ) : null}
      <ol aria-label={ariaLabel} className={styles.stepList}>
        {steps.map((label, index) => {
          const stepNumber = index + 1;
          const complete = stepNumber < currentStep;
          const active = stepNumber === currentStep;
          return (
            <li
              aria-current={active ? "step" : undefined}
              className={[
                styles.stepItem,
                complete ? styles.stepComplete : "",
                active ? styles.stepActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={label}
            >
              <span aria-hidden="true" className={styles.stepNumber}>
                {complete ? "✓" : stepNumber}
              </span>
              <span className={styles.stepLabel}>{label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function resolveQuickPlayOnboardingStep(input: {
  authUser: boolean;
  guestAccountReady: boolean;
  quickPlaySuccess: boolean;
}) {
  if (input.quickPlaySuccess) {
    return input.authUser ? 2 : 3;
  }
  if (input.authUser) {
    return 1;
  }
  if (!input.guestAccountReady) {
    return 1;
  }
  return 2;
}
