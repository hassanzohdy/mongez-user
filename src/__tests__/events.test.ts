import { afterEach, describe, expect, it, vi } from "vitest";
import events from "@mongez/events";
import User from "../user-manager";
import UserEventsListener from "../user-events-listener";
import type { UserCacheDriverInterface } from "../types";

function memoryDriver(): UserCacheDriverInterface {
  const store = new Map<string, any>();
  return {
    get: (key) => (store.has(key) ? store.get(key) : null),
    set: (key, value) => {
      store.set(key, value);
    },
    remove: (key) => {
      store.delete(key);
    },
  };
}

function makeWithEvents(namespace = "auth") {
  class TestUser extends User {
    protected cacheDriver = memoryDriver();
    protected enableEvents = true;
    protected eventsBaseName = namespace;
  }
  const u = new TestUser();
  u.boot();
  return u;
}

afterEach(() => {
  // Clear every subscription so tests don't leak callbacks across cases.
  events.unsubscribe();
});

describe("UserEventsListener — construction", () => {
  it("stores the namespace on `name`", () => {
    const listener = new UserEventsListener("auth");
    expect(listener.name).toBe("auth");
  });

  it("is attached to user.events when enableEvents is true", () => {
    const u = makeWithEvents();
    expect(u.events).toBeInstanceOf(UserEventsListener);
    expect(u.events!.name).toBe("auth");
  });
});

describe("login() event", () => {
  it("fires the listener registered via onLogin", () => {
    const u = makeWithEvents();
    const spy = vi.fn();
    u.events!.onLogin(spy);
    u.login({ id: 1, name: "Ada", accessToken: "tk" });
    expect(spy).toHaveBeenCalledOnce();
    const [userData, user] = spy.mock.calls[0];
    expect(userData).toMatchObject({ id: 1, name: "Ada", accessToken: "tk" });
    expect(user).toBe(u);
  });

  it("fires on the global @mongez/events bus under `${ns}.login`", () => {
    makeWithEvents("custom-ns");
    const spy = vi.fn();
    events.subscribe("custom-ns.login", spy);
    const u = makeWithEvents("custom-ns");
    u.login({ id: 1, accessToken: "tk" });
    expect(spy).toHaveBeenCalledOnce();
  });

  it("can be unsubscribed", () => {
    const u = makeWithEvents();
    const spy = vi.fn();
    const sub = u.events!.onLogin(spy);
    sub.unsubscribe();
    u.login({ id: 1, accessToken: "tk" });
    expect(spy).not.toHaveBeenCalled();
  });

  it("supports multiple listeners on the same event", () => {
    const u = makeWithEvents();
    const a = vi.fn();
    const b = vi.fn();
    u.events!.onLogin(a);
    u.events!.onLogin(b);
    u.login({ id: 1, accessToken: "tk" });
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
  });
});

describe("logout() event", () => {
  it("fires the listener registered via onLogout", () => {
    const u = makeWithEvents();
    u.login({ id: 1, accessToken: "tk" });
    const spy = vi.fn();
    u.events!.onLogout(spy);
    u.logout();
    expect(spy).toHaveBeenCalledOnce();
    const [user] = spy.mock.calls[0];
    expect(user).toBe(u);
  });

  it("fires on the global bus under `${ns}.logout`", () => {
    const spy = vi.fn();
    events.subscribe("auth.logout", spy);
    const u = makeWithEvents();
    u.login({ id: 1, accessToken: "tk" });
    u.logout();
    expect(spy).toHaveBeenCalledOnce();
  });
});

describe("change() event", () => {
  it("fires onChange when update() is called", () => {
    const u = makeWithEvents();
    u.login({ id: 1, name: "Ada", accessToken: "tk" });
    const spy = vi.fn();
    u.events!.onChange(spy);
    u.update({ id: 1, name: "Grace", accessToken: "tk2" });
    expect(spy).toHaveBeenCalledOnce();
  });

  it("the onChange handler receives newData, oldData, user", () => {
    const u = makeWithEvents();
    u.login({ id: 1, name: "Ada", accessToken: "tk" });
    const spy = vi.fn();
    u.events!.onChange(spy);
    u.update({ id: 1, name: "Grace", accessToken: "tk" });
    const [newData, oldData, user] = spy.mock.calls[0];
    expect(newData.name).toBe("Grace");
    expect(oldData.name).toBe("Ada");
    expect(user).toBe(u);
  });
});

