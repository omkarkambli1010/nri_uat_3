"use client";

import { useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import Splide from "@splidejs/splide";
import "@splidejs/splide/css";

export interface PlanCarouselItem {
    /** Stable key for the slide. */
    id: string;
    /** Rendered card for this slide. */
    content: ReactNode;
}

export interface PlanCarouselProps {
    items: PlanCarouselItem[];
    /** Passed straight through to Splide. */
    options?: Record<string, any>;
    ariaLabel?: string;
}

export default function PlanCarousel({
    items,
    options,
    ariaLabel = "Plan options",
}: PlanCarouselProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const splideRef = useRef<Splide | null>(null);

    // Options are an inline object literal at the call sites, so a new reference
    // arrives on every render. Comparing the serialised form keeps the carousel
    // from being torn down and rebuilt on each parent update.
    const optionsKey = useMemo(() => JSON.stringify(options ?? {}), [options]);
    const itemsKey = useMemo(() => items.map((item) => item.id).join("|"), [items]);

    useEffect(() => {
        if (!rootRef.current) return;

        const instance = new Splide(rootRef.current, JSON.parse(optionsKey));
        instance.mount();
        splideRef.current = instance;

        return () => {
            instance.destroy();
            splideRef.current = null;
        };
        // Rebuilt only when the options or the set of slides actually change.
    }, [optionsKey, itemsKey]);

    return (
        <div className="splide" ref={rootRef} aria-label={ariaLabel}>
            <div className="splide__track">
                <ul className="splide__list">
                    {items.map((item) => (
                        <li className="splide__slide" key={item.id}>
                            {item.content}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
