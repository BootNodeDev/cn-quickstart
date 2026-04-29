# Name Service Overview

This backend is the HTTP layer for `name-service`. The relevant setup is the OAuth2 path only: Keycloak login, participant-admin calls, and the new username-based signup flow.

## How It Works

### Core runtime

- `src/server.ts` boots the process.
- `src/config.ts` loads runtime configuration and decides the auth mode.
- `src/http/app.ts` wires Fastify, middleware, and route registration.

### Required mode

`name-service` expects `oauth2=true` at runtime, so the backend runs against Keycloak and the participant-admin JSON API.

That means:

- the browser starts unauthenticated. The user sees a public signup/login form and enters a username.
- signup/login creates the backend session only after the username is accepted.
- Keycloak still acts as the identity provider for the OAuth2 part of the stack, but the name-service flow itself starts from the public form.
- backend service calls use client credentials, meaning the backend gets its own machine token instead of acting as a human user.
- signup can create parties/users through the participant admin JSON API, which is the participant-level admin surface for parties, users, and rights.

The auth mode is selected from `SPRING_PROFILES_ACTIVE` via `loadConfig()`.

### Existing app flow

- `src/auth/oauth2.ts` handles the browser login callback and stores the authenticated session for the OAuth2-backed flows.
- `src/auth/oauth2-registry.ts` stores the Keycloak registrations and builds the `/oauth2/authorization/:registrationId` login URLs.
- `src/routes/user.ts` resolves the current session into the current user view.
- `src/routes/admin.ts` manages tenant registrations.
- `src/canton/ledger.ts` submits ledger commands.
- `src/canton/auth.ts` provides the bearer token used for backend ledger calls.

### Ledger identity model

- A `party` is the ledger identity that owns contracts on the ledger.
- A `user` is the participant-side access record that can act for a party.
- A session user is the backend’s auth/session state after Keycloak returns.

The backend already maps a logged-in user to a party, and the new signup flow extends that model for name-service users after the public form is submitted.

## What We Added

### `POST /signup`

New route:

- file: `src/routes/signup.ts`
- OpenAPI: `common/openapi.yaml`

Behavior:

- accepts `{ username }`, where the username is the login key for the service
- creates or reuses a party for that username, so each username keeps its own ledger identity
- creates or reuses the participant user, so the participant knows which backend user can act for that party
- grants the user `CanActAs` and `CanReadAs`, which are the minimum rights needed to submit and read ledger data
- stores the result in an in-memory identity repository, so repeat signups reuse the same mapping during the process lifetime
- sets the Fastify session so the user is logged in after signup

The public flow is:

- the browser starts with no session
- the user submits `POST /signup` with a username
- the backend creates the ledger identity (`party` + participant `user`) for that username
- the backend sets the browser session so the user is now logged in, using the same session model that the OAuth2 flow uses after Keycloak returns

### New backend components

The signup flow is split into small files:

- `src/signup/repository.ts`
  - in-memory `username -> { partyId, userId }` mapping
- `src/signup/service.ts`
  - signup orchestration that ties username lookup, party allocation, and user creation together
- `src/participant-admin/client.ts`
  - participant admin JSON API client used to create parties, users, and rights
- `src/auth/client-credentials.ts`
  - reusable client-credentials token provider used for backend-to-participant calls

### Wiring changes

- `src/http/app.ts` now registers `signup` when available.
- `src/server.ts` creates the signup service only when the OAuth2/admin config is present.
- `src/auth/csrf.ts` allows `POST /signup` through without the normal CSRF session check.
- `src/config.ts` now loads the participant-admin client credentials needed by signup.

## Current Signup Design

The model is:

- one username maps to one party
- signing up again with the same username logs you back into the same identity
- alias features will later use the current session party

This keeps ownership simple and avoids a shared global party for all users.

## Backward Compatibility

The existing app behavior is preserved:

- `oauth2` login still works as before
- existing routes were not changed
- `src/canton/auth.ts` keeps its original token behavior

The signup flow is additive. It is only wired when the participant-admin credentials are present.

## Notes

- `/v2/packages` and `/v2/parties` are participant admin JSON API endpoints.
- Swagger UI can still be used for the app-provider and app-user APIs.
- The backend build is still the normal `npm run build` flow in `backend-js`.
