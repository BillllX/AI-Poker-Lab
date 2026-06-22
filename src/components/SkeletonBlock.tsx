import styles from "./SkeletonBlock.module.css";

type SkeletonBlockProps = {
  className?: string;
  height?: number | string;
  rounded?: "md" | "pill" | "sm";
  width?: number | string;
};

export function SkeletonBlock({
  className,
  height = 14,
  width = "100%",
  rounded = "md",
}: SkeletonBlockProps) {
  return (
    <span
      aria-hidden="true"
      className={[styles.block, styles[`rounded_${rounded}`], className].filter(Boolean).join(" ")}
      style={{ height, width }}
    />
  );
}

type SkeletonStackProps = {
  className?: string;
  label?: string;
  rows?: number;
};

export function SkeletonStack({ className, label = "Loading", rows = 4 }: SkeletonStackProps) {
  return (
    <div aria-busy="true" aria-label={label} className={[styles.stack, className].filter(Boolean).join(" ")} role="status">
      {Array.from({ length: rows }, (_, index) => (
        <SkeletonBlock
          height={index === 0 ? 18 : 12}
          key={index}
          width={index === rows - 1 ? "72%" : "100%"}
        />
      ))}
    </div>
  );
}

type SkeletonCardGridProps = {
  className?: string;
  count?: number;
  label?: string;
};

export function SkeletonCardGrid({ className, count = 3, label = "Loading" }: SkeletonCardGridProps) {
  return (
    <div aria-busy="true" aria-label={label} className={[styles.cardGrid, className].filter(Boolean).join(" ")} role="status">
      {Array.from({ length: count }, (_, index) => (
        <div className={styles.card} key={index}>
          <SkeletonBlock height={16} rounded="pill" width="42%" />
          <SkeletonBlock height={108} rounded="md" />
          <SkeletonBlock height={12} width="88%" />
          <SkeletonBlock height={12} width="64%" />
        </div>
      ))}
    </div>
  );
}
