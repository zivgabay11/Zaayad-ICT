import { useEffect, useRef, useState } from 'react';

// Tracks the width / height ratio of an element (kept up to date as the window is resized), so
// the dashboard's tile layout can be chosen for the screen shape it is actually shown on.
export function useBoxAspect(fallback = 1.9) {
    const ref = useRef<HTMLDivElement>(null);
    const [aspect, setAspect] = useState(fallback);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const measure = () => {
            if (el.clientWidth > 0 && el.clientHeight > 0) setAspect(el.clientWidth / el.clientHeight);
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return { ref, aspect };
}
