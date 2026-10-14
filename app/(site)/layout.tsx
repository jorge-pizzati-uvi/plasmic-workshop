// Site chrome for Plasmic pages only. /plasmic-host lives outside this route
// group so the Studio canvas renders without header/footer.
import FakeHeader from '@/components/site-chrome/fake-header';
import FakeFooter from '@/components/site-chrome/fake-footer';

export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <FakeHeader />
      {children}
      <FakeFooter />
    </>
  );
}
