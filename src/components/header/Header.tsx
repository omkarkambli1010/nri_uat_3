'use client';

import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { useSpinner } from '@/components/spinner/Spinner';
import styles from './header.module.scss';
import { publicPath } from "@/utils/publicPath";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { show, hide } = useSpinner();

  const redirectHome = () => {
    show();
    if (pathname === '/page-not-found') {
      localStorage.clear();
      sessionStorage.clear();
      router.push('/');
      hide();
    } else {
      window.location.reload();
    }
  };

  return (
    <nav className={`navbar navbar-expand-lg bg-white ${styles.navbar}`} aria-label="Main navigation">
      <div className="container">
        <button
          className={`navbar-brand ${styles.navbarBrand}`}
          onClick={redirectHome}
          aria-label="Go to homepage"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <Image
            src={publicPath("/assets/images/sbi-securities-logo.png")}
            alt="SBI Securities Logo"
            width={160}
            height={48}
            priority
            style={{ objectFit: 'contain' }}
          />
        </button>
      </div>
    </nav>
  );
}
