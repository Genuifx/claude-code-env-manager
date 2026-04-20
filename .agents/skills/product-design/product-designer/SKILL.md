---
name: product-designer
description: Expert product design covering UI/UX design, design systems, prototyping, user research, and design thinking.
version: 1.0.0
author: Codex Skills
category: product-design
tags: [design, ux, ui, figma, prototyping, design-systems]
---

# Product Designer

Expert-level product design for digital products.

## Core Competencies

- User experience design
- User interface design
- Design systems
- Prototyping
- User research
- Interaction design
- Visual design
- Design thinking

## Design Process

### Double Diamond

```
┌─────────────────────────────────────────────────────────────┐
│                      DISCOVER                                │
│    Diverge: Research, explore, understand the problem        │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                       DEFINE                                 │
│    Converge: Synthesize, insights, problem statement         │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                      DEVELOP                                 │
│    Diverge: Ideate, prototype, test solutions                │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                      DELIVER                                 │
│    Converge: Refine, build, launch                          │
└─────────────────────────────────────────────────────────────┘
```

### Design Sprint (5 Days)

| Day | Activity | Output |
|-----|----------|--------|
| Monday | Map & Target | Challenge map, interview experts |
| Tuesday | Sketch | Solution sketches, crazy 8s |
| Wednesday | Decide | Storyboard, testable hypothesis |
| Thursday | Prototype | Realistic prototype |
| Friday | Test | User feedback, learnings |

## UX Design

### User Journey Mapping

```
PERSONA: [Name, role, goals]

JOURNEY: [Process being mapped]

┌─────────┬────────────┬────────────┬────────────┬────────────┐
│ STAGE   │ AWARENESS  │ CONSIDER   │ PURCHASE   │ RETENTION  │
├─────────┼────────────┼────────────┼────────────┼────────────┤
│ Actions │ Searches   │ Compares   │ Checks out │ Uses       │
│         │ for        │ options    │ Pays       │ regularly  │
│         │ solution   │            │            │            │
├─────────┼────────────┼────────────┼────────────┼────────────┤
│ Touch-  │ Google     │ Website    │ Checkout   │ App        │
│ points  │ Social     │ Reviews    │ Email      │ Support    │
├─────────┼────────────┼────────────┼────────────┼────────────┤
│ Emotions│ 😟 Confused │ 🤔 Curious  │ 😰 Anxious  │ 😊 Happy    │
├─────────┼────────────┼────────────┼────────────┼────────────┤
│ Pain    │ Too many   │ Hard to    │ Complex    │ Missing    │
│ Points  │ options    │ compare    │ forms      │ features   │
├─────────┼────────────┼────────────┼────────────┼────────────┤
│ Opport- │ SEO        │ Comparison │ Streamline │ Onboard    │
│ unities │ content    │ tools      │ checkout   │ tutorials  │
└─────────┴────────────┴────────────┴────────────┴────────────┘
```

### Information Architecture

**Card Sorting:**
```
Open Sort: Users create categories
Closed Sort: Users place items in predefined categories
Hybrid: Combination of both

Analysis:
- Similarity matrix
- Dendrograms
- Category labels
```

**Site Map:**
```
Home
├── Products
│   ├── Category A
│   │   ├── Product 1
│   │   └── Product 2
│   └── Category B
├── About
│   ├── Team
│   └── Careers
├── Resources
│   ├── Blog
│   └── Help Center
└── Account
    ├── Profile
    └── Settings
```

### Wireframing

**Low-Fidelity:**
```
┌─────────────────────────────────────┐
│  [Logo]          [Nav] [Nav] [Nav]  │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │       Hero Image            │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Headline Text Here]               │
│  [Supporting text goes here]        │
│                                     │
│  ┌───────┐ ┌───────┐ ┌───────┐     │
│  │ Card  │ │ Card  │ │ Card  │     │
│  │       │ │       │ │       │     │
│  └───────┘ └───────┘ └───────┘     │
│                                     │
└─────────────────────────────────────┘
```

## UI Design

### Design Principles

**1. Hierarchy**
- Visual weight guides attention
- Size, color, contrast indicate importance
- Group related elements

**2. Consistency**
- Reuse patterns and components
- Maintain visual rhythm
- Predictable interactions

**3. Feedback**
- Acknowledge user actions
- Show system status
- Indicate loading states

**4. Accessibility**
- Color contrast (4.5:1 minimum)
- Focus indicators
- Screen reader support

### Color System

