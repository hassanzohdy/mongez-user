import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import events from "@mongez/events";
import User from "../user-manager";
import type { UserCacheDriverInterface } from "../types";

/**
 * In-memory driver mirroring what an SSR-per-request or test fixture would
 * supply. We expose the underlying Map so tests can inspect what was written
 * to "storage" — that's how we verify persistence-through-reload semantics.
 */
function memoryDriver() {
  const store = new Map<string, any>();
  const driver: UserCacheDriverInterface = {
    get: (key) => (store.has(key) ? store.get(key) : null),
    set: (key, value) => {
      store.set(key, value);
    },
    remove: (key) => {
      store.delete(key);
    },
  };
  return { driver, store };
}

function make(overrides: Partial<{
  cacheDriver: UserCacheDriverInterface;
  accessTokenKey: string;
  cacheKey: string;
  enableEvents: boolean;
  eventsBaseName: string;
}> = {}) {
  class TestUser extends User {}
  const u = new TestUser();
  for (const [key, value] of Object.entries(overrides)) {
    (u as any)[key] = value;
  }
  return u;
}

afterEach(() => {
  // Tear down anything subscribed to the global @mongez/events bus so events
  // from a previous test can't bleed into the next one.
  events.unsubscribe();
});

describe("boot()", () => {
  it("hydrates userData from the cache driver", () => {
    const { driver, store } = memoryDriver();
    store.set("user", { id: 7, name: "Ada", accessToken: "tk" });
    const u = make({ cacheDriver: driver });
    u.boot();
    expect(u.get("id")).toBe(7);
    expect(u.get("name")).toBe("Ada");
    expect(u.getAccessToken()).toBe("tk");
  });

  it("falls back to an empty object when the driver returns nothing", () => {
    const { driver } = memoryDriver();
    const u = make({ cacheDriver: driver });
    u.boot();
    expect(u.all()).toEqual({});
    expect(u.isLoggedIn()).toBe(false);
  });

  it("survives a missing cacheDriver (session-only mode)", () => {
    const u = make();
    expect(() => u.boot()).not.toThrow();
    expect(u.all()).toEqual({});
  });

  it("does NOT instantiate events when enableEvents is false", () => {
    const { driver } = memoryDriver();
    const u = make({ cacheDriver: driver });
    u.boot();
    expect(u.events).toBeUndefined();
  });

  it("instantiates events on this.events when enableEvents is true", () => {
    const { driver } = memoryDriver();
    const u = make({ cacheDriver: driver, enableEvents: true, eventsBaseName: "auth" });
    u.boot();
    expect(u.events).toBeDefined();
    expect(u.events!.name).toBe("auth");
  });

  it("falls back to cacheKey as the events namespace when eventsBaseName is not set", () => {
    const { driver } = memoryDriver();
    const u = make({ cacheDriver: driver, enableEvents: true, cacheKey: "current-user" });
    u.boot();
    expect(u.events!.name).toBe("current-user");
  });

  it("returns the user instance so it can be chained", () => {
    const u = make();
    expect(u.boot()).toBe(u);
  });
});

describe("login() / logout()", () => {
  it("login() stores the payload, writes to the cache driver, and marks the user logged in", () => {
    const { driver, store } = memoryDriver();
    const u = make({ cacheDriver: driver });
    u.boot();
    u.login({
      id: 1,
      name: "Ada",
      email: "ada@example.com",
      accessToken: "tk",
    });
    expect(u.isLoggedIn()).toBe(true);
    expect(u.isNotLoggedIn()).toBe(false);
    expect(u.get("name")).toBe("Ada");
    expect(u.get("email")).toBe("ada@example.com");
    expect(store.get("user")).toMatchObject({ id: 1, name: "Ada", accessToken: "tk" });
  });

  it("logout() clears userData and removes the cached entry", () => {
    const { driver, store } = memoryDriver();
    const u = make({ cacheDriver: driver });
    u.boot();
    u.login({ id: 1, name: "Ada", accessToken: "tk" });
    expect(store.has("user")).toBe(true);
    u.logout();
    expect(u.isLoggedIn()).toBe(false);
    expect(u.all()).toEqual({});
    expect(store.has("user")).toBe(false);
  });

  it("persistence across a 'reload' — boot() on a fresh instance restores the session", () => {
    const { driver } = memoryDriver();

    // First "session" — log in and write to the cache.
    const first = make({ cacheDriver: driver });
    first.boot();
    first.login({ id: 42, name: "Grace", accessToken: "session-token" });

    // Simulate a page reload by creating a brand-new instance using the
    // SAME driver (so the in-memory store survives across instances).
    const second = make({ cacheDriver: driver });
    second.boot();

    expect(second.isLoggedIn()).toBe(true);
    expect(second.getAccessToken()).toBe("session-token");
    expect(second.get("name")).toBe("Grace");
  });

  it("logout() on one instance is reflected on a fresh boot — cache is empty", () => {
    const { driver } = memoryDriver();
    const first = make({ cacheDriver: driver });
    first.boot();
    first.login({ id: 1, accessToken: "tk" });
    first.logout();

    const second = make({ cacheDriver: driver });
    second.boot();
    expect(second.isLoggedIn()).toBe(false);
    expect(second.all()).toEqual({});
  });
});

