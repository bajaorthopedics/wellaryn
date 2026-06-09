import "./globals.css";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ServiceWorkerRegistration from "@/components/ui/ServiceWorkerRegistration";
import Analytics from "@/components/ui/Analytics";
import CookieConsent from "@/components/ui/CookieConsent";

export const metadata = {
  title: "Wellaryn — Train Smarter. Prevent Injuries.",
  description:
    "Wellaryn is the AI-powered fitness platform that analyzes your biometric data to prevent injuries before they happen. Built for athletes, coaches, and sports doctors.",
  keywords: [
    "fitness AI",
    "injury prevention",
    "sports analytics",
    "readiness score",
    "HRV",
    "training load",
  ],
  manifest: "/manifest.json",
  themeColor: "#00C896",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Wellaryn",
  },
  icons: {
    apple: "/icons/icon.svg",
  },
  openGraph: {
    title: "Wellaryn — Train Smarter. Prevent Injuries.",
    description:
      "The AI that prevents injuries before they happen. Connect your wearables, get real-time readiness insights.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="noise-overlay">
      <body>
        <LanguageProvider>
          <AuthProvider>{children}</AuthProvider>
        </LanguageProvider>
        <ServiceWorkerRegistration />
        <Analytics />
        <CookieConsent />
      </body>
    </html>
  );
}