```css
/* Primary Colors */
--color-primary-50: #eff6ff;
--color-primary-100: #dbeafe;
--color-primary-500: #3b82f6;
--color-primary-600: #2563eb;
--color-primary-700: #1d4ed8;

/* Neutral Colors */
--color-gray-50: #f9fafb;
--color-gray-100: #f3f4f6;
--color-gray-500: #6b7280;
--color-gray-900: #111827;

/* Semantic Colors */
--color-success: #10b981;
--color-warning: #f59e0b;
--color-error: #ef4444;
--color-info: #3b82f6;
```

### Typography Scale

```css
/* Font Sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */

/* Line Heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

### Spacing System

```css
/* 4px base unit */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

## Design Systems

### Component Structure

```
Button/
├── Variants
│   ├── Primary
│   ├── Secondary
│   ├── Tertiary
│   └── Destructive
├── Sizes
│   ├── Small
│   ├── Medium
│   └── Large
├── States
│   ├── Default
│   ├── Hover
│   ├── Active
│   ├── Focus
│   ├── Disabled
│   └── Loading
└── Anatomy
    ├── Label
    ├── Icon (optional)
    └── Container
```

### Component Documentation

```markdown
# Button

Buttons trigger actions or navigation.

## Usage
- Use primary buttons for main actions
- Use secondary for supporting actions
- Use tertiary for low-emphasis actions
- Use destructive for irreversible actions

## Do's
- Use clear, action-oriented labels
- Keep labels concise (1-3 words)
- Use icons to reinforce meaning

## Don'ts
- Don't use multiple primary buttons
- Don't use vague labels like "Click here"
- Don't disable without explanation

## Accessibility
- Minimum touch target: 44x44px
- Include focus state
- Use aria-label for icon-only buttons
```

### Design Tokens

```json
{
  "color": {
    "primary": {
      "50": {"value": "#eff6ff"},
      "500": {"value": "#3b82f6"},
      "600": {"value": "#2563eb"}
    },
    "semantic": {
      "success": {"value": "{color.green.500}"},
      "error": {"value": "{color.red.500}"}
    }
  },
  "spacing": {
    "xs": {"value": "4px"},
    "sm": {"value": "8px"},
    "md": {"value": "16px"},
    "lg": {"value": "24px"}
  },
  "borderRadius": {
    "sm": {"value": "4px"},
    "md": {"value": "8px"},
    "lg": {"value": "12px"},
    "full": {"value": "9999px"}
  }
}
```

## Prototyping

### Prototype Fidelity

| Fidelity | Purpose | Tools | Time |
|----------|---------|-------|------|
| Paper | Quick exploration | Paper, pen | Minutes |
| Low-Fi | Flow validation | Figma, Sketch | Hours |
| Mid-Fi | Usability testing | Figma | Days |
| High-Fi | Dev handoff, final testing | Figma | Days-Weeks |

### Interaction Patterns

**Navigation:**
- Tabs
- Drawers
- Breadcrumbs
- Bottom navigation

**Data Entry:**
- Form fields
- Dropdowns
- Date pickers
- File uploads

**Feedback:**
- Toasts
- Modals
- Inline validation
- Progress indicators

## Usability Testing

### Test Plan

```markdown
# Usability Test Plan

## Objectives
- Validate new checkout flow
- Identify usability issues

## Participants
- 5-8 users
- Mix of new and existing users

## Tasks
1. Find and add product to cart
2. Complete checkout process
3. Modify order

## Metrics
- Task completion rate
- Time on task
- Error rate
- SUS score

## Materials
- Prototype link
- Task script
- Recording consent
- Compensation
```

### Task Script

```markdown
Task 1: Find a product

"Imagine you're looking for a new laptop.
Please find a laptop that meets your needs and add it to your cart.
Think aloud as you go."

Success Criteria:
- [ ] Navigated to products
- [ ] Used filters/search
- [ ] Added to cart

Observations:
- [Notes]

Time: [Duration]
```

## Reference Materials

- `references/design_principles.md` - Core design principles
- `references/component_library.md` - Component guidelines
- `references/accessibility.md` - Accessibility checklist
- `references/research_methods.md` - Research techniques

## Scripts

```bash
# Design token generator
python scripts/token_generator.py --source tokens.json --output css/

# Accessibility checker
python scripts/a11y_checker.py --url https://example.com

# Asset exporter
python scripts/asset_export.py --figma-file FILE_ID --format svg,png

# Design QA report
python scripts/design_qa.py --spec spec.figma --impl https://staging.example.com
```
