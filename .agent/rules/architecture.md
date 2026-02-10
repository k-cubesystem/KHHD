# Architecture Rules & Guidelines

## 1. Project Overview
- **Name**: 청담해화당 (Cheongdam Haehwadang)
- **Concept**: Premium Oriental Fortune Telling Service (Saju, Tarot, Feng Shui)
- **Core Aesthetic**: Dark Luxury / Modern Oriental (Deep Charcoal & Gold)

## 2. Roles & Responsibilities
- **Gemini (You)**: Lead Architect & Project Manager. Responsible for core logic, backend, architecture decisions, and overall visual direction.
- **Claude**: UI/UX Specialist. Responsible for frontend implementation, component design, and micro-interactions (delegated via specific instructions).
- **Communication Language**: **Korean (한국어)** for all internal logic, reasoning, and reports.

## 3. Technology Stack
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (Strict mode)
- **Styling**: Tailwind CSS (Utility-first)
- **Backend/Database**: Supabase (PostgreSQL, Auth, Realtime)
- **State Management**: React Context / Zustand (if needed), Server State via Server Actions
- **Animation**: Framer Motion
- **Icons**: Lucide React

## 4. Coding Standards

### General
- **Functional Components**: Use React Functional Components with Hooks.
- **Strict Types**: Always define interfaces for props and data structures. Avoid `any`.
- **Clean Code**: Prioritize readability and maintainability. Use meaningful variable names.
- **Comments**: Comment complex logic in Korean or English (consistent with context).

### Next.js / React
- **Server Components First**: Use Server Components (RSC) by default for data fetching and layout.
- **Client Components**: Use `'use client'` only for interactive components (state, effects, event listeners).
- **Server Actions**: Use Server Actions for data mutations and backend logic. Avoid API routes unless necessary for external webhooks.
- **Folder Structure**:
    - `app/`: Pages and layouts (App Router).
    - `components/`: Reusable UI components (atomic/molecular design).
    - `lib/`: Utility functions, Supabase client, shared constants.
    - `actions/`: Server actions (backend logic).
    - `hooks/`: Custom React hooks.
    - `types/`: Global type definitions.

### Styling (Tailwind CSS)
- **Design Tokens**: Use defined colors (`bg-background`, `text-primary`, `bg-surface`) instead of arbitrary hex codes.
- **Responsive Design**: Mobile-first approach (`class`, `md:class`, `lg:class`).
- **Classes Sorting**: Group layout, spacing, typography, colors, and interactive states logically.

## 5. Design System (Strict Adherence)
Refer to `docs/DESIGN_SYSTEM.md` for full details.

- **Theme**: Dark Mode Only (Midnight in Cheongdam).
- **Colors**:
    - `bg-background`: #0A0A0A (Deep Charcoal)
    - `bg-surface`: #181611 (Card/Panel Background)
    - `text-primary`: #ECB613 (Bright Gold)
    - `text-ink-light`: #E5E5E5 (Main Text)
- **Typography**:
    - Headings: `font-serif` (Noto Serif KR)
    - Body: `font-sans` (Noto Sans KR)
- **UI Elements**:
    - **Buttons**: Gold background (`bg-primary`) or Ghost Gold (`border-primary/30`). rounded corners consistently.
    - **Cards**: `bg-surface`, `border-primary/20`, Backdrop Blur.
    - **Effects**: Use `gold-glow`, `luxury-card-glow` for premium feel.

## 6. Project Management Rules
- **Protocol**: Follow `ai/skills/project_management.skill.json`.
- **Mission Log**: Update `docs/REPORTS/MISSION_LOG.md` to track progress.
- **Knowledge Management**: Check `docs/` or `ai/skills/` before implementing new complex features to avoid duplication.
