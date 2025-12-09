# FanForge Design System

**Version:** 1.0  
**Approach:** Utility-first  
**Framework:** Tailwind  
**Pattern:** shadcn/ui

## Metadata

### Brand Personality

- Modern
- Creative
- Professional
- Collaborative
- Empowering
- Trustworthy
- Intuitive

### Principles

- Utility-first styling
- Tailwind CSS compatibility
- shadcn/ui patterns
- HSL color format
- CSS custom properties

## Design Tokens

### Colors (HSL Format with Light/Dark Theme Support)

#### Semantic Colors (shadcn/ui pattern)

| Token                    | Light Mode          | Dark Mode           | Description                   |
| ------------------------ | ------------------- | ------------------- | ----------------------------- |
| `background`             | `0 0% 100%`         | `222.2 84% 4.9%`    | Main background               |
| `foreground`             | `222.2 84% 4.9%`    | `210 40% 98%`       | Main text color               |
| `card`                   | `0 0% 100%`         | `222.2 84% 4.9%`    | Card backgrounds              |
| `card-foreground`        | `222.2 84% 4.9%`    | `210 40% 98%`       | Card text                     |
| `popover`                | `0 0% 100%`         | `222.2 84% 4.9%`    | Popover backgrounds           |
| `popover-foreground`     | `222.2 84% 4.9%`    | `210 40% 98%`       | Popover text                  |
| `primary`                | `199 89% 48%`       | `199 89% 48%`       | Primary brand color (#0ea5e9) |
| `primary-foreground`     | `210 40% 98%`       | `222.2 84% 4.9%`    | Text on primary               |
| `secondary`              | `300 100% 25%`      | `300 100% 25%`      | Secondary accent (#800080)    |
| `secondary-foreground`   | `210 40% 98%`       | `210 40% 98%`       | Text on secondary             |
| `muted`                  | `210 40% 96%`       | `217.2 32.6% 17.5%` | Muted backgrounds             |
| `muted-foreground`       | `215.4 16.3% 46.9%` | `215 20.2% 65.1%`   | Muted text                    |
| `accent`                 | `210 40% 96%`       | `217.2 32.6% 17.5%` | Accent backgrounds            |
| `accent-foreground`      | `222.2 84% 4.9%`    | `210 40% 98%`       | Accent text                   |
| `destructive`            | `0 84.2% 60.2%`     | `0 62.8% 30.6%`     | Error/destructive actions     |
| `destructive-foreground` | `210 40% 98%`       | `210 40% 98%`       | Text on destructive           |
| `border`                 | `214.3 31.8% 91.4%` | `217.2 32.6% 17.5%` | Border color                  |
| `input`                  | `214.3 31.8% 91.4%` | `217.2 32.6% 17.5%` | Input borders                 |
| `ring`                   | `199 89% 48%`       | `199 89% 48%`       | Focus rings                   |

#### Primary Color Scale

| Token         | Value          | Description           |
| ------------- | -------------- | --------------------- |
| `primary-50`  | `199 100% 97%` | Very light primary    |
| `primary-100` | `199 100% 93%` | Light primary         |
| `primary-200` | `199 100% 85%` | Lighter primary       |
| `primary-300` | `199 95% 74%`  | Light primary variant |
| `primary-400` | `199 93% 61%`  | Medium light primary  |
| `primary-500` | `199 89% 48%`  | Base primary color    |
| `primary-600` | `200 98% 39%`  | Medium dark primary   |
| `primary-700` | `201 96% 32%`  | Dark primary          |
| `primary-800` | `201 90% 27%`  | Darker primary        |
| `primary-900` | `202 80% 24%`  | Darkest primary       |

#### Neutral Color Scale

| Token         | Value        | Description           |
| ------------- | ------------ | --------------------- |
| `neutral-50`  | `0 0% 98%`   | Very light neutral    |
| `neutral-100` | `240 5% 96%` | Light neutral         |
| `neutral-200` | `240 6% 90%` | Lighter neutral       |
| `neutral-300` | `240 5% 84%` | Light neutral variant |
| `neutral-400` | `240 5% 64%` | Medium neutral        |
| `neutral-500` | `240 4% 46%` | Base neutral          |
| `neutral-600` | `240 5% 34%` | Medium dark neutral   |
| `neutral-700` | `240 5% 26%` | Dark neutral          |
| `neutral-800` | `240 4% 16%` | Darker neutral        |
| `neutral-900` | `240 6% 10%` | Darkest neutral       |

#### Status Colors

| Token     | Light Mode    | Dark Mode     | Description    |
| --------- | ------------- | ------------- | -------------- |
| `success` | `142 76% 36%` | `142 71% 45%` | Success states |
| `warning` | `45 93% 47%`  | `45 93% 47%`  | Warning states |
| `error`   | `0 84% 60%`   | `0 63% 31%`   | Error states   |
| `info`    | `217 91% 60%` | `217 91% 60%` | Info states    |

### Spacing (Tailwind Compatible)

| Token | Value      | Pixel Equivalent |
| ----- | ---------- | ---------------- |
| `0`   | `0`        | 0px              |
| `px`  | `1px`      | 1px              |
| `0.5` | `0.125rem` | 2px              |
| `1`   | `0.25rem`  | 4px              |
| `1.5` | `0.375rem` | 6px              |
| `2`   | `0.5rem`   | 8px              |
| `2.5` | `0.625rem` | 10px             |
| `3`   | `0.75rem`  | 12px             |
| `3.5` | `0.875rem` | 14px             |
| `4`   | `1rem`     | 16px             |
| `5`   | `1.25rem`  | 20px             |
| `6`   | `1.5rem`   | 24px             |
| `7`   | `1.75rem`  | 28px             |
| `8`   | `2rem`     | 32px             |
| `9`   | `2.25rem`  | 36px             |
| `10`  | `2.5rem`   | 40px             |
| `11`  | `2.75rem`  | 44px             |
| `12`  | `3rem`     | 48px             |
| `14`  | `3.5rem`   | 56px             |
| `16`  | `4rem`     | 64px             |
| `20`  | `5rem`     | 80px             |
| `24`  | `6rem`     | 96px             |
| `28`  | `7rem`     | 112px            |
| `32`  | `8rem`     | 128px            |
| `36`  | `9rem`     | 144px            |
| `40`  | `10rem`    | 160px            |
| `44`  | `11rem`    | 176px            |
| `48`  | `12rem`    | 192px            |
| `52`  | `13rem`    | 208px            |
| `56`  | `14rem`    | 224px            |
| `60`  | `15rem`    | 240px            |
| `64`  | `16rem`    | 256px            |
| `72`  | `18rem`    | 288px            |
| `80`  | `20rem`    | 320px            |
| `96`  | `24rem`    | 384px            |

### Border Radius

| Token     | Value      | Description         |
| --------- | ---------- | ------------------- |
| `DEFAULT` | `0.5rem`   | Current app default |
| `none`    | `0`        | No radius           |
| `sm`      | `0.125rem` | Small radius        |
| `md`      | `0.375rem` | Medium radius       |
| `lg`      | `0.5rem`   | Large radius        |
| `xl`      | `0.75rem`  | Extra large radius  |
| `2xl`     | `1rem`     | 2x large radius     |
| `3xl`     | `1.5rem`   | 3x large radius     |
| `full`    | `9999px`   | Fully rounded       |

### Typography

#### Font Families

| Token   | Value                                     |
| ------- | ----------------------------------------- |
| `sans`  | `ui-sans-serif, system-ui, sans-serif`    |
| `serif` | `ui-serif, Georgia, serif`                |
| `mono`  | `ui-monospace, SFMono-Regular, monospace` |

#### Font Sizes

| Token  | Size       | Line Height |
| ------ | ---------- | ----------- |
| `xs`   | `0.75rem`  | `1rem`      |
| `sm`   | `0.875rem` | `1.25rem`   |
| `base` | `1rem`     | `1.5rem`    |
| `lg`   | `1.125rem` | `1.75rem`   |
| `xl`   | `1.25rem`  | `1.75rem`   |
| `2xl`  | `1.5rem`   | `2rem`      |
| `3xl`  | `1.875rem` | `2.25rem`   |
| `4xl`  | `2.25rem`  | `2.5rem`    |
| `5xl`  | `3rem`     | `1`         |
| `6xl`  | `3.75rem`  | `1`         |
| `7xl`  | `4.5rem`   | `1`         |
| `8xl`  | `6rem`     | `1`         |
| `9xl`  | `8rem`     | `1`         |

### Shadows

| Token     | Value                                                                 |
| --------- | --------------------------------------------------------------------- |
| `sm`      | `0 1px 2px 0 rgb(0 0 0 / 0.05)`                                       |
| `DEFAULT` | `0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)`       |
| `md`      | `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`    |
| `lg`      | `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`  |
| `xl`      | `0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)` |
| `2xl`     | `0 25px 50px -12px rgb(0 0 0 / 0.25)`                                 |
| `inner`   | `inset 0 2px 4px 0 rgb(0 0 0 / 0.05)`                                 |
| `none`    | `0 0 #0000`                                                           |

## Utility Classes

### FanForge-Specific Utility Classes

#### Canvas Element

**Purpose:** Interactive canvas elements with selection states  
**Base Classes:** `cursor-move border-2 border-transparent transition-colors`  
**Hover State:** `hover:border-primary-300`  
**Modifiers:**

- `selected`: `border-primary-500`

#### Asset Palette Item

**Purpose:** Asset grid items with drag capability  
**Base Classes:** `aspect-square border border-neutral-200 rounded cursor-move transition-all`  
**Hover State:** `hover:border-primary-500 hover:shadow-md`

#### Campaign Card

**Purpose:** Campaign overview cards  
**Base Classes:** `bg-card border border-border rounded-lg p-6 cursor-pointer transition-shadow`  
**Hover State:** `hover:shadow-lg`

#### Submission Status Badges

##### Pending

**Classes:** `bg-yellow-100 text-yellow-800 border-yellow-300`

##### Approved

**Classes:** `bg-green-100 text-green-800 border-green-300`

##### Rejected

**Classes:** `bg-red-100 text-red-800 border-red-300`

## Components (shadcn/ui Pattern)

### Button

**Description:** Configurable button with multiple variants using Tailwind utilities

**Base Classes:**

```
inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50
```

#### Variants

| Variant       | Classes                                                                          |
| ------------- | -------------------------------------------------------------------------------- |
| `default`     | `bg-primary text-primary-foreground hover:bg-primary/90`                         |
| `destructive` | `bg-destructive text-destructive-foreground hover:bg-destructive/90`             |
| `outline`     | `border border-input bg-background hover:bg-accent hover:text-accent-foreground` |
| `secondary`   | `bg-secondary text-secondary-foreground hover:bg-secondary/80`                   |
| `ghost`       | `hover:bg-accent hover:text-accent-foreground`                                   |
| `link`        | `text-primary underline-offset-4 hover:underline`                                |

#### Sizes

| Size      | Classes                |
| --------- | ---------------------- |
| `default` | `h-10 px-4 py-2`       |
| `sm`      | `h-9 rounded-md px-3`  |
| `lg`      | `h-11 rounded-md px-8` |
| `icon`    | `h-10 w-10`            |

### Input

**Description:** Form input element with consistent styling

**Base Classes:**

```
flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50
```

### Card

**Description:** Container component with consistent styling

**Base Classes:** `rounded-lg border bg-card text-card-foreground shadow-sm`

#### Sub-components

| Component         | Classes                                              |
| ----------------- | ---------------------------------------------------- |
| `CardHeader`      | `flex flex-col space-y-1.5 p-6`                      |
| `CardTitle`       | `text-2xl font-semibold leading-none tracking-tight` |
| `CardDescription` | `text-sm text-muted-foreground`                      |
| `CardContent`     | `p-6 pt-0`                                           |
| `CardFooter`      | `flex items-center p-6 pt-0`                         |

### Badge

**Description:** Small status indicator with semantic variants

**Base Classes:**

```
inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
```

#### Variants

| Variant       | Classes                                                                                 |
| ------------- | --------------------------------------------------------------------------------------- |
| `default`     | `border-transparent bg-primary text-primary-foreground hover:bg-primary/80`             |
| `secondary`   | `border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80`       |
| `destructive` | `border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80` |
| `outline`     | `text-foreground`                                                                       |

## FanForge-Specific Components

### Canvas

**Description:** Creative workspace with drag-and-drop capabilities  
**Base Classes:** `relative w-full h-full bg-background border border-border rounded-lg overflow-hidden`

**Features:**

- Drag-and-drop asset placement using utility classes
- Selection states with `.canvas-element.selected`
- Zoom and pan with transform utilities

### Asset Palette

**Description:** Asset library with categorization and search  
**Base Classes:** `flex flex-col h-full bg-card border border-border rounded-lg`

#### Sub-components

| Component   | Classes                      |
| ----------- | ---------------------------- |
| `AssetGrid` | `grid grid-cols-3 gap-2 p-4` |
| `AssetItem` | `asset-palette-item`         |

## Usage Guidelines

### CSS Custom Properties

- Use HSL format for all color values to enable easy theming
- Define semantic color names (background, foreground, primary, etc.)
- Support both light and dark themes through CSS custom property overrides

### Utility-First Approach

- Prefer Tailwind utility classes over custom CSS
- Create component-specific utility classes only when needed (`.canvas-element`, `.asset-palette-item`)
- Use `@apply` directive for complex component styling

### shadcn/ui Patterns

- Follow shadcn/ui component structure and naming conventions
- Use consistent base classes and variant patterns
- Maintain accessibility with focus states and semantic markup

### Theming

- Use CSS custom properties for runtime theme switching
- Support system preference detection (`prefers-color-scheme`)
- Maintain consistent color relationships across themes

## Tailwind Configuration

### Extended Colors

```javascript
{
  colors: {
    border: "hsl(var(--border))",
    input: "hsl(var(--input))",
    ring: "hsl(var(--ring))",
    background: "hsl(var(--background))",
    foreground: "hsl(var(--foreground))",
    primary: {
      DEFAULT: "hsl(var(--primary))",
      foreground: "hsl(var(--primary-foreground))",
    },
    secondary: {
      DEFAULT: "hsl(var(--secondary))",
      foreground: "hsl(var(--secondary-foreground))",
    },
    destructive: {
      DEFAULT: "hsl(var(--destructive))",
      foreground: "hsl(var(--destructive-foreground))",
    },
    muted: {
      DEFAULT: "hsl(var(--muted))",
      foreground: "hsl(var(--muted-foreground))",
    },
    accent: {
      DEFAULT: "hsl(var(--accent))",
      foreground: "hsl(var(--accent-foreground))",
    },
    popover: {
      DEFAULT: "hsl(var(--popover))",
      foreground: "hsl(var(--popover-foreground))",
    },
    card: {
      DEFAULT: "hsl(var(--card))",
      foreground: "hsl(var(--card-foreground))",
    },
  },
  borderRadius: {
    lg: "var(--radius)",
    md: "calc(var(--radius) - 2px)",
    sm: "calc(var(--radius) - 4px)",
  },
}
```
