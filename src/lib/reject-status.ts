import secureSessionService from "@/services/secure-session.service";

export const REJECT_STATUS_EVENT = "reject-status-changed";

export const setRejectStatus = (value?: string | null): void => {
  if (typeof window === "undefined") return;

  if (value === "R") {
    secureSessionService.setItem("RejectStatus", "R");
  } else {
    secureSessionService.removeItem("RejectStatus");
  }

  window.dispatchEvent(new Event(REJECT_STATUS_EVENT));
};

export const clearRejectStatus = (): void => {
  if (typeof window === "undefined") return;

  secureSessionService.removeItem("RejectStatus");
  window.dispatchEvent(new Event(REJECT_STATUS_EVENT));
};