<div align="center">

# @mongez/user

**Framework-agnostic current-user store — class-based session state, pluggable cache drivers, dot-notation permissions, and a lifecycle event bus.**

[![npm](https://img.shields.io/npm/v/@mongez/user.svg)](https://www.npmjs.com/package/@mongez/user)
[![license](https://img.shields.io/npm/l/@mongez/user.svg)](LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@mongez/user.svg)](https://bundlephobia.com/package/@mongez/user)
[![downloads](https://img.shields.io/npm/dw/@mongez/user.svg)](https://www.npmjs.com/package/@mongez/user)

</div>

---

## Why @mongez/user?

> **`@mongez/user` is NOT an auth provider.** It does not sign you in, mint tokens, talk to OAuth providers, or run a session backend. It holds the *result* of authentication — the current user payload, the access token, the permissions — and gives you a class-based API to read, mutate, and persist it.

`NextAuth` is React/Next.js-only, opinionated about routes, and OAuth-first. The `Auth0` SDK is a paid SaaS coupling. Rolling your own with `jwt-decode` + a `localStorage` helper means reinventing token storage, session restoration, permission checks, login/logout signaling, and SSR guards on every project. `@mongez/user` is the smallest layer between "the server returned a user" and "the rest of my app needs to read it": one base class, one three-method cache driver contract, an optional event bus, and a dot-notation permission check. Works in the browser, in Node, in tests, in any framework — or none.

```ts
import { User as BaseUser, UserCacheDriverInterface } from "@mongez/user";

class AppUser extends BaseUser {
  protected cacheDriver: UserCacheDriverInterface = myDriver;
}

const user = new AppUser();
user.boot();
user.login({ id: 1, name: "Ada", accessToken: "eyJhbGc..." });
user.isLoggedIn();           // true
user.can("posts.create");    // dot-notation permission check
```

---

## Features

| Feature | Description |
|---|---|
| **Current-user state container** | A subclassed `User` instance holds the authenticated payload — id, name, token, anything else. Read it via `get(path)`, write it via `set(path, value)`. |
| **Pluggable cache drivers** | Any object with `get` / `set` / `remove` persists `userData` between sessions — `localStorage`, `sessionStorage`, cookies, `@mongez/cache`, in-memory, your own. |
| **Session restoration** | `boot()` reads the cache driver and hydrates `userData`. The next page reload finds the user "still logged in" with no extra wiring. |
| **Access token shortcuts** | `getAccessToken()` / `setAccessToken()` / `refreshToken()` — and a configurable key (`accessTokenKey`) when your API returns `token` or `jwt` instead. |
| **CASL-style permission checks** | `setPermissions(obj)` stores any shape; `can("posts.create")` checks it via dot-notation. Truthy leaf passes, missing key fails. |
| **Lifecycle event bus** | Opt in with `enableEvents = true` and you get `onBoot` / `onLogin` / `onLogout` / `onChange` / `onKeyChange` listeners, dispatched on `@mongez/events`. |
| **Module-level current-user pointer** | `setCurrentUser` / `getCurrentUser` for cross-module access without importing the user-defining module. |
| **Multiple user types** | Distinct subclasses with distinct `cacheKey` / `eventsBaseName` for apps with both admin and customer sessions. |
| **TypeScript-first** | `UserInterface`, `UserInfo`, `UserCacheDriverInterface`, `UserEvents`, `Role`, `PermissionGroup` exported for typed call sites. |
| **Framework-agnostic** | Zero React / Vue / Angular coupling. Runs in the browser, in Node, in tests. |
| **Tiny surface** | One base class, one global pointer, one events listener. Five public methods you actually call day-to-day. |

---

## Installation

```sh
npm install @mongez/user
```

```sh
yarn add @mongez/user
```

```sh
pnpm add @mongez/user
```

`@mongez/events` and `@mongez/reinforcements` are runtime dependencies (auto-installed). No peer deps to wire.

---

## Quick start

```ts
import { User as BaseUser, UserCacheDriverInterface } from "@mongez/user";

// 1. Bring your own cache driver — anything with get/set/remove.
const localStorageDriver: UserCacheDriverInterface = {
  get(key) {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  remove(key) {
    localStorage.removeItem(key);
  },
};

// 2. Subclass the base User. The cache driver is the only field you usually set.
class AppUser extends BaseUser {
  protected cacheDriver = localStorageDriver;
}

// 3. Boot it — this is what restores any cached session. The constructor does NOT.
const user = new AppUser();
user.boot();

// 4. Log them in. The driver writes the payload; the event bus fires (if enabled).
user.login({
  id: 42,
  name: "Ada Lovelace",
  email: "ada@example.com",
  accessToken: "eyJhbGc...",
});

user.isLoggedIn();           // true
user.getAccessToken();       // "eyJhbGc..."
user.get("name");            // "Ada Lovelace"
user.id;                     // 42 (shorthand for user.get("id"))

user.logout();               // clears userData + removes from cache
user.isLoggedIn();           // false
```

That's the entire happy path. Everything below is depth on the same surface.

---

## The `User` base class

Subclass `User`, declare a `cacheDriver`, optionally override the protected fields, then `new` and `boot`.

```ts
import { User as BaseUser, UserCacheDriverInterface } from "@mongez/user";

class AppUser extends BaseUser {
  // Required: where to persist userData between sessions.
  protected cacheDriver: UserCacheDriverInterface = myDriver;

  // Optional: which key inside userData holds the bearer token.
  // Default: "accessToken". Set to "token" / "jwt" / whatever your API returns.
  protected accessTokenKey: string = "token";

  // Optional: the cache-driver key that stores the whole payload.
  // Default: "user".
  protected cacheKey: string = "current-user";

  // Optional: turn on the event bus. Off by default.
  protected enableEvents: boolean = true;

  // Optional: namespace for event topics. Defaults to cacheKey.
  protected eventsBaseName: string = "auth";
}
```

### Protected fields

| Field | Type | Default | Purpose |
|---|---|---|---|
| `cacheDriver` | `UserCacheDriverInterface \| undefined` | `undefined` | Where `userData` is persisted. Omit for session-only memory state. |
| `permissions` | `object` | `{}` | The permissions object queried by `can()`. Set via `setPermissions()`. |
| `userData` | `object` | `{}` | The current payload. Set internally by `boot` / `login` / `update` / `set`. |
| `accessTokenKey` | `string` | `"accessToken"` | Which key in `userData` holds the token. |
| `cacheKey` | `string` | `"user"` | The cache-driver key that stores the whole payload. |
| `enableEvents` | `boolean` | `false` | Whether `this.events` is instantiated during `boot()`. |
| `eventsBaseName` | `string \| undefined` | `cacheKey` | Namespace for event topics. |

### `boot()` is required

> The constructor does NOT touch the cache driver. If you forget `boot()`, `userData` stays `{}` and the user is never "logged in" — even when the cache has a valid payload.

```ts
public boot(): UserInterface {
  this.userData = this.cacheDriver?.get(this.getCacheKey()) || {};
  if (this.enableEvents) {
    this.events = new UserEventsListener(this.eventsBaseName || this.cacheKey);
    this.events.triggerBoot(this.userData, this);
  }
  return this;
}
```

`boot()` returns `this` so you can chain:

```ts
const user = new AppUser().boot() as AppUser;
```

### Method surface

```ts
// Identity
user.isLoggedIn();              // boolean — true when getAccessToken().length > 0
user.isNotLoggedIn();           // !isLoggedIn()
user.id;                        // shorthand for user.get("id")
user.getCacheKey();             // configured cacheKey
user.getAccessTokenKey();       // configured accessTokenKey
user.setAccessTokenKey("jwt");  // change at runtime (returns `this`)

// Session
user.login(userData);           // store, cache, fire login event
user.logout();                  // clear, remove from cache, fire logout
user.update(userData);          // replace whole payload; preserves token if not in payload

// Token
user.getAccessToken();          // string; "" when not logged in
user.setAccessToken(token);     // writes the access-token key; fires keyChange
user.refreshToken(token);       // alias for setAccessToken

// Read — dot-notation via @mongez/reinforcements
user.get("email");
user.get("profile.address.country");
user.get("optional-key", "fallback");
user.all();                     // entire userData object (live reference)

// Write — dot-notation; creates nested structure as needed
user.set("profile.address.country", "Egypt");

// Permissions
user.setPermissions({ posts: { create: true } });
user.can("posts.create");       // true
```

> **`set()` is a referential-equality no-op.** Passing the same value (`===`) as the current value skips the cache write and the `keyChange` event. If you mutate an object in place and pass the same reference, the change is invisible.

> **`update(newData)` preserves the existing token** when `newData[accessTokenKey]` is falsy. Pass the token explicitly if you want it replaced — or `setAccessToken()` it separately.

---

## Cache drivers

The only requirement is a three-method object:

```ts
type UserCacheDriverInterface = {
  get(key: string, defaultValue?: any): any;
  set(key: string, value: any): void;
  remove(key: string): void;
};
```

The driver is consulted in exactly three places:

| Method | When |
|---|---|
| `get(cacheKey)` | Once inside `boot()` to hydrate `userData`. |
| `set(cacheKey, value)` | Inside `set()` and `update()` after `userData` mutates. |
| `remove(cacheKey)` | Inside `logout()`. |

> **The package ships zero built-in drivers.** Bring your own — examples below — or use [`@mongez/cache`](https://github.com/hassanzohdy/cache), whose facade already matches the contract.

### localStorage driver

```ts
import { UserCacheDriverInterface } from "@mongez/user";

const localStorageDriver: UserCacheDriverInterface = {
  get(key) {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },
  set(key, value) {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, JSON.stringify(value));
  },
  remove(key) {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(key);
  },
};
```

The `typeof localStorage === "undefined"` guards make it safe to import on the server.

### `@mongez/cache` driver

[`@mongez/cache`](https://github.com/hassanzohdy/cache) implements the same shape, so the default facade drops in directly — including the encrypted variant for tokens at rest.

```ts
import cache from "@mongez/cache";
import { User as BaseUser } from "@mongez/user";

class AppUser extends BaseUser {
  protected cacheDriver = cache;
}
```

### In-memory driver (tests, per-request SSR)

```ts
function memoryDriver(): UserCacheDriverInterface {
  const store = new Map<string, any>();
  return {
    get: (key) => store.get(key) ?? null,
    set: (key, value) => { store.set(key, value); },
    remove: (key) => { store.delete(key); },
  };
}
```

A fresh driver per request gives you per-request isolation without an SSR store primitive.

### No driver at all

If you don't set `cacheDriver`, every persistence call short-circuits (`this.cacheDriver?.set(...)`). The user becomes session-only — useful for tests or one-off SSR renders. `boot()`, `login()`, `logout()`, `set()` all still work.

---

## The current-user pointer

A single module-level slot for "the logged-in user", set and read from anywhere.

```ts
import { setCurrentUser, getCurrentUser } from "@mongez/user";

setCurrentUser(user);     // store an instance
getCurrentUser();         // retrieve it (same instance, or undefined)
```

Use it for code that needs to reach the current user without importing the module where the user was constructed — middleware, generic API helpers, error reporters.

```ts
// src/api/with-auth.ts
import { getCurrentUser } from "@mongez/user";

export function withAuth(request: Request): Request {
  const token = getCurrentUser()?.getAccessToken();
  if (token) request.headers.set("Authorization", `Bearer ${token}`);
  return request;
}
```

> **Module-level → process-wide.** In a Node process serving multiple requests, every request reads the same slot. Do NOT use `setCurrentUser` in SSR; thread the `user` instance through your request context instead. In tests, reset between cases with `setCurrentUser(undefined as any)`.

> **`logout()` does NOT clear the slot.** `getCurrentUser()?.isLoggedIn()` will return `false` (because the instance reports it), but `getCurrentUser()` still returns the same object. Most apps gate on `isLoggedIn()` and don't need to clear it.

---

## Permissions

`setPermissions(obj)` stores any shape; `can(path)` reads the value at the dot-notation path and returns `true` when it's truthy.

```ts
user.setPermissions({
  posts: { create: true, delete: false },
  admin: { panel: true },
});

user.can("posts.create");      // true
user.can("posts.delete");      // false
user.can("admin.panel");       // true
user.can("missing.key");       // false (missing → falsy)
```

The shape is up to you — flat dotted keys (`{ "posts.create": true }`), nested objects, role strings, permission arrays — whatever your backend returns. Keep it JSON-serializable so it round-trips through the cache driver if you persist it.

> **`setPermissions` REPLACES the permissions object.** Calling it twice doesn't merge — the second call wipes the first. Merge yourself before passing the object if you need additive semantics.

> **Permissions are NOT written through to the cache driver.** They live on the instance only. Either re-set them after each `boot()`, or stash them inside `userData` (which IS cached) and re-apply in a subclass `boot()` override:

```ts
class AppUser extends BaseUser {
  protected cacheDriver = myDriver;

  public override boot() {
    super.boot();
    const persisted = this.get("permissions");
    if (persisted) this.setPermissions(persisted);
    return this;
  }
}
```

---

## Lifecycle events

Each `User` instance can have a `UserEventsListener` attached to `this.events`. Opt in by setting `enableEvents = true`; the listener is instantiated during `boot()` and dispatches through the [`@mongez/events`](https://github.com/hassanzohdy/events) bus.

```ts
class AppUser extends BaseUser {
  protected cacheDriver = myDriver;
  protected enableEvents = true;          // off by default
  protected eventsBaseName = "auth";      // defaults to cacheKey
}

const user = new AppUser();
user.boot();

const sub = user.events!.onLogin((userData, u) => {
  console.log("logged in:", userData.name);
});

user.events!.onLogout((u) => {
  console.log("logged out");
});

user.events!.onChange((newData, oldData, u) => {
  console.log("payload replaced");
});

sub.unsubscribe();                        // remove a listener
```

### The five events

| Event | Listener method | Args | Fires |
|---|---|---|---|
| `boot` | `onBoot(cb)` | `(initData, user)` | At the end of `boot()`. |
| `login` | `onLogin(cb)` | `(userData, user)` | At the START of `login()`, before commit. |
| `logout` | `onLogout(cb)` | `(user)` | At the end of `logout()`. |
| `change` | `onChange(cb)` | `(newData, oldData, user)` | At the end of `update()`. |
| `keyChange` | `onKeyChange(cb)` | `(key, newValue, oldValue, user)` | At the end of `set()`, and per-key inside `update()`. |

All return an `EventSubscription` from `@mongez/events`. Call `.unsubscribe()` to remove.

### Subscribe from anywhere via the global bus

Events dispatch on the `@mongez/events` bus under `${eventsBaseName}.${eventType}`. Any module can subscribe without holding the user reference:

```ts
import events from "@mongez/events";

events.subscribe("auth.login",  (userData, user) => analytics.identify(userData.id));
events.subscribe("auth.logout", (user) => analytics.reset());
events.subscribe("auth.change", (newData, oldData, user) => { /* ... */ });
```

> **`onLogin` fires BEFORE the data is committed.** Inside an `onLogin` callback, `user.get(...)` still returns the previous payload — the callback's first argument is the new one. For post-commit values, listen to `change` instead.

> **Known bug: `onBoot` and `onKeyChange` subscribe to the wrong topic.** Both wire to `logout` in the current release. Until it's fixed, subscribe through the global bus directly: `events.subscribe("auth.boot", cb)` / `events.subscribe("auth.keyChange", cb)`. See `src/__tests__/events.test.ts` for the documented regression.

> **Known bug: `update()` emits stale `oldValue`.** The per-key `keyChange` event fired inside `update()` reports `oldValue === newValue` because the payload is assigned before the loop runs. The values themselves are written correctly — only the event arg is wrong.

---

## Recipes

### Persist user across reloads with encrypted cache

For tokens and PII you don't want sitting in plaintext `localStorage` — any extension with `window` access can read it. Pair `EncryptedLocalStorageDriver` from [`@mongez/cache`](https://github.com/hassanzohdy/cache) with a `User` subclass; the on-disk value is ciphertext, decrypted transparently on `boot()`.

```ts
import { User as BaseUser } from "@mongez/user";
import cache, {
  EncryptedLocalStorageDriver,
  setCacheConfigurations,
} from "@mongez/cache";
import {
  encrypt,
  decrypt,
  setEncryptionConfigurations,
} from "@mongez/encryption";

setEncryptionConfigurations({ key: import.meta.env.VITE_APP_SECRET });
setCacheConfigurations({
  driver: new EncryptedLocalStorageDriver(),
  encryption: { encrypt, decrypt },
});

class AppUser extends BaseUser {
  protected cacheDriver = cache;          // already matches the contract
  protected accessTokenKey = "token";
  protected enableEvents = true;
  protected eventsBaseName = "auth";
}

export const user = new AppUser();
user.boot();                              // restores + decrypts any prior session
```

After login, the next page reload calls `boot()`, decrypts the entry, and the user is "still logged in" with the original token.

### Gate UI on permissions

After login, fetch the permissions object from your backend, store it on the user, and let the rest of the app ask `can(path)` instead of duplicating the logic.

```ts
import { getCurrentUser } from "@mongez/user";

// 1. After login — store the permissions returned by the API.
user.login({ id: response.id, name: response.name, token: response.token });
user.setPermissions(response.permissions);

// 2. Anywhere in the UI — gate render on can().
function CreatePostButton() {
  if (!getCurrentUser()?.can("posts.create")) return null;
  return <button>Create post</button>;
}

// 3. Or use it in a router guard.
function requirePermission(path: string) {
  return () => {
    const u = getCurrentUser();
    if (!u?.can(path)) throw new Response("Forbidden", { status: 403 });
  };
}
```

### Auto-attach the access token to every API call

A single `fetch` wrapper that reads from the current-user pointer — every call site gets the bearer header for free.

```ts
import { getCurrentUser } from "@mongez/user";

export async function api(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const token = getCurrentUser()?.getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(path, { ...init, headers });
}

// Usage:
const me = await api("/api/me").then(r => r.json());
```

### Refresh the token on 401 and retry

Most APIs reject expired tokens with a 401. Combine `refreshToken()` (which updates the stored token and fires `keyChange`) with `logout()` for the give-up case.

```ts
import { getCurrentUser } from "@mongez/user";

export async function api(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const user = getCurrentUser();
  const token = user?.getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(path, { ...init, headers });
  if (res.status !== 401 || !user) return res;

  // Try to refresh.
  const refresh = await fetch("/api/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken: user.get("refreshToken") }),
  });

  if (!refresh.ok) {
    user.logout();                          // fires auth.logout for the rest of the app
    throw new Error("Session expired");
  }

  const { token: nextToken } = await refresh.json();
  user.refreshToken(nextToken);             // updates the stored token + fires keyChange

  // Retry the original request with the new token.
  headers.set("Authorization", `Bearer ${nextToken}`);
  return fetch(path, { ...init, headers });
}
```

### Run admin and customer users side by side

When the same app has multiple session types, use distinct subclasses with distinct `cacheKey` and `eventsBaseName` so they persist to different keys and fire on different topics.

```ts
import { User as BaseUser } from "@mongez/user";
import cache from "@mongez/cache";

class AdminUser extends BaseUser {
  protected cacheDriver = cache;
  protected cacheKey = "admin-session";
  protected eventsBaseName = "admin";
}

class CustomerUser extends BaseUser {
  protected cacheDriver = cache;
  protected cacheKey = "customer-session";
  protected eventsBaseName = "customer";
}

export const admin = new AdminUser().boot() as AdminUser;
export const customer = new CustomerUser().boot() as CustomerUser;

// They persist to different keys, fire on different topics, and don't interfere.
admin.login({ id: 1, role: "admin", accessToken: "admin-tk" });
customer.login({ id: 99, role: "buyer", accessToken: "customer-tk" });
```

Listeners stay independent — `events.subscribe("admin.login", cb)` only fires for the admin, and `events.subscribe("customer.logout", cb)` only for the customer.

### Per-request user isolation in Node SSR

For server-side rendering, the module-level `currentUser` pointer is a leak — every request sees the same slot. Build a fresh `User` per request, hydrate it from the session cookie, and attach it to the request object.

> **Do NOT call `setCurrentUser()` on the server.** Thread the user explicitly through your render context.

```ts
import { User as BaseUser, UserCacheDriverInterface } from "@mongez/user";

function memoryDriver(): UserCacheDriverInterface {
  const store = new Map<string, any>();
  return {
    get: (k) => store.get(k) ?? null,
    set: (k, v) => { store.set(k, v); },
    remove: (k) => { store.delete(k); },
  };
}

class AppUser extends BaseUser {}

app.use((req, res, next) => {
  const user = new AppUser();
  (user as any).cacheDriver = memoryDriver();
  user.boot();

  // Hydrate from the request's session cookie / Authorization header.
  if (req.session?.user) user.login(req.session.user);

  (req as any).user = user;                 // thread it, don't globalize it
  next();
});
```

### Cross-module side effects on login / logout

Wire analytics, query-cache invalidation, and redirects to the global event topics — no module needs to import your `user` instance to react.

```ts
import events from "@mongez/events";
import { queryClient } from "./query-client";
import { analytics } from "./analytics";

events.subscribe("auth.login", (userData) => {
  analytics.identify(userData.id, { name: userData.name, email: userData.email });
});

events.subscribe("auth.logout", () => {
  analytics.reset();
  queryClient.clear();                      // dump cached queries on sign-out
  window.location.href = "/login";          // redirect
});

// Some other module decides we need to log out (e.g., a WebSocket "session-expired").
events.subscribe("server.session-expired", () => {
  import("./auth").then(({ user }) => user.logout());
});
```

The login call site doesn't know analytics exists. The analytics module doesn't know the user module exists. They meet at the topic.

---

## TypeScript

Subclass `User` and declare `implements UserInterface` to catch any future drift between the base class and your subclass at compile time.

```ts
import {
  User as BaseUser,
  UserInterface,
  UserCacheDriverInterface,
  UserInfo,
} from "@mongez/user";

interface AppUserInfo extends UserInfo {
  id: number;
  name: string;
  email: string;
}

class AppUser extends BaseUser implements UserInterface {
  protected cacheDriver: UserCacheDriverInterface = myDriver;

  public override get(key: string, defaultValue?: any): any {
    return super.get(key, defaultValue);
  }
}
```

All exported types:

```ts
import type {
  UserInterface,
  UserInfo,
  UserCacheDriverInterface,
  UserEvents,
  UserEventName,
  WithDataCallback,
  Role,
  PermissionGroup,
} from "@mongez/user";
```

`Role` and `PermissionGroup` are exported for callers wiring permission UIs (label + name pairs, role lists). `setPermissions` itself accepts any object — the types are not enforced internally.

---

## Related packages

| Package | Use when you need |
|---|---|
| [`@mongez/cache`](https://github.com/hassanzohdy/cache) | A drop-in cache driver — plain, encrypted, session, or in-memory — that already matches `UserCacheDriverInterface`. The natural persistence layer for tokens at rest. |
| [`@mongez/events`](https://github.com/hassanzohdy/events) | The event bus used internally. Subscribe to `auth.login` / `auth.logout` / `auth.change` from anywhere without holding the user reference. |
| [`@mongez/encryption`](https://github.com/hassanzohdy/mongez-encryption) | CryptoJS-backed `encrypt` / `decrypt` pair for the encrypted cache drivers — wrap your access tokens at rest. |
| [`@mongez/atom`](https://github.com/hassanzohdy/mongez-atom) | Framework-agnostic reactive state for everything that is NOT auth. Compose with `@mongez/user` when you need both. |
| [`@mongez/reinforcements`](https://github.com/hassanzohdy/reinforcements) | Provides the dot-notation `get` / `set` helpers used internally for `user.get("a.b.c")` and the permissions check. |

---

## Further reading

- [`llms-full.txt`](./llms-full.txt) — exhaustive single-file API surface for tool-assisted development.
- [`skills/`](./skills) — per-topic deep-dives (overview, user-manager, cache-drivers, events, permissions, current-user, recipes).
- [`CHANGELOG.md`](./CHANGELOG.md) — release history and documented quirks.

---

## License

MIT
