import Link from "next/link";

import styles from "./profile-priorities-card.module.css";

interface ProfilePrioritiesCardProps {
  returnTo: string;
}

export function ProfilePrioritiesCard({ returnTo }: ProfilePrioritiesCardProps) {
  const href = `/profile/priorities?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <section
      aria-labelledby="profile-priorities-card-heading"
      className={styles.card}
      data-testid="profile-priorities-card"
    >
      <div aria-hidden="true" className={styles.mark}>
        <span>100</span>
        <small>sparks</small>
      </div>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>Your priorities</p>
        <h2 id="profile-priorities-card-heading">100 Sparks</h2>
        <p>Choose what matters to you. Distribute 100 sparks across your priorities to personalize your feed.</p>
        <p className={styles.note}>Optional and private. You can adjust them anytime.</p>
      </div>
      <Link className={styles.action} href={href} prefetch={false}>
        Adjust priorities <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
