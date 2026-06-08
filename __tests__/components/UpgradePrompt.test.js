/**
 * UpgradePrompt — Component Snapshot Tests
 *
 * REQUIRED PACKAGES (not yet installed):
 *   npm install --save-dev @testing-library/react @testing-library/jest-dom jest-environment-jsdom
 *
 * Tests basic rendering of the UpgradePrompt component.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// ─── Mock dependencies ───────────────────────────────────────

// Mock next/link to render a plain <a> tag
jest.mock('next/link', () => {
  return function MockLink({ children, href, className }) {
    return <a href={href} className={className}>{children}</a>;
  };
});

// Mock LanguageContext
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ lang: 'en' }),
}));

// Mock CSS module
jest.mock('@/components/ui/UpgradePrompt.module.css', () => ({
  wrapper: 'wrapper',
  overlay: 'overlay',
  inline: 'inline',
  card: 'card',
  iconWrap: 'iconWrap',
  lockIcon: 'lockIcon',
  title: 'title',
  description: 'description',
  actions: 'actions',
  upgradeBtn: 'upgradeBtn',
  learnMore: 'learnMore',
}));

import UpgradePrompt from '@/components/ui/UpgradePrompt';

// ═══════════════════════════════════════════════════════════════
// Render Tests
// ═══════════════════════════════════════════════════════════════

describe('UpgradePrompt', () => {
  it('renders with feature name', () => {
    render(<UpgradePrompt feature="chat" />);

    // The upgrade prompt should display the feature name
    expect(screen.getByText('Team Messaging')).toBeInTheDocument();
  });

  it('renders upgrade button linking to /pricing', () => {
    render(<UpgradePrompt feature="goals" />);

    const upgradeLink = screen.getByText('Upgrade Now');
    expect(upgradeLink).toBeInTheDocument();
    expect(upgradeLink.closest('a')).toHaveAttribute('href', '/pricing');
  });

  it('renders learn more link', () => {
    render(<UpgradePrompt feature="export" />);

    const learnMore = screen.getByText('Learn More');
    expect(learnMore).toBeInTheDocument();
    expect(learnMore.closest('a')).toHaveAttribute('href', '/pricing');
  });

  it('displays the required plan name', () => {
    render(<UpgradePrompt feature="analytics" />);

    // analytics requires 'team' plan → displayed as 'Team'
    expect(screen.getByText(/Team/)).toBeInTheDocument();
  });

  it('renders inline variant by default', () => {
    const { container } = render(<UpgradePrompt feature="chat" />);

    expect(container.firstChild).toHaveClass('inline');
    expect(container.firstChild).not.toHaveClass('overlay');
  });

  it('renders overlay variant when specified', () => {
    const { container } = render(<UpgradePrompt feature="chat" variant="overlay" />);

    expect(container.firstChild).toHaveClass('overlay');
  });

  it('renders lock icon SVG', () => {
    const { container } = render(<UpgradePrompt feature="reports" />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <UpgradePrompt feature="chat" className="custom-class" />
    );

    expect(container.firstChild.className).toContain('custom-class');
  });
});
