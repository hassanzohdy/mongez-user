import User from "./user-manager";

let currentUser: User | undefined;

/**
 * Set current User
 *
 * @param {User} user
 */
export function setCurrentUser(user: User) {
  currentUser = user;
}

/**
 * Get current User
 *
 * @returns {User | undefined}
 */
export function getCurrentUser(): User | undefined {
  return currentUser;
}
