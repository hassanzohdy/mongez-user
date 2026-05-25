import { afterEach, describe, expect, it } from "vitest";
import User from "../user-manager";
import { getCurrentUser, setCurrentUser } from "../current-user";

class TestUser extends User {}

afterEach(() => {
  // Reset the module-level slot so tests don't leak into each other.
  setCurrentUser(undefined as any);
});

describe("current-user pointer", () => {
  it("returns undefined before anything is set", () => {
    expect(getCurrentUser()).toBeUndefined();
  });

  it("setCurrentUser stores an instance, getCurrentUser returns it", () => {
    const u = new TestUser();
    u.boot();
    setCurrentUser(u);
    expect(getCurrentUser()).toBe(u);
  });

  it("setCurrentUser overwrites — the most recent call wins", () => {
    const a = new TestUser();
    const b = new TestUser();
    a.boot();
    b.boot();
    setCurrentUser(a);
    setCurrentUser(b);
    expect(getCurrentUser()).toBe(b);
  });

  it("the returned instance is the live object — calling its methods reflects in subsequent reads", () => {
    const u = new TestUser();
    u.boot();
    setCurrentUser(u);
    getCurrentUser().login({ id: 1, accessToken: "tk" });
    expect(getCurrentUser().isLoggedIn()).toBe(true);
    expect(getCurrentUser().get("id")).toBe(1);
  });
});
