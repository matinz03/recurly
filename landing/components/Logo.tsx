/**
 * The app icon, redrawn in CSS rather than served as assets/icons/logo.png so
 * it stays sharp at every size the page uses it and picks up the same accent
 * token as everything else. Two opposite corners rounded is the brand's shape.
 */
export function Logo({ size = 36 }: { size?: number }) {
    const radius = size * 0.32;

    return (
        <span
            aria-hidden
            className="grid shrink-0 place-items-center bg-accent font-extrabold leading-none text-white"
            style={{
                width: size,
                height: size,
                fontSize: size * 0.6,
                borderTopRightRadius: radius,
                borderBottomLeftRadius: radius,
            }}
        >
            R
        </span>
    );
}

export function Wordmark({ size = 36 }: { size?: number }) {
    return (
        <span className="inline-flex items-center gap-2.5">
            <Logo size={size} />
            <span className="text-xl font-extrabold tracking-tight text-primary">Recurrly</span>
        </span>
    );
}
