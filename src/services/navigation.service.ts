import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

// Navigation Service — equivalent to Angular NavigationService
// Manages allowed route stack for step-by-step onboarding flow

// Routes that must never be visited when the user chose Semi-Digital journey
const SEMI_DIGITAL_SKIP: string[] = [
  '/CaptureSelfie',
  '/uploadSignature',
  '/esign',
];

class NavigationService {
  private allowedRoutes: string[] = [];
  private historyStack: string[] = [];
  private router: AppRouterInstance | null = null;
  private onSpinnerHide?: () => void;

  setRouter(router: AppRouterInstance, onHideSpinner?: () => void) {
    this.router = router;
    this.onSpinnerHide = onHideSpinner;
  }

  private isSemiDigital(): boolean {
    return (
      typeof window !== 'undefined' &&
      sessionStorage.getItem('accountType') === 'semi-digital'
    );
  }

  private shouldSkip(route: string): boolean {
    if (!this.isSemiDigital()) return false;
    return SEMI_DIGITAL_SKIP.some((skip) => route.startsWith(skip));
  }

  navigateToNextStep(): void {
    if (!this.allowedRoutes.length) {
      const storedRoutes = sessionStorage.getItem('allowedRoutes');
      if (storedRoutes) {
        this.allowedRoutes = JSON.parse(storedRoutes);
      } else {
        setTimeout(() => {
          this.router?.push('/');
          this.onSpinnerHide?.();
        }, 100);
        return;
      }
    }

    // Drop any routes that are not applicable to the current journey type
    while (this.allowedRoutes.length > 0 && this.shouldSkip(this.allowedRoutes[0])) {
      this.allowedRoutes.shift();
    }
    sessionStorage.setItem('allowedRoutes', JSON.stringify(this.allowedRoutes));

    if (this.allowedRoutes.length > 0) {
      const nextRoute = this.allowedRoutes.shift()!;
      sessionStorage.setItem('allowedRoutes', JSON.stringify(this.allowedRoutes));

      if (nextRoute) {
        this.historyStack.push(nextRoute);
        setTimeout(() => {
          this.router?.push(nextRoute);
          this.onSpinnerHide?.();
        }, 200);
      }
    }
  }

  navigateToPreviousStep(): void {
    if (this.historyStack.length > 1) {
      this.historyStack.pop();
      const previousRoute = this.historyStack[this.historyStack.length - 1];
      setTimeout(() => {
        this.router?.push(previousRoute);
        this.onSpinnerHide?.();
      }, 200);
    }
  }

  fetchRejectedRoutes(rejectedRoutes: string[], location: string): void {
    this.allowedRoutes = rejectedRoutes;
    sessionStorage.setItem('allowedRoutes', JSON.stringify(this.allowedRoutes));

    if (location !== 'Aadhar') {
      this.navigateToNextStep();
    }
  }
}

export const navigationService = new NavigationService();
export default navigationService;
