/**
 * The Bauhaus tile motif from the app's splash screen
 * (assets/images/splash-pattern.png), rebuilt as an SVG so it can be recoloured
 * per theme and cropped to any aspect instead of stretching a bitmap.
 *
 * A grid is written as rows of space-separated two-character cells: shape then
 * colour.
 *   shapes  o full circle · q/w/e/r quarter disc centred on the
 *           top-left / top-right / bottom-right / bottom-left corner · . empty
 *   colours c coral · a amber · m mint · n navy · r cream
 * `r` is both a shape and a colour; position disambiguates it, so `rr` is a
 * bottom-left quarter in cream. Hand-authored rather than generated: the
 * arrangement is a composition, and a random one reads as noise.
 */

const COLORS: Record<string, string> = {
    c: 'var(--color-brand-coral)',
    a: 'var(--color-brand-amber)',
    m: 'var(--color-brand-mint)',
    n: 'var(--color-brand-navy)',
    r: 'var(--color-brand-cream)',
};

/** Quarter disc of radius = one cell, centred on the named corner. */
const QUARTERS: Record<string, (s: number) => string> = {
    q: (s) => `M0,0 L${s},0 A${s},${s} 0 0 1 0,${s} Z`,
    w: (s) => `M${s},0 L0,0 A${s},${s} 0 0 0 ${s},${s} Z`,
    e: (s) => `M${s},${s} L${s},0 A${s},${s} 0 0 0 0,${s} Z`,
    r: (s) => `M0,${s} L0,0 A${s},${s} 0 0 1 ${s},${s} Z`,
};

export const HERO_PATTERN = [
    'qc oa rr wm',
    'or em wa rr',
    'rn or qa en',
    'om wn rr oc',
];

export const CTA_PATTERN = [
    'oa qn er rm',
    'em rr oc wa',
    'wn or wa qn',
];

interface PatternProps {
    /** Rows of space-separated two-character cells. */
    rows?: string[];
    /** Cell edge in px. The SVG scales to its box; this only sets the ratio. */
    cell?: number;
    className?: string;
}

export function Pattern({ rows = HERO_PATTERN, cell = 100, className }: PatternProps) {
    const grid = rows.map((row) => row.trim().split(/\s+/));
    const columns = Math.max(...grid.map((row) => row.length));

    return (
        <svg
            aria-hidden
            className={className}
            viewBox={`0 0 ${columns * cell} ${grid.length * cell}`}
            preserveAspectRatio="xMidYMid slice"
        >
            {grid.flatMap((row, y) =>
                row.map((token, x) => {
                    const [shape, tone] = token;
                    const fill = COLORS[tone];
                    if (!fill || shape === '.') return null;

                    const key = `${x}-${y}`;
                    const offset = `translate(${x * cell} ${y * cell})`;

                    if (shape === 'o') {
                        return (
                            <circle
                                key={key}
                                cx={x * cell + cell / 2}
                                cy={y * cell + cell / 2}
                                r={cell * 0.4}
                                fill={fill}
                            />
                        );
                    }

                    const path = QUARTERS[shape];
                    if (!path) return null;

                    return <path key={key} d={path(cell)} transform={offset} fill={fill} />;
                }),
            )}
        </svg>
    );
}
