/* Drawn product artwork.

   The live site uses photography we have no licence to copy, so the device and the case are
   drawn here instead. Line art also survives being dropped onto any background, which a cut-out
   photograph does not, and it keeps the repository free of anyone else's assets. */

export function RnDeviceMark({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 120 96" fill="none" aria-hidden="true">
            <rect x="8" y="16" width="104" height="66" rx="7" fill="#1e2128" stroke="rgb(255 255 255 / 0.22)" />
            <rect x="16" y="24" width="72" height="50" rx="3" fill="#07090b" stroke="rgb(255 255 255 / 0.14)" />
            {/* The screen's own lap display: a sector bar and the delta that matters. */}
            <rect x="22" y="30" width="34" height="4" rx="2" fill="#dc0714" />
            <rect x="60" y="30" width="22" height="4" rx="2" fill="rgb(255 255 255 / 0.28)" />
            <rect x="22" y="40" width="46" height="9" rx="2" fill="rgb(255 255 255 / 0.85)" />
            <rect x="22" y="53" width="28" height="5" rx="2" fill="rgb(255 255 255 / 0.32)" />
            <rect x="22" y="62" width="38" height="5" rx="2" fill="rgb(255 255 255 / 0.18)" />
            {/* Two lenses, track and cockpit. */}
            <circle cx="99" cy="38" r="7.5" fill="#0a0c0e" stroke="rgb(255 255 255 / 0.3)" />
            <circle cx="99" cy="38" r="3" fill="#2b3f5c" />
            <circle cx="99" cy="60" r="7.5" fill="#0a0c0e" stroke="rgb(255 255 255 / 0.3)" />
            <circle cx="99" cy="60" r="3" fill="#2b3f5c" />
            {/* Suction mount. */}
            <path d="M60 16V8" stroke="rgb(255 255 255 / 0.3)" strokeWidth="3" strokeLinecap="round" />
            <ellipse cx="60" cy="6" rx="15" ry="4.5" fill="#15181d" stroke="rgb(255 255 255 / 0.22)" />
        </svg>
    );
}

/* The fitted case, open, with the unit and mount seated in the foam. */
export function RnCaseArt({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 420 300" fill="none" aria-hidden="true">
            <defs>
                <linearGradient id="rnFoam" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#1c1f24" />
                    <stop offset="1" stopColor="#0d0f12" />
                </linearGradient>
            </defs>

            {/* Lid, hinged back. */}
            <rect x="26" y="14" width="368" height="72" rx="10" fill="#15181d" stroke="rgb(255 255 255 / 0.16)" />
            <rect x="46" y="30" width="328" height="40" rx="5" fill="#0c0e11" stroke="rgb(255 255 255 / 0.08)" />
            <text x="210" y="56" textAnchor="middle" fill="rgb(255 255 255 / 0.30)"
                  fontFamily="var(--rn-display), sans-serif" fontSize="17" fontWeight="800" letterSpacing="5">
                RACE NAVIGATOR
            </text>

            {/* Base. */}
            <rect x="26" y="92" width="368" height="184" rx="12" fill="url(#rnFoam)" stroke="rgb(255 255 255 / 0.16)" />

            {/* Foam cut-outs. */}
            <rect x="52" y="116" width="188" height="136" rx="8" fill="#08090b" stroke="rgb(255 255 255 / 0.07)" />
            <rect x="260" y="116" width="108" height="62" rx="8" fill="#08090b" stroke="rgb(255 255 255 / 0.07)" />
            <rect x="260" y="190" width="108" height="62" rx="8" fill="#08090b" stroke="rgb(255 255 255 / 0.07)" />

            {/* Unit seated in the large cut-out. */}
            <rect x="68" y="132" width="156" height="104" rx="7" fill="#1e2128" stroke="rgb(255 255 255 / 0.22)" />
            <rect x="80" y="144" width="104" height="80" rx="3" fill="#07090b" />
            <rect x="90" y="154" width="46" height="6" rx="3" fill="#dc0714" />
            <rect x="90" y="168" width="70" height="13" rx="2" fill="rgb(255 255 255 / 0.85)" />
            <rect x="90" y="188" width="40" height="6" rx="3" fill="rgb(255 255 255 / 0.3)" />
            <circle cx="203" cy="163" r="10" fill="#0a0c0e" stroke="rgb(255 255 255 / 0.3)" />
            <circle cx="203" cy="163" r="4" fill="#2b3f5c" />
            <circle cx="203" cy="205" r="10" fill="#0a0c0e" stroke="rgb(255 255 255 / 0.3)" />
            <circle cx="203" cy="205" r="4" fill="#2b3f5c" />

            {/* Mount and coiled cable in the smaller cut-outs. */}
            <ellipse cx="314" cy="147" rx="30" ry="9" fill="#15181d" stroke="rgb(255 255 255 / 0.22)" />
            <path d="M314 147v-16" stroke="rgb(255 255 255 / 0.3)" strokeWidth="4" strokeLinecap="round" />
            <circle cx="314" cy="221" r="22" fill="none" stroke="rgb(255 255 255 / 0.22)" strokeWidth="5" />
            <circle cx="314" cy="221" r="11" fill="none" stroke="rgb(255 255 255 / 0.14)" strokeWidth="4" />

            {/* Latches. */}
            <rect x="120" y="268" width="44" height="16" rx="4" fill="#1a1d22" stroke="rgb(255 255 255 / 0.16)" />
            <rect x="256" y="268" width="44" height="16" rx="4" fill="#1a1d22" stroke="rgb(255 255 255 / 0.16)" />
        </svg>
    );
}
