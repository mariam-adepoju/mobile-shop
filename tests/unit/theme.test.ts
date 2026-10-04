import {
  DEMO_STORE_NOTICE,
  MIN_TOUCH_TARGET,
  colors,
  fontSize,
  layout,
  letterSpacing,
  lineHeight,
  radii,
  shadows,
  spacing,
} from '@/theme';

/**
 * These assertions exist to catch drift from `DESIGN.md`, which is the visual
 * source of truth (AGENTS.md 2). If a token changes here, the change belongs
 * in DESIGN.md first.
 */
describe('DESIGN.md colour tokens', () => {
  it('matches the DESIGN.md section 2 table exactly', () => {
    expect(colors).toEqual({
      primary: '#16a34a',
      primaryHover: '#15803d',
      rausch: '#ff385c',
      rausch600: '#e00b41',
      hof: '#222222',
      foggy: '#6a6a6a',
      grey500: '#c1c1c1',
      bebe: '#ebebeb',
      deco: '#dddddd',
      faint: '#f7f7f7',
      white: '#ffffff',
    });
  });

  it('uses only lowercase hex, so tokens never disagree on case', () => {
    for (const value of Object.values(colors)) {
      expect(value).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe('DESIGN.md type scale', () => {
  it('matches the DESIGN.md section 3 sizes', () => {
    expect(fontSize).toEqual({
      caption: 11,
      body: 14,
      ui: 16,
      subheading: 20,
      headingSm: 22,
      heading: 28,
    });
  });

  it('defines a line height and letter spacing for every size', () => {
    for (const role of Object.keys(fontSize)) {
      expect(lineHeight[role as keyof typeof lineHeight]).toBeGreaterThan(0);
      expect(letterSpacing).toHaveProperty(role);
    }
  });
});

describe('DESIGN.md spacing and shape', () => {
  it('is built on a 4px base unit', () => {
    for (const value of [spacing.one, spacing.two, spacing.three, spacing.four]) {
      expect(value % 4).toBe(0);
    }
    expect(spacing.one).toBe(4);
  });

  it('keeps the 48px section gap from DESIGN.md', () => {
    expect(spacing.section).toBe(48);
  });

  it('uses 12px cards and pill buttons', () => {
    expect(radii.card).toBe(12);
    expect(radii.pill).toBe(9999);
  });

  it('carries the single subtle card shadow on both platforms', () => {
    expect(shadows.card.elevation).toBeGreaterThan(0);
    expect(shadows.card.shadowOpacity).toBeGreaterThan(0);
  });
});

describe('accessibility constants', () => {
  it('keeps the 44pt minimum touch target from AGENTS.md 10', () => {
    expect(MIN_TOUCH_TARGET).toBeGreaterThanOrEqual(44);
  });

  it('exposes the mandatory demo-store notice', () => {
    expect(DEMO_STORE_NOTICE).toContain('not a licensed pharmacy');
  });

  it('keeps the 1280px desktop container for the web build', () => {
    expect(layout.maxContentWidth).toBe(1280);
  });
});
