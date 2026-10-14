'use client';

// Placeholder for the real site header so Plasmic pages lay out as they will
// in production: a sticky, zero-height overlay (hero bleeds underneath) that
// becomes a compact 54px dark bar once scrolled. Dimensions measured on
// sandals.com; see site-chrome.module.css.
import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './site-chrome.module.css';

const LINKS = ['Resorts', 'Inclusions', 'Celebrations', 'Groups', 'Specials'];

export default function FakeHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}
      aria-label="Site header (placeholder)"
    >
      <div className={styles.gradient} />
      <div className={styles.bar}>
        <div className={styles.pill}>
          <Link className={styles.logo} href="/">
            Sandals
          </Link>
          <ul className={styles.nav}>
            {LINKS.map(label => (
              <li key={label}>
                <a href="#">{label}</a>
              </li>
            ))}
          </ul>
          <div className={styles.right}>
            <span>Sign in</span>
            <span>Search</span>
            <span>English</span>
            <button type="button" className={styles.book}>
              Book Now
            </button>
            <span className={styles.burger} aria-hidden />
          </div>
        </div>
      </div>
    </header>
  );
}