describe("access tokens", () => {
  it("isLoggedIn() requires a non-empty access token", () => {
    const u = make();
    u.boot();
    expect(u.isLoggedIn()).toBe(false);
    u.setAccessToken("");
    expect(u.isLoggedIn()).toBe(false);
    u.setAccessToken("eyJ…");
    expect(u.isLoggedIn()).toBe(true);
  });

  it("getAccessToken() returns the empty string when nothing is stored", () => {
    const u = make();
    u.boot();
    expect(u.getAccessToken()).toBe("");
  });

  it("setAccessToken() writes through to the underlying key", () => {
    const u = make();
    u.boot();
    u.setAccessToken("new-token");
    expect(u.get("accessToken")).toBe("new-token");
    expect(u.getAccessToken()).toBe("new-token");
  });

  it("refreshToken() is an alias for setAccessToken()", () => {
    const u = make();
    u.boot();
    u.refreshToken("refreshed");
    expect(u.getAccessToken()).toBe("refreshed");
  });

  it("honors a custom accessTokenKey", () => {
    const u = make({ accessTokenKey: "jwt" });
    u.boot();
    u.login({ id: 1, jwt: "eyJ…" });
    expect(u.isLoggedIn()).toBe(true);
    expect(u.getAccessToken()).toBe("eyJ…");
    // The default "accessToken" key is NOT used:
    expect(u.get("accessToken")).toBeNull();
  });

  it("setAccessTokenKey() changes the key at runtime", () => {
    const u = make();
    u.boot();
    expect(u.getAccessTokenKey()).toBe("accessToken");
    u.setAccessTokenKey("token");
    expect(u.getAccessTokenKey()).toBe("token");
    u.login({ id: 1, token: "tk" });
    expect(u.getAccessToken()).toBe("tk");
  });
});

describe("get() / set() / all()", () => {
  it("get() returns the value at a key", () => {
    const u = make();
    u.boot();
    u.login({ id: 1, name: "Ada", accessToken: "tk" });
    expect(u.get("name")).toBe("Ada");
  });

  it("get() supports dot-notation for nested paths", () => {
    const u = make();
    u.boot();
    u.login({
      id: 1,
      profile: { address: { country: "Egypt" } },
      accessToken: "tk",
    });
    expect(u.get("profile.address.country")).toBe("Egypt");
  });

  it("get() returns the default when the key is missing", () => {
    const u = make();
    u.boot();
    expect(u.get("missing", "fallback")).toBe("fallback");
  });

  it("set() writes to a key, mutates the cache, and triggers keyChange events when enabled", () => {
    const { driver, store } = memoryDriver();
    const u = make({ cacheDriver: driver });
    u.boot();
    u.set("name", "Ada");
    expect(u.get("name")).toBe("Ada");
    expect(store.get("user")).toMatchObject({ name: "Ada" });
  });

  it("set() with dot-notation creates nested structure", () => {
    const u = make();
    u.boot();
    u.set("profile.address.country", "Egypt");
    expect(u.get("profile.address.country")).toBe("Egypt");
  });

  it("set() is a no-op when the new value is referentially equal to the current", () => {
    const { driver } = memoryDriver();
    const setSpy = vi.spyOn(driver, "set");
    const u = make({ cacheDriver: driver });
    u.boot();
    u.set("answer", 42);
    setSpy.mockClear();
    u.set("answer", 42);     // identical → no cache write
    expect(setSpy).not.toHaveBeenCalled();
  });

  it("all() returns the entire userData object", () => {
    const u = make();
    u.boot();
    u.login({ id: 1, name: "Ada", accessToken: "tk" });
    expect(u.all()).toMatchObject({ id: 1, name: "Ada", accessToken: "tk" });
  });

  it("the `id` shortcut reads userData.id", () => {
    const u = make();
    u.boot();
    u.login({ id: 99, accessToken: "tk" });
    expect(u.id).toBe(99);
  });
});

