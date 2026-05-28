# Legacy Theme Design

## Goal

Rework the Vue app's `legacy` theme from a light reskin into a distinct child-friendly visual mode for ages 6-9.

The new `legacy` theme should feel softer, clearer, and more encouraging than `mainline`, without becoming noisy, overly decorative, or childish in a way that reduces long-term usability for parents.

## Current State

The current theme system in `homework-app/src/App.vue` toggles between:

- `mainline`
- `legacy`

Today, `legacy` is implemented mostly as a shallow override in `homework-app/src/style.css`:

- palette values are changed
- borders and shadows are softened
- corner radius is increased
- some component classes like `.card-mainline`, `.btn-mainline`, `.input-mainline`, and `.badge-mainline` are lightly adjusted

This improves tone slightly, but it still reads as the same interface skeleton as `mainline`. The result is a theme that feels like a color variation rather than a coherent visual language.

## Desired Outcome

After this change, `legacy` should function as a separate presentation mode with its own design logic:

- `mainline` remains editorial, high-contrast, and structured
- `legacy` becomes child-friendly, soft, bright, and easy to scan
- the two themes share layout and business logic, but differ meaningfully in visual rhythm, interaction tone, and surface treatment

The intended emotional direction is:

- welcoming
- encouraging
- calm
- playful in a restrained way

The intended product direction is not "cartoon mode". It should still look credible and clean to adults.

## Audience

The primary audience for the `legacy` theme is children aged 6-9.

This implies:

- larger and clearer interactive targets
- lower visual pressure
- simpler hierarchy inside cards
- more immediate task clarity
- softer states and motion

At the same time, the interface must remain acceptable to a parent who is configuring tasks, checking progress, or managing rewards.

## Chosen Direction

The selected direction is the balanced "Little Explorer" path.

This direction emphasizes:

- light blue-green primary accents
- bright cream or off-white surfaces
- rounded but not exaggerated geometry
- gentle navigation highlights
- a sense of "missions" or "exploration" rather than strict admin workflow

It intentionally avoids:

- high-saturation candy palettes
- sticker-like decoration
- excessive illustration motifs
- dense motion or visual noise

## Design Principles

### 1. Encourage Starting

The theme should reduce the friction of beginning a task.

Buttons, cards, and progress modules should feel inviting rather than demanding. Visual emphasis should help a child answer:

- what should I do now
- where do I tap
- what do I get when I finish

### 2. Reduce Hardness

`mainline` uses bold borders, offset shadows, and high contrast. `legacy` should intentionally soften this language:

- lighter borders
- lower-contrast containers
- smoother shadows
- less abrupt hover and active feedback

### 3. Keep Hierarchy Clear

The UI should remain easy to scan. Child-friendly does not mean flatter or noisier.

Each surface should clearly communicate:

- primary action
- current status
- supporting details

### 4. Stay Adult-Safe

The visual system should remain clean enough that parents do not feel they are using a toy app.

This means personality must come from system-level consistency, not from layered decoration.

## Scope

This change applies only to the Vue app theme presentation layer.

In scope:

- `homework-app/src/style.css`
- `homework-app/src/App.vue`
- targeted visual refinements in high-traffic Vue components where global theme overrides are not enough

Out of scope:

- data model changes
- route changes
- business logic changes
- copy rewrites across the product
- adding new game mechanics or reward systems

## Recommended Implementation Approach

Use `legacy` as a first-class theme variant driven primarily by global tokens and shared component classes, with selective component-level refinements for the most visible screens.

This preserves the existing architecture:

- the same app shell
- the same components
- the same database and state logic

But it upgrades the presentation system in a controlled way so `legacy` reads as a distinct UI language.

## Theme System Changes

### Color Tokens

The `legacy` token set should be redefined beyond the current blue replacement.

It should introduce:

- a softer primary hue in the blue-green family
- lighter background and surface separation
- gentler border tone
- child-friendly semantic accents for success, info, warning, and reward states

The palette should support calm contrast instead of hard contrast.

### Surface Language

`legacy` surfaces should feel airy and safe:

- softer cards
- subtle elevation
- less dependence on thick borders
- slightly brighter internal panels

The goal is to make cards feel like activity panels rather than editorial tiles.

### Radius and Shape

The theme should use more rounded geometry than `mainline`, but avoid exaggerated bubble UI.

Recommended direction:

- medium-large radius for cards
- pill or capsule treatment for badges and selected nav items
- rounded CTA buttons with larger tap-friendly shape

### Background Treatment

The current grid background should be replaced in `legacy`.

Instead of a technical grid, use a quieter background rhythm such as:

- very soft atmospheric gradients
- low-contrast organic shapes
- sparse, large-scale patterning

The background should create softness without competing with content.

## Shared Component Changes

### Cards

`legacy .card-mainline` should become a soft container with:

- lighter border treatment
- gentle shadow
- slightly brighter interior
- less rigid edge contrast

