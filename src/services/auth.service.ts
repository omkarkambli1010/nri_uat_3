// Auth Service — equivalent to Angular AuthService + AuthGuard
// Checks session token for route protection

import secureSessionService from "./secure-session.service";

// 'AccT' is the live NRI session token — issued by VerifyNriOtp on
// /mobile-home-otp and sent as the Authorization bearer by api.service.
// 'token' is the legacy key the SSO / aggregator-callback components store.
// Accepting either lets one guard cover both journeys.
const TOKEN_KEYS = ["AccT", "token"] as const;

export class AuthService {
  static isLoggedIn(): boolean {
    if (typeof window === "undefined") return false;
    return TOKEN_KEYS.some((key) => !!secureSessionService.getItem(key));
  }
}

export const authService = new AuthService();
export default authService;
