'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { t, getSection } from '@/lib/i18n';
import styles from './page.module.css';

/* ============================================
   Wellaryn Landing Page — Bilingual (EN/ES)
   ============================================ */

export default function Home() {
  const { lang, toggleLang } = useLanguage();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [demoVisible, setDemoVisible] = useState(false);
  const demoGaugeRef = useRef(null);

  /* --- Scroll listener for navbar glass effect --- */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* --- IntersectionObserver for .reveal elements --- */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );

    const els = document.querySelectorAll('.reveal');
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  /* --- IntersectionObserver for demo gauge animation --- */
  useEffect(() => {
    if (!demoGaugeRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setDemoVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(demoGaugeRef.current);
    return () => observer.disconnect();
  }, []);

  /* --- Smooth scroll to section --- */
  const scrollTo = useCallback((id) => {
    setMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, []);

  /* --- Early access form --- */
  const handleSubmit = (e) => {
    e.preventDefault();
    if (email.trim()) setSubmitted(true);
  };

  // Get translated sections
  const nav = getSection('nav', lang);
  const hero = getSection('hero', lang);
  const problem = getSection('problem', lang);
  const howItWorks = getSection('howItWorks', lang);
  const demo = getSection('demo', lang);
  const sportsSection = getSection('sports', lang);
  const profiles = getSection('profiles', lang);
  const statsSection = getSection('stats', lang);
  const finalCta = getSection('finalCta', lang);
  const footer = getSection('footer', lang);
  const featuresGrid = getSection('featuresGrid', lang);
  const coachSection = getSection('coachSection', lang);
  const integrations = getSection('integrations', lang);
  const testimonials = getSection('testimonials', lang);
  const pricingPreview = getSection('pricingPreview', lang);

  // Wearable brand names for the hero marquee
  const wearableBrands = ['Oura Ring', 'WHOOP', 'Garmin', 'Fitbit', 'Apple Health'];
  const wearableEmojis = ['💍', '🟢', '⌚', '⌚', '🍎'];

  return (
    <>
      {/* ===================== NAVBAR ===================== */}
      <nav
        id="navbar"
        className={`${styles.navbar} ${scrolled ? styles.navbarScrolled : ''}`}
      >
        <div className={styles.navInner}>
          <div className={styles.logo}>
            Wellar<span className={styles.logoAccent}>y</span>n
          </div>

          <ul className={styles.navLinks}>
            <li>
              <button id="nav-features" className={styles.navLink} onClick={() => scrollTo('features')}>
                {nav.features}
              </button>
            </li>
            <li>
              <button id="nav-how" className={styles.navLink} onClick={() => scrollTo('how-it-works')}>
                {nav.howItWorks}
              </button>
            </li>
            <li>
              <button id="nav-sports" className={styles.navLink} onClick={() => scrollTo('sports')}>
                {nav.sports}
              </button>
            </li>
            <li>
              <Link href="/pricing" className={styles.navLink}>
                {nav.pricing}
              </Link>
            </li>
          </ul>

          <Link href="/auth/login" className={styles.navSignIn} id="nav-signin">
            {lang === 'es' ? 'Iniciar Sesión' : 'Sign In'}
          </Link>

          <button id="nav-cta" className={`btn btn-primary ${styles.navCta}`} onClick={() => router.push('/auth/register')}>
            {nav.getEarlyAccess}
          </button>

          <button
            id="lang-toggle"
            className={styles.langToggle}
            onClick={toggleLang}
            aria-label="Toggle language"
            title={lang === 'en' ? 'Cambiar a español' : 'Switch to English'}
          >
            {t('langToggle', lang)}
          </button>

          <button
            id="hamburger-btn"
            className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ''}`}
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      {/* --- Mobile Menu Overlay --- */}
      <div className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ''}`}>
        <button className={styles.mobileNavLink} onClick={() => scrollTo('features')}>{nav.features}</button>
        <button className={styles.mobileNavLink} onClick={() => scrollTo('how-it-works')}>{nav.howItWorks}</button>
        <button className={styles.mobileNavLink} onClick={() => scrollTo('sports')}>{nav.sports}</button>
        <Link href="/pricing" className={styles.mobileNavLink} onClick={() => setMenuOpen(false)}>{nav.pricing}</Link>
        <Link href="/auth/login" className={styles.mobileNavLink} onClick={() => setMenuOpen(false)}>{lang === 'es' ? 'Iniciar Sesión' : 'Sign In'}</Link>
        <button className="btn btn-primary btn-lg" onClick={() => router.push('/auth/register')}>{nav.getEarlyAccess}</button>
        <button className={styles.langToggle} onClick={toggleLang}>{t('langToggle', lang)}</button>
      </div>

      <main>
        {/* ===================== HERO ===================== */}
        <section id="hero" className={styles.hero}>
          <div className={styles.heroBg} aria-hidden="true" />
          <div className={styles.heroBgOrb1} aria-hidden="true" />
          <div className={styles.heroBgOrb2} aria-hidden="true" />

          <div className={styles.heroInner}>
            <div className={styles.heroContent}>
              <div className={styles.heroTag}>
                <span className={styles.heroTagDot} />
                {hero.tag}
              </div>

              <h1 className={`text-hero ${styles.heroTitle}`}>
                {hero.titleLine1}
                <br />
                <span className={styles.heroTitleLine2}>{hero.titleLine2}</span>
              </h1>

              <p className={styles.heroSubtitle}>{hero.subtitle}</p>

              <div className={styles.heroCtas}>
                <button id="hero-cta-primary" className="btn btn-primary btn-lg" onClick={() => router.push('/auth/register')}>
                  {hero.ctaPrimary}
                </button>
                <button id="hero-cta-secondary" className="btn btn-secondary btn-lg" onClick={() => router.push('/pricing')}>
                  {hero.ctaSecondary}
                </button>
              </div>

              {/* Scrolling Wearable Badge Bar */}
              <div className={styles.heroBadgeBar}>
                <div className={styles.heroBadgeTrack}>
                  {[...wearableBrands, ...wearableBrands].map((brand, i) => (
                    <div key={`${brand}-${i}`} className={styles.heroBadge}>
                      <span className={styles.heroBadgeIcon}>{wearableEmojis[i % wearableEmojis.length]}</span>
                      <span className={styles.heroBadgeName}>{brand}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.heroVisual}>
              <div className={styles.gaugeContainer}>
                <div className={styles.gaugeGlow} aria-hidden="true" />
                <svg className={styles.gaugeSvg} viewBox="0 0 300 300">
                  <circle className={styles.gaugeTrack} cx="150" cy="150" r="140" />
                  <circle className={styles.gaugeProgress} cx="150" cy="150" r="140" />
                </svg>
                <div className={styles.gaugeCenter}>
                  <div className={styles.gaugeScore}>73</div>
                  <div className={styles.gaugeLabel}>{hero.gaugeLabel}</div>
                  <div className={styles.gaugeStatusBadge}>{hero.gaugeStatus}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== PROBLEM ===================== */}
        <section id="features" className={`${styles.problem} section`}>
          <div className="container">
            <div className={`${styles.sectionHeading} reveal`}>
              <span className={styles.sectionTag}>{problem.tag}</span>
              <h2>
                {problem.title.split('\n').map((line, i) => (
                  <span key={i}>{line}{i === 0 && <br />}</span>
                ))}
              </h2>
              <p>{problem.subtitle}</p>
            </div>

            <div className={`${styles.problemGrid} reveal`}>
              {problem.fragments.map((item) => (
                <div key={item.name} className={styles.fragmentCard}>
                  <span className={styles.fragmentIcon}>{item.icon}</span>
                  <div className={styles.fragmentName}>{item.name}</div>
                  <div className={styles.fragmentStatus}>{item.status}</div>
                </div>
              ))}
            </div>

            <div className={`${styles.arrowDown} reveal`}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
            </div>

            <div className={`${styles.solutionCard} reveal`}>
              <div className={styles.solutionLogo}>
                Wellar<span className={styles.logoAccent}>y</span>n
              </div>
              <p className={styles.solutionDesc}>{problem.solution}</p>
            </div>
          </div>
        </section>

        {/* ===================== FEATURES GRID (NEW — 10 features) ===================== */}
        <section id="all-features" className={styles.featuresSection}>
          <div className="container">
            <div className={`${styles.sectionHeading} reveal`}>
              <span className={styles.sectionTag}>{featuresGrid.tag}</span>
              <h2>{featuresGrid.title}</h2>
              <p>{featuresGrid.subtitle}</p>
            </div>

            <div className={`${styles.featuresGrid} reveal`}>
              {featuresGrid.items.map((feat, i) => (
                <div key={i} className={styles.featureCard}>
                  <span className={styles.featureIcon}>{feat.icon}</span>
                  <h3 className={styles.featureTitle}>{feat.title}</h3>
                  <p className={styles.featureDesc}>{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===================== HOW IT WORKS ===================== */}
        <section id="how-it-works" className={styles.howItWorks}>
          <div className="container">
            <div className={`${styles.sectionHeading} reveal`}>
              <span className={styles.sectionTag}>{howItWorks.tag}</span>
              <h2>{howItWorks.title}</h2>
              <p>{howItWorks.subtitle}</p>
            </div>

            <div className={`${styles.stepsGrid} reveal`}>
              {howItWorks.steps.map((step) => (
                <div key={step.num} className={styles.stepCard}>
                  <div className={styles.stepNumber}>
                    {step.num}
                    <span className={styles.stepIcon}>{step.icon}</span>
                  </div>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepDesc}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===================== READINESS DEMO ===================== */}
        <section id="readiness-demo" className={`${styles.readinessDemo} section`}>
          <div className="container">
            <div className={`${styles.sectionHeading} reveal`}>
              <span className={styles.sectionTag}>{demo.tag}</span>
              <h2>{demo.title}</h2>
              <p>{demo.subtitle}</p>
            </div>

            <div className={`${styles.demoCard} reveal`} ref={demoGaugeRef}>
              <div className={styles.demoHeader}>
                <div className={styles.demoHeaderLeft}>
                  <h3>{demo.dailyReadiness}</h3>
                  <span>{lang === 'en' ? 'Today, May 30' : 'Hoy, 30 de Mayo'}</span>
                </div>
                <div className={styles.demoLive}>
                  <span className={styles.demoLiveDot} />
                  {demo.live}
                </div>
              </div>

              <div className={styles.demoGaugeSection}>
                <div className={styles.demoGaugeContainer}>
                  <svg className={styles.demoGaugeSvg} viewBox="0 0 180 180">
                    <circle className={styles.demoGaugeTrack} cx="90" cy="90" r="80" />
                    <circle className={`${styles.demoGaugeProgress} ${demoVisible ? styles.demoGaugeAnimated : ''}`} cx="90" cy="90" r="80" />
                  </svg>
                  <div className={styles.demoGaugeCenter}>
                    <div className={styles.demoGaugeScore}>54</div>
                    <div className={styles.demoGaugeLabel}>/ 100</div>
                  </div>
                </div>
                <span className="badge badge-yellow">{demo.moderateRisk}</span>
              </div>

              <div className={styles.demoMetrics}>
                <div className={styles.demoMetric}>
                  <div className={styles.demoMetricValue}>45.2ms</div>
                  <div className={styles.demoMetricLabel}>{demo.hrvLabel}</div>
                </div>
                <div className={styles.demoMetric}>
                  <div className={styles.demoMetricValue}>5h 40m</div>
                  <div className={styles.demoMetricLabel}>{demo.sleepLabel}</div>
                </div>
                <div className={styles.demoMetric}>
                  <div className={styles.demoMetricValue}>↑25%</div>
                  <div className={styles.demoMetricLabel}>{demo.trainingLabel}</div>
                </div>
              </div>

              <div className={styles.demoRiskBadge}>
                <div className={styles.riskBadgeInner}>{demo.riskLabel}</div>
                <div className={styles.riskFactor}>{demo.riskFactor}</div>
              </div>

              <div className={styles.demoRecs}>
                <div className={styles.demoRecsTitle}>{demo.recommendations}</div>
                <ul className={styles.demoRecList}>
                  {demo.recs.map((rec, i) => (
                    <li key={i} className={styles.demoRecItem}>
                      <span className={styles.demoRecIcon}>→</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== COACH/DOCTOR SECTION (NEW) ===================== */}
        <section id="for-coaches" className={styles.coachSection}>
          <div className="container">
            <div className={`${styles.sectionHeading} reveal`}>
              <span className={styles.sectionTag}>{coachSection.tag}</span>
              <h2>{coachSection.title}</h2>
              <p>{coachSection.subtitle}</p>
            </div>

            <div className={`${styles.coachGrid} reveal`}>
              {coachSection.cards.map((card, i) => (
                <div key={i} className={styles.coachCard}>
                  <div className={styles.coachCardIcon}>{card.icon}</div>
                  <h3 className={styles.coachCardTitle}>{card.title}</h3>
                  <p className={styles.coachCardDesc}>{card.desc}</p>
                </div>
              ))}
            </div>

            <div className={`${styles.coachCta} reveal`}>
              <button className="btn btn-secondary btn-lg" onClick={() => router.push('/auth/register')}>
                {lang === 'es' ? 'Crear Cuenta de Coach' : 'Create Coach Account'}
              </button>
            </div>
          </div>
        </section>

        {/* ===================== INTEGRATIONS (NEW) ===================== */}
        <section id="integrations" className={`${styles.integrationsSection} section`}>
          <div className="container">
            <div className={`${styles.sectionHeading} reveal`}>
              <span className={styles.sectionTag}>{integrations.tag}</span>
              <h2>{integrations.title}</h2>
              <p>{integrations.subtitle}</p>
            </div>

            <div className={`${styles.integrationsGrid} reveal`}>
              {integrations.devices.map((device, i) => (
                <div key={i} className={`${styles.integrationCard} ${device.name === 'Apple Health' ? styles.integrationComingSoon : ''}`}>
                  <span className={styles.integrationLogo}>{wearableEmojis[i]}</span>
                  <span className={styles.integrationName}>{device.name}</span>
                  <span className={`${styles.integrationStatus} ${device.name === 'Apple Health' ? styles.integrationStatusSoon : ''}`}>
                    {device.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===================== SPORTS ===================== */}
        <section id="sports" className={styles.sports}>
          <div className="container">
            <div className={`${styles.sectionHeading} reveal`}>
              <span className={styles.sectionTag}>{sportsSection.tag}</span>
              <h2>{sportsSection.title}</h2>
              <p>{sportsSection.subtitle}</p>
            </div>

            <div className={`${styles.sportsGrid} reveal`}>
              {sportsSection.list.map((sport) => (
                <div key={sport.name} className={styles.sportCard}>
                  <span className={styles.sportEmoji}>{sport.emoji}</span>
                  <span className={styles.sportName}>{sport.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===================== MULTI-PROFILE ===================== */}
        <section id="profiles" className={`${styles.profiles} section`}>
          <div className="container">
            <div className={`${styles.sectionHeading} reveal`}>
              <span className={styles.sectionTag}>{profiles.tag}</span>
              <h2>{profiles.title}</h2>
              <p>{profiles.subtitle}</p>
            </div>

            <div className={`${styles.profilesGrid} reveal`}>
              {profiles.cards.map((profile) => (
                <div key={profile.title} className={styles.profileCard}>
                  <span className={styles.profileIcon}>{profile.icon}</span>
                  <h3 className={styles.profileTitle}>{profile.title}</h3>
                  <p className={styles.profileDesc}>{profile.desc}</p>
                  <ul className={styles.profileFeatures}>
                    {profile.features.map((f) => (
                      <li key={f} className={styles.profileFeature}>
                        <span className={styles.profileCheck}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===================== TESTIMONIALS (NEW) ===================== */}
        <section id="testimonials" className={styles.testimonialsSection}>
          <div className="container">
            <div className={`${styles.sectionHeading} reveal`}>
              <span className={styles.sectionTag}>{testimonials.tag}</span>
              <h2>{testimonials.title}</h2>
            </div>

            <div className={`${styles.testimonialsGrid} reveal`}>
              {testimonials.items.map((item, i) => (
                <div key={i} className={styles.testimonialCard}>
                  <div className={styles.testimonialQuote}>
                    <span className={styles.testimonialQuoteMark}>&ldquo;</span>
                    {item.quote}
                  </div>
                  <div className={styles.testimonialAuthor}>
                    <div className={styles.testimonialAvatar}>
                      {item.author.charAt(0)}
                    </div>
                    <div>
                      <div className={styles.testimonialName}>{item.author}</div>
                      <div className={styles.testimonialRole}>{item.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===================== STATS ===================== */}
        <section id="stats" className={styles.stats}>
          <div className="container">
            <div className={`${styles.statsGrid} reveal`}>
              {statsSection.items.map((stat, i) => (
                <div key={i} className={styles.statItem}>
                  <div className={`${styles.statNumber} ${i === 0 ? styles.statNumberAccent : ''}`}>
                    {stat.number}
                  </div>
                  <p className={styles.statDesc}>{stat.desc}</p>
                  {stat.source && (
                    <p className={styles.statSource}>{stat.source}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===================== PRICING PREVIEW (NEW) ===================== */}
        <section id="pricing-preview" className={`${styles.pricingPreview} section`}>
          <div className="container">
            <div className={`${styles.sectionHeading} reveal`}>
              <span className={styles.sectionTag}>{pricingPreview.tag}</span>
              <h2>{pricingPreview.title}</h2>
              <p>{pricingPreview.subtitle}</p>
            </div>

            <div className={`${styles.pricingGrid} reveal`}>
              {/* Free */}
              <div className={styles.pricingCard}>
                <div className={styles.pricingCardHeader}>
                  <h3 className={styles.pricingPlanName}>{pricingPreview.free}</h3>
                  <p className={styles.pricingPlanDesc}>{pricingPreview.freeDesc}</p>
                </div>
                <div className={styles.pricingPrice}>
                  <span className={styles.pricingAmount}>{pricingPreview.freePrice}</span>
                </div>
                <button className="btn btn-secondary" onClick={() => router.push('/auth/register')}>
                  {pricingPreview.getStarted}
                </button>
              </div>

              {/* Pro — highlighted */}
              <div className={`${styles.pricingCard} ${styles.pricingCardPopular}`}>
                <div className={styles.pricingPopularBadge}>{pricingPreview.popular}</div>
                <div className={styles.pricingCardHeader}>
                  <h3 className={styles.pricingPlanName}>{pricingPreview.pro}</h3>
                  <p className={styles.pricingPlanDesc}>{pricingPreview.proDesc}</p>
                </div>
                <div className={styles.pricingPrice}>
                  <span className={styles.pricingAmount}>{pricingPreview.proPrice}</span>
                  <span className={styles.pricingPeriod}>{pricingPreview.perMonth}</span>
                </div>
                <button className="btn btn-primary" onClick={() => router.push('/auth/register')}>
                  {pricingPreview.getStarted}
                </button>
              </div>

              {/* Team */}
              <div className={styles.pricingCard}>
                <div className={styles.pricingCardHeader}>
                  <h3 className={styles.pricingPlanName}>{pricingPreview.team}</h3>
                  <p className={styles.pricingPlanDesc}>{pricingPreview.teamDesc}</p>
                </div>
                <div className={styles.pricingPrice}>
                  <span className={styles.pricingAmount}>{pricingPreview.teamPrice}</span>
                  <span className={styles.pricingPeriod}>{pricingPreview.perMonth}</span>
                </div>
                <button className="btn btn-secondary" onClick={() => router.push('/auth/register')}>
                  {pricingPreview.getStarted}
                </button>
              </div>
            </div>

            <div className={`${styles.pricingViewAll} reveal`}>
              <Link href="/pricing" className="btn btn-ghost">
                {pricingPreview.viewAll} →
              </Link>
            </div>
          </div>
        </section>

        {/* ===================== FINAL CTA ===================== */}
        <section id="final-cta" className={`${styles.finalCta} section`}>
          <div className={styles.finalCtaBg} aria-hidden="true" />
          <div className="container">
            <div className={`${styles.finalCtaContent} reveal`}>
              <h2>
                {finalCta.titleLine1}<br />
                {finalCta.titleLine2}<br />
                <span className="text-gradient">{finalCta.titleLine3}</span>
              </h2>
              <p>{finalCta.subtitle}</p>

              <div className={styles.ctaButtons}>
                <button
                  id="submit-btn"
                  className="btn btn-primary btn-lg"
                  onClick={() => router.push('/auth/register')}
                >
                  {finalCta.joinWaitlist}
                </button>
                <Link href="/pricing" className="btn btn-secondary btn-lg">
                  {hero.ctaSecondary}
                </Link>
              </div>

              <p className={styles.ctaPrivacy}>{finalCta.privacy}</p>
            </div>
          </div>
        </section>
      </main>

      {/* ===================== FOOTER ===================== */}
      <footer className={styles.footer}>
        <div className={styles.footerDisclaimer}>
          <p>{footer.disclaimer}</p>
        </div>
        <div className={styles.footerInner}>
          <div className={styles.footerLeft}>
            <span className={styles.footerLogo}>
              Wellar<span className={styles.logoAccent}>y</span>n
            </span>
            <span className={styles.footerCopy}>
              © {new Date().getFullYear()} Wellaryn. {footer.rights}
            </span>
          </div>
          <ul className={styles.footerLinks}>
            <li><Link href="/legal/privacy" className={styles.footerLink}>{footer.privacy}</Link></li>
            <li><Link href="/legal/terms" className={styles.footerLink}>{footer.terms}</Link></li>
            <li><a href="mailto:hello@wellaryn.com" className={styles.footerLink}>{footer.contact}</a></li>
          </ul>
        </div>
      </footer>
    </>
  );
}
