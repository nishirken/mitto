# Mitto

E-ink optimized Telegram web client. Lit web components, TypeScript, Vite. TDLib WASM via `@dibgram/tdweb` for Telegram API. Vitest + Playwright for browser testing. ESLint + Stylelint for linting. Nix flake + direnv for dev environment.

## Conventions
- Files: kebab-case (`chat-item.ts`, `chat-list-screen.ts`)
- Colocate test files next to components (`*.test.ts`)
- Custom elements: kebab-case (`<chat-item>`, `<app-root>`)
- Classes: PascalCase (`ChatItem`, `AppRoot`)

## Coding
- Prefer semantic HTML (`<form>`, `<label>`, `<button type="submit">`) over divs with click handlers
- Use appropriate ARIA roles and attributes
- Add `data-testid` attributes to interactive elements for testing
- The `data-testid` values are hierarchical and selectable as through the root element of the component.

## Testing
- Select elements by `data-testid` using `tid()` helper from `src/test-utils.ts`
- Use mocks if possible

## Key Notes
- `tsconfig.json`: `useDefineForClassFields: false` is critical for Lit decorators
- Pre-commit hook via simple-git-hooks → lint-staged (eslint --fix on .ts, stylelint --fix on .css)
