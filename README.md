# Mongez User

A User Management tool for user auth and data management

## Purpose of this package

The main goal for this package is to manage user state in your app, either in a nodejs app or a browser based app.

## Installation

`yarn add @mongez/user`

Or

`npm i @mongez/user`

## Usage

Let's declare a new user class.

```ts
// src/user/index.ts
import cache from '@mongez/cache';
import { User as BaseUser, UserInterface, UserCacheDriverInterface } from '@mongez/user';

class User extends BaseUser implements UserInterface {
  /**
   * Cache driver
   */
  protected cacheDriver: UserCacheDriverInterface = cache;
}

const user: User = new User;

export default user;
```

Now we're ready to start using our User class object.

## Logging User

We defined our user, now let's set the user data once the user is logged in, in some other place in the app.

```ts
// some-other-place.ts
import user from 'src/user';

const userData = {
    id: 1,
    name: 'Hasan Zohdy',
    email: 'hassanzohdy@gmail.com',
    accessToken: 'eydfgtre3wqsadcfgbhyt5r4e3wqqsadxcfvgfhytr54e3w',
}

user.login(userData);
```

It's important to notice that `accessToken` key is the main key to detect if user is logged in or not.

## Changing Access Token Key

```ts
// src/user/index.ts
import cache from '@mongez/cache';
import { User as BaseUser, UserInterface, UserCacheDriverInterface } from '@mongez/user';

class User extends BaseUser implements UserInterface {
  /**
   * Cache driver
   */
  protected cacheDriver: UserCacheDriverInterface = cache;
  /**
   * Access token key
   *
   * @default `accessToken`
   */
  protected accessTokenKey: string = "token";
}

const user: User = new User;

export default user;
```

Now we can set the access token key as `token`

```ts
// some-other-place.ts
import user from 'src/user';

const userData = {
    id: 1,
    name: 'Hasan Zohdy',
    email: 'hassanzohdy@gmail.com',
    token: 'eydfgtre3wqsadcfgbhyt5r4e3wqqsadxcfvgfhytr54e3w',
}

user.login(userData);
```

## Checking if user is logged in

```ts
// some-other-place.ts
import user from 'src/user';

if (user.isLoggedIn()) {
    // do something
}
```

## Log the user out

```ts
// some-other-place.ts
import user from 'src/user';

user.logout();

console.log(user.isLoggedIn()); // false
```

## Checking if user is not logged in

```ts
// some-other-place.ts
import user from 'src/user';

if (user.isNotLoggedIn()) {
    // do something
}
```

## Get user data

To get a value from user data use `user.get` method.

> This method accepts `dot.notation.syntax` to get value from nested object.

```ts
// some-other-place.ts
import user from 'src/user';

console.log(user.get('id')); // 1
```

## Getting default data if key is missing form user data

```ts
// some-other-place.ts
import user from 'src/user';

console.log(user.get('some-key', true)); // true
```

## Get access token

```ts
// some-other-place.ts
import user from 'src/user';

console.log(user.getAccessToken()); // eydfgtre3wqsadcfgbhyt5r4e3wqqsadxcfvgfhytr54e3w
```

## Update entire user data

Using `update` method will update the entire user data, along side with access token, if its key is in the passed object, otherwise the current access token value will be obtained from old user data.

```ts
// some-other-place.ts
import user from 'src/user';

const userData = {
    id: 1,
    name: 'Hasan Zohdy',
    email: 'hassanzohdy@gmail.com',
    token: 'etSDFGDGTQ32QWDFGTREWQWDSFERR',
}

user.update(userData);
```

## Set user key value

If we would like to update a certain key, user `user.set` method.

> This method accepts `dot.notation.syntax` to set values.

```ts
// some-other-place.ts
import user from 'src/user';

user.set('address.country', 'Egypt'); // a new nested object called `address` will be added to user data. 
```

## Refresh access token

A simpler method to update only the access token value.

```ts
// some-other-place.ts
import user from 'src/user';

user.refreshToken('eysadfgbhtrtrewdasfghty5432qwsdfegrt5yt54322wqasdfgrt5453423w1qasdfg');
```

## List all user data

To get the entire user data, alongside with access token, user `user.all`

```ts
// some-other-place.ts
import user from 'src/user';

console.log(
    user.all()
); // {id: 1, ...}
```

## User Interface

Here is the entire user interface that is implemented in the Base User class.

```ts

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
```

## User Events

If you'd like to track the updates that occur on the user class, we can inject user events list to the User class.

```ts
// src/user/index.ts
import cache from '@mongez/cache';
import { EventSubscription } from '@mongez/events';

import { UserEvents, UserEventsListener, User as BaseUser, UserInterface, UserCacheDriverInterface } from '@mongez/user';

class User extends BaseUser implements UserInterface {
  /**
   * Cache driver
   */
  protected cacheDriver: UserCacheDriverInterface = cache;
  /**
   * Enable events
   *
   * @default false
   */
  protected enableEvents: boolean = true;

  /**
   * Event base name
   * If not set and events are enabled, cache key will be used instead
   */
  protected eventsBaseName: string = 'user';
}

const user: User = new User;

// you can define any type of events listeners such onLogin
user.events.onLogin((userData: any, user: UserInterface) => {
});

export default user;
```

Available events types

```ts
import { EventSubscription } from "@mongez/events";

type WithDataCallback = (data: any, user: UserInterface) => void;

type UserEvents = {
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
```

## TODO

- Add unit tests.
- Enhance permissions integration.
