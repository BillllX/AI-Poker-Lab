import { liveRegionProps } from "@/lib/client/liveRegion";
import styles from "./FormFieldMessage.module.css";

type FormFieldErrorProps = {
  className?: string;
  message?: string | null;
  variant?: "box" | "inline";
};

export function FormFieldError({ message, className, variant = "box" }: FormFieldErrorProps) {
  if (!message) {
    return null;
  }

  const variantClass = variant === "inline" ? styles.errorInline : styles.error;

  return (
    <p className={[variantClass, className].filter(Boolean).join(" ")} {...liveRegionProps("alert")}>
      {message}
    </p>
  );
}

type FormFieldHintProps = {
  className?: string;
  live?: "alert" | "status";
  message?: string | null;
};

export function FormFieldHint({ message, className, live = "status" }: FormFieldHintProps) {
  if (!message) {
    return null;
  }

  return (
    <p className={[styles.hint, className].filter(Boolean).join(" ")} {...liveRegionProps(live)}>
      {message}
    </p>
  );
}
