import User from "./User";

let currentUser: User;

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
 * @returns {User}
 */
export function getCurrentUser(): User {
  return currentUser;
}
