'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';
import styles from './pricing.module.css';

const plans = [
  {
    id: 'free',
    icon: '🏃',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      { key: 'dashboard', included: true },
      { key: 'history7', included: true },
      { key: 'wearable1', included: true },
      { key: 'basicScore', included: true },
      { key: 'fullHistory', included: false },
      { key: 'allWearables', included: false },
      { key: 'goals', included: false },
      { key: 'export', included: false },
      { key: 'chat', included: false },
      { key: 'athletes', included: false },
      { key: 'teamAnalytics', included: false },
      { key: 'reports', included: false },
      { key: 'injuryLog', included: false },
    ],
  },
  {
    id: 'pro',
    icon: '⚡',
    popular: true,
    monthlyPrice: 9.99,
    yearlyPrice: 95.88,
    features: [
      { key: 'dashboard', included: true },
      { key: 'fullHistory', included: true },
      { key: 'allWearables', included: true },
      { key: 'advancedScore', included: true },
      { key: 'goals', included: true },
      { key: 'export', included: true },
      { key: 'chat', included: true },
      { key: 'reports', included: true },
      { key: 'injuryLog', included: true },
      { key: 'athletes', included: false },
      { key: 'teamAnalytics', included: false },
    ],
  },
  {
    id: 'team',
    icon: '🏆',
    monthlyPrice: 29.99,
    yearlyPrice: 287.88,
    features: [
      { key: 'dashboard', included: true },
      { key: 'fullHistory', included: true },
      { key: 'allWearables', included: true },
      { key: 'advancedScore', included: true },
      { key: 'goals', included: true },
      { key: 'export', included: true },
      { key: 'chat', included: true },
      { key: 'reports', included: true },
      { key: 'injuryLog', included: true },
      { key: 'athletes10', included: true },
      { key: 'teamAnalytics', included: true },
    ],
  },
];

const faqs = [
  { key: 'trial' },
  { key: 'cancel' },
  { key: 'switch' },
  { key: 'payment' },
  { key: 'refund' },
];

export default function PricingPage() {
  const { lang } = useLanguage();
  const router = useRouter();
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(null);

  const T = useCallback((key) => t(`pricing.${key}`, lang), [lang]);

  const handleCheckout = async (planId) => {
    if (planId === 'free') {
      router.push('/auth/register');
      return;
    }

    setLoadingPlan(planId);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          interval: annual ? 'year' : 'month',
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        // If not authenticated, redirect to register
        if (res.status === 401) {
          router.push('/auth/register');
        }
      }
    } catch (err) {
      console.error('Checkout error:', err);
    } finally {
      setLoadingPlan(null);
    }
  };

  const formatPrice = (price) => {
    if (price === 0) return '$0';
    return `$${price.toFixed(2)}`;
  };

  return (
    <div className={styles.page}>
      {/* Navbar */}
      <nav className={styles.navbar}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.logo}>
            Wellar<span className={styles.logoAccent}>y</span>n
          </Link>
          <Link href="/auth/login" className={styles.signIn}>
            {lang === 'es' ? 'Iniciar Sesión' : 'Sign In'}
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <header className={styles.hero}>
        <div className={styles.heroBgOrb1} aria-hidden="true" />
        <div className={styles.heroBgOrb2} aria-hidden="true" />
        <span className={styles.tag}>
          <span className={styles.tagDot} />
          {T('tag')}
        </span>
        <h1 className={styles.title}>{T('title')}</h1>
        <p className={styles.subtitle}>{T('subtitle')}</p>

        {/* Toggle */}
        <div className={styles.toggleWrap}>
          <span className={`${styles.toggleLabel} ${!annual ? styles.toggleActive : ''}`}>
            {T('monthly')}
          </span>
          <button
            className={`${styles.toggle} ${annual ? styles.toggleOn : ''}`}
            onClick={() => setAnnual((a) => !a)}
            aria-label="Toggle billing interval"
          >
            <span className={styles.toggleThumb} />
          </button>
          <span className={`${styles.toggleLabel} ${annual ? styles.toggleActive : ''}`}>
            {T('annual')}
          </span>
          {annual && <span className={styles.saveBadge}>{T('save20')}</span>}
        </div>
      </header>

      {/* Plans Grid */}
      <section className={styles.plansSection}>
        <div className={styles.plansGrid}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`${styles.planCard} ${plan.popular ? styles.planPopular : ''}`}
            >
              {plan.popular && (
                <div className={styles.popularBadge}>{T('mostPopular')}</div>
              )}

              <div className={styles.planHeader}>
                <span className={styles.planIcon}>{plan.icon}</span>
                <h2 className={styles.planName}>{T(`plans.${plan.id}.name`)}</h2>
                <p className={styles.planDesc}>{T(`plans.${plan.id}.desc`)}</p>
              </div>

              <div className={styles.priceWrap}>
                <span className={styles.priceAmount}>
                  {formatPrice(annual ? plan.yearlyPrice / 12 : plan.monthlyPrice)}
                </span>
                {plan.monthlyPrice > 0 && (
                  <span className={styles.pricePeriod}>/ {T('perMonth')}</span>
                )}
                {annual && plan.yearlyPrice > 0 && (
                  <div className={styles.priceBilled}>
                    {T('billedAnnually')} — {formatPrice(plan.yearlyPrice)}/{T('year')}
                  </div>
                )}
              </div>

              <button
                className={`${styles.planCta} ${plan.popular ? styles.planCtaPrimary : styles.planCtaSecondary}`}
                onClick={() => handleCheckout(plan.id)}
                disabled={loadingPlan === plan.id}
              >
                {loadingPlan === plan.id
                  ? T('redirecting')
                  : T(`plans.${plan.id}.cta`)}
              </button>

              <ul className={styles.featureList}>
                {plan.features.map((feature) => (
                  <li
                    key={feature.key}
                    className={`${styles.featureItem} ${!feature.included ? styles.featureDisabled : ''}`}
                  >
                    <span className={styles.featureCheck}>
                      {feature.included ? '✓' : '—'}
                    </span>
                    <span>{T(`features.${feature.key}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className={styles.faqSection}>
        <h2 className={styles.faqTitle}>{T('faqTitle')}</h2>
        <div className={styles.faqList}>
          {faqs.map((faq) => (
            <div
              key={faq.key}
              className={`${styles.faqItem} ${openFaq === faq.key ? styles.faqOpen : ''}`}
            >
              <button
                className={styles.faqQuestion}
                onClick={() => setOpenFaq(openFaq === faq.key ? null : faq.key)}
              >
                <span>{T(`faq.${faq.key}.q`)}</span>
                <span className={styles.faqChevron}>
                  {openFaq === faq.key ? '−' : '+'}
                </span>
              </button>
              <div className={styles.faqAnswer}>
                <p>{T(`faq.${faq.key}.a`)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className={styles.bottomCta}>
        <h3>{T('bottomCtaTitle')}</h3>
        <p>{T('bottomCtaSubtitle')}</p>
        <button
          className={styles.bottomCtaBtn}
          onClick={() => router.push('/auth/register')}
        >
          {T('bottomCtaButton')}
        </button>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerLogo}>
            Wellar<span className={styles.logoAccent}>y</span>n
          </span>
          <span className={styles.footerCopy}>
            © {new Date().getFullYear()} Wellaryn. {t('footer.rights', lang)}
          </span>
        </div>
      </footer>
    </div>
  );
}
