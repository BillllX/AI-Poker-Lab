import Link from "next/link";
import styles from "./TableMomentOverlay.module.css";

export type TableMomentWinner = {
  amount: number;
  name: string;
  playerId: string;
  winReason?: string;
  wonChipsLabel: string;
};

type HandWinMomentProps = {
  eyebrow: string;
  handId: number;
  handLabel: string;
  onViewLog?: () => void;
  open: boolean;
  variant: "handWin";
  viewLogLabel?: string;
  winners: TableMomentWinner[];
};

type SessionEndMomentProps = {
  description: string;
  eyebrow: string;
  onPrimary: () => void;
  onSecondaryClick?: () => void;
  open: boolean;
  primaryBusy?: boolean;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  title: string;
  variant: "sessionEnd";
};

export type TableMomentOverlayProps = HandWinMomentProps | SessionEndMomentProps;

export function TableMomentOverlay(props: TableMomentOverlayProps) {
  if (!props.open) {
    return null;
  }

  if (props.variant === "handWin") {
    return (
      <section aria-live="polite" className={styles.overlay}>
        <div className={styles.card}>
          <div aria-hidden="true" className={styles.trophy}>
            🏆
          </div>
          <p className={styles.eyebrow}>{props.eyebrow}</p>
          <h2 className={styles.title}>
            {props.handLabel} #{props.handId}
          </h2>
          <div className={styles.winnerList}>
            {props.winners.map((winner) => (
              <article key={winner.playerId}>
                <strong>{winner.name}</strong>
                <span>
                  {winner.wonChipsLabel} +{winner.amount.toLocaleString()}
                </span>
                {winner.winReason ? <small>{winner.winReason}</small> : null}
              </article>
            ))}
          </div>
          {props.onViewLog && props.viewLogLabel ? (
            <button className={styles.logJump} type="button" onClick={props.onViewLog}>
              {props.viewLogLabel}
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section aria-live="polite" className={styles.overlay} role="dialog">
      <div className={styles.card}>
        <p className={styles.eyebrow}>{props.eyebrow}</p>
        <h2 className={styles.title}>{props.title}</h2>
        <p className={styles.description}>{props.description}</p>
        <div className={styles.actions}>
          <button
            className={styles.primaryAction}
            disabled={props.primaryBusy}
            type="button"
            onClick={props.onPrimary}
          >
            {props.primaryLabel}
          </button>
          <Link
            className={styles.secondaryAction}
            href={props.secondaryHref}
            onClick={props.onSecondaryClick}
          >
            {props.secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
