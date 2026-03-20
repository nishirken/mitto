# Mitto

E-ink optimized Telegram web client. Lit web components, TypeScript, Vite. TDLib WASM via `@dibgram/tdweb` for Telegram API. Vitest + Playwright for browser testing. ESLint + Stylelint for linting. Nix flake + direnv for dev environment.

## Conventions
- Files: kebab-case (`chat-item.ts`, `chat-list-screen.ts`)
- Custom elements: kebab-case (`<chat-item>`, `<app-root>`)
- Classes: PascalCase (`ChatItem`, `AppRoot`)

## Key Notes
- `tsconfig.json`: `useDefineForClassFields: false` is critical for Lit decorators
- Playwright version in npm must match `nix eval nixpkgs#playwright-driver.version`
- Pre-commit hook via simple-git-hooks → lint-staged (eslint --fix on .ts, stylelint --fix on .css)
