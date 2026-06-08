# AutoMarket Design System v2.0

## 🎨 Visual Redesign Complete

This document outlines the comprehensive visual redesign of AutoMarket, implementing a modern, premium, and accessible design system.

---

## Color Palette

### Primary Colors
- **Gold**: `#f59e0b` - Primary accent, CTAs, highlights
- **Dark**: `#0a0a0a` - Main background
- **Carbon**: `#1a1a1a` - Secondary background, cards

### Extended Palette
- **Slate**: Neutral grays for borders, muted text
  - 50, 100, 200, 300, 400, 500, 600, 700, 800, 900
- **Emerald**: Success states (400, 500, 600)
- **Sky**: Info states (400, 500, 600)
- **Red**: Error/danger states

### Color Usage
- **Gold/Yellow**: Primary actions, hover states, focus indicators
- **Slate**: Borders, disabled states, secondary text
- **Emerald**: Success messages, positive feedback
- **Red**: Errors, dangerous actions, "On Sale" badges

---

## Typography

### Font Families
- **Bebas Neue** (`font-bebas`) - Headlines, display text, branding
  - Tracking: `tracking-wider` or `tracking-widest`
  - Usage: H1-H6, section titles, logos

- **Poppins** (`font-poppins`) - Body text, UI labels, forms
  - Clean, modern, excellent readability
  - Weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

- **Outfit** (`font-outfit`) - Secondary, legacy fallback
  - Transitioning out but still used in some components

### Font Sizing
- `text-xs` (12px) - Helper text, badges, captions
- `text-sm` (14px) - Form labels, secondary copy
- `text-base` (16px) - Body text, default
- `text-lg` (18px) - Subheadings
- `text-xl`, `text-2xl`, `text-3xl` - Headlines

---

## Component Library

### Buttons (`Button.tsx`)
```tsx
<Button variant="primary" size="md">Action</Button>
```

**Variants:**
- `primary` - Gold gradient, main CTAs
- `secondary` - Dark slate, secondary actions
- `outline` - Gold border, transparent
- `ghost` - Minimal, hover effect only
- `danger` - Red, destructive actions

**Sizes:**
- `sm` - Compact, inline actions
- `md` - Standard, most common
- `lg` - Large, prominent actions

**Features:**
- Built-in loading state with spinner
- Icon support (left side)
- Full width option
- Accessibility-first (ARIA labels, focus states)

### Cards (`Card.tsx`)
```tsx
<Card hoverable interactive>
  <CardHeader>Title</CardHeader>
  <CardBody>Content</CardBody>
  <CardFooter>Actions</CardFooter>
</Card>
```

- Dark background with subtle borders
- Optional hover effects
- Structured sections (header, body, footer)
- Responsive padding

### Inputs (`Input.tsx`, `TextArea`)
```tsx
<Input label="Name" type="email" error="Invalid email" icon={<Icon />} />
<TextArea label="Message" helperText="Max 500 chars" />
```

**Features:**
- Labels with required indicator
- Error states with custom messages
- Helper text for guidance
- Icon support (left side)
- Accessibility labels
- Disabled states
- Focus visible rings

### Badges (`Badge.tsx`)
```tsx
<Badge variant="gold">Featured</Badge>
<BadgeGroup>
  <Badge variant="danger">Sale</Badge>
  <Badge variant="success">Available</Badge>
</BadgeGroup>
```

**Variants:**
- `default` - Neutral background
- `success` - Green, positive
- `danger` - Red, critical
- `warning` - Yellow, caution
- `info` - Blue, information
- `gold` - Gold/accent

---

## Component Usage Guide

### Navbar
✅ **Improvements:**
- Semantic HTML (`<nav role="banner">`)
- Keyboard navigation support
- Focus visible indicators
- Mobile-responsive hamburger with Framer animations
- Smooth scrollbar detection with backdrop blur
- Better spacing and alignment

### Footer
✅ **Improvements:**
- 3-column grid layout (responsive)
- Social media icons with hover effects
- Contact info with proper icons
- Gradient divider
- Better typography hierarchy
- Accessible icon buttons

### CarCard
✅ **Improvements:**
- Motion animations on mount/hover
- Better badge system with color variants
- Improved favorite toggle with visual feedback
- Modern button integration
- Gradient overlays on hover
- Better image zoom effect
- Responsive typography
- Accessible ARIA labels

