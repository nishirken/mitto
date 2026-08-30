# Mitto

E-ink optimized Telegram web client targeting Mudita Kompakt (4.3" E Ink, 800×480, 217 PPI). Lit web components, TypeScript, Vite, pnpm. Capacitor for Android APK bundling. gramjs (vendored bundle in `src/lib/telegram/`, v2.26.7 / TL layer 193 — verify via `Version.d.ts` and `tl/AllTLObjects.d.ts`) for Telegram API. Vitest + @open-wc/testing + happy-dom for testing. Biome for linting and formatting (TS + CSS). Nix flake + direnv for dev environment.

## Conventions
- Files: kebab-case (`dialog-item.ts`, `dialog-list-screen.ts`)
- Colocate test files next to components (`*.test.ts`)
- Custom elements: kebab-case (`<dialog-item>`, `<app-root>`)
- Classes: PascalCase (`DialogItem`, `AppRoot`)
- `mk-*` prefix for design system components, full names for feature/screen components

## Coding
- Do not add comments!
- Blank line before every `return` — no longer linted, keep it by hand
- `on*` names a property holding a callback (the slot a parent assigns, like `el.onclick`); `handle*` names the function passed to a listener (`addEventListener('click', handleClick)`). A method bound in a template is `handle*` even when the property it feeds is `on*` — `.onBottom=${this._handleBottom}`
- Prefer semantic HTML (`<form>`, `<label>`, `<button type="submit">`) over divs with click handlers
- Use appropriate ARIA roles and attributes
- Add `data-testid` attributes to interactive elements for testing
- The `data-testid` values are hierarchical and selectable as through the root element of the component.
- Custom form elements use `formAssociated` + `ElementInternals`
- In a union (that is usually a State type) if a member is object use objects { type: 'loading' } for each member of the type, otherwise use plain strings. Eg `'loading' | 'error'` vs `{ type: 'loading' } | { type: 'error', message: 'string' }`

## State & Routing
- `@lit-labs/signals` for reactive state, `@lit/context` for DI (services provided at `app-root`)
- Hash-based routing via `src/router.ts`
- Layers: `*Store` app-scoped singleton, state + commands · `*Projection` screen-scoped, derived read signals only, `init()`/`dispose()` per `connectedCallback` · `*SyncService` screen-scoped, paired 1:1 with a projection, network → repository writes, owns `loading`/`hasMore` · `*Repository` app-scoped singleton, transactional DB writes
- "Projection" names the read-model classes only — persisted rows are `Stored*` records

## Styles
- Colocated CSS files, imported with `?inline`, scoped via `static styles = unsafeCSS(...)`
- Order CSS selectors low→high specificity (Biome `noDescendingSpecificity`)
- Whole pixel values only — fractional px rounds unpredictably on e-ink
- No `cursor` properties at all — touch-only device

## Testing
- `@open-wc/testing` with `happy-dom` environment
- Select elements by `data-testid` using `tid()` helper from `src/test-utils.ts`
- Use mocks if possible
- Mocks colocated in `__mocks__/` directories next to the module being mocked

### Writing mocks
- Services expose an interface (`IAuthStore`, `IDatabase`, `IDialogRepository`, …) next to the class; the class `implements` it. Concrete classes have private fields, so a mock can never `implements` them directly — the interface is what ties mock and impl together
- Mocks are classes, never object literals: `export class MockX implements IX {}` plus `export const mockX = new MockX()`. A literal needs `as unknown as X`, which silently rots as the real API changes
- A mock standing in for something the code under test calls with `new` **must be constructible** — arrow functions have no `[[Construct]]` and throw `TypeError: … is not a constructor`. This surfaces as an unrelated assertion failure when the throw happens inside an async `connectedCallback`
- Share members at module level when the code under test constructs its own instance, so `new MockX()` and the exported `mockX` observe the same spies (`useDefineForClassFields: false` rules out `private static`)
- `vi.fn()` needs an explicit body — write `vi.fn(() => {})`; the bare form's inferred type can't be named under `declaration: true`
- `api/__mocks__/telegram-client` must stay free of a *runtime* `telegram` import (type-only is fine) — that is what lets a `vi.mock('telegram')` factory reuse `MockClient`. Add one and the factory re-enters and deadlocks with no output; pass the `Api` namespace in from the factory's `actual` instead
- `vi.mock` factories are hoisted above imports: reference imported values via `await import(...)` inside the factory, never from the module scope

## Key Notes
- `tsconfig.json`: `useDefineForClassFields: false` is critical for Lit decorators and prevents `private static` fields — use module-level variables instead
- Pre-commit hook via simple-git-hooks → lint-staged (`biome check --write` on .ts and .css)
- `biome` comes from the Nix flake, not npm — the npm binary is dynamically linked and NixOS cannot run it
- `biome.json` rejects comments; keep it strict JSON or it silently falls back to defaults
