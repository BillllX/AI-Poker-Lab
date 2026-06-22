import Link from "next/link";
import styles from "./TableMomentOverlay.module.css";

export type TableMomentWinner = {
  amount: number;
  name: string;
  netAmount?: number;
  netChipsLabel?: string;
  playerId: string;
  winReason?: string;
  wonChipsLabel: string;
};

type HandWinMomentProps = {
  countdownLabel?: string;
  countdownSeconds?: number;
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
      <section aria-live="polite" className={`${styles.overlay} ${styles.tableOverlay}`}>
        <div className={`${styles.card} ${styles.handWinCard}`}>
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
                  {winner.netChipsLabel && winner.netAmount !== undefined
                    ? `${winner.netChipsLabel} ${formatSignedAmount(winner.netAmount)}`
                    : `${winner.wonChipsLabel} +${winner.amount.toLocaleString()}`}
                </span>
                {winner.winReason ? <small>{winner.winReason}</small> : null}
                {winner.netChipsLabel && winner.netAmount !== undefined ? (
                  <small>
                    {winner.wonChipsLabel} {winner.amount.toLocaleString()}
                  </small>
                ) : null}
              </article>
            ))}
          </div>
          {props.onViewLog && props.viewLogLabel ? (
            <button className={styles.logJump} type="button" onClick={props.onViewLog}>
              {props.viewLogLabel}
            </button>
          ) : null}
          {props.countdownLabel && props.countdownSeconds !== undefined ? (
            <p className={styles.countdown}>{props.countdownLabel}</p>
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

function formatSignedAmount(amount: number) {
  return `${amount > 0 ? "+" : ""}${amount.toLocaleString()}`;
}
