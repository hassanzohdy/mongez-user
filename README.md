# @mongez/user

> Framework-agnostic user/auth state manager — login, logout, access tokens, permissions, and pluggable persistence with an event bus.

`@mongez/user` is the auth/session primitive of the Mongez family. It works on the browser and on Node, with no React or framework coupling. You subclass a `User` base class, plug in a cache driver of your choice (localStorage, cookies, `@mongez/cache`, anything that implements three methods), and you get a clean object-oriented surface for the things every app needs: "is this user logged in", "what's their access token", "can they do this".

It pairs naturally with [`@mongez/atom`](https://github.com/hassanzohdy/mongez-atom) for app state and [`@mongez/events`](https://github.com/hassanzohdy/events) for cross-module signaling — both of which are used internally.

## Install

```sh
yarn add @mongez/user
# peer deps: @mongez/events, @mongez/reinforcements
```

## A 30-second tour

```ts
import { User as BaseUser, UserCacheDriverInterface } from "@mongez/user";

// 1. Bring your own cache driver — anything with get/set/remove.
const localStorageDriver: UserCacheDriverInterface = {
  get: (key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  },
  set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
  remove: (key) => localStorage.removeItem(key),
};

// 2. Subclass the base User. The cache driver is the only required field.
class AppUser extends BaseUser {
  protected cacheDriver = localStorageDriver;
}

// 3. Boot — restores any cached session.
const user = new AppUser();
user.boot();

// 4. Log them in.
user.login({
  id: 42,
  name: "Ada Lovelace",
  email: "ada@example.com",
  accessToken: "eyJhbGc…",
});

user.isLoggedIn();          // true
user.getAccessToken();      // "eyJhbGc…"
user.get("name");           // "Ada Lovelace"
user.id;                    // 42

user.logout();
user.isLoggedIn();          // false
```

## What's in the box

| Export | Purpose |
|---|---|
| `User` | The base class. Subclass it, set `cacheDriver`, call `boot()`. |
| `UserEventsListener` | Per-instance pub/sub for `boot` / `login` / `logout` / `change` / `keyChange`. |
| `setCurrentUser` / `getCurrentUser` | Module-level pointer to "the current user" for code that doesn't have an import path to it. |
| `UserInterface` | The full method contract. Implement it on your subclass for type safety. |
| `UserInfo` | The user-data shape: `accessToken` plus any extra keys. |
| `UserCacheDriverInterface` | The three-method contract any storage adapter satisfies. |

## The base class

```ts
import { User as BaseUser, UserCacheDriverInterface } from "@mongez/user";

class AppUser extends BaseUser {
  // Required: where to persist user data between sessions.
  protected cacheDriver: UserCacheDriverInterface = myDriver;

  // Optional: which key inside userData holds the bearer token.
  // Defaults to "accessToken". Set to "token" / "jwt" / whatever your API uses.
  protected accessTokenKey: string = "token";

  // Optional: the cache driver key that stores the whole user payload.
  // Defaults to "user".
  protected cacheKey: string = "current-user";

  // Optional: turn on the event bus. Off by default.
  protected enableEvents: boolean = true;

  // Optional: namespace for the event bus. Falls back to `cacheKey`.
  protected eventsBaseName: string = "auth";
}
```

`boot()` reads the cache driver for `cacheKey`, hydrates `userData`, and (if events are enabled) instantiates `UserEventsListener` on `this.events` and fires `boot`.

## The methods you get

```ts
const user = new AppUser();
user.boot();

// Identity
user.isLoggedIn();            // boolean — does getAccessToken() have length?
user.isNotLoggedIn();         // boolean — inverse
user.id;                      // shorthand for user.get("id")

// Session
user.login(userData);         // write userData, fire login event, cache it
user.logout();                // clear userData, remove from cache, fire logout
user.update(userData);        // replace whole payload (keeps token if not provided)

// Token
user.getAccessToken();        // string
user.setAccessToken(token);   // update token in place
user.refreshToken(token);     // alias for setAccessToken

// Reads — dot-notation supported via @mongez/reinforcements `get`
user.get("email");
user.get("profile.address.country");
user.get("optional-key", "fallback");

// Writes — dot-notation supported
user.set("profile.address.country", "Egypt");

// Permissions
user.setPermissions({ users: { create: true, delete: false } });
user.can("users.create");     // true
user.can("users.delete");     // false
user.can("users.archive");    // false (missing → falsy)

// Full payload
user.all();                   // entire userData object
```

## Cache drivers

The only requirement is a three-method object:

```ts
type UserCacheDriverInterface = {
  get(key: string, defaultValue?: any): any;
  set(key: string, value: any): void;
  remove(key: string): void;
};
```

### localStorage driver

```ts
const localStorageDriver: UserCacheDriverInterface = {
  get: (key) => {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  },
  set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
  remove: (key) => localStorage.removeItem(key),
};
```

### `@mongez/cache` driver

```ts
import cache from "@mongez/cache";

class AppUser extends BaseUser {
  protected cacheDriver = cache;   // already matches the shape
}
```

### In-memory driver (tests, SSR per-request)

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

## Events

Opt in by setting `protected enableEvents = true` on your subclass. The base class wires up a `UserEventsListener` on `this.events` during `boot()`.

```ts
class AppUser extends BaseUser {
  protected cacheDriver = myDriver;
  protected enableEvents = true;
  protected eventsBaseName = "auth";
}

const user = new AppUser();
user.boot();

user.events!.onLogin((userData, u) => {
  console.log("logged in:", userData);
});

user.events!.onLogout((u) => {
  console.log("logged out");
});

user.events!.onChange((newData, oldData, u) => {
  console.log("user data replaced");
});

user.events!.onKeyChange((key, next, prev, u) => {
  console.log(`${key}: ${prev} -> ${next}`);
});
```

All callbacks return an `EventSubscription` from `@mongez/events`. Call `.unsubscribe()` to remove the listener.

Events fire on the `@mongez/events` bus under `${eventsBaseName}.${eventType}`:

- `${ns}.boot` — fired by `boot()`
- `${ns}.login` — fired by `login()`
- `${ns}.logout` — fired by `logout()`
- `${ns}.change` — fired by `update()`
- `${ns}.keyChange` — fired by `set()` (and per-key during `update()`)

## Permissions

`setPermissions(obj)` stores an arbitrary object; `can(path)` checks it via dot-notation. Any truthy leaf value passes.

```ts
user.setPermissions({
  posts: { create: true, delete: false },
  admin: { panel: true },
});

user.can("posts.create");   // true
user.can("posts.delete");   // false
user.can("admin.panel");    // true
user.can("missing.key");    // false
```

The shape is up to you — flat keys (`"posts.create": true`), nested objects, RBAC role arrays, whatever fits your backend. Keep it serializable so it round-trips through the cache driver.

## Current user pointer

For code that needs to reach "the logged-in user" without depending on a specific module path:

```ts
import { setCurrentUser, getCurrentUser } from "@mongez/user";

const user = new AppUser();
user.boot();
setCurrentUser(user);

// Later, somewhere unrelated:
const u = getCurrentUser();
if (u?.isLoggedIn()) {
  // …
}
```

## TypeScript

- Subclass `User` and (optionally) declare `implements UserInterface` to get the full contract checked at compile time.
- `UserInfo` is `{ accessToken?: string; [key: string]: any }` — extend it for your own user payload shape.

## Related packages

| Package | Purpose |
|---|---|
| [`@mongez/atom`](https://github.com/hassanzohdy/mongez-atom) | Framework-agnostic state primitive — atoms, actions, derived values. |
| [`@mongez/events`](https://github.com/hassanzohdy/events) | Tiny event bus. Used internally. |
| [`@mongez/reinforcements`](https://github.com/hassanzohdy/reinforcements) | TypeScript utility belt. `get` / `set` for dot-notation. Used internally. |
| [`@mongez/cache`](https://github.com/hassanzohdy/cache) | Drop-in cache driver implementing the `UserCacheDriverInterface` shape. |

## License

MIT