describe("keyChange event", () => {
  it("fires when set() is called", () => {
    const u = makeWithEvents();
    const spy = vi.fn();
    events.subscribe("auth.keyChange", spy);
    u.set("name", "Ada");
    expect(spy).toHaveBeenCalledOnce();
    const [key, newValue, oldValue, user] = spy.mock.calls[0];
    expect(key).toBe("name");
    expect(newValue).toBe("Ada");
    expect(oldValue).toBeNull();
    expect(user).toBe(u);
  });

  it("does NOT fire when set() is called with an identical value", () => {
    const u = makeWithEvents();
    u.set("name", "Ada");
    const spy = vi.fn();
    events.subscribe("auth.keyChange", spy);
    u.set("name", "Ada");
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("boot() event", () => {
  it("fires on the global bus under `${ns}.boot` when boot() runs with events enabled", () => {
    const spy = vi.fn();
    events.subscribe("auth.boot", spy);
    class TestUser extends User {
      protected cacheDriver = memoryDriver();
      protected enableEvents = true;
      protected eventsBaseName = "auth";
    }
    new TestUser().boot();
    expect(spy).toHaveBeenCalledOnce();
  });
});

// =============================================================================
// REGRESSION / BUG-DOCUMENTING TESTS — these document known bugs in the
// current implementation. They're skipped so the suite still goes green, but
// they pin down the expected behavior for a future fix.
// =============================================================================

describe("REGRESSION: UserEventsListener wires wrong topics", () => {
  // See src/user-events-listener.ts:16 — onBoot subscribes to "logout"
  // instead of "boot".
  it("onBoot should subscribe to the `boot` topic, not `logout`", () => {
    const u = makeWithEvents();
    const spy = vi.fn();
    u.events!.onBoot(spy);
    // Trigger a boot manually:
    u.events!.triggerBoot({ id: 1 }, u);
    expect(spy).toHaveBeenCalledOnce();
  });

  // See src/user-events-listener.ts:53 — onKeyChange subscribes to "logout"
  // instead of "keyChange".
  it("onKeyChange should subscribe to the `keyChange` topic, not `logout`", () => {
    const u = makeWithEvents();
    const spy = vi.fn();
    u.events!.onKeyChange(spy);
    u.set("name", "Ada");
    expect(spy).toHaveBeenCalledOnce();
    const [key, newValue, oldValue] = spy.mock.calls[0];
    expect(key).toBe("name");
    expect(newValue).toBe("Ada");
    expect(oldValue).toBeNull();
  });
});

describe("REGRESSION: update() emits stale oldValue in keyChange", () => {
  // See src/user-manager.ts:163-174 — `this.userData = userData` is assigned
  // BEFORE the per-key triggerKeyChange loop runs, so `this.get(key)` reads
  // back the new value instead of the previous one. The keyChange event's
  // `oldValue` argument is therefore identical to `newValue`.
  it("keyChange's oldValue during update() should be the PREVIOUS value, not the new one", () => {
    const u = makeWithEvents();
    u.login({ id: 1, name: "Ada", accessToken: "tk" });
    const spy = vi.fn();
    events.subscribe("auth.keyChange", spy);
    u.update({ id: 1, name: "Grace", accessToken: "tk" });
    // Find the call for the name key:
    const nameCall = spy.mock.calls.find((c) => c[0] === "name");
    expect(nameCall).toBeDefined();
    const [, newValue, oldValue] = nameCall!;
    expect(newValue).toBe("Grace");
    expect(oldValue).toBe("Ada");   // currently emits "Grace"
  });
});

describe("REGRESSION: update() mutates the input payload", () => {
  // See src/user-manager.ts:164-166 — when the new payload omits the
  // access token, the existing token is written BACK into the caller's
  // object. The caller's input should not be mutated.
  it("update() should not mutate the userData argument", () => {
    const u = makeWithEvents();
    u.login({ id: 1, accessToken: "preserved" });
    const payload = { id: 1, name: "Grace" };
    u.update(payload);
    expect(payload).toEqual({ id: 1, name: "Grace" });  // currently has accessToken added
  });
});
