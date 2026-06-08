# Card Frame Rarity Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `src/components/gacha/CardFrame.vue` so `N`, `R`, `SR`, and `SSR` have a clearer premium rarity ladder, with `SSR` using an extremely fine holographic gradient effect.

**Architecture:** Keep the change contained to the existing `CardFrame.vue` component. Rework the template only as needed for decorative layers, replace the current rarity surface CSS with a layered material system, and verify the result through the existing card consumers rather than changing any gacha logic or parent layouts.

**Tech Stack:** Vue 3 single-file components, scoped CSS, existing Tailwind utility classes already used in templates

---

## File Structure

- Modify: `src/components/gacha/CardFrame.vue`
  - Keep the component API unchanged
  - Add minimal decorative structure if pseudo-elements alone are not enough
  - Replace rarity background, border, badge, inner panel, and locked-state styles
- Review manually through existing consumers:
  - `src/components/gacha/CardReveal.vue`
  - `src/components/gacha/TenPullResult.vue`
  - `src/components/gacha/CollectionView.vue`

### Task 1: Adjust CardFrame Markup For Layered Surfaces

**Files:**
- Modify: `src/components/gacha/CardFrame.vue`

- [ ] **Step 1: Re-read the current component before editing**

Run: `sed -n '1,260p' src/components/gacha/CardFrame.vue`
Expected: The component shows the current frame wrapper, optional SSR shimmer layer, and rarity-specific CSS blocks.

- [ ] **Step 2: Replace the current single-purpose SSR shimmer node with generic decorative layers**

Update the template section inside `src/components/gacha/CardFrame.vue` so the frame wrapper contains two reusable decorative layers and the existing content layer remains last:

```vue
<template>
  <div
    class="card-frame transition-all duration-300"
    :class="[
      `rarity-${card.rarity.toLowerCase()}`,
      { 'is-locked': isLocked },
      { 'cursor-pointer hover:scale-105 active:scale-95': clickable }
    ]"
    @click="handleClick"
  >
    <div class="card-surface absolute inset-0 pointer-events-none"></div>
    <div class="card-foil absolute inset-0 pointer-events-none"></div>

    <div class="card-inner p-3 flex flex-col h-full items-center justify-between text-center relative z-10 select-none">
      <span class="rarity-badge text-[10px] font-bold px-2 py-0.5 rounded-full uppercase absolute top-2 left-2 shadow-sm">
        {{ card.rarity }}
      </span>

      <span v-if="count > 1" class="count-badge text-[10px] font-semibold bg-primary-light text-primary-dark px-1.5 py-0.5 rounded absolute top-2 right-2 border border-primary/20">
        ×{{ count }}
      </span>

      <div class="emoji-container my-auto flex items-center justify-center text-5xl md:text-6xl drop-shadow-md">
        {{ card.emoji }}
      </div>

      <div class="w-full mt-2">
        <h4 class="text-sm font-bold text-content-main truncate leading-tight">
          {{ isZh ? card.name.zh : card.name.en }}
        </h4>
        <p v-if="showSeries" class="text-[10px] text-content-sub mt-0.5 uppercase tracking-wider">
          {{ card.series }}
        </p>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 3: Confirm the component still parses cleanly**

Run: `sed -n '1,260p' src/components/gacha/CardFrame.vue`
Expected: The SSR-only shimmer node is gone and the new `card-surface` plus `card-foil` layers exist once each.

- [ ] **Step 4: Commit the markup checkpoint**

```bash
git add src/components/gacha/CardFrame.vue
git commit -m "refactor: prepare layered card frame surface"
```

### Task 2: Rebuild The Core Card Material System

**Files:**
- Modify: `src/components/gacha/CardFrame.vue`

- [ ] **Step 1: Replace the base `.card-frame` and `.card-inner` styles with a layered premium card shell**

In the `<style scoped>` block, replace the existing `.card-frame`, `.card-inner`, and dark-mode card-inner rules with:

```css
.card-frame {
  aspect-ratio: 2 / 3;
  width: 100%;
  position: relative;
  isolation: isolate;
  border-width: 1px;
  border-style: solid;
  border-radius: 1rem;
  overflow: hidden;
  background: #1f2937;
  box-shadow:
    0 10px 30px rgba(15, 23, 42, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.16);
}