The card should feel friendly and breathable, especially for lists of tasks and summary sections.

### Primary Buttons

`legacy .btn-mainline` should shift from hard offset-shadow energy to soft encouragement:

- clearer fill color
- larger rounded shape
- less aggressive shadow movement
- hover feedback through slight lift, glow, or brightness rather than strong translation

The main CTA should feel like "start this mission" rather than "submit a command".

### Secondary Buttons

`legacy .btn-mainline-secondary` should look obviously secondary, but still approachable:

- lighter fill or translucent fill
- soft border
- pill-like or rounded rectangle treatment
- calm hover feedback

### Inputs

`legacy .input-mainline` should feel safe and clear:

- softer outer boundary
- more obvious focus state through tint or glow
- reduced black-outline feeling

Inputs should remain readable for parents while staying less severe than `mainline`.

### Badges

`legacy .badge-mainline` should become lighter and more informational.

Badges should:

- carry status without looking stamped on
- use softer fills
- rely on concise color coding
- avoid competing with primary content

## App Shell Changes

### Sidebar

The desktop sidebar should visually soften under `legacy`:

- calmer background separation
- gentler selected state
- more pill-like navigation highlighting
- less stark border behavior

The shell should feel more companion-like and less like a productivity dashboard.

### Mobile Header and Bottom Navigation

The mobile shell should also participate in the theme:

- more rounded selected states
- softer icon emphasis
- stronger clarity for the current location
- lighter chrome overall

This is important because the theme difference should be visible immediately, even before scrolling content.

## Targeted Screen Refinements

Global class changes will not be enough on their own. A few high-traffic surfaces should receive explicit `legacy` tuning.

### Home

Prioritize:

- task entry panel
- task list cards
- progress or summary blocks
- floating or primary add-task action

The child should quickly understand what to do next.

### Analytics

Prioritize:

- summary statistic cards
- history list visual density
- reward/progress emphasis

The page should feel informative without becoming visually heavy.

### Settings

Prioritize:

- profile/config cards
- theme toggle presentation
- destructive action area containment

This page must remain clear for parents while still matching the softer theme.

### Rewards

Prioritize:

- reward cards
- stock or expiry status badges
- redeem CTA emphasis

This page is a good place for encouraging color, but it should still remain organized.

### Monopoly / Game View

Prioritize only the most prominent panels and CTAs.

The goal is not to redesign the entire game, only to ensure that the `legacy` theme remains coherent when users enter this feature.

## Interaction and Motion Rules

The motion language should be gentler than `mainline`.

Recommended rules:

- reduce strong directional jumps
- prefer slight lift, slight scale, or slight brightness change
- make active states feel soft and responsive
- avoid exaggerated bounce or playful motion that cheapens the product

Hover and active states should support reassurance, not excitement overload.

## Content and Tone Constraints

This project does not require large copy changes, but visual tone should suggest:

- begin
- continue
- explore
- complete

It should avoid the feeling of:

- admin control panels
- enterprise dashboards
- novelty event pages

## Non-Goals

This change does not include:

- creating separate layouts per theme
- creating a dedicated children-only route structure
- changing core feature behavior
- introducing illustrations as a new asset system
- rebranding `mainline`

## Risks

### Risk 1: Still Feels Like a Recolor

If the implementation touches only palette values and shadows, the final result will remain too close to `mainline`.

Mitigation:

- include app-shell and shared component shape changes
- include targeted tweaks on high-traffic screens

### Risk 2: Becomes Too Cute or Noisy

If the implementation pushes decoration too far, the UI may lose credibility and become tiring over time.

Mitigation:

- keep backgrounds subtle
- keep accent colors controlled
- avoid excessive per-card variation

### Risk 3: Theme Drift Across Screens

Some screens may remain on older visual assumptions and break the coherence of the theme.

Mitigation:

- verify the home, analytics, settings, rewards, and monopoly views explicitly
- add component-level `legacy` overrides only where necessary

## Testing and Verification

Verification should confirm both consistency and usability.

### Visual Verification

Check the following in both desktop and mobile layouts:

- app shell difference is obvious immediately
- primary CTA stands out clearly
- cards are easier to scan
- badges and status indicators remain readable
- no screen looks like a partial or broken theme

### Functional Verification

Confirm theme toggle still works correctly:

- `mainline` remains unchanged
- `legacy` applies expected root class behavior
- theme persistence in settings storage still works

### Screen Coverage

Review at minimum:

- home
- daily check-in
- rewards
- analytics
- settings
- monopoly

## Implementation Summary

The preferred implementation is a balanced middle path:

- strengthen `legacy` into a distinct child-friendly visual system
- keep the same feature and component architecture
- focus on tokens, shared UI primitives, shell styling, and a limited set of high-impact screen overrides

This is sufficient to make `legacy` feel intentional, natural, and better looking without turning the app into a different product.
