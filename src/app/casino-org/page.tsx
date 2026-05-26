import Image from "next/image";
import type { Metadata } from "next";
import styles from "./casino-org.module.css";

export const metadata: Metadata = {
  title: "AI Poker Lab for Casino.org",
  description:
    "A mobile-first AI poker engagement layer for Casino.org: virtual points, AI players, live tables, retention, and content growth.",
};

const screenshots = [
  {
    src: "/images/casino-pitch/home-leaderboard.png",
    alt: "Mobile homepage with AI Poker Lab leaderboard",
    title: "Instant consumer hook",
    text: "A clear mobile CTA, visible leaderboard, and no real-money framing.",
    width: 453,
    height: 954,
  },
  {
    src: "/images/casino-pitch/lobby-active.png",
    alt: "Mobile match lobby with active AI poker table",
    title: "Live match lobby",
    text: "Users can see active tables, seats, and their own AI player status.",
    width: 475,
    height: 955,
  },
  {
    src: "/images/casino-pitch/live-table.png",
    alt: "Mobile AI poker live table",
    title: "Watchable poker action",
    text: "The table turns virtual-point gameplay into a spectator experience.",
    width: 450,
    height: 949,
  },
  {
    src: "/images/casino-pitch/my-player.png",
    alt: "Mobile AI player training room",
    title: "AI player identity",
    text: "Each user owns a player profile, progress, style, rank, and match history.",
    width: 451,
    height: 960,
  },
  {
    src: "/images/casino-pitch/table-coaching.png",
    alt: "Mobile coaching panel for AI poker player",
    title: "Coaching loop",
    text: "Users return to tune strategy, watch outcomes, and improve their AI.",
    width: 457,
    height: 961,
  },
  {
    src: "/images/casino-pitch/home-growth.png",
    alt: "Mobile player growth section",
    title: "Content and research mode",
    text: "Advanced agent access creates AI-native stories for poker audiences.",
    width: 482,
    height: 960,
  },
];

const benefits = [
  {
    title: "Increase session duration",
    text: "Move visitors from reading a page to watching hands, checking rankings, and following their AI player.",
  },
  {
    title: "Create a virtual-points sink",
    text: "Tables, buy-ins, coaching, rankings, and daily rewards give non-real-money points a reason to circulate.",
  },
  {
    title: "Add an AI-native product angle",
    text: "Casino.org can own a differentiated AI poker experience instead of only publishing guides and reviews.",
  },
  {
    title: "Generate repeat visits",
    text: "Player progress, daily profit, live seating, and leaderboard movement give users a reason to come back.",
  },
  {
    title: "Support editorial and SEO",
    text: "AI poker challenges, agent battles, hand recaps, and strategy experiments can become recurring content.",
  },
  {
    title: "Pilot without real-money risk",
    text: "The product is designed for entertainment, virtual points, and free-to-play engagement, not gambling deposits.",
  },
];

const pilotSteps = [
  "Launch a co-branded Casino.org AI Poker Lab landing page.",
  "Run a 30-day campaign around AI poker training, leaderboards, and match recaps.",
  "Measure starts, hands watched, session duration, repeat visits, and virtual points consumed.",
  "Use the data to decide between promotion, licensing, white-label integration, or acquisition talks.",
];

export default function CasinoOrgPitchPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>AI Poker Partnership Concept</p>
          <h1>Give Casino.org an AI poker experience users can actually play with.</h1>
          <p className={styles.lede}>
            AI Poker Lab is a mobile-first, free-to-play Texas Hold&apos;em experience where users create,
            train, and watch AI players compete with virtual points. It can help Casino.org turn poker
            traffic into deeper engagement, repeat visits, and AI-native content.
          </p>
          <div className={styles.heroActions}>
            <a href="#pilot">Explore pilot plan</a>
            <a href="#screens" className={styles.secondaryAction}>
              View mobile product
            </a>
          </div>
          <div className={styles.trustRow} aria-label="Product positioning">
            <span>No real-money deposits</span>
            <span>Virtual points</span>
            <span>AI agents</span>
            <span>Mobile-first</span>
          </div>
        </div>

        <div className={styles.heroPhones} aria-label="Real mobile product screenshots">
          <PhoneCard image={screenshots[2]} priority />
          <PhoneCard image={screenshots[3]} priority className={styles.offsetPhone} />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>Why Casino.org</p>
          <h2>Most casino media products are content-first. This adds an interactive AI layer.</h2>
          <p>
            The experience fits naturally beside poker guides, free-to-play tools, newsletters, and
            editorial campaigns while staying away from real-money wagering.
          </p>
        </div>

        <div className={styles.benefitGrid}>
          {benefits.map((benefit) => (
            <article className={styles.benefitCard} key={benefit.title}>
              <h3>{benefit.title}</h3>
              <p>{benefit.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.productLoop}>
        <div>
          <p className={styles.eyebrow}>Engagement loop</p>
          <h2>Train → Watch → Coach → Rank → Return</h2>
          <p>
            Users do not need to manually play every hand. They set a strategy, launch an AI player,
            watch live decisions, coach the next hand, and track results through points and rankings.
          </p>
        </div>
        <div className={styles.loopCards}>
          {["Create AI player", "Auto-seat into live table", "Watch and coach", "Review ranking"].map(
            (item, index) => (
              <article key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{item}</strong>
              </article>
            ),
          )}
        </div>
      </section>

      <section className={styles.section} id="screens">
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>Real mobile screenshots</p>
          <h2>Current product surfaces that can become a Casino.org pilot.</h2>
          <p>
            These are the actual mobile screens from the working product: lobby, live table, player
            profile, coaching, leaderboard, and agent access.
          </p>
        </div>

        <div className={styles.screenshotGrid}>
          {screenshots.map((image) => (
            <PhoneCard image={image} key={image.src} />
          ))}
        </div>
      </section>

      <section className={styles.pilot} id="pilot">
        <div>
          <p className={styles.eyebrow}>Suggested pilot</p>
          <h2>A 30-day co-branded experiment before any bigger commercial decision.</h2>
          <p>
            The first step should be a low-risk pilot, not a heavy procurement process. The goal is to
            prove whether AI poker improves engagement for Casino.org&apos;s existing audience.
          </p>
        </div>
        <ol>
          {pilotSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className={styles.cta}>
        <p className={styles.eyebrow}>Partnership options</p>
        <h2>Co-branded pilot, embedded mini-game, content partnership, white-label license, or acquisition discussion.</h2>
        <p>
          Recommended ask: a short product review call with Casino.org&apos;s product, content, or
          partnerships team to decide whether an AI poker pilot is worth testing.
        </p>
        <a href="mailto:partnerships@casino.org?subject=AI%20Poker%20Engagement%20Concept">Draft outreach CTA</a>
      </section>
    </main>
  );
}

function PhoneCard({
  image,
  priority,
  className,
}: {
  image: (typeof screenshots)[number];
  priority?: boolean;
  className?: string;
}) {
  return (
    <article className={`${styles.phoneCard} ${className ?? ""}`}>
      <div className={styles.phoneFrame}>
        <Image
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          priority={priority}
          sizes="(max-width: 640px) 292px, 315px"
        />
      </div>
      <div className={styles.phoneCaption}>
        <h3>{image.title}</h3>
        <p>{image.text}</p>
      </div>
    </article>
  );
}
