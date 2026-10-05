# DESIGN.md — Visual Implementation Contract

## 1. Purpose & Brand Direction

This file is the visual implementation contract for the shop. The product is a modern Nigerian e-commerce demo for OTC pharmacy and supermarket goods.

### Brand Personality

- **Quiet, clean white gallery wall canvas** combined with clean Nigerian retail and modern digital product standards.
- **Visual Vocabulary:** Full-bleed product photography on a soft off-white canvas (`#f7f7f7`), paired with pure white card surfaces (`#ffffff`) and minimal monochrome iconography (`#222222`).
- **Chromatic Punctuation:** Retail green (`#16a34a`) serves as the primary commerce action color (for checkout buttons, add-to-cart affordances, and key success states), while coral-red / Rausch (`#ff385c`) is reserved strictly for wishlist hearts, high-urgency badges, and safety highlights.
- **Constraints:** Avoid overly clinical, alarming, or futuristic pharmacy aesthetics. The mandatory **"Demo store — not a licensed pharmacy"** disclaimer must remain visible in the footer and checkout views.

---

## 2. Tokens — Colors

| Name                   | Value     | Token                   | Role                                                                  |
| ---------------------- | --------- | ----------------------- | --------------------------------------------------------------------- |
| Primary / Retail Green | `#16a34a` | `--color-primary`       | Primary CTA color for add-to-cart, checkout actions, and success cues |
| Primary Hover          | `#15803d` | `--color-primary-hover` | Active/hover state for primary actions                                |
| Rausch (Coral)         | `#ff385c` | `--color-rausch`        | Accent for wishlist hearts, urgent badges, and micro-highlights       |
| Hof (Near-Black)       | `#222222` | `--color-hof`           | Primary text, body copy, headings, and icon strokes                   |
| Foggy                  | `#6a6a6a` | `--color-foggy`         | Secondary text, muted labels, helper copy, and category subtitles     |
| Grey 500               | `#c1c1c1` | `--color-grey-500`      | Disabled text and input placeholder states                            |
| Bebe                   | `#ebebeb` | `--color-bebe`          | Hairline borders, input underlines, and dividers                      |
| Deco                   | `#dddddd` | `--color-deco`          | Skeleton card placeholders and disabled surfaces                      |
| Faint (Canvas)         | `#f7f7f7` | `--color-faint`         | Page canvas background and footer container surface                   |
| White                  | `#ffffff` | `--color-white`         | Elevated card surfaces, input fields, modals, and dropdowns           |

---

## 3. Tokens — Typography

**Font Family:** Clean geometric sans (Inter / system fallback).

### Type Scale

| Role              | Size | Line Height | Letter Spacing | Token               |
| ----------------- | ---- | ----------- | -------------- | ------------------- |
| caption           | 11px | 1.18        | 0px            | `--text-caption`    |
| body / metadata   | 14px | 1.43        | -0.009em       | `--text-body`       |
| ui / labels       | 16px | 1.25        | 0px            | `--text-ui`         |
| subheading        | 20px | 1.2         | -0.18px        | `--text-subheading` |
| heading-sm        | 22px | 1.18        | -0.44px        | `--text-heading-sm` |
| heading (display) | 28px | 1.43        | 0px            | `--text-heading`    |

---

## 4. Spacing & Shapes

**Base unit:** 4px  
**Density:** Compact and scannable.

### Border Radius

- **Cards:** 12px (smooth modern corners, no hard edges)
- **Badges / Pills:** 9999px
- **Inputs:** 8px
- **Buttons / Search Bar:** 9999px

### Shadows

- **Subtle Card/Search shadow:** `0px 0px 0px 1px rgba(0, 0, 0, 0.02), 0px 2px 6px 0px rgba(0, 0, 0, 0.04), 0px 4px 8px 0px rgba(0, 0, 0, 0.1)`
- **Elevated overlay (modals):** `0 8px 28px rgba(0, 0, 0, 0.28)`

### Layout Constraints

- **Desktop max width:** 1280px container with responsive page gutters.
- **Section gap:** 48px vertical separation between content blocks.
- **Grid Structure:** Catalog uses a sticky filter sidebar + product grid. Checkout uses a two-column desktop layout (`delivery form` | `sticky order summary`).

---

## 5. Required UI Components & Elements

### Global Search & Filter Bar (Floating Capsule)

Full-width rounded capsule (`border-radius: 9999px`), white surface, segmented fields separated by subtle vertical dividers, 16px labels, and a circular retail green or coral submit button on the right.

### Product Card

- **Structure:** Rounded container (12px radius), borderless, white surface against the off-white (`#f7f7f7`) canvas.
- **Image Area:** Full-bleed image at 1:1 aspect ratio with 12px radius.
- **Badges:** OTC status or "Prescription Only" pill badges positioned in the top-left overlay. Wishlist toggle heart button in the top-right.
- **Details below image:** Product name (14px/500 `#222222`, single-line truncate), brand/pack size metadata (`#6a6a6a`), and price in Nigerian Naira (₦) with clean formatting.

### Prescription-Only Products

Must be visually distinguishable with a distinct state badge indicating they cannot be added to the cart or purchased online, preserving regulatory compliance.

### Checkout Flow

- **Desktop two-column layout:** Contact details, saved/custom delivery address selection, and a sticky order summary container on the right.
- **Action CTA:** Clear, loading-aware payment button communicating currency and action (e.g., _Pay ₦12,500 with Paystack_). Prevent multiple simultaneous submissions.

---

## 6. States

Every core interactive component must handle:

1. **Loading:** Structural skeletons matching exact shapes.
2. **Empty:** Clear context explanation with a direct recovery action.
3. **Error:** User-safe messaging without leaking internal technical errors.
4. **Success:** Visible confirmation banners or badges.

---

## 7. Tailwind v4 / CSS Configuration (`globals.css`)

```css
:root {
  --color-primary: #16a34a;
  --color-primary-hover: #15803d;
  --color-rausch: #ff385c;
  --color-rausch-600: #e00b41;
  --color-hof: #222222;
  --color-foggy: #6a6a6a;
  --color-grey-500: #c1c1c1;
  --color-bebe: #ebebeb;
  --color-deco: #dddddd;
  --color-faint: #f7f7f7;
  --color-white: #ffffff;

  --background: #f7f7f7;
  --foreground: #222222;
  --card: #ffffff;
  --card-foreground: #222222;
  --border: #ebebeb;
  --radius-cards: 12px;
  --radius-buttons: 9999px;
  --shadow-subtle:
    rgba(0, 0, 0, 0.02) 0px 0px 0px 1px, rgba(0, 0, 0, 0.04) 0px 2px 6px 0px,
    rgba(0, 0, 0, 0.1) 0px 4px 8px 0px;
}
```

## 8. Screenshot References & UI Inspiration

The agent must inspect the reference images stored in `docs/design/screenshots/` when building corresponding views:

- `homepage1.png`: Reference for homepage header positioning, and category row spacing.
- `homepage.png`: Reference for homepage header positioning, and category row spacing.
- `homepage-productdetail.png`: Reference for productdetails page.
- `homepage-productdetail1.png`: Reference for productdetails page.
- `checkout.png`: Reference for checkoutpage.
- `checkout.png1`: Reference for checkoutpage.
- `checkout.png2`: Reference for checkoutpage.
- `checkout.png3`: Reference for checkoutpage.
- `checkout.png4`: Reference for checkoutpage.
- `checkout.png5`: Reference for checkoutpage.
