'use client';

import styles from './upload-supporting.module.scss';
import { publicPath } from "@/utils/publicPath";

// Layered SVG illustration for the support-document empty state.
// Figma source: node 0:89258 — "13098899_Upload_file_concept_illustration 1".
// The 5 SVG fragments live in /public/assets/images/diy/upload-supporting/.
// Insets match Figma's exported positions (top right bottom left).

const BASE = publicPath('/assets/images/diy/upload-supporting');

type Layer = { src: string; top: number; right: number; bottom: number; left: number };

const LAYERS: Layer[] = [
  { src: `${BASE}/layer-1.svg`,  top: -0.01, right: -0.01, bottom: 0.01, left: 0.01 },
  { src: `${BASE}/layer-3.svg`,  top: 19.08, right: 19.81, bottom: 8.87, left: 15.64 },
  { src: `${BASE}/layer-2.svg`,  top: 24.02, right: 26.75, bottom: 29.57, left: 21.4 },
  { src: `${BASE}/layer-4a.svg`, top: 24.22, right: 5.7,   bottom: 5.7,  left: 52.64 },
  { src: `${BASE}/layer-4b.svg`, top: 55.02, right: 76.07, bottom: 6.8,  left: 6.14 },
];

export function UploadSupportingIllustration() {
  return (
    <div className={styles.illo} aria-hidden="true">
      {LAYERS.map((layer) => (
        <img
          key={layer.src}
          src={layer.src}
          alt=""
          className={styles.illoLayer}
          style={{
            top: `${layer.top}%`,
            left: `${layer.left}%`,
            width: `${100 - layer.left - layer.right}%`,
            height: `${100 - layer.top - layer.bottom}%`,
          }}
        />
      ))}
    </div>
  );
}
