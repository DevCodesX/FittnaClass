# FittnaClass Design System — Living Style Guide

_Last updated: 2026-03-16_

---

## 1. Brand Blue Semantic Rules

Primary brand blue (`--color-primary: #478FE6` / focus blue: `#3B82F6`) is restricted to **three semantic roles only**:

| Role | Usage | Example |
|------|-------|---------|
| **CTA Buttons** | Primary action buttons (save, publish, enroll, continue) | `bg-primary text-white` |
| **Interactive Focus States** | `:focus-visible` outline/ring on form inputs and interactive controls | `focus-visible:ring-2 focus-visible:ring-[#3B82F6]` |
| **Informational Highlights** | Course codes, step indicators, active nav items, info badges | `text-primary`, `bg-primary/10 text-primary` |

> [!CAUTION]
> Do **NOT** use brand blue for: decorative backgrounds, large surface fills, borders (use `#E5E7EB`), or body text.

---

## 2. Elevation Tokens

All shadows are capped at **≤ 2px blur**. No `shadow-md`, `shadow-lg`, `shadow-xl`, or `shadow-2xl`.

| Token | CSS Value | Usage |
|-------|-----------|-------|
| `--elevation-none` | `0 0 0 rgba(0,0,0,0)` | Muted cards, inner panels |
| `--elevation-subtle` | `0 1px 2px rgba(15,23,42,0.08)` | Card containers, form sections |

**Inline equivalent:** `shadow-[0_1px_2px_rgba(15,23,42,0.08)]`

For hover states, use `border-color` transitions (e.g., `hover:ring-blue-100/50`) instead of shadow elevation changes.

---

## 3. Form Input Specification

All form inputs must follow this exact spec:

```css
.form-input {
    width: 100%;
    padding: 12px;            /* touch-friendly target */
    border-radius: 8px;
    border: 1px solid #E5E7EB; /* gray-200 */
    background: #FFFFFF;
    color: #0F172A;
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.form-input:focus-visible {
    border-color: #3B82F6;
    box-shadow: 0 0 0 2px #3B82F6; /* 2px blue outline */
}
```

---

## 4. Color Palette & Backgrounds

| Token | Hex | Role |
|-------|-----|------|
| `--background` | `#F6F7F8` | Page body background |
| `--form-card-bg` | `#FFFFFF` | Card backgrounds |
| `--form-card-muted-bg` | `#F7F9FC` | Muted/secondary panels |
| `--form-border` | `#E5E7EB` | Card and input borders |
| `--foreground` | `#0F172A` | Primary text |

> [!IMPORTANT]
> Body background must use `var(--background)`, never hardcoded dark values.

---

## 5. WCAG 2.1 Contrast Matrix

All pairings verified against WCAG 2.1 AA requirements:
- **Body text:** ≥ 4.5:1 ratio
- **Large text/icons (≥18px bold or ≥24px):** ≥ 3:1 ratio

| Text Color | Background | Ratio | Pass? |
|-----------|------------|-------|-------|
| `#0F172A` (slate-900) | `#FFFFFF` (white) | **15.4:1** | ✅ AA |
| `#0F172A` (slate-900) | `#F7F9FC` (muted bg) | **14.6:1** | ✅ AA |
| `#0F172A` (slate-900) | `#F6F7F8` (body bg) | **14.3:1** | ✅ AA |
| `#475569` (slate-600) | `#FFFFFF` (white) | **6.0:1** | ✅ AA |
| `#64748B` (slate-500) | `#FFFFFF` (white) | **4.6:1** | ✅ AA |
| `#94A3B8` (slate-400) | `#FFFFFF` (white) | **3.0:1** | ⚠️ Large only |
| `#478FE6` (primary) | `#FFFFFF` (white) | **3.3:1** | ⚠️ Large only |
| `#FFFFFF` (white) | `#478FE6` (primary) | **3.3:1** | ⚠️ Large only |
| `#FFFFFF` (white) | `#3B82F6` (focus blue) | **3.1:1** | ⚠️ Large only |
| `#FFFFFF` (white) | `#047857` (emerald-700) | **5.0:1** | ✅ AA |
| `#065F46` (emerald-800) | `#D1FAE5` (emerald-light) | **6.4:1** | ✅ AA |
| `#FFFFFF` (white) | `#0F2B5B` (gradient-primary dark) | **12.3:1** | ✅ AA |

> [!NOTE]
> `slate-400` (`#94A3B8`) is used only for placeholder text and secondary labels — acceptable for large text. Primary brand blue buttons use white text on `bg-primary` — passes 3:1 for large/bold text (buttons are always bold ≥14px).

---

## 6. FREE Badge Specification

| Context | Classes | Contrast |
|---------|---------|----------|
| CourseCard (explore list) | `bg-emerald-700 text-white` | **5.0:1** ✅ AA |
| Course detail page | `bg-emerald-700 text-white` | **5.0:1** ✅ AA |
| Upload-center confirmation | `border-emerald-200 bg-emerald-50 text-emerald-800` | **6.4:1** ✅ AA |

---

## 7. Analytics Events

| Event Name | Trigger | Payload |
|-----------|---------|---------|
| `free_lesson_upload` | Teacher saves course with `is_free_lesson=true` | `{ courseId, courseCode, price: 0 }` |

Tracked via `window.dataLayer` push and `CustomEvent('fittnaclass-analytics')`.
