import Script from 'next/script';

/**
 * Plausible Analytics — privacy-friendly, no cookies, GDPR-compliant by default.
 * Set NEXT_PUBLIC_PLAUSIBLE_DOMAIN in .env to enable.
 * Sign up at https://plausible.io and add your domain.
 */
export default function Analytics() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return null;

  return (
    <Script
      defer
      data-domain={domain}
      src="https://plausible.io/js/script.js"
      strategy="afterInteractive"
    />
  );
}
