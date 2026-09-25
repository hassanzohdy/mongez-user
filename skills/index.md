---
description: "Use @mongez/user when an application needs a small, framework-agnostic holder for authenticated-user data, access tokens, permissions, persistence, and lifecycle notifications. In the normal browser-app path, implement a synchronous cache driver, subclass User with that driver, construct and boot one instance at startup, register it with setCurrentUser, and call login with the API payload. Read fields and the token through the instance, set server-provided permissions, and call logout to clear persisted state. Choose a focused topic below when configuring storage, events, permissions, or server-side usage."
---

# @mongez/user

## Start here: the usual authenticated browser session

1. Follow [User manager](user-manager/SKILL.md) to subclass `User`, configure its cache driver, create one instance, and call `boot()`.
2. Use [Cache drivers](cache-drivers/SKILL.md) to supply synchronous `get`, `set`, and `remove` methods; `localStorage` is the usual browser choice.
3. Call `setCurrentUser(user)` from [Current user](current-user/SKILL.md) after bootstrapping, then have the login flow call `user.login(apiUser)`.
4. Store API permissions with `user.setPermissions(apiUser.permissions)` and gate UI or actions with `user.can("posts.create")`; see [Permissions](permissions/SKILL.md).
5. Read the access token with `user.getAccessToken()` for authenticated requests, and call `user.logout()` when the session ends.

## Topics

- [User manager](user-manager/SKILL.md) — subclass configuration plus the session, data, and token methods.
- [Cache drivers](cache-drivers/SKILL.md) — synchronous persistence implementations and SSR constraints.
- [Current user](current-user/SKILL.md) — module-level current-user access; browser-only guidance.
- [Permissions](permissions/SKILL.md) — `setPermissions()` and exact-boolean `can()` checks.
- [Events](events/SKILL.md) — optional boot, login, logout, change, and key-change listeners.
- [Recipes](recipes/SKILL.md) — composed browser, refresh, SSR, and multiple-user patterns.

## Not this package →

- Login forms, credential exchange, route guards, and HTTP interceptors belong in your application or its UI/network library.
- Reactive global client state belongs in [@mongez/atom](/atom/overview/).
- The shared event bus belongs in [@mongez/events](/events/overview/).
- General cache APIs and drivers beyond this three-method adapter belong in [@mongez/cache](/cache/overview/).
