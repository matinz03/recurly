# Working on this project

## Setup

Node 24 — pinned in [`.nvmrc`](../.nvmrc) and enforced by `engines`. npm 10 and
npm 11 resolve optional and peer dependencies differently, and a lockfile written
by one fails `npm ci` under the other.

```bash
nvm use
npm install
cp .env.example .env   # then fill it in - the app throws on boot without keys
npx expo start
```

## The gates

Run all four before calling anything done. CI runs the same set plus a generated
file check.

```bash
npx tsc --noEmit -p .
npm run lint
npm test
npx expo export --platform web
```

The last one earns its place. It is the only check that catches a native module
being evaluated in Node during static prerender, and it has caught two real
breakages that typecheck, lint and tests all passed straight through.

### What the gates cannot tell you

Layout, keyboard behaviour, gestures, colour and animation are invisible to all
four. Every one of those has shipped broken with a fully green check run — the
modal sheet rendered as a header at the bottom of the screen, the Android
keyboard covered the last row, borders vanished in light mode, the card didn't
animate, and the card stopped expanding at all.

Those need a device or a simulator. When you haven't used one, say the change is
unverified rather than implying it was checked.

## Branches and PRs

`master` is the release branch; `dev` is where work lands first.

- Branch from `dev`, named `feat/…`, `fix/…`, `chore/…` or `docs/…`.
- PR into `dev`. Promote `dev` → `master` as its own PR.
- Commits are conventional-commit prefixed, and the body says *why*. The diff
  already says what.
- CodeRabbit reviews PRs. Check its findings against the current code before
  acting on them — it has been right about real bugs here, and it has also
  proposed a change that would have introduced one (scoping status counts to the
  dominant currency, which hid records entirely).

## Refreshing the lockfile

Not in place. `npm install --package-lock-only` inside the working copy resolves
against the `node_modules` already on disk, and optional native addons that fail
to build locally get pruned from the lockfile — which Linux CI then reports as
missing.

```bash
mkdir /tmp/lockgen && cp package.json /tmp/lockgen/
cd /tmp/lockgen && npm install --package-lock-only
cp package-lock.json <repo>/package-lock.json
```

## Generated files

[`constants/brandIcons.ts`](../constants/brandIcons.ts) is generated from
simple-icons. Edit the generator, not the output:

```bash
npm run generate:brand-icons
```

CI regenerates it and fails on any diff, so a hand-edit is caught.

## Tests

`jest-expo`, pinned to 54.x — the latest peer-requires a newer React than SDK 54
ships.

Coverage is aimed at logic that has actually broken: the multi-currency
aggregation in `lib/insights.ts`, renewal-date rolling, reminder timing, icon
matching, and the persisted stores' round trips. Component rendering is not
tested; a test renderer has no layout engine, so it couldn't have caught any of
the layout bugs listed above anyway.

Shared fixtures live in [`test-utils/`](../test-utils), outside `__tests__` —
jest treats every file in that directory as a suite and fails on one with no
tests in it.

## Conventions

- 4-space indent, single quotes, TypeScript throughout.
- Styling is NativeWind v5. Add component classes to `global.css` under
  `@layer components` and compose them; don't inline long utility strings.
- Tokens are duplicated in `global.css` `@theme` and `constants/theme.ts` (the
  latter for values JS needs). Keep them in sync.
- Comment the *why* for anything non-obvious, and don't narrate what the code
  already says.
- Before "simplifying" something that looks redundant, read
  [`DECISIONS.md`](DECISIONS.md). Several oddities are load-bearing and every one
  of them is there because it broke once.
