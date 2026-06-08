# Card Frame Rarity Background Design

## Context

The gacha card frame in `src/components/gacha/CardFrame.vue` already differentiates `N`, `R`, `SR`, and `SSR`, but the current treatment is visually flat. The backgrounds rely on simple gradients and light glows, which makes the rarity ladder feel incremental rather than intentionally premium.

The goal of this change is to upgrade the card face itself so that each rarity reads as a distinct collectible tier:

- `N`: fixed background color
- `R`: special background color
- `SR`: gradient background color
- `SSR`: gradient background with special visual effects

This design only applies to the card body rendered by `CardFrame.vue`. It does not change draw result containers, modal shells, or the flip-card back in `CardReveal.vue`.

## Scope

In scope:

- Redesign the visual system inside `CardFrame.vue`
- Strengthen rarity differentiation for `N`, `R`, `SR`, `SSR`
- Improve background material quality, border treatment, badge styling, and content contrast
- Preserve compatibility with existing props, events, and card data
- Keep dark mode support intact

Out of scope:

- Changes to gacha probabilities, card data, or draw logic
- Layout changes in `TenPullResult.vue`, `CardReveal.vue`, or collection screens
- Adding rarity-specific business behavior
- Replacing emoji art or typography outside the card frame

## Visual Direction

The target style is premium collectible card, not playful capsule toy. The card should feel more like a polished trading card with material layering, reflective coating, and controlled lighting.

Design principles:

- Prefer deep, grounded base tones over pastel fills
- Use material contrast to communicate rarity escalation
- Keep the content readable even on effect-heavy rarities
- Reserve continuous animated effects for `SSR` only
- Make `SSR` feel holographic rather than merely colorful

## Card Surface Model

The card face should be treated as four visual layers:

1. Base layer
   The main rarity-dependent background surface.
2. Texture layer
   Fine material texture or reflective pattern applied with pseudo-elements.
3. Light layer
   Soft highlight, edge reflection, glow, or holographic sweep depending on rarity.
4. Content protection layer
   A restrained inner panel that preserves legibility without flattening the card.

This structure should be implemented without changing the component API. Visual complexity should remain encapsulated inside the component stylesheet and minimal template additions.

## Rarity Definitions

### N

`N` should use a fixed matte background color, closer to slate metal or smoke silver than the current light gray gradient. It should feel like a basic card with quality, not an unfinished placeholder.

Visual rules:

- Static, mostly solid base
- Very subtle top-light or fine grain texture
- Low contrast border
- Minimal or no glow

### R

`R` should use a special background color with a stronger material identity, but still stay restrained. The primary read should be a premium single-tone surface rather than a showy gradient.

Visual rules:

- Recognizable specialty color, such as cold teal, deep jade, or blue-metal
- Light metallic cut or reflective streak
- More noticeable border and soft glow than `N`
- Still visually controlled and not overly vivid

### SR

`SR` should be the first tier where gradient becomes a defining characteristic. It needs to read immediately as more collectible and more elevated than `R`.

Visual rules:

- Dual-tone or triple-tone gradient
- Clear center light or edge glow
- Stronger depth than `R`
- Premium but still stable enough for multiple cards on screen

### SSR

`SSR` should use a gradient background with holographic effect treatment. The intended effect is holographic foil, not rainbow novelty.

Visual rules:

- Deep premium base to anchor the card
- Color-shifting gradient ribbons
- Holographic diagonal pattern or prism reflection
- Edge iridescence and small highlight accents
- Slow, subtle motion only on the effect layer

## Supporting Elements

### Border

Borders should evolve with rarity instead of only changing color:

- `N`: muted metallic border
- `R`: cleaner and brighter specialty-metal border
- `SR`: more luminous border with inner line detail
- `SSR`: premium metallic outer border with holographic inner reflection

### Rarity Badge

The rarity badge should be updated from a generic pill into a more premium label treatment. It should feel closer to a stamped plate or collector label than a default rounded tag.

Rules:

- Keep the current placement and content
- Reduce the toy-like feel
- Match each rarity's material language
- Allow `SSR` badge to carry a restrained gradient

### Content Protection Layer

The current `card-inner` white glass panel mutes the background too aggressively. It should be replaced by a lighter-touch protective layer:

- Enough contrast for title and series text
- More transparency than the current implementation
- Tone should adapt to light and dark mode
- Background should remain visible through the panel

### Locked State

Locked cards should not collapse all rarity identity into flat grayscale.

Rules:

- Keep the locked visual clearly distinct
- Preserve some hint of the underlying rarity
- Prefer desaturation, lowered brightness, and haze over total visual shutdown

## Motion

Animation usage should stay disciplined:

- `N`, `R`: no persistent motion
- `SR`: static or near-static treatment only
- `SSR`: slow and subtle animated holographic sweep

The motion must not flicker or overpower the content, especially in the ten-card result grid.

## Accessibility and Performance

The redesign should preserve usability:

- Card text remains readable in all rarities
- Effect layers do not interfere with clickability
- Persistent animations are limited to `SSR`
- Heavy blur, blend, and shadow usage should stay moderate to avoid degrading multi-card rendering

If needed, `prefers-reduced-motion` should disable or simplify `SSR` animation.

## Implementation Approach

Primary implementation target:

- `src/components/gacha/CardFrame.vue`

Likely changes:

- Add or refine effect layers with pseudo-elements or one minimal extra decorative element
- Replace the current rarity background definitions with a deeper tiered system
- Update `card-inner`, border, and badge styling
- Add `SSR`-only holographic animation
- Adjust locked-state styling to preserve card identity

No public API changes are expected.

## Testing Strategy

Validate manually across the existing card usage surfaces:

- Single card reveal front
- Ten-pull result grid
- Card detail modal
- Collection and other places where `CardFrame` is reused

Check specifically:

- Rarity distinction is obvious at a glance
- `SSR` feels special without becoming noisy
- Text and emoji remain readable
- Locked cards still show rarity character
- Light and dark themes remain coherent

## Acceptance Criteria

- `N`, `R`, `SR`, and `SSR` each have clearly different background logic
- `N` reads as fixed matte base color
- `R` reads as a special premium color surface
- `SR` reads as a clear gradient rarity
- `SSR` reads as a holographic gradient rarity with subtle special effects
- The card looks more premium overall without changing business behavior
- The redesign is contained to `CardFrame.vue`
