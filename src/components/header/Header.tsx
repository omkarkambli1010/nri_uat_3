"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useSpinner } from "@/components/spinner/Spinner";
import styles from "./header.module.scss";
import { publicPath } from "@/utils/publicPath";
import secureSessionService from "@/services/secure-session.service";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { show, hide } = useSpinner();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [personalFormNumber, setPersonalFormNumber] = useState("");

  useEffect(() => {
    const sync = () =>
      setPersonalFormNumber(
        secureSessionService.getItem("applicationNumber") ?? ""
      );
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [pathname]);

  const redirectHome = () => {
    show();
    if (pathname === "/page-not-found") {
      localStorage.clear();
      secureSessionService.removeAll();
      setTimeout(() => {
        router.push("/home");
      }, 200);
      hide();
    } else {
      window.location.reload();
    }
  };

  return (
    <nav
      className={`navbar navbar-expand-lg bg-white ${styles.navbar}`}
      aria-label="Main navigation"
    >
      <div className="container">
        <button
          className={`navbar-brand ${styles.navbarBrand}`}
          onClick={redirectHome}
          aria-label="Go to homepage"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <Image
            src={publicPath("/assets/images/sbi-securities-logo.png")}
            alt="SBI Securities Logo"
            width={160}
            height={48}
            priority
            style={{ objectFit: "contain" }}
          />
        </button>
        {personalFormNumber && (
          <p className={styles.formNumber}>
            Ref No. - <span>{personalFormNumber}</span>
          </p>
        )}
      </div>
    </nav>
  );
}