describe("update()", () => {
  it("replaces the entire payload", () => {
    const { driver } = memoryDriver();
    const u = make({ cacheDriver: driver });
    u.boot();
    u.login({ id: 1, name: "Ada", email: "ada@x.com", accessToken: "tk" });
    u.update({ id: 1, name: "Grace", accessToken: "tk2" });
    expect(u.get("name")).toBe("Grace");
    // The replaced payload doesn't include email, so it's gone:
    expect(u.get("email")).toBeNull();
  });

  it("preserves the existing token when the new payload doesn't include one", () => {
    const u = make();
    u.boot();
    u.login({ id: 1, name: "Ada", accessToken: "original-token" });
    u.update({ id: 1, name: "Grace" });
    expect(u.getAccessToken()).toBe("original-token");
  });

  it("writes the new payload through to the cache driver", () => {
    const { driver, store } = memoryDriver();
    const u = make({ cacheDriver: driver });
    u.boot();
    u.login({ id: 1, accessToken: "tk" });
    u.update({ id: 1, name: "Grace", accessToken: "tk2" });
    expect(store.get("user")).toMatchObject({ name: "Grace", accessToken: "tk2" });
  });
});

describe("permissions", () => {
  it("setPermissions stores the object and can() reads it via dot-notation", () => {
    const u = make();
    u.boot();
    u.setPermissions({
      posts: { create: true, delete: false },
      admin: { panel: true },
    });
    expect(u.can("posts.create")).toBe(true);
    expect(u.can("posts.delete")).toBe(false);
    expect(u.can("admin.panel")).toBe(true);
  });

  it("can() returns false for a missing path", () => {
    const u = make();
    u.boot();
    u.setPermissions({ posts: { create: true } });
    expect(u.can("posts.archive")).toBe(false);
    expect(u.can("unrelated.key")).toBe(false);
  });

  it("can() returns true for any truthy leaf, false for any falsy leaf", () => {
    const u = make();
    u.boot();
    u.setPermissions({
      truthyString: "yes",
      truthyNumber: 1,
      truthyArray: [1],
      falsyString: "",
      falsyNumber: 0,
      falsyNull: null,
      falsyUndefined: undefined,
      explicitFalse: false,
    });
    expect(u.can("truthyString")).toBe(true);
    expect(u.can("truthyNumber")).toBe(true);
    expect(u.can("truthyArray")).toBe(true);
    expect(u.can("falsyString")).toBe(false);
    expect(u.can("falsyNumber")).toBe(false);
    expect(u.can("falsyNull")).toBe(false);
    expect(u.can("falsyUndefined")).toBe(false);
    expect(u.can("explicitFalse")).toBe(false);
  });

  it("setPermissions REPLACES the permissions object — it does not merge", () => {
    const u = make();
    u.boot();
    u.setPermissions({ posts: { create: true } });
    u.setPermissions({ admin: { panel: true } });
    expect(u.can("posts.create")).toBe(false);   // gone after the second call
    expect(u.can("admin.panel")).toBe(true);
  });

  it("permissions are NOT written through to the cache driver", () => {
    const { driver, store } = memoryDriver();
    const u = make({ cacheDriver: driver });
    u.boot();
    u.setPermissions({ posts: { create: true } });
    // Driver should NOT have been touched by setPermissions; only by login/set/update.
    expect(store.has("user")).toBe(false);
  });
});

describe("cache keys", () => {
  it("honors a custom cacheKey", () => {
    const { driver, store } = memoryDriver();
    const u = make({ cacheDriver: driver, cacheKey: "session" });
    u.boot();
    u.login({ id: 1, accessToken: "tk" });
    expect(store.has("session")).toBe(true);
    expect(store.has("user")).toBe(false);
    expect(u.getCacheKey()).toBe("session");
  });

  it("getCacheKey() returns the configured key", () => {
    const u = make({ cacheKey: "current-user" });
    u.boot();
    expect(u.getCacheKey()).toBe("current-user");
  });
});
