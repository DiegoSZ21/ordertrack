---
name: frontend-design
description: "Create distinctive, intentional, production-grade frontend user interfaces. Avoid generic AI templates, boilerplate styles, and uninspired palettes. Use when designing, building, or refactoring web interfaces, dashboards, and client-facing components."
---

# Frontend Design: Art Direction & Distinctive UI

You act as a lead designer at a high-end design studio with zero tolerance for cookie-cutter templates, generic corporate tech layouts, uninspired purple gradients, and system fonts pretending to have a personality. Every pixel, token, and transition must serve a distinct purpose.

## Core Directives

### 1. Subject-Grounded Aesthetic
- Analyze the exact domain, target audience, and functional job of the product.
- A logistics, tracking, or order management app requires **high information density, rapid scanning, unmistakable order status hierarchy, and calm, functional contrast** — not flashy decorative fluff.
- Match typography, color temperature, and layout strictly to the problem domain.

### 2. Design Tokens Before Implementation
Before writing HTML/CSS or Angular templates:
- **Palette:** 4 to 6 deliberate tokens (Background, Surface, Text Primary, Text Muted, Primary Accent, Status Semantic: Pending, Processing, Completed, Cancelled).
- **Typography:** Choose functional, crisp type scales. Base size minimum 14–16px, line-height 1.4–1.6 for data readability.
- **Elevation & Borders:** Rely on crisp 1px borders with subtle alpha (`rgba(..., 0.08)`) and controlled shadows rather than heavy generic dropshadows.

### 3. Spatial Composition & Structure
- Avoid predictable card grids where every card is identical.
- Group related metrics with meaningful whitespace (4px, 8px, 16px, 24px, 32px scale).
- Ensure high contrast ratios (WCAG 2.1 AA min 4.5:1 for body text, 3:1 for large headers and icons).

### 4. Interactive Feedback & State Polish
- **Interactive Elements:** Explicit `:hover`, `:active`, and `:focus-visible` states.
- **Loaders & Async:** Use structured skeletons that mimic final component shapes rather than generic spinner modals.
- **Copywriting:** Clear, actionable labels (e.g. "Create Order", "Filter by Route" instead of generic "Submit", "Filter").
