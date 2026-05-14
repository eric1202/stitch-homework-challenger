# Shared I18n Design

## Goal

Unify the Vue, React, and Expo homework apps around a single shared translation source so future locale and key changes are made once and consumed consistently by all three projects.

## Current State

The repository currently maintains three separate locale files:

- `homework-app/src/locales.js`
- `homework-app-react/src/locales.js`
- `homework-app-expo/src/services/locales.js`

These files contain overlapping but not identical translation trees. The drift shows up in two ways:

1. Key structure differences, such as `app.nav.home` vs `app.nav.tasks` and `app.nav.adventure` vs `app.nav.monopoly`.
2. Framework-specific interpolation syntax differences, with Vue using `{name}` and i18next using `{{name}}`.

This makes content changes error-prone and forces manual synchronization across projects.

## Desired Outcome

After this change:

- All translation content will live in one shared source under `packages/shared`.
- Vue, React, and Expo will all read from that shared source.
- All three apps will use the same translation key structure.
- Each app will keep its existing i18n framework.
- Framework-specific interpolation formatting will be handled by a shared adapter instead of by duplicating locale content.

## Recommended Approach

Use a single shared locale source with runtime adaptation.

The shared package will own canonical `en` and `zh` message objects using one canonical interpolation format. A small adapter layer in `packages/shared` will transform those messages into framework-specific resources:

- Vue resources with `{name}` style interpolation
- React and Expo resources with `{{name}}` style interpolation

This preserves the existing framework choices while removing duplicate translation content.

## Canonical Locale Format

The canonical source should use i18next-style `{{variable}}` interpolation.

Reasoning:

- React and Expo already use i18next directly.
- It is safer to convert `{{name}}` to Vue format than to maintain Vue-style canonical strings and later infer i18next placeholders.
- The shared source should optimize for the majority consumer path because two of the three apps already use i18next.

The Vue adapter will convert interpolation placeholders from `{{name}}` to `{name}` recursively across the locale tree before passing messages into `vue-i18n`.

## Shared Module Shape

Add shared locale utilities in `packages/shared`:

- `packages/shared/locales.js`
  - Exports canonical `en` and `zh`
  - Exports framework adapter helpers
- `packages/shared/index.js`
  - Re-exports shared locale helpers

The shared locale module should expose a narrow API:

- `getCanonicalMessages()`
  - Returns `{ en, zh }` using canonical shared content
- `getVueMessages()`
  - Returns `{ en, zh }` transformed for `vue-i18n`
- `getI18nextResources()`
  - Returns `{ en: { translation: en }, zh: { translation: zh } }`

The adapter should be implemented as a pure recursive transformer over nested objects and arrays so the locale definitions stay declarative and easy to audit.

## Unified Key Structure

This migration will also standardize the translation tree so the three apps stop carrying divergent naming.

The canonical key structure should prefer the union of all currently used app capabilities, with one key per concept. The following categories must be aligned during migration:

- Navigation keys
  - Standardize on one naming scheme for home/tasks, check-in, analytics, rewards, monopoly/adventure, settings
- Shared common actions and status labels
- Home screen content
- Daily check-in content
- Rewards content
- Analytics content
- Settings content
- Monopoly content

Where two keys represent the same concept today, one canonical key should survive and the app code should be updated to use it everywhere. This is intentionally part of the migration because sharing the source without unifying the keys would preserve drift.

## Migration Strategy

### Phase 1: Inventory and Alignment

Build a complete inventory of translation keys referenced by each app and compare them against the three current locale files.

The inventory should identify:

- Keys used by all three apps
- Keys used only by one or two apps
- Keys with equivalent meaning but different names
- Keys present in locale files but unused in code

This inventory is the basis for defining the canonical translation tree and avoiding accidental omissions.

### Phase 2: Create Shared Locale Source

Create `packages/shared/locales.js` with:

- Canonical `en`
- Canonical `zh`
- Recursive interpolation conversion for Vue
- Resource wrappers for Vue and i18next consumers

At this stage, the new shared module should include the fully unified key structure and complete copy for both languages.

### Phase 3: Switch App I18n Entry Points

