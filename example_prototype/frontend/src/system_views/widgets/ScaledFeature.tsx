import React, { useEffect, useRef, useState } from 'react';
import { DASHBOARD_DESIGN_HEIGHT, DASHBOARD_DESIGN_WIDTH, DASHBOARD_MAX_ZOOM, DASHBOARD_MIN_ZOOM } from '../utilities/dashboardFeatures';

// Renders a feature at "page resolution" inside a widget and scales it to the widget's real
// size: the feature is laid out as a page of at least DASHBOARD_DESIGN_WIDTH × DASHBOARD_DESIGN_HEIGHT
// CSS pixels (extra room goes along the widget's longer side), then zoomed to fit. Stretch a widget and the
// feature gets bigger, shrink it and it gets smaller — it always fills the widget exactly, so
// the dashboard never needs a scrollbar of its own.
//
// CSS `zoom` (not transform) is used on purpose: a transformed ancestor would trap the
// features' `position: fixed` dialogs inside the widget. The dialogs still sit at viewport level
// here, and index.css (.dash-scaled .fixed) cancels the zoom for them so they keep a normal size.

export const ScaledFeature: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const boxRef = useRef<HTMLDivElement>(null);
    const [box, setBox] = useState({ w: 0, h: 0 });

    useEffect(() => {
        const el = boxRef.current;
        if (!el) return;
        const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const fit = Math.min(box.w / DASHBOARD_DESIGN_WIDTH, box.h / DASHBOARD_DESIGN_HEIGHT);
    const zoom = box.w > 0 && box.h > 0 ? Math.min(DASHBOARD_MAX_ZOOM, Math.max(DASHBOARD_MIN_ZOOM, fit)) : 1;

    return (
        <div ref={boxRef} className="relative w-full h-full overflow-hidden">
            {box.w > 0 && (
                <div
                    className="dash-scaled"
                    style={{ zoom, width: box.w / zoom, height: box.h / zoom, ['--dash-inv-zoom' as string]: 1 / zoom }}
                >
                    {children}
                </div>
            )}
        </div>
    );
};
