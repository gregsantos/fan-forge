# FanForge Style Guide

**Version:** 1.0  
**Date:** 2025-06-13  
**Approach:** Utility-first  
**Framework:** Tailwind  
**Animation:** Framer Motion

## Metadata

### Purpose

Define visual language, interaction rules, and code conventions for agentic coding systems generating FanForge screens and components.

### Audience

AI agents, developers, designers

### Goals

- Ship cohesive, beautiful UI that feels lively yet professional
- Encode accessibility and performance best-practices by default
- Leverage Framer Motion for subtle, polished animation without compromising user preference or CLS

### Compliance

Agents must treat every section as a spec—deviations require explicit override.

## Instructions

### High Priority

- Use modern, semantic HTML and accessible ARIA practices
- For animations, use Framer Motion and ensure smooth, performant transitions
- For interactivity, implement all described behaviors (hover, click, scroll-triggered effects) using best practices

### Medium Priority

- Ensure design is visually stunning, with harmonious color palettes, typography, and spacing
- Make output responsive for mobile, tablet, and desktop

### Low Priority

- Include comments in code to explain key sections

## Animation Guidelines (Framer Motion)

### Duration Tokens

| Name     | Value | Unit    | Use Case                 |
| -------- | ----- | ------- | ------------------------ |
| **fast** | 0.15  | seconds | Button hover             |
| **base** | 0.25  | seconds | Fade/slide in            |
| **slow** | 0.45  | seconds | Modals, page transitions |

### Easing Tokens

| Name        | Value              | Use Case     |
| ----------- | ------------------ | ------------ |
| **default** | `[0.4, 0, 0.2, 1]` | Most motions |

### Stagger Tokens

| Name         | Value | Unit    | Use Case    |
| ------------ | ----- | ------- | ----------- |
| **children** | 0.05  | seconds | Lists/Grids |

### Variants Library

#### fadeSlide Variant

```typescript
// lib/animation.ts
export const fadeSlide = {
  hidden: {opacity: 0, y: 12},
  show: {opacity: 1, y: 0, transition: {duration: 0.25, ease: "easeOut"}},
}
```

#### stagger Variant

```typescript
export const stagger = {
  show: {transition: {staggerChildren: 0.05}},
}
```

### Animation Best Practices

#### Critical: Respect User Preference

Always check for reduced motion preference:

```typescript
const reduced = useReducedMotion()
const animate = reduced ? false : "show"
```

#### High Priority

- **Avoid layout shift:** Use layout prop and position: relative
- **No blocking animations:** Keep main thread free (< 16ms)

## Interaction Patterns

### Hover State

- **Visual Cue:** 4% surface tint, cursor pointer
- **Accessibility:** `role="button"`
- **Implementation:** `hover:bg-accent/40 cursor-pointer`

### Focus State

- **Visual Cue:** 2px outline using primary color
- **Accessibility:** `tabindex="0"`
- **Implementation:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`

### Disabled State

- **Visual Cue:** 40% opacity, no shadow
- **Accessibility:** `aria-disabled="true"`
- **Implementation:** `disabled:opacity-40 disabled:shadow-none disabled:pointer-events-none`

### Error Messaging

- **Pattern:** Inline under field + toast summary
- **Accessibility:** `role="alert"`
- **Implementation:** `aria-live="assertive"` for immediate errors, `aria-live="polite"` for form validation

## Accessibility Checklist

### Critical Requirements

#### Color Contrast

- **Requirement:** Color contrast ≥ 4.5:1 for text, 3:1 for icons
- **Validation:** Use contrast checking tools, test with high contrast mode

#### Keyboard Navigation

- **Requirement:** All interactive elements reachable via Tab key
- **Validation:** Test keyboard-only navigation

### High Priority

#### Motion Preference

- **Requirement:** Motion preference respected
- **Implementation:** `useReducedMotion()` hook implementation required

#### Form Labels

- **Requirement:** Form fields labelled with htmlFor
- **Implementation:** `<label htmlFor="fieldId">`

### Medium Priority

#### Live Announcements

- **Requirement:** Live regions use polite announcements
- **Implementation:** `aria-live="polite"` for status updates

## Theming (Dark Mode Enabled)

### Theme Switching

- **Method:** `data-theme="dark"` on `<html>`
- **Token Swapping:** Automatic via CSS variables

### Media Handling

- **Images:** Provide dark variant when needed
- **Illustrations:** Provide dark variant when needed

### Implementation

```typescript
// Theme switching implementation
const [theme, setTheme] = useState("light")

useEffect(() => {
  document.documentElement.setAttribute("data-theme", theme)
}, [theme])
```

## Code Conventions

### Naming Conventions

| Element        | Pattern                     | Example                   | Description           |
| -------------- | --------------------------- | ------------------------- | --------------------- |
| **Components** | PascalCase                  | `Button.tsx`              | File and export names |
| **Hooks**      | camelCase with `use` prefix | `useTheme`                | Hook naming           |
| **Tests**      | Colocated                   | `Button.test.tsx`         | Test file placement   |
| **Assets**     | kebab-case with prefix      | `campaign-hero-image.png` | Asset naming          |

### File Organization

| Element               | Path               |
| --------------------- | ------------------ |
| **Motion Variants**   | `lib/animation.ts` |
| **Utility Functions** | `lib/utils.ts`     |
| **Components**        | `components/`      |
| **Hooks**             | `hooks/`           |

### Styling Utilities

- **Class Composition:** clsx + tailwind-merge
- **Requirement:** Always export Storybook CSF story for future integration

### Example Component

```typescript
import { motion } from 'framer-motion';
import { fadeSlide } from '@/lib/animation';
import { cn } from '@/lib/utils';