.card-frame::before,
.card-frame::after,
.card-surface::before,
.card-surface::after,
.card-foil::before,
.card-foil::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.card-frame::before {
  inset: 1px;
  border-radius: calc(1rem - 1px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  opacity: 0.9;
  z-index: 0;
}

.card-frame::after {
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.18), transparent 38%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent 24%, transparent 76%, rgba(0, 0, 0, 0.16));
  mix-blend-mode: screen;
  opacity: 0.6;
  z-index: 0;
}

.card-surface,
.card-foil {
  position: absolute;
  inset: 0;
  border-radius: inherit;
}

.card-surface {
  z-index: 0;
}

.card-foil {
  z-index: 1;
}

.card-inner {
  position: relative;
  z-index: 2;
  height: 100%;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.04) 28%, rgba(8, 15, 28, 0.12) 100%),
    linear-gradient(180deg, rgba(10, 14, 22, 0.14), rgba(10, 14, 22, 0.22));
  backdrop-filter: blur(8px);
}

:global(.dark) .card-inner {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02) 24%, rgba(0, 0, 0, 0.18) 100%),
    linear-gradient(180deg, rgba(5, 10, 18, 0.22), rgba(5, 10, 18, 0.32));
}
```

- [ ] **Step 2: Add premium badge, count, and emoji styling so the new surfaces still read clearly**

Append these rules after the `card-inner` block:

```css
.rarity-badge {
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  padding-inline: 0.55rem;
  padding-block: 0.22rem;
  letter-spacing: 0.14em;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 6px 18px rgba(15, 23, 42, 0.18);
}

.count-badge {
  background: rgba(255, 255, 255, 0.84);
  color: #0f172a;
  border-color: rgba(255, 255, 255, 0.5);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.12);
}

.emoji-container {
  text-shadow:
    0 8px 18px rgba(15, 23, 42, 0.22),
    0 2px 0 rgba(255, 255, 255, 0.16);
}
```

- [ ] **Step 3: Verify the component stylesheet now defines shared layers before rarity-specific overrides**

Run: `sed -n '1,320p' src/components/gacha/CardFrame.vue`
Expected: Shared shell rules appear before rarity-specific sections, and `card-surface` plus `card-foil` are styled explicitly.

- [ ] **Step 4: Commit the shared material system**

```bash
git add src/components/gacha/CardFrame.vue
git commit -m "style: add premium layered card shell"
```

### Task 3: Implement N And R Rarity Background Systems

**Files:**
- Modify: `src/components/gacha/CardFrame.vue`

- [ ] **Step 1: Replace the current `N` and `R` rarity blocks with the new fixed-color and special-color materials**

In `src/components/gacha/CardFrame.vue`, replace the existing `.rarity-n`, `.rarity-r`, and their badge rules with:

```css
.rarity-n {
  border-color: rgba(148, 163, 184, 0.7);
  background: #6b7280;
  box-shadow:
    0 12px 26px rgba(71, 85, 105, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.rarity-n .card-surface {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.12), transparent 28%),
    linear-gradient(135deg, #7b8594 0%, #66707f 55%, #4f5866 100%);
}

.rarity-n .card-surface::before {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, transparent 35%, rgba(255, 255, 255, 0.04) 100%);
  opacity: 0.75;
}

.rarity-n .card-surface::after {
  background:
    repeating-linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.03) 0 2px,
      transparent 2px 7px
    );
  opacity: 0.28;
}

.rarity-n .card-foil {
  opacity: 0.22;
}

.rarity-n .rarity-badge {
  background: linear-gradient(180deg, rgba(103, 116, 136, 0.94), rgba(78, 89, 107, 0.96));
  color: #f8fafc;
}

