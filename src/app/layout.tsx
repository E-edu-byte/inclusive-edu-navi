import type { Metadata } from 'next';
import { Noto_Sans_JP } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { BookmarkProvider } from '@/contexts/BookmarkContext';
import PageViewTracker from '@/components/PageViewTracker';

// Google Analytics 測定ID
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://news-navi.jp/inclusive'),
  title: {
    default: 'インクルーシブ教育ナビ | 特別支援教育の最新情報',
    template: '%s | インクルーシブ教育ナビ',
  },
  description: 'すべての子どもの学びを支える最新情報。インクルーシブ教育に関するニュース、研究、実践事例をお届けします。',
  keywords: ['特別支援教育', 'インクルーシブ教育', '発達障害', '合理的配慮', '通級指導', '個別支援'],
  authors: [{ name: 'インクルーシブ教育ナビ編集部' }],
  verification: {
    google: '_0bILKnQoufY0oJ-FQRkW3KdJDtCOXls3NW5LWgjOvU',
  },
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: 'https://news-navi.jp/inclusive/',
    siteName: 'インクルーシブ教育ナビ',
    title: 'NewsNavi - インクルーシブ教育ナビ',
    description: 'すべての子どもの学びを支える最新情報',
    images: [
      {
        url: 'https://news-navi.jp/inclusive/ogp-image.jpg',
        width: 1200,
        height: 630,
        alt: 'NewsNavi - インクルーシブ教育ナビ',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NewsNavi - インクルーシブ教育ナビ',
    description: 'すべての子どもの学びを支える最新情報',
    images: ['https://news-navi.jp/inclusive/ogp-image.jpg'],
  },
  alternates: {
    types: {
      'application/rss+xml': '/feed.xml',
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        {/* PWA対応 */}
        <link rel="manifest" href="/inclusive/manifest.json" />
        <meta name="theme-color" content="#0ea5e9" />
        {/* iOS対応 */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="教育ナビ" />
        <link rel="apple-touch-icon" href="/inclusive/icon.jpg" />

        {/* Google Analytics */}
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}');
              `}
            </Script>
          </>
        )}

        {/* Service Worker登録 */}
        <Script id="sw-register" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.register('/inclusive/sw.js')
                .then(function(registration) {
                  console.log('ServiceWorker registered');
                })
                .catch(function(error) {
                  console.log('ServiceWorker registration failed:', error);
                });
            }
          `}
        </Script>
      </head>
      <body className={notoSansJP.className}>
        <BookmarkProvider>
          <PageViewTracker />
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </BookmarkProvider>
      </body>
    </html>
  );
}
