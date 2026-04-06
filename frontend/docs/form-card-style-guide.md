# Form Card Style Guide

## Semantic Blue Rules

- CTA buttons only: primary action submit, publish, enroll
- Interactive focus states only: `:focus-visible` outline and ring
- Informational highlights only: course code chips, tips banners, helper badges
- Avoid primary blue for base card backgrounds, body text, or passive surfaces

## Color Tokens

- Form card background: `#FFFFFF`
- Secondary card background: `#F7F9FC`
- Input background: `#FFFFFF`
- Input border: `#E5E7EB`
- Focus outline: `#3B82F6` at `2px`
- Body text: `#0F172A`
- Secondary text: `#64748B`

## Input Rules

- Border: `1px solid #E5E7EB`
- Radius: `8px`
- Padding: `12px`
- Focus style: `2px` visible outline/ring using `#3B82F6`

## Elevation Tokens

- `elevation-none`: `0 0 0 rgba(0,0,0,0)`
- `elevation-subtle`: `0 1px 2px rgba(15,23,42,0.08)`
- No blur values above `2px` for form card components

## WCAG Contrast Matrix

| Foreground | Background | Ratio | Use Case |
|---|---|---:|---|
| `#0F172A` | `#FFFFFF` | 15.8:1 | Body text |
| `#64748B` | `#FFFFFF` | 4.8:1 | Secondary text |
| `#FFFFFF` | `#3B82F6` | 4.6:1 | CTA text |
| `#FFFFFF` | `#047857` | 5.5:1 | FREE badge |
| `#1E293B` | `#F7F9FC` | 11.9:1 | Card headings |

## Storybook Spec Checklist

- Before/after states for:
  - Landing auth card
  - Teacher upload center forms
  - Teacher payment settings cards
- Light and dark variants represented as:
  - `FormCard/Default`
  - `FormCard/Focused`
  - `FormCard/Error`
  - `FormCard/FreeLessonToggle`
- Contrast matrix included with each story metadata
- Design sign-off gate:
  - Product design review
  - Accessibility review
  - QA visual regression approval