---

## Spacing System

Built on 4px base unit:
- `xs`: 4px (0.25rem)
- `sm`: 8px (0.5rem)
- `md`: 16px (1rem)
- `lg`: 24px (1.5rem)
- `xl`: 32px (2rem)
- `2xl`: 48px (3rem)

**Usage:** Apply consistently with Tailwind spacing classes (`p-4`, `gap-6`, `mb-8`)

---

## Shadow & Depth

### Box Shadows
- `shadow-xs` - Minimal depth
- `shadow-sm` - Subtle cards
- `shadow-md` - Standard elevation
- `shadow-lg` - Prominent cards
- `shadow-xl` - Modals, prominent UI
- `shadow-glow` - Gold accent glow (hover states)
- `shadow-premium` - Deep, rich shadow

---

## Transitions & Motion

### Duration Tokens
- `duration-xs`: 150ms (micro-interactions)
- `duration-sm`: 200ms (hover effects)
- `duration-md`: 300ms (standard animations)
- `duration-lg`: 500ms (page transitions)

### Framer Motion Usage
- Page transitions: 300ms, y-axis movement
- Hover effects: 200ms, scale/shadow
- List animations: Stagger with 80ms delay
- AdminPages: No y-offset (immediate opacity)

---

## Accessibility (a11y)

### WCAG 2.1 Compliance
✅ **Implemented:**
- Focus visible indicators (2px gold ring)
- Color contrast ratios ≥ 4.5:1
- ARIA labels on all interactive elements
- Semantic HTML (`<button>`, `<nav>`, `<article>`)
- Keyboard navigation support
- Form error messaging
- Required field indicators

### Focus Management
- All interactive elements have `:focus-visible` state
- Focus trap in modals (upcoming)
- Skip navigation links (recommended)

### Color & Contrast
- Text on dark backgrounds: `text-white/70` minimum
- Gold on dark: High contrast ✓
- Slate borders: `border-white/5` to `border-white/10`

---

## Migration Guide

### For Existing Components
Replace inline styles with utility classes:

```tsx
// ❌ Before
<div style={{ padding: '1.25rem', backgroundColor: '#111111' }}>

// ✅ After
<div className="p-5 lg:p-6 bg-carbon">
```

### Import Changes
```tsx
// ✅ New centralized imports
import { Button, Card, Input, Badge } from '@/components/ui'

// ✅ Composition
<Card hoverable>
  <CardHeader>Title</CardHeader>
  <CardBody>Content</CardBody>
</Card>
```

---

## Files Modified

### Core Design Files
- `tailwind.config.js` - Extended color palette, spacing, shadows
- `src/index.css` - Global styles, utilities, animations
- `src/components/Navbar.tsx` - Complete redesign
- `src/components/Footer.tsx` - Complete redesign
- `src/components/CarCard.tsx` - Complete redesign

### New UI Components
- `src/components/ui/Button.tsx` - Variant system
- `src/components/ui/Card.tsx` - Composable card
- `src/components/ui/Input.tsx` - Form inputs with validation
- `src/components/ui/Badge.tsx` - Semantic badges
- `src/components/ui/index.ts` - Exports

---

## Next Steps

1. **Update remaining pages** - Apply new design system to:
   - Home page
   - Cars page / CarDetail
   - Financing page
   - Contact page
   - Admin dashboard pages

2. **Test accessibility** - Run WAVE, Axe, or Lighthouse
   - Check contrast ratios
   - Verify keyboard navigation
   - Test screen readers

3. **Performance optimization** - Monitor:
   - Image optimization
   - Code splitting
   - Bundle size

4. **Component expansion** - Add:
   - Modal/Dialog component
   - Select/Dropdown component
   - Toast/Notification component
   - Tooltip component

---

## Brand Values Reflected

✨ **Modern** - Clean, contemporary design language  
🎯 **Premium** - Luxury automotive aesthetic  
♿ **Accessible** - Inclusive design for all users  
⚡ **Performant** - Smooth animations, fast interactions  
🎨 **Cohesive** - Unified design system across pages  

---

*Design System v2.0 - AutoMarket 2024*
*Last updated: June 2024*
