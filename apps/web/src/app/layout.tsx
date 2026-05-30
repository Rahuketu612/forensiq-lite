import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/contexts';
import { DevModeBadge } from '@/components/dev-mode-badge';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ForensiQ Lite - Forensic Audit Intelligence',
  description: 'Forensic audit intelligence platform for Indian CA firms',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            {children}
            <DevModeBadge />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}