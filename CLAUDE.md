# CLAUDE.md

This file provides comprehensive guidance to Claude Code and other AI coding assistants when working with the FanForge codebase.

## Project Overview

FanForge is a collaborative platform connecting IP owners with fan creators through sanctioned derivative content creation campaigns. Built with Next.js 14 App Router, React 18, TypeScript, and shadcn/ui components.

## Development Commands

```bash
# Setup
npm install                  # Install dependencies

# Development
npm run dev                   # Start development server (http://localhost:3000)
npm run type-check           # TypeScript type checking
npm run lint                 # ESLint code quality check
npm run lint:fix             # Auto-fix linting issues
npm run format               # Format code with Prettier
npm run format:check         # Check code formatting

# Build & Deploy
npm run build              # Production build
npm run export             # Static export
npm run start              # Serve production build

# Testing
npm run test               # Run Jest test suite
```

## Technology Stack

- **Frontend:** React 18.2.0 with Next.js 14.0.0 App Router
- **Language:** TypeScript 5.0.0
- **Styling:** Tailwind CSS 3.3.0 with shadcn/ui components
- **Icons:** Lucide React 0.294.0 exclusively
- **Forms:** React Hook Form 7.47.0 with Zod 3.22.0 validation
- **State:** React Hooks (useState, useReducer, useContext)
- **Node.js:** 18.17.0+ (recommended 20.9.0)

## Architecture

### File Structure

```
app/
.
├── ai
│   ├── implementation-plan.md
│   ├── prioritized-feature-list.md
│   ├── technical-requirements.xml
│   └── user-stories-checklist.md
├── app
│   ├── (auth)
│   │   ├── login
│   │   │   └── page.tsx
│   │   └── register
│   │       └── page.tsx
│   ├── (brand)
│   │   ├── campaigns
│   │   │   ├── [id]
│   │   │   │   ├── campaign-detail-client.tsx
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── dashboard
│   │   │   └── page.tsx
│   │   └── submissions
│   │       └── page.tsx
│   ├── (creator)
│   │   ├── create
│   │   │   └── page.tsx
│   │   ├── discover
│   │   │   ├── [id]
│   │   │   │   ├── campaign-discover-client.tsx
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   └── portfolio
│   │       └── page.tsx
│   ├── api
│   │   ├── auth
│   │   │   ├── login
│   │   │   │   └── route.ts
│   │   │   └── register
│   │   │       └── route.ts
│   │   ├── campaigns
│   │   │   ├── [id]
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   └── submissions
│   │       └── route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── CLAUDE.md
├── components
│   ├── canvas
│   │   └── creation-canvas.tsx
│   ├── shared
│   │   └── navigation.tsx
│   └── ui
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       └── input.tsx
├── db
│   ├── index.ts
│   └── schema.ts
├── drizzle.config.ts
├── lib
│   ├── mock-data.ts
│   ├── utils.ts
│   └── validations.ts
├── next.config.js
├── package-lock.json
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── types
│   └── index.ts
└── utils
    └── supabase
        ├── client.ts
        ├── middleware.ts
        └── server.ts
```

### Core Features

- **User Authentication:** Role-based (Creator vs Brand Admin)
- **Campaign Management:** Creation, asset kits, timelines for brand admins
- **Campaign Discovery:** Search and filtering for creators
- **Creation Canvas:** Drag-and-drop composition tool using brand assets
- **Submission Workflow:** Review and approval system
- **Portfolio Management:** Creator showcase of approved works

### Data Models

- **User:** id, email, role, profile, createdAt
- **Campaign:** id, title, description, brandId, assets, status, deadline
- **Submission:** id, campaignId, creatorId, artwork, status, feedback
- **Asset:** id, campaignId, category (Characters, Backgrounds, Logos, Titles, Props), url, metadata

## AI Coding Guidelines

### 1. Code Quality Standards

- Write clean, maintainable TypeScript code with strict type checking
- Follow Next.js 14+ best practices and conventions
- Implement comprehensive error handling and edge case management
- Maintain consistent code style with ESLint and Prettier compliance
- Add meaningful JSDoc comments for complex functions and components

### 2. Testing Requirements

- Write unit tests for all utility functions and business logic
- Create integration tests for API routes and database operations
- Add component tests for complex UI components
- Ensure 80%+ test coverage before marking any step complete
- All tests must pass before proceeding to the next step

### 3. Quality Assurance Process

- **Before coding**: Analyze and plan the implementation approach
- **During coding**: Validate types, check for build errors, run linters
- **After coding**: Run full test suite, verify functionality manually
- **Before committing**: Seek human approval and confirmation
- **After approval**: Commit changes with descriptive messages

## Development Guidelines

### Code Style

- Use TypeScript interfaces for all props and data structures
- Follow functional components with React Hooks
- Use Tailwind utility classes (no custom CSS)
- Implement responsive design with mobile-first approach
- Support dark mode using `dark:` prefix classes
- Use descriptive variable names, avoid abbreviations

### Component Patterns

- Place components in appropriate directories (ui/, forms/, canvas/, shared/)
- Use shadcn/ui component library patterns
- Implement proper accessibility (ARIA labels, keyboard navigation)
- Validate forms with React Hook Form + Zod schemas
- Use Lucide React icons exclusively

### State Management

- Local state: useState, useReducer
- Global state: Context API when needed
- Form state: React Hook Form
- Data validation: Zod schemas

## Environment Configuration

Required environment variables:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NODE_ENV=development
NEXT_PUBLIC_MAX_FILE_SIZE=10485760
NEXT_PUBLIC_ALLOWED_FILE_TYPES=image/jpeg,image/png,image/svg+xml
```

**Build Configuration:**

- Static export enabled (`output: "export"`)
- Image optimization disabled for static hosting
- Trailing slash enabled for compatibility

## Performance & Browser Support

**Targets:**

- First Contentful Paint: < 1.5 seconds
- Largest Contentful Paint: < 2.5 seconds
- Browser support: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Responsive breakpoints: Mobile (320-767px), Tablet (768-1023px), Desktop (1024px+)

## Deployment

- Target platform: Vercel (static export)
- Next.js configuration includes `output: "export"` and `trailingSlash: true`
- Images use `unoptimized: true` for static hosting compatibility

## Memories

- After completing steps, update the @ai/implementation-plan.md todo checklist
- Always ask me before commiting changes. Preview commit message or summary first