'use client';

import styles from './esign.module.scss';
import { publicPath } from "@/utils/publicPath";

// Layered SVG illustration for the E-Sign screen ("consent/pana").
// Figma source: node 0:23959 (NRE-RI file). The 7 SVG fragments live in
// /public/assets/images/diy/esign/. Each layer's position matches Figma's
// frame (140.0018 x 137.957), expressed as percentages so the composition
// scales as one unit.

const BASE = publicPath('/assets/images/diy/esign');

type Layer = { src: string; top: number; left: number; width: number; height: number };

// Percentages of the 140.0018 x 137.957 Figma frame. Ordered back-to-front.
const LAYERS: Layer[] = [
  { src: `${BASE}/background-complete.svg`, top: 5.458,  left: 0,      width: 99.979, height: 91.286 },
  { src: `${BASE}/background-simple.svg`,   top: 7.017,  left: 5.543,  width: 94.457, height: 76.827 },
  { src: `${BASE}/floor.svg`,               top: 96.487, left: 1.557,  width: 97.018, height: 0.117 },
  { src: `${BASE}/clipboard.svg`,           top: 0,      left: 27.457, width: 56.349, height: 84.762 },
  { src: `${BASE}/plant.svg`,               top: 55.920, left: 75.763, width: 22.375, height: 40.534 },
  { src: `${BASE}/speech-bubble.svg`,       top: 16.563, left: 3.921,  width: 10.683, height: 10.839 },
  { src: `${BASE}/character.svg`,           top: 14.555, left: 9.278,  width: 26.348, height: 85.441 },
];

export function EsignIllustration() {
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
            width: `${layer.width}%`,
            height: `${layer.height}%`,
          }}
        />
      ))}
    </div>
  );
}
