import type { Metadata } from 'next';
import { Noto_Sans_JP } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { BookmarkProvider } from '@/contexts/BookmarkContext';
import PageViewTracker from '@/components/PageViewTracker';

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
    siteName: 'インクルーシブ教育ナビ',
    title: 'インクルーシブ教育ナビ | 特別支援教育の最新情報',
    description: 'すべての子どもの学びを支える最新情報。インクルーシブ教育に関するニュース、研究、実践事例をお届けします。',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'インクルーシブ教育ナビ | 特別支援教育の最新情報',
    description: 'すべての子どもの学びを支える最新情報',
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
        {/* Google Analytics - 本番環境でIDを設定 */}
        {/*
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-XXXXXXXXXX');
            `,
          }}
        />
        */}
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
