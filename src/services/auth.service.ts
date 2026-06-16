// Auth Service — equivalent to Angular AuthService + AuthGuard
// Checks session token for route protection

export class AuthService {
  static isLoggedIn(): boolean {
    if (typeof window === 'undefined') return false;
    return !!sessionStorage.getItem('token');
  }
}

export const authService = new AuthService();
export default authService;
