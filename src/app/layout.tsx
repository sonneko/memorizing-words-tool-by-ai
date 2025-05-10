import type { Metadata } from 'next';
import { Geist_Mono, Geist } from 'next/font/google'; // Geist is kept for other potential UI elements
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // For potential system messages

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'LexiCLI - CLI Word Learning',
  description: 'Offline-first PWA CLI-style word learning application.',
  manifest: '/manifest.json', // PWA Manifest
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head><meta name="theme-color" content="#262626" /></head>
      <body className="font-mono antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
