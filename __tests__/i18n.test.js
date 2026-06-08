/**
 * i18n — Translation System Tests
 *
 * Verifies bilingual coverage (EN/ES), the t() accessor,
 * the getSection() helper, and structural consistency.
 */

import translations, { t, getSection } from '@/lib/i18n';

// ═══════════════════════════════════════════════════════════════
// t() function
// ═══════════════════════════════════════════════════════════════

describe('t() function', () => {
  it('returns English text by default', () => {
    const result = t('hero.titleLine1');
    expect(result).toBe('Know when to push.');
  });

  it('returns English text when lang="en"', () => {
    expect(t('hero.titleLine1', 'en')).toBe('Know when to push.');
  });

  it('returns Spanish text when lang="es"', () => {
    expect(t('hero.titleLine1', 'es')).toBe('Sabe cuándo dar todo.');
  });

  it('returns the key itself for unknown keys', () => {
    expect(t('nonexistent.key.path', 'en')).toBe('nonexistent.key.path');
  });

  it('handles deeply nested keys', () => {
    expect(t('dashboard.nav.overview', 'en')).toBe('Overview');
    expect(t('dashboard.nav.overview', 'es')).toBe('Resumen');
  });

  it('handles partial path that resolves to an object', () => {
    // t('nav') should return the nav object since it has no en/es at top level
    const result = t('nav', 'en');
    expect(typeof result).toBe('object');
  });

  it('returns key when path is partially valid but ends undefined', () => {
    expect(t('nav.features.nonexistent', 'en')).toBe('nav.features.nonexistent');
  });
});

// ═══════════════════════════════════════════════════════════════
// getSection() function
// ═══════════════════════════════════════════════════════════════

describe('getSection() function', () => {
  it('returns resolved English section for hero', () => {
    const hero = getSection('hero', 'en');
    expect(hero.titleLine1).toBe('Know when to push.');
    expect(hero.ctaPrimary).toBe('Get Started Free');
  });

  it('returns resolved Spanish section for hero', () => {
    const hero = getSection('hero', 'es');
    expect(hero.titleLine1).toBe('Sabe cuándo dar todo.');
    expect(hero.ctaPrimary).toBe('Empieza Gratis');
  });

  it('returns empty object for unknown section', () => {
    expect(getSection('nonexistent', 'en')).toEqual({});
  });

  it('resolves arrays correctly (sports list)', () => {
    const sports = getSection('sports', 'en');
    expect(Array.isArray(sports.list)).toBe(true);
    expect(sports.list[0]).toHaveProperty('name');
  });
});

// ═══════════════════════════════════════════════════════════════
// Bilingual coverage — every leaf node should have en + es
// ═══════════════════════════════════════════════════════════════

describe('bilingual coverage', () => {
  /**
   * Recursively collects all leaf-node paths that have { en, es } shape.
   * Also collects paths that are leaf objects WITHOUT both en and es
   * (which would be translation gaps).
   */
  function collectTranslationPaths(obj, prefix = '') {
    const complete = [];
    const missing = [];

    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if ('en' in value || 'es' in value) {
          // This is a translation leaf
          if ('en' in value && 'es' in value) {
            complete.push(path);
          } else {
            missing.push({ path, hasEn: 'en' in value, hasEs: 'es' in value });
          }
        } else {
          // Recurse into nested sections
          const sub = collectTranslationPaths(value, path);
          complete.push(...sub.complete);
          missing.push(...sub.missing);
        }
      }
    }

    return { complete, missing };
  }

  it('every translation key has both en AND es', () => {
    const { complete, missing } = collectTranslationPaths(translations);

    if (missing.length > 0) {
      const missingDetails = missing.map(
        m => `  ${m.path}: has_en=${m.hasEn}, has_es=${m.hasEs}`
      ).join('\n');
      fail(`Missing translations:\n${missingDetails}`);
    }

    // Sanity check: we should have found a significant number of translation keys
    expect(complete.length).toBeGreaterThan(50);
  });
});

// ═══════════════════════════════════════════════════════════════
// Nav items
// ═══════════════════════════════════════════════════════════════

describe('nav translations', () => {
  const navKeys = ['features', 'howItWorks', 'sports', 'pricing', 'getEarlyAccess'];

  it('all nav items have EN translations', () => {
    for (const key of navKeys) {
      expect(t(`nav.${key}`, 'en')).not.toBe(`nav.${key}`);
    }
  });

  it('all nav items have ES translations', () => {
    for (const key of navKeys) {
      expect(t(`nav.${key}`, 'es')).not.toBe(`nav.${key}`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// Dashboard nav items
// ═══════════════════════════════════════════════════════════════

describe('dashboard nav translations', () => {
  const dashNavKeys = [
    'overview', 'readiness', 'training', 'history', 'reports',
    'goals', 'injuries', 'profile', 'team', 'chat', 'analytics', 'admin',
  ];

  it('all dashboard nav items have EN translations', () => {
    for (const key of dashNavKeys) {
      const value = t(`dashboard.nav.${key}`, 'en');
      expect(value).not.toBe(`dashboard.nav.${key}`);
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('all dashboard nav items have ES translations', () => {
    for (const key of dashNavKeys) {
      const value = t(`dashboard.nav.${key}`, 'es');
      expect(value).not.toBe(`dashboard.nav.${key}`);
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// Upgrade prompt translations
// ═══════════════════════════════════════════════════════════════

describe('upgrade prompt translations', () => {
  it('has title, featurePrefix, featureSuffix, upgradeNow, learnMore', () => {
    const keys = ['title', 'featurePrefix', 'featureSuffix', 'upgradeNow', 'learnMore'];
    for (const key of keys) {
      expect(t(`upgrade.${key}`, 'en')).not.toBe(`upgrade.${key}`);
      expect(t(`upgrade.${key}`, 'es')).not.toBe(`upgrade.${key}`);
    }
  });

  it('has feature translations for all gated features', () => {
    const features = ['goals', 'chat', 'export', 'reports', 'injuries', 'analytics', 'maxAthletes'];
    for (const feat of features) {
      expect(t(`upgrade.features.${feat}`, 'en')).not.toBe(`upgrade.features.${feat}`);
      expect(t(`upgrade.features.${feat}`, 'es')).not.toBe(`upgrade.features.${feat}`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// No duplicate keys (structural check)
// ═══════════════════════════════════════════════════════════════

describe('structural integrity', () => {
  it('translations object is not empty', () => {
    expect(Object.keys(translations).length).toBeGreaterThan(10);
  });

  it('top-level sections exist', () => {
    const expectedSections = [
      'nav', 'hero', 'problem', 'howItWorks', 'demo', 'sports',
      'profiles', 'footer', 'dashboard', 'pricing', 'upgrade',
    ];
    for (const section of expectedSections) {
      expect(translations).toHaveProperty(section);
    }
  });
});
