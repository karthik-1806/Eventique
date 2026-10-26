import type { Metadata, Viewport } from 'next';
import './globals.css';
import { EventProvider } from '@/context/EventContext';

export const viewport: Viewport = {
  themeColor: '#070B16',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'Eventique — AI Event Planning Assistant',
  description: 'Plan your wedding, birthday, or community event with AI-powered intelligence. Get personalized budgets, timelines, vendor recommendations, and what-if scenarios.',
  keywords: 'event planning, AI assistant, wedding planner, birthday planner, budget management',
  openGraph: {
    title: 'Eventique — AI Event Planning Assistant',
    description: 'Transform your event requirements into actionable plans with AI',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <EventProvider>
          {children}
        </EventProvider>
      </body>
    </html>
  );
}
