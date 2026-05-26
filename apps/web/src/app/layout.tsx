import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { SiteHeader } from '@/components/site-header';
import './global.css';

const fontSans = Inter({ subsets: ['latin'], variable: '--font-inter' });

const SITE_TITLE = 'Chatarooni — talk to strangers';
const SITE_DESCRIPTION =
  'Free random text chat. Meet new people and make friends from around the world.';

export const metadata: Metadata = {
  // metadataBase = canonical origin. Without this, Next infers the host from
  // the request — which on prod (Cloudflare → Railway → Next) produces a
  // non-public URL in og:image, breaking social-share previews.
  metadataBase: new URL('https://chatarooni.com'),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  // Explicit openGraph + twitter blocks (with relative `/opengraph-image.png`)
  // are documented to resolve against metadataBase — guaranteed absolute URL.
  // The file at app/opengraph-image.png is still served at that route.
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Chatarooni',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630 }],
  },
  // Twitter falls back to og:* for title/description/image — we only need to
  // declare the card type to get the big-banner style instead of the small one.
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fontSans.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <SiteHeader />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
