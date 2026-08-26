/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const TOKEN_KEY = 'wesee_jwt_token';

export const tokenStore = {
  get(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  set(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
  },
};
