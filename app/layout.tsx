import type { Metadata } from 'next';
import { draftMode } from 'next/headers';
import DraftBanner from './draft-banner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Plasmic workshop',
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { isEnabled: isDraft } = await draftMode();

  return (
    <html lang="en">
      <body>
        {isDraft && <DraftBanner />}
        {children}
      </body>
    </html>
  );
}
