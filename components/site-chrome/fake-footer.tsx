// Placeholder for the real site footer (ultramarine, sand text). Keeps pages
// from ending abruptly and gives the last section a realistic neighbour.
import styles from './site-chrome.module.css';

const COLUMNS: Record<string, string[]> = {
  Resorts: ['Jamaica', 'Saint Lucia', 'Bahamas', 'Barbados', 'Curaçao'],
  Inclusions: ['Dining', 'Bars', 'Water Sports', 'Scuba Diving', 'Golf'],
  Celebrations: ['Weddings', 'Honeymoons', 'Anniversaries', 'Vow Renewals'],
  Company: ['About', 'Careers', 'Press', 'Foundation', 'Contact'],
};

export default function FakeFooter() {
  return (
    <footer className={styles.footer} aria-label="Site footer (placeholder)">
      <div className={styles.footerGrid}>
        <div className={`${styles.footerCol} ${styles.footerBrand}`}>
          <span className={styles.logo}>Sandals</span>
          <p>
            Placeholder footer for the workshop host. Matches the production
            footer colour and approximate height.
          </p>
        </div>
        {Object.entries(COLUMNS).map(([title, items]) => (
          <div key={title} className={styles.footerCol}>
            <h4>{title}</h4>
            <ul>
              {items.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className={styles.footerBottom}>
        <span>© Sandals Resorts International — placeholder</span>
        <span>Privacy · Terms · Accessibility</span>
      </div>
    </footer>
  );
}
