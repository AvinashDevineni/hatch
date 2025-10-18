'use client';

import Image from 'next/image';
import Link from 'next/link';
import styles from './landing.module.css';

interface LandingProps {
  onTryNow: () => void;
}

export function Landing({ onTryNow }: LandingProps) {
  return (
    <div className={styles.landing}>
      <header className={styles.landingHeader}>
        <Image src="/logo.png" alt="Hatch logo" className={styles.landingLogo} width={50} height={50} priority />
        <h1 className={styles.landingBrand}>Hatch</h1>
      </header>

      <main className={styles.landingHero}>
        <h1 className={styles.landingTitle}>Automate your startup journey — from idea to launch</h1>
        <p className={styles.landingMission}>
          Our mission is simple: make startup building effortless, so your ideas can change the world without risking your job.
        </p>
      </main>

      <div className={styles.landingFeatures}>
        <div className={styles.landingFeatureCard}>
          <Image src="/lightbulb.png" alt="Lightbulb icon" width={60} height={60} />
          <h3>Validate your startup idea</h3>
          <p>AI insights on feasibility and demand</p>
        </div>

        <div className={styles.landingFeatureCard}>
          <Image src="/gear.png" alt="Gear icon" width={60} height={60} />
          <h3>Generate your MVP</h3>
          <p>Prototype and content created automatically</p>
        </div>

        <div className={styles.landingFeatureCard}>
          <Image src="/rocketship.png" alt="Rocket icon" width={60} height={60} />
          <h3>Launch & Grow</h3>
          <p>Create ads, get publicity and expand!</p>
        </div>
      </div>

      <button className={styles.landingCta} onClick={onTryNow}>
        Make my MVP
      </button>

      <p className={styles.landingFootnote}>
        Already building?{' '}
        <Link href="#builder" className={styles.landingLink}>
          Jump to the builder
        </Link>
      </p>
    </div>
  );
}
