// Auth Service — equivalent to Angular AuthService + AuthGuard
// Checks session token for route protection

import secureSessionService from "./secure-session.service";

export class AuthService {
  static isLoggedIn(): boolean {
    if (typeof window === 'undefined') return false;
    return !!secureSessionService.getItem('token');
  }
}

export const authService = new AuthService();
export default authService;