interface CampaignCardProps {
  children: React.ReactNode;
  className?: string;
}

export function CampaignCard({ children, className }: CampaignCardProps) {
  return (
    <motion.article
      variants={fadeSlide}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.4 }}
      className={cn(
        "bg-card border border-border rounded-lg shadow-sm p-6 transition-shadow hover:shadow-lg",
        className
      )}
    >
      {children}
    </motion.article>
  );
}

// Storybook story export
export default {
  title: 'Components/CampaignCard',
  component: CampaignCard,
};
```

## Asset Guidelines

### Icons

- **Library:** Lucide React
- **Size:** 24 × 24 px
- **Stroke Width:** 1.5
- **Implementation:** `import { IconName } from 'lucide-react'`

### Images

- **Formats:** Optimized SVG/PNG
- **Max Size:** 200 KB
- **Naming:** kebab-case, campaign images prefixed with `campaign-`

### Optimization Requirements

- Use `next/image` for automatic optimization
- Provide appropriate alt text for all images
- Use lazy loading for non-critical images

## Design Token Mapping

### Color Mappings

| Figma Token      | Tailwind Class   | CSS Variable              |
| ---------------- | ---------------- | ------------------------- |
| `$primary-500`   | `bg-primary`     | `hsl(var(--primary))`     |
| `$secondary-500` | `bg-secondary`   | `hsl(var(--secondary))`   |
| `$neutral-100`   | `bg-neutral-100` | `hsl(var(--muted))`       |
| `$success`       | `bg-green-500`   | `hsl(142 76% 36%)`        |
| `$warning`       | `bg-yellow-500`  | `hsl(45 93% 47%)`         |
| `$error`         | `bg-destructive` | `hsl(var(--destructive))` |

### Spacing Mappings

| Figma Token | Tailwind Class | Value     |
| ----------- | -------------- | --------- |
| `$space-xs` | `p-1`          | `0.25rem` |
| `$space-sm` | `p-2`          | `0.5rem`  |
| `$space-md` | `p-4`          | `1rem`    |
| `$space-lg` | `p-6`          | `1.5rem`  |
| `$space-xl` | `p-8`          | `2rem`    |

### Radius Mappings

| Figma Token  | Tailwind Class | CSS Variable                |
| ------------ | -------------- | --------------------------- |
| `$radius-sm` | `rounded-sm`   | `calc(var(--radius) - 4px)` |
| `$radius-md` | `rounded-md`   | `calc(var(--radius) - 2px)` |
| `$radius-lg` | `rounded-lg`   | `var(--radius)`             |
| `$radius-xl` | `rounded-xl`   | `0.75rem`                   |

### Shadow Mappings

| Figma Token  | Tailwind Class | Value                               |
| ------------ | -------------- | ----------------------------------- |
| `$shadow-sm` | `shadow-sm`    | `0 1px 2px 0 rgb(0 0 0 / 0.05)`     |
| `$shadow-md` | `shadow-md`    | `0 4px 6px -1px rgb(0 0 0 / 0.1)`   |
| `$shadow-lg` | `shadow-lg`    | `0 10px 15px -3px rgb(0 0 0 / 0.1)` |

## Responsive Design

### Breakpoints (Tailwind)

| Name    | Value  | Usage          |
| ------- | ------ | -------------- |
| **sm**  | 640px  | Small tablets  |
| **md**  | 768px  | Large tablets  |
| **lg**  | 1024px | Laptops        |
| **xl**  | 1280px | Desktops       |
| **2xl** | 1536px | Large desktops |

### Mobile-First Approach

- **Principle:** Design for mobile first, enhance for larger screens
- **Implementation:** Use min-width breakpoints (`sm:`, `md:`, `lg:`)

### Touch Targets

- **Minimum Size:** 44px × 44px (11 × 11 Tailwind units)
- **Implementation:** `min-h-11 min-w-11` for interactive elements

## Performance Guidelines

### Animation Performance

- **Principle:** Use transform and opacity for animations
- **Avoid:** Animating layout properties (width, height, top, left)
- **Implementation:** Use Framer Motion's layout prop for layout animations

### Image Optimization

- **Principle:** Use `next/image` with appropriate sizing
- **Lazy Loading:** Implement for below-the-fold images
- **Formats:** Prefer WebP with fallbacks

### Bundle Optimization

- **Principle:** Tree-shake unused utilities and components
- **Implementation:** Use dynamic imports for heavy components

## Validation Rules

### Color Contrast

- **Minimum Ratio:** 4.5:1 for normal text
- **Minimum Ratio (Large Text):** 3:1 for large text (18px+ or 14px+ bold)
- **Tools:** Use WebAIM Contrast Checker or similar

### Motion Testing

- Test with `prefers-reduced-motion` enabled
- Ensure animations don't cause seizures (max 3 flashes per second)

### Keyboard Navigation

- All interactive elements must be keyboard accessible
- Focus indicators must be visible and clear
- Tab order must be logical
