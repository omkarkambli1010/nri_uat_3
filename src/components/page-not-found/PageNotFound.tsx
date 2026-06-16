'use client';

import Image from 'next/image';
import styles from './page-not-found.module.scss';
import { publicPath } from "@/utils/publicPath";

export default function PageNotFound() {
  return (
    <section aria-label="Page Not Found" className={styles.container}>
      <div className="container">
        <div className="row">
          <div className="col-12 d-flex justify-content-center">
            <Image
              src={publicPath("/assets/images/diy/404-page.png")}
              alt="404 Page Not Found"
              width={400}
              height={300}
              priority
              style={{ width: '100%', maxWidth: 400, height: 'auto' }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