.rarity-r {
  border-color: rgba(56, 189, 248, 0.72);
  background: #155e75;
  box-shadow:
    0 14px 28px rgba(8, 47, 73, 0.2),
    0 0 18px rgba(34, 211, 238, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.rarity-r .card-surface {
  background:
    radial-gradient(circle at top left, rgba(186, 230, 253, 0.16), transparent 32%),
    linear-gradient(135deg, #1c7a92 0%, #14566d 48%, #0f3f54 100%);
}

.rarity-r .card-surface::before {
  background:
    linear-gradient(122deg, transparent 14%, rgba(203, 244, 255, 0.22) 28%, transparent 42%);
  opacity: 0.92;
}

.rarity-r .card-surface::after {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent 24%, rgba(0, 0, 0, 0.08) 100%);
  opacity: 0.8;
}

.rarity-r .card-foil {
  background:
    radial-gradient(circle at 82% 18%, rgba(255, 255, 255, 0.12), transparent 16%);
  opacity: 0.5;
}

.rarity-r .rarity-badge {
  background: linear-gradient(180deg, rgba(34, 168, 197, 0.94), rgba(14, 104, 128, 0.96));
  color: #f5fdff;
}
```

- [ ] **Step 2: Remove any leftover old `N` and `R` dark-mode gradient blocks that conflict with the new design**

Run: `rg -n "rarity-n|rarity-r|dark" src/components/gacha/CardFrame.vue`
Expected: Only the new rarity definitions remain, and there are no old light-cyan or light-gray gradient blocks left behind.

- [ ] **Step 3: Commit the `N` and `R` pass**

```bash
git add src/components/gacha/CardFrame.vue
git commit -m "style: upgrade n and r card backgrounds"
```

### Task 4: Implement SR And SSR Premium Effects

**Files:**
- Modify: `src/components/gacha/CardFrame.vue`

- [ ] **Step 1: Replace the current `SR` and `SSR` rarity blocks with gradient and ultra-fine holographic treatments**

In `src/components/gacha/CardFrame.vue`, replace the existing `.rarity-sr`, `.rarity-ssr`, badge rules, and old SSR shimmer implementation with:

```css
.rarity-sr {
  border-color: rgba(167, 139, 250, 0.74);
  background: #43306a;
  box-shadow:
    0 16px 30px rgba(49, 46, 129, 0.24),
    0 0 22px rgba(129, 140, 248, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.14);
}

.rarity-sr .card-surface {
  background:
    radial-gradient(circle at 22% 18%, rgba(255, 255, 255, 0.16), transparent 22%),
    radial-gradient(circle at 78% 82%, rgba(96, 165, 250, 0.14), transparent 24%),
    linear-gradient(135deg, #5b4b8a 0%, #334a83 48%, #192f5d 100%);
}

.rarity-sr .card-surface::before {
  background:
    linear-gradient(140deg, rgba(255, 255, 255, 0.14), transparent 30%, rgba(125, 211, 252, 0.08) 72%, transparent 100%);
  opacity: 0.9;
}

.rarity-sr .card-surface::after {
  background:
    radial-gradient(circle at center, rgba(255, 255, 255, 0.08), transparent 52%);
  opacity: 0.8;
}

.rarity-sr .card-foil {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), transparent 24%, rgba(255, 255, 255, 0.03) 100%);
  opacity: 0.66;
}

.rarity-sr .rarity-badge {
  background: linear-gradient(180deg, rgba(126, 105, 205, 0.96), rgba(67, 48, 106, 0.96));
  color: #faf7ff;
}

.rarity-ssr {
  border-color: rgba(244, 208, 117, 0.82);
  background: #241c3a;
  box-shadow:
    0 18px 34px rgba(49, 24, 70, 0.28),
    0 0 26px rgba(251, 191, 36, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.rarity-ssr .card-surface {
  background:
    radial-gradient(circle at 18% 20%, rgba(255, 255, 255, 0.22), transparent 18%),
    radial-gradient(circle at 84% 16%, rgba(251, 191, 36, 0.14), transparent 20%),
    linear-gradient(135deg, #31224f 0%, #1d274e 34%, #114b5f 66%, #31224f 100%);
}

.rarity-ssr .card-surface::before {
  background:
    linear-gradient(115deg, transparent 0%, rgba(255, 255, 255, 0.18) 18%, transparent 30%, rgba(96, 165, 250, 0.12) 45%, transparent 56%, rgba(244, 114, 182, 0.12) 70%, transparent 82%);
  opacity: 0.95;
}

.rarity-ssr .card-surface::after {
  background:
    radial-gradient(circle at center, rgba(255, 255, 255, 0.08), transparent 55%);
  opacity: 0.8;
}

.rarity-ssr .card-foil {
  background:
    linear-gradient(120deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.02) 22%, rgba(255, 255, 255, 0.18) 24%, rgba(255, 255, 255, 0.03) 27%, rgba(255, 255, 255, 0.03) 48%, rgba(125, 211, 252, 0.16) 50%, rgba(255, 255, 255, 0.03) 53%, rgba(255, 255, 255, 0.03) 74%, rgba(244, 114, 182, 0.14) 76%, rgba(255, 255, 255, 0.02) 78%, rgba(255, 255, 255, 0.02) 100%);
  background-size: 220% 220%;
  mix-blend-mode: screen;
  opacity: 0.75;
  animation: ssrFoilShift 5.8s linear infinite;
}

.rarity-ssr .card-foil::before {
  background:
    repeating-linear-gradient(
      115deg,
      rgba(255, 255, 255, 0.12) 0 1px,
      rgba(125, 211, 252, 0.08) 1px 2px,
      rgba(244, 114, 182, 0.08) 2px 3px,
      transparent 3px 8px
    );
  mix-blend-mode: screen;
  opacity: 0.32;
}

.rarity-ssr .card-foil::after {
  background:
    radial-gradient(circle at 84% 18%, rgba(255, 255, 255, 0.22), transparent 12%),
    radial-gradient(circle at 18% 82%, rgba(255, 255, 255, 0.14), transparent 14%);
  opacity: 0.75;
}

.rarity-ssr .rarity-badge {
  background: linear-gradient(180deg, rgba(245, 191, 83, 0.96), rgba(137, 83, 255, 0.86));
  color: #fffdf7;
}

@keyframes ssrFoilShift {
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: 100% 50%;
  }
}
```

- [ ] **Step 2: Add reduced-motion protection for the SSR foil animation**

Append this block after the `@keyframes ssrFoilShift` rule:

```css
@media (prefers-reduced-motion: reduce) {
  .rarity-ssr .card-foil {
    animation: none;
  }
}
```

- [ ] **Step 3: Confirm the SSR effect stays extremely fine rather than chunky**

Run: `rg -n "repeating-linear-gradient|ssrFoilShift|rarity-ssr" src/components/gacha/CardFrame.vue`
Expected: The `SSR` treatment uses 1px to 3px foil lines and a single slow animation named `ssrFoilShift`.

- [ ] **Step 4: Commit the `SR` and `SSR` pass**

```bash
git add src/components/gacha/CardFrame.vue
git commit -m "style: add sr gradients and ssr holographic foil"
```

### Task 5: Refine Locked State And Final Verification

**Files:**
- Modify: `src/components/gacha/CardFrame.vue`
- Review: `src/components/gacha/CardReveal.vue`
- Review: `src/components/gacha/TenPullResult.vue`
- Review: `src/components/gacha/CollectionView.vue`

- [ ] **Step 1: Replace the old full-grayscale locked-state styling with restrained desaturation and haze**

In `src/components/gacha/CardFrame.vue`, replace the existing `.is-locked` and `.is-locked::after` block with:

```css
.is-locked {
  filter: saturate(0.38) brightness(0.72);
  opacity: 0.7;
  box-shadow:
    0 8px 18px rgba(15, 23, 42, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.is-locked .card-surface,
.is-locked .card-foil,
.is-locked .card-inner {
  filter: grayscale(0.22);
}

.is-locked .card-foil {
  opacity: 0.18 !important;
}

.is-locked::after {
  content: '🔒';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.5rem;
  opacity: 0.72;
  z-index: 3;
  text-shadow: 0 4px 12px rgba(15, 23, 42, 0.24);
}
```

- [ ] **Step 2: Run a quick component diff check**

Run: `git diff -- src/components/gacha/CardFrame.vue`
Expected: The diff is limited to the card component and shows no prop or script API breakage.

- [ ] **Step 3: Run the project verification command**

Run: `npm run build`
Expected: Vite completes successfully without Vue SFC or CSS errors.

- [ ] **Step 4: Review the card in all existing consumers**

Run: `rg -n "<CardFrame|CardFrame " src/components`
Expected: The search shows the existing usage points you need to visually sanity-check after build.

- [ ] **Step 5: Commit the final card visual pass**

```bash
git add src/components/gacha/CardFrame.vue
git commit -m "feat: upgrade gacha card rarity backgrounds"
```
