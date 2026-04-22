# Mitto

E-ink optimized Telegram web client targeting Mudita Kompakt (4.3" E Ink, 800×480, 217 PPI). Lit web components, TypeScript, Vite, pnpm. Capacitor for Android APK bundling. gramjs (vendored bundle in `src/lib/telegram/`) for Telegram API. Vitest + @open-wc/testing + happy-dom for testing. ESLint + Stylelint for linting. Nix flake + direnv for dev environment.

## Conventions
- Files: kebab-case (`chat-item.ts`, `chat-list-screen.ts`)
- Colocate test files next to components (`*.test.ts`)
- Custom elements: kebab-case (`<chat-item>`, `<app-root>`)
- Classes: PascalCase (`ChatItem`, `AppRoot`)
- `mk-*` prefix for design system components, full names for feature/screen components

## Coding
- Prefer semantic HTML (`<form>`, `<label>`, `<button type="submit">`) over divs with click handlers
- Use appropriate ARIA roles and attributes
- Add `data-testid` attributes to interactive elements for testing
- The `data-testid` values are hierarchical and selectable as through the root element of the component.
- Custom form elements use `formAssociated` + `ElementInternals`

## State & Routing
- `@lit-labs/signals` for reactive state, `@lit/context` for DI (services provided at `app-root`)
- Hash-based routing via `src/router.ts`

## Styles
- Colocated CSS files, imported with `?inline`, scoped via `static styles = unsafeCSS(...)`
- Order CSS selectors low→high specificity (stylelint `no-descending-specificity`)
- Whole pixel values only — fractional px rounds unpredictably on e-ink
- No `cursor: pointer` — touch-only device

## Testing
- `@open-wc/testing` with `happy-dom` environment
- Select elements by `data-testid` using `tid()` helper from `src/test-utils.ts`
- Use mocks if possible
- Mocks in `src/api/__mocks__/`

## Key Notes
- `tsconfig.json`: `useDefineForClassFields: false` is critical for Lit decorators
- Pre-commit hook via simple-git-hooks → lint-staged (eslint --fix on .ts, stylelint --fix on .css)
