import { EventSubscription } from "@mongez/events";

export interface UserInfo {
  /**
   * Current access token
   */
  accessToken?: string;
  /**
   * Any other data
   */
  [key: string]: any;
}

export interface UserInterface extends UserInfo {
  /**
   * Get cache key
   *
   * @returns {string}
   */
  getCacheKey(): string;

  /**
   * Check if user is logged in
   *
   * @returns {boolean}
   */
  isLoggedIn(): boolean;

  /**
   * Check if user is not logged in
   *
   * @returns {boolean}
   */
  isNotLoggedIn(): boolean;

  /**
   * Log the user in
   * It will store the data in the storage engine i.e Local Storage
   * But will not make the ajax request
   *
   * @param  {UserInfo} userData
   * @returns {UserInterface}
   */
  login(userData: UserInfo): UserInterface;

  /**
   * Log the user out
   */
  logout();

  /**
   * Get user access token
   *
   * @returns {string}
   */
  getAccessToken(): string;

  /**
   * Update current access token
   *
   * @param {string} newAccessToken
   */
  setAccessToken(newAccessToken: string): void;

  /**
   * Refresh token
   *
   * @alias setAccessToken
   * @param  {string} newAccessToken
   * @returns {void}
   */
  refreshToken(newAccessToken: string): void;

  /**
   * Set the given value
   *
   * @param   {string} key
   * @param   {any} value
   */
  set(key: string, value: any);

  /**
   * Reset user info excluding access token if not provided with the given data
   *
   * @param {object} newInfo
   */
  update(newInfo: UserInfo);

  /**
   * Get value for the given key, otherwise return default value
   *
   * @param   {string} key
   * @param   {any} defaultValue
   * @returns {any}
   */
  get(key: string, defaultValue: any): any;

  /**
   * Set user permissions list
   */
  setPermissions(permissions: object);

  /**
   * Check if user has access to the given permission role
   *
   * @param {string} permission
   * @returns {boolean}
   */
  can(permission: string): boolean;

  /**
   * Get all user data
   *
   * @returns {UserInfo}
   */
  all(): UserInfo;
}

export type Role = {
  /**
   * Role Displayed Text
   */
  text: string;
  /**
   * Role Server Name
   */
  name: string;
};

export type PermissionGroup = {
  /**
   * Permission Displayed Text
   */
  text: string;
  /**
   * Permission Server Name
   */
  name: string;
  /**
   * List of Roles
   */
  roles: Role[];
};

export type WithDataCallback = (data: any, user: UserInterface) => void;

export type UserEventName =
  | "boot"
  | "login"
  | "change"
  | "keyChange"
  | "logout";

export type UserEvents = {
  /**
   * User Event base name
   */
  name: string;

  /**
   * Triggered when boot method is called
   */
  onBoot(callback: WithDataCallback): EventSubscription;

  /**
   * Triggered when user data is changed
   */
  onChange(
    callback: (newData: any, oldData: any, user: UserInterface) => void
  ): EventSubscription;

  /**
   * Triggered when a key is changed in user data and the given value is not the same as current value of same key
   */
  onKeyChange(
    callback: (
      key: string,
      newValue: any,
      oldValue: any,
      user: UserInterface
    ) => void
  ): EventSubscription;

  /**
   * Triggered once user is logged in, when the login method is called.
   */
  onLogin(callback: WithDataCallback): EventSubscription;

  /**
   * Triggered once user is logged out, when the logout method is called.
   */
  onLogout(callback: (user: UserInterface) => void): EventSubscription;

  /**
   * Trigger boot event, called on creating new instance of User class.
   */
  triggerBoot(initData: any, user: UserInterface): void;

  /**
   * Trigger user data change, called when calling `update` method.
   */
  triggerChange(newData: any, oldData: any, user: UserInterface);

  /**
   * Trigger key's value is changed , called when calling `set` method and the given value is not the same as current value of same key.
   */
  triggerKeyChange(
    key: string,
    newValue: any,
    oldValue: any,
    user: UserInterface
  ): void;

  /**
   * Trigger login event, called when calling `login` method
   */
  triggerLogin(userData: any, user: UserInterface): void;

  /**
   * Trigger logout event, called when calling `logout` method
   */
  triggerLogout(user: UserInterface): void;
};

export type UserCacheDriverInterface = {
  /**
   * Get cache value
   */
  get(key: string, defaultValue?: any): any;
  /**
   * Set cache value in the cache driver storage
   */
  set(key: string, value: any): void;
  /**
   * Remove key from cache driver
   */
  remove(key: string): void;
  /**
   * Dynamic attributes and methods
   */
  [id: string]: any;
};
