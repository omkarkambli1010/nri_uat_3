"use client";

import { useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import secureSessionService from "@/services/secure-session.service";

const BODY_CLASS = "hide-reject-flow-back-buttons";
const REJECT_STATUS_EVENT = "reject-status-changed";

export default function GlobalBackButtonController() {
  const pathname = usePathname();

  const updateBackButtonVisibility = useCallback(() => {
    const rejectStatus = secureSessionService.getItem("RejectStatus");
    const isFaqPage = pathname.toLowerCase().includes("/faq");
    
    const shouldHideBackButtons = rejectStatus === "R" && !isFaqPage;

    document.body.classList.toggle(BODY_CLASS, shouldHideBackButtons);
  }, []);

  useEffect(() => {
    updateBackButtonVisibility();

    // Handles explicit updates made in the current browser tab.
    window.addEventListener(REJECT_STATUS_EVENT, updateBackButtonVisibility);

    // Can handle relevant storage changes where supported.
    window.addEventListener("storage", updateBackButtonVisibility);

    return () => {
      window.removeEventListener(
        REJECT_STATUS_EVENT,
        updateBackButtonVisibility,
      );

      window.removeEventListener("storage", updateBackButtonVisibility);
    };
  }, [pathname, updateBackButtonVisibility]);

  return null;
}
