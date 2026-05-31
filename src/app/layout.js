import "./globals.css";
import { LanguageProvider } from "@/contexts/LanguageContext";

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
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
