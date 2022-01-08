import { Obj } from "@mongez/reinforcements";
import UserEventsListener from "./UserEventsListener";
import {
  UserInfo,
  UserInterface,
  UserCacheDriverInterface,
  UserEvents,
} from "./types";

export default class User implements UserInterface {
  /**
   * Cache driver
   */
  protected cacheDriver: UserCacheDriverInterface;

  /**
   * Permissions list
   */
  protected permissions = {};

  /**
   * User data
   */
  protected userData: object = {};

  /**
   * Access token key
   *
   * @default `accessToken`
   */
  protected accessTokenKey: string = "accessToken";

  /**
   * Cache key that will be used to store user details in the cache driver
   *
   * @default `user`
   */
  protected cacheKey: string = "user";

  /**
   * Enable events
   *
   * @default false
   */
  protected enableEvents: boolean = false;

  /**
   * Event base name
   * If not set and events are enabled, cache key will be used instead
   */
  protected eventsBaseName: string;

  /**
   * Set user events list
   */
  public events: UserEvents;

  /**
   * Constructor
   */
  public constructor() {
    this.boot();
  }

  /**
   * Initialize the user
   */
  public boot(): UserInterface {
    if (this.enableEvents) {
      this.events = new UserEventsListener(
        this.eventsBaseName || this.cacheKey
      );
    }

    this.userData = this.cacheDriver.get(this.getCacheKey(), {}) as UserInfo;

    if (this.events) {
      this.events.triggerBoot(this.userData, this);
    }

    return this;
  }

  /**
   * Get cache key
   *
   * @returns {string}
   */
  public getCacheKey(): string {
    return this.cacheKey;
  }

  /**
   * Get access token key
   *
   * @returns {string}
   */
  public getAccessTokenKey(): string {
    return this.accessTokenKey;
  }

  /**
   * Set access token key
   *
   * @param {string} accessTokenKey
   * @returns {self}
   */
  public setAccessTokenKey(accessTokenKey: string): UserInterface {
    this.accessTokenKey = accessTokenKey;
    return this;
  }

  /**
   * Check if user is logged in
   *
   * @returns {boolean}
   */
  public isLoggedIn(): boolean {
    return this.getAccessToken().length > 0;
  }

  /**
   * Check if user is not logged in
   *
   * @returns {boolean}
   */
  public isNotLoggedIn(): boolean {
    return !this.isLoggedIn();
  }

  /**
   * Log the user in
   * It will store the data in the storage engine i.e Local Storage
   * But will not make the ajax request
   *
   * @param  {UserInfo} userData
   * @returns {UserInterface}
   */
  public login(userData: UserInfo): UserInterface {
    if (this.events) {
      this.events.triggerLogin(userData, this);
    }

    this.update(userData);

    return this;
  }

  /**
   * Set the given value
   *
   * @param   {string} key
   * @param   {any} value
   */
  public set(key: string, value: any) {
    const oldValue: any = this.get(key);
    if (value === oldValue) return;

    Obj.set(this.userData, key, value);

    this.cacheDriver.set(this.getCacheKey(), this.userData);

    this.triggerKeyChange(key, value, oldValue);
  }

  /**
   * Reset user info excluding access token if not provided with the given data
   *
   * @param {object} newInfo
   */
  public update(userData: UserInfo) {
    if (!userData[this.accessTokenKey]) {
      userData[this.accessTokenKey] = this.getAccessToken();
    }

    const oldData = { ...this.userData };

    this.userData = userData;

    for (let key in userData) {
      this.triggerKeyChange(key, userData[key], this.get(key));
    }

    this.cacheDriver.set(this.getCacheKey(), userData);

    if (this.events) {
      this.events.triggerChange(this.userData, oldData, this);
    }
  }

  /**
   * Get value for the given key, otherwise return default value
   *
   * @param   {string} key
   * @param   {any} defaultValue
   * @returns {any}
   */
  public get(key: string, defaultValue: any = null) {
    return Obj.get(this.userData, key, defaultValue);
  }

  /**
   * Log the user out
   */
  public logout() {
    this.userData = {};
    this.cacheDriver.remove(this.getCacheKey());
    if (this.events) {
      this.events.triggerLogout(this);
    }
  }

  /**
   * Get user access token
   *
   * @returns {string}
   */
  public getAccessToken(): string {
    return this.get(this.accessTokenKey, "");
  }

  /**
   * Update current access token
   *
   * @param  {string} newAccessToken
   * @returns {void}
   */
  public setAccessToken(newAccessToken: string): void {
    this.set(this.accessTokenKey, newAccessToken);
  }

  /**
   * Refresh token
   *
   * @alias setAccessToken
   * @param  {string} newAccessToken
   * @returns {void}
   */
  public refreshToken(newAccessToken: string): void {
    return this.setAccessToken(newAccessToken);
  }

  /**
   * Get all user data
   *
   * @returns {UserInfo}
   */
  public all(): UserInfo {
    return this.userData;
  }

  /**
   * Set user permissions list
   */
  public setPermissions(permissions: object) {
    this.permissions = permissions;
  }

  /**
   * Check if user has access to the given permission role
   *
   * @param {string} permission
   * @returns {boolean}
   */
  public can(permission: string) {
    return Boolean(Obj.get(this.permissions, permission)) === true;
  }

  /**
   * Trigger change for the given key
   *
   * @param  {string} key
   * @param  {any} newValue
   * @param  {any} oldValue
   * @returns {void}
   */
  protected triggerKeyChange(key: string, newValue: any, oldValue: any): void {
    if (this.events) {
      this.events.triggerKeyChange(key, newValue, oldValue, this);
    }
  }
}