Update the app-specific i18n bootstrapping files so they consume the shared module instead of local locale files:

- `homework-app/src/i18n.js` uses `getVueMessages()`
- `homework-app-react/src/i18n.js` uses `getI18nextResources()`
- `homework-app-expo/src/i18n/index.js` uses `getI18nextResources()`

Default language selection behavior should remain unchanged in this migration:

- Vue keeps browser-driven default locale
- React keeps browser-driven default locale
- Expo keeps its current default locale behavior

This keeps the change focused on shared content rather than user-facing locale behavior.

### Phase 4: Update App Code to Canonical Keys

Update component code in all three apps to reference the canonical key set.

This includes:

- Navigation labels
- Any feature-specific key paths that currently differ between platforms
- Any renamed monopoly, home, settings, or check-in references

The goal is that all platform code references the same semantic key names even if each platform renders different UI.

### Phase 5: Remove Duplicated Locale Files

Once each app consumes the shared source and all key references are migrated, remove the old project-local locale definitions:

- `homework-app/src/locales.js`
- `homework-app-react/src/locales.js`
- `homework-app-expo/src/services/locales.js`

If any thin compatibility wrappers are still useful for import stability, keep them only if they are trivial pass-throughs to the shared package. Otherwise delete them to avoid future drift.

## Error Handling and Safety

The shared adapter layer should be deterministic and side-effect free.

Key safety rules:

- Do not mutate the canonical locale objects in place during conversion.
- Preserve nested object structure exactly.
- Preserve arrays if any locale branch uses them in the future.
- Only transform interpolation placeholder syntax in string values.

The migration should avoid introducing fallback aliasing between old and new keys. Instead, code references should be updated to the canonical names during the migration so there is one real source of truth.

## Testing and Verification

Verification must cover both structural correctness and user-visible behavior.

### Static Verification

- Run a key inventory script or equivalent check to confirm the shared locale source covers every translation key referenced by the apps.
- Confirm the shared `en` and `zh` trees have identical structure.
- Confirm the Vue-transformed messages no longer contain `{{...}}`.
- Confirm i18next resources preserve `{{...}}`.

### App Verification

At minimum, run each app’s basic build or startup verification after the migration:

- Vue app
- React app
- Expo app

Check the following views specifically because they use a broad set of translations and interpolation:

- Main navigation
- Home/tasks screen
- Daily check-in screen
- Rewards screen
- Settings screen
- Monopoly/adventure screen

Confirm:

- No missing-key warnings appear
- Interpolated content renders correctly
- Chinese and English both render as expected
- Platform-specific i18n bootstrapping still works

## Non-Goals

This migration does not include:

- Replacing `vue-i18n` with i18next in the Vue app
- Changing the current default locale behavior per platform
- Introducing remote translation loading
- Adding a translation management UI

Those can be addressed later if needed, but they should not be folded into this refactor.

## Risks

### Key Rename Regressions

Unifying the key tree will require code updates across three apps. Missing a reference could produce runtime missing-key errors.

Mitigation:

- Inventory all translation usages before changing keys
- Verify each app after migration

### Interpolation Conversion Bugs

An incorrect recursive transform could break strings containing placeholders.

Mitigation:

- Keep the transform small and pure
- Verify representative strings with interpolation in both Vue and i18next outputs

### Hidden Drift in Unused Branches

Some keys may exist in locale files but not currently be referenced. Deleting them blindly could remove planned content.

Mitigation:

- Review unused branches before removal
- Keep only content that still maps to supported UI or near-term product intent

## Implementation Boundaries

The work should stay scoped to:

- `packages/shared`
- The three i18n bootstrap files
- Component references that need key-name updates
- Removal of duplicate locale definitions

It should not expand into unrelated UI rewrites or behavior changes.

## Success Criteria

The migration is complete when:

- Translation content is maintained in one shared source
- All three apps import translation resources from `packages/shared`
- All three apps use the same translation key structure
- Vue interpolation works with transformed shared resources
- React and Expo interpolation works with canonical i18next resources
- Old duplicated locale definitions are removed or reduced to trivial pass-throughs
