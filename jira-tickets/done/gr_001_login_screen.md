# GR-001 — Login screen with hardcoded credentials (MVP)

- **Type:** Story
- **Epic:** Scholastic AI — Foundations
- **Priority:** P0 (blocks all authenticated screens)
- **Status:** To Do
- **Estimate:** S

## Problem & why now

Scholastic AI is a private, institution-facing tool. Before any user can interact with their library, chat, or history, we need a recognisable entry point that gates access. We are not yet ready to integrate a real identity provider, but we still need an end-to-end "sign in → land on Library" flow so the rest of the app can be built and demoed against a logged-in session.

## User story

> **As an** authorised researcher,
> **I want** to sign in to Scholastic AI from a branded login screen,
> **so that** I can access my digital library and chat workspace from a known, trusted entry point.

## Outcome we want

A user lands on `/login`, enters the demo credentials, is taken to the Library page, and stays signed in across reloads until they explicitly sign out. Wrong credentials produce a clear, non-leaky error.

## In scope

- Public route `/login` rendered when no session exists.
- Email + password form matching the design 1:1 (logo block, headline "Scholastic AI", subtext "Sign in to access your digital library.", email field with mail icon, password field with lock icon, "Forgot Password?" link as a non-functional placeholder, primary "Sign In" button, "Request Access" footer link).
- Backend endpoint `POST /api/auth/login` that:
  - Accepts `{ email, password }`.
  - Validates against a single hardcoded credential pair stored in backend config (e.g. `demo@scholastic.ai` / `scholastic-demo`). Values must come from config, not be inlined in route code, so they can later be swapped for a real provider.
  - On success, issues an HTTP-only session cookie and returns a minimal user payload.
  - On failure, returns 401 with a generic `"Invalid email or password"` message (no field-level hints).
- Backend endpoint `POST /api/auth/logout` that clears the session.
- Backend endpoint `GET /api/auth/me` for the frontend to resolve the current session on app boot.
- Route guard: any non-public route redirects to `/login` when there is no session; `/login` redirects to `/library` when there is one.

## Out of scope

- Real identity provider, SSO, password reset, account creation.
- Multi-tenancy, roles, permissions.
- Rate limiting, captcha, lockout (track as follow-up before we ever ship to real users).
- Email verification.

## Acceptance criteria

1. **Visual fidelity** — `/login` renders the layout in `designs/login_scholastic_ai/screen.png` / `code.html` using the design system tokens defined in `designs/library_intelligence_system/DESIGN.md` (colors, Hanken Grotesk, 8px spacing rhythm, 8px corner radius on inputs, primary button uses `--primary` / `--on-primary`).
2. **Happy path** — Submitting the configured demo credentials redirects to `/library` and `GET /api/auth/me` returns the user.
3. **Wrong password** — Submitting any other credentials shows an inline error "Invalid email or password" beneath the form, the password field is cleared, focus returns to the password input, and no information leaks about whether the email exists.
4. **Empty fields** — Client-side validation prevents submission with empty email or password and surfaces field-level hints.
5. **Session persistence** — After signing in, a full page reload keeps the user signed in.
6. **Sign out** — Calling `/api/auth/logout` (wired up later by the sidebar profile menu) clears the cookie and redirects to `/login`.
7. **Route guard** — Visiting `/library`, `/chat`, or `/history` while signed out redirects to `/login`. Visiting `/login` while signed in redirects to `/library`.
8. **Hardcoded creds are configurable** — The demo email/password live in a single backend config module and are documented in the README, not hardcoded inside route handlers.

## Design references

- Screen: `designs/login_scholastic_ai/screen.png`
- HTML reference: `designs/login_scholastic_ai/code.html`
- Design system (colors, typography, spacing, components): `designs/library_intelligence_system/DESIGN.md`
- Cross-screen overview: `designs/highlevel_design_overview.png`

## Technical notes

- Cookie should be `HttpOnly`, `SameSite=Lax`, and `Secure` in production; signed with a server-side secret.
- Keep the auth module behind a thin interface (`auth_gateway`) so swapping the hardcoded check for a real provider is a single-file change.
- "Forgot Password?" and "Request Access" links render but are non-functional in this ticket; mark them with `aria-disabled` or route to a placeholder page.

## Dependencies

- None — this ticket unblocks GR-002, GR-003, GR-004

