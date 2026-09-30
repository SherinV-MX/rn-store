/* Copy for the Race Navigator pages, in both languages.

   Kept here rather than in src/dictionaries because these two pages carry far more prose than
   the store does, and mixing a hundred marketing strings into the store's dictionary would
   make both harder to read. Same idea, different file: nothing below is hard-coded in a
   component, so a translator never has to open JSX.

   Product names, specifications and the box contents are taken from race-navigator.de. */

export type Locale = 'en' | 'de';

const pick = <T,>(locale: string, en: T, de: T): T => (locale === 'de' ? de : en);

export interface NavItem { label: string; href: string }
/* `quote` marks the brand-ambassador slide. Its artwork is not a photograph the type sits on
   top of — the left half is a cut-out portrait with the driver's name set into it, and the
   right half is left black for the quote. So that slide gets its own arrangement rather than
   the centred caption the other five use. */
export interface Slide {
    eyebrow: string;
    title: string;
    subtitle: string;
    cta: string;
    href: string;
    image: string;
    variant?: 'quote';
}
export interface ProductCard { name: string; tagline: string; href: string; badge?: string; image?: string }
export interface Category { id: string; label: string; icon: string; products: ProductCard[] }

export function rnNav(locale: string) {
    return {
        products: pick(locale, 'RN Products', 'RN Produkte'),
        support: pick(locale, 'RN Support', 'RN Support'),
        partners: pick(locale, 'Partners', 'Partner'),
        contact: pick(locale, 'Contact us', 'Kontakt'),
        store: pick(locale, 'Store', 'Shop'),
        cart: pick(locale, 'Cart', 'Warenkorb'),
        menu: pick(locale, 'Menu', 'Menü'),
        close: pick(locale, 'Close', 'Schließen'),
        switchTo: pick(locale, 'Auf Deutsch ansehen', 'View in English'),
        skip: pick(locale, 'Skip to content', 'Zum Inhalt springen'),
    };
}

/* The five hero slides, in the order the live carousel runs them. */
export function rnSlides(locale: string): Slide[] {
    const cta = pick(locale, 'Learn more', 'Mehr erfahren');
    const en: Slide[] = [
        { eyebrow: 'RN Analyzer', title: 'Intuitive data analysis', subtitle: 'Professional lap evaluation', cta, href: '#software', image: '/rn/hero/analyzer.jpg' },
        { eyebrow: 'RN One', title: 'The way of driving faster', subtitle: 'The all-in-one tool for trackday drivers', cta, href: 'rn-one', image: '/rn/hero/one.jpg' },
        { eyebrow: 'RN Pro', title: 'By pros, for pros', subtitle: 'Modular systems for professional motorsport', cta, href: '#systems', image: '/rn/hero/pro.jpg' },
        { eyebrow: 'RN Telemetry', title: 'Real time telemetry data', subtitle: 'Car data straight from the track to your laptop', cta, href: '#live', image: '/rn/hero/telemetry.jpg' },
        { eyebrow: 'RN TPMS', title: 'Tire pressure control', subtitle: 'Display and record tire pressure with TPMS', cta, href: '#data', image: '/rn/hero/tpms.jpg' },
        {
            eyebrow: 'Brand ambassador',
            title: 'Intuitive handling and attention to detail. Race Navigator sets the benchmark.',
            /* The name and role are set into the artwork itself, so repeating them here would
               print them twice on the slide. */
            subtitle: '',
            cta: 'View brand ambassadors',
            href: '#partners',
            image: '/rn/menzel.jpg',
            variant: 'quote',
        },
    ];
    const de: Slide[] = [
        { eyebrow: 'RN Analyzer', title: 'Datenanalyse leicht gemacht', subtitle: 'Professionelle Rundenauswertung auf PC und iPad', cta, href: '#software', image: '/rn/hero/analyzer.jpg' },
        { eyebrow: 'RN One', title: 'The way of driving faster', subtitle: 'Das All-in-One-Tool für Trackdayfahrer', cta, href: 'rn-one', image: '/rn/hero/one.jpg' },
        { eyebrow: 'RN Pro', title: 'Von Profis für Profis', subtitle: 'Modulare Systeme für den Motorsport-Einsatz', cta, href: '#systems', image: '/rn/hero/pro.jpg' },
        { eyebrow: 'RN Telemetry', title: 'Telemetrie-Daten in Echtzeit', subtitle: 'Fahrzeugdaten von der Strecke direkt auf den Laptop', cta, href: '#live', image: '/rn/hero/telemetry.jpg' },
        { eyebrow: 'RN TPMS', title: 'Reifendruck-Kontrolle', subtitle: 'Reifendruck anzeigen und aufzeichnen mit TPMS', cta, href: '#data', image: '/rn/hero/tpms.jpg' },
        {
            eyebrow: 'Markenbotschafter',
            title: 'Intuitive Bedienung und Liebe zum Detail. Race Navigator setzt den Maßstab.',
            subtitle: '',
            cta: 'Markenbotschafter ansehen',
            href: '#partners',
            image: '/rn/menzel.jpg',
            variant: 'quote',
        },
    ];
    return pick(locale, en, de);
}

export function rnCategories(locale: string): Category[] {
    const en: Category[] = [
        {
            id: 'systems', label: 'RN Systems', icon: '/rn/tabs/systems.jpg',
            products: [
                { name: 'RN PRO', tagline: 'Autonomous, modular & flexible', href: '#', badge: 'Modular', image: '/rn/cards/rn-pro.jpg' },
                { name: 'RN ONE', tagline: 'The all-in-one system', href: 'rn-one', badge: 'Most popular', image: '/rn/cards/rn-one.jpg' },
                { name: 'RN LITE', tagline: 'The compact Race Navigator', href: '#', image: '/rn/cards/rn-lite.jpg' },
            ],
        },
        {
            id: 'data', label: 'RN Data & TPMS', icon: '/rn/tabs/data.png',
            products: [
                { name: 'RN OBD PLUG', tagline: 'Read vehicle data over OBD-II', href: '#', image: '/rn/cards/obd-plug.jpg' },
                { name: 'RN CAN CABLE', tagline: 'Additional vehicle data over CAN bus', href: '#', image: '/rn/cards/can-cable.jpg' },
                { name: 'RN TPMS', tagline: 'Display and record tire pressure', href: '#', image: '/rn/cards/tpms.jpg' },
            ],
        },
        {
            id: 'live', label: 'RN Live & EMS', icon: '/rn/tabs/live.png',
            products: [
                { name: 'RN TELEMETRY', tagline: 'Receive vehicle data live', href: '#', image: '/rn/cards/telemetry.jpg' },
                { name: 'RN LIVE', tagline: 'Video streaming from the cockpit', href: '#', image: '/rn/cards/live.jpg' },
                { name: 'RN EMS', tagline: 'Automatic management of driving events', href: '#', image: '/rn/cards/ems.jpg' },
            ],
        },
        {
            id: 'software', label: 'Software & Apps', icon: '/rn/tabs/software.png',
            products: [
                { name: 'RN ANALYZER', tagline: 'Professional, intuitive lap evaluation', href: '#', image: '/rn/cards/analyzer.jpg' },
                { name: 'RN CONNECT', tagline: 'Control the Race Navigator from iPhone and iPad', href: '#', image: '/rn/cards/connect.jpg' },
                { name: 'RN TELEMETRY SOFTWARE', tagline: 'With team and spectator modes', href: '#', image: '/rn/cards/telemetry-software.jpg' },
            ],
        },
    ];
    const de: Category[] = [
        {
            id: 'systems', label: 'RN Systeme', icon: '/rn/tabs/systems.jpg',
            products: [
                { name: 'RN PRO', tagline: 'Autonom, modular & flexibel', href: '#', badge: 'Modular', image: '/rn/cards/rn-pro.jpg' },
                { name: 'RN ONE', tagline: 'Das All-in-One-System', href: 'rn-one', badge: 'Beliebt', image: '/rn/cards/rn-one.jpg' },
                { name: 'RN LITE', tagline: 'Der kompakteste Race Navigator', href: '#', image: '/rn/cards/rn-lite.jpg' },
            ],
        },
        {
            id: 'data', label: 'RN Data & TPMS', icon: '/rn/tabs/data.png',
            products: [
                { name: 'RN OBD PLUG', tagline: 'Fahrzeugdaten über OBD-II auslesen', href: '#', image: '/rn/cards/obd-plug.jpg' },
                { name: 'RN CAN-KABEL', tagline: 'Zusätzliche Fahrzeugdaten über CAN-Bus', href: '#' },
                { name: 'RN TPMS', tagline: 'Reifendruck anzeigen und aufzeichnen', href: '#', image: '/rn/cards/tpms.jpg' },
            ],
        },
        {
            id: 'live', label: 'RN Live & EMS', icon: '/rn/tabs/live.png',
            products: [
                { name: 'RN TELEMETRY', tagline: 'Fahrzeugdaten live empfangen', href: '#', image: '/rn/cards/telemetry.jpg' },
                { name: 'RN LIVE', tagline: 'Videostreaming aus dem Cockpit', href: '#', image: '/rn/cards/live.jpg' },
                { name: 'RN EMS', tagline: 'Automatische Verwaltung von Driving Events', href: '#', image: '/rn/cards/ems.jpg' },
            ],
        },
        {
            id: 'software', label: 'Software & Apps', icon: '/rn/tabs/software.png',
            products: [
                { name: 'RN ANALYZER', tagline: 'Professionelle und intuitive Rundenauswertung', href: '#', image: '/rn/cards/analyzer.jpg' },
                { name: 'RN CONNECT', tagline: 'Race Navigator via iPhone und iPad steuern', href: '#', image: '/rn/cards/connect.jpg' },
                { name: 'RN TELEMETRY SOFTWARE', tagline: 'Mit Team- und Zuschauermodus', href: '#', image: '/rn/cards/telemetry-software.jpg' },
            ],
        },
    ];
    return pick(locale, en, de);
}

/* The partner rail. Logos are the client's own files, served from /public rather than hotlinked
   off their WordPress install. Width and height are the real pixel dimensions so nothing
   reflows while they load. */
export interface TrackRegion { name: string; src: string; href: string }

/* The four regions RN break their track list into, each a darkened circuit photograph. The
   names are theirs. */
export const RN_TRACKS: TrackRegion[] = [
    { name: 'Europe', src: '/rn/tracks/europe.jpg', href: '#' },
    { name: 'Middle East & Asia', src: '/rn/tracks/asia.jpg', href: '#' },
    { name: 'North- & South America', src: '/rn/tracks/americas.jpg', href: '#' },
    { name: 'Australia & Oceania', src: '/rn/tracks/oceania.jpg', href: '#' },
];

export interface Partner { name: string; src: string; w: number; h: number }

export const RN_PARTNERS: Partner[] = [
    { name: 'BMW M', src: '/rn/partners/bmw-m.jpg', w: 180, h: 65 },
    { name: 'Porsche', src: '/rn/partners/porsche.jpg', w: 180, h: 93 },
    { name: 'AMG', src: '/rn/partners/amg.jpg', w: 180, h: 101 },
    { name: 'Schnitzer Motorsport', src: '/rn/partners/schnitzer.jpg', w: 180, h: 21 },
    { name: 'GRIP', src: '/rn/partners/grip.jpg', w: 180, h: 180 },
    { name: 'Fast Lap', src: '/rn/partners/fast-lap.jpg', w: 180, h: 38 },
    { name: 'JP Performance', src: '/rn/partners/jp-performance.jpg', w: 180, h: 39 },
    { name: 'Maserati', src: '/rn/partners/maserati.png', w: 400, h: 183 },
    { name: 'GetSpeed', src: '/rn/partners/getspeed.png', w: 400, h: 60 },
    { name: 'Black Falcon', src: '/rn/partners/black-falcon.png', w: 400, h: 71 },
    { name: 'Atomic', src: '/rn/partners/atomic.png', w: 400, h: 59 },
];

export function rnHome(locale: string) {
    return pick(locale, {
        productsHead: 'RN Products',
        quote: 'Intuitive handling and attention to detail. Race Navigator sets the benchmark.',
        quoteName: 'Christian Menzel',
        quoteRole: 'Racing driver · Brand ambassador',
        ctaHead: 'Everything packed,\nlet’s go to the track.',
        ctaButton: 'Show now',
        nightHead: 'Full vision -\nalso at night!',
        nightButton: 'Shop now',
        tracksHead: 'Support on over 160 tracks',
        tracksBody: 'The Race Navigator systems support over 160 race tracks worldwide, including 270 track variants. The list of supported tracks is continuously updated. For the best track experience, wherever you drive.',
        newsHead: 'News.',
    }, {
        productsHead: 'RN Produkte',
        quote: 'Intuitive Bedienung und Liebe zum Detail. Race Navigator — das Gerät, das es zu schlagen gilt.',
        quoteName: 'Christian Menzel',
        quoteRole: 'Rennfahrer · Markenbotschafter',
        ctaHead: 'Alles gepackt,\nab auf die Strecke.',
        ctaButton: 'Jetzt ansehen',
        /* The live German page runs this heading in English too. */
        nightHead: 'Full vision -\nalso at night!',
        nightButton: 'Jetzt kaufen',
        tracksHead: 'Unterstützung auf über 160 Strecken',
        tracksBody: 'Die Race Navigator Systeme unterstützen über 160 Rennstrecken weltweit, inklusive 270 Streckenvarianten. Die Liste der unterstützten Strecken wird laufend erweitert. Für das beste Streckenerlebnis, wo immer Sie fahren.',
        newsHead: 'News.',
    });
}

export function rnFooter(locale: string) {
    return pick(locale, {
        tagline: 'The way of driving faster.',
        newsletterHead: 'NEWSLETTER-SIGN UP',
        groups: [
            { head: 'Products', links: ['RN LITE', 'RN ONE', 'RN PRO', 'RN Modes', 'Software & Apps', 'RN Data', 'RN Live', 'RN EMS'] },
            { head: 'Support', links: ['FAQ', 'Track list', 'Manuals', 'Device updates', 'Mode activation', 'Video layouts'] },
            { head: 'Partners', links: ['Distribution partners', 'Brand ambassadors', 'References'] },
            { head: 'Legal', links: ['Imprint', 'Privacy policy', 'Terms and conditions'] },
        ],
        rights: 'RN Vision GmbH.',
    }, {
        tagline: 'The way of driving faster.',
        newsletterHead: 'NEWSLETTER-ANMELDUNG',
        groups: [
            { head: 'Produkte', links: ['RN LITE', 'RN ONE', 'RN PRO', 'RN Modes', 'Software & Apps', 'RN Data', 'RN Live', 'RN EMS'] },
            { head: 'Support', links: ['FAQ', 'Streckenliste', 'Anleitungen', 'Geräte-Updates', 'MODE-Aktivierung', 'Video-Layouts'] },
            { head: 'Partner', links: ['Vertriebspartner', 'Markenbotschafter', 'Referenzen'] },
            { head: 'Rechtliches', links: ['Impressum', 'Datenschutzerklärung', 'AGB'] },
        ],
        rights: 'RN Vision GmbH.',
    });
}

/* ------------------------------------------------------------------ RN ONE */

/* A comparison cell that is a yes only with an optional module, plug or cable. RN's own table
   shows these as a plain tick, which reads as "included"; their spec further up the same page
   says otherwise. Marking them is the one place this table says more than theirs does. */
export const OPTIONAL = 'optional';

export function rnOne(locale: string) {
    return pick(locale, {
        eyebrow: 'RN Systems',
        name: 'RN ONE',
        tagline: 'The all-in-one tool',
        intro: 'A compact video and analysis system that sticks to the windscreen in seconds. Two built-in HD cameras record cockpit and track at once, the 5-inch touchscreen works in gloves, and the lap time, reference time and gain or loss sit in front of you while you drive.',
        buy: 'Order now',
        support: 'To support area',
        gallery: [
            { src: '/rn/product/rn-one-01.png', alt: 'RN ONE on its windscreen mount, screen showing a lap' },
            { src: '/rn/product/rn-one-02.png', alt: 'RN ONE from the front on its mount' },
            { src: '/rn/product/rn-one-03.png', alt: 'RN ONE from the side showing the cameras' },
        ],
        /* RN's own three lines from the product page, word for word. */
        highlights: [
            'Better lap times with professional data recording',
            'The all-in-one tool for the race track',
            'Dual HD-camera system (track and driver)',
        ],
        systemHead: 'The all-in-one video and analysis system.',
        systemBody: 'The RN ONE is the compact all-rounder among the RN systems. The unit can be mounted on the windscreen in a few easy steps. After mounting, the RN ONE is immediately ready for use. It can be controlled via the large touch screen monitor. Two integrated cameras for track and interior recordings record picture-in-picture videos in HD. A third camera (either HD or Full-HD) can be optionally connected and flexibly installed in the vehicle. Its many features, simple handling and compact design make the RN ONE the ideal system for ambitious trackday enthusiasts and professional racers.',
        functionsHead: 'Functions',
        /* RN's own list. Their markup leaks a stray `</li>` into the USB line; written out properly here. */
        functions: [
            'Display of lap time, reference time, time gain/loss during the drive',
            'Two integrated cameras for cockpit and track',
            'Optional connection of third camera (HD or Full-HD)',
            'Manual or automatic start/stop of recording',
            'Picture-in-picture video with up to three camera views and data overlay',
            'RN Analyzer App for iPad and Windows PCs',
            'Wireless (WiFi) data and video transfer to iPad or PC',
            'Export of videos and data to USB stick',
            'Automatic recognition of race tracks via GPS',
            'Additional vehicle data optionally via OBD2 or CAN bus',
        ],
        shopNow: 'Shop now',
        /* The four spec tabs, straight off the live product page. Every pane is two columns
           except Settings, which fills only the first — as it does there. */
        specTabs: [
            {
                label: 'Technical data',
                cols: [
                    {
                        head: 'General technical data',
                        items: [
                            'Compact lightweight aluminum housing',
                            'Dimensions: 165 x 147 x 113 mm',
                            'Weight (main unit): 884 g',
                            'Two integrated cameras for track and cockpit recordings (HD)',
                            'Connections: Optional camera, USB3, USB2, HDMI output, GPS, microphone, speakers',
                            'Storage capacity: 64 GB',
                            'High dynamic microphone',
                            'Internal battery as buffer (up to 1 hour)',
                            'WiFi access point for data exchange with iPad/Smartphone/Windows PC and Internet access (e.g. for updates)',
                            'Bluetooth for connecting the OBD2 connector with the RN OBD PLUG',
                            'Integrated 5 inch color display with touch screen (also suitable for racing gloves)',
                        ],
                    },
                    {
                        head: 'Sensors',
                        items: [
                            'GPS/Glonass – position and speed (10Hz)',
                            'Acceleration sensor (20Hz, roll/yaw/pitch)',
                            'OBD2 connection via optional OBD2 plug or cable adapter',
                            'CAN-Bus-Connection via optional CAN cable and adapter',
                        ],
                    },
                ],
            },
            {
                label: 'Settings',
                cols: [
                    {
                        head: '',
                        items: [
                            'Settings and control directly via optional display / WiFi Dashboard or via RN Connect App (for mobile iOS devices)',
                            'Automatic start/stop function: depending on speed or rpm, or standing start',
                            'Manual recording possible',
                            'Creation of driver profiles (with portrait photo) and vehicle profiles',
                            'Management of multiple events',
                            'Manual or automatic adjustment of the draw frame',
                            'Selection of the logo for insertion in the composite videos.',
                            'Date, time, time zone, video quality, microphone level, speaker level',
                            'Software updates via Internet',
                        ],
                    },
                ],
            },
            {
                label: 'Scope of delivery',
                cols: [
                    {
                        head: 'Trackday Version',
                        items: [
                            'RN ONE Main Unit (64 GB) with two integrated HD-Cameras',
                            'Trackday Mode',
                            'Suction cup mount for windshield',
                            'Car charger cable 12V',
                            'RN charger/adapter 230V/14V',
                            'External GPS-antenna',
                            'Manual (PDF-Download)',
                            'RN Analyzer App / Software (as Download in the Apple Store and from our website)',
                        ],
                    },
                    {
                        head: 'Racing Version',
                        items: [
                            'RN ONE Main Unit (64 GB) with two integrated HD-Cameras',
                            'Trackday Mode',
                            'Suction cup mount for windshield',
                            'RN ONE MKII motorsports mount',
                            'Car charger cable 12V',
                            'RN charger/adapter 230V/14V',
                            'External GPS-antenna',
                            'Manual (PDF-Download)',
                            'RN Analyzer App / Software (as Download in the Apple Store and from our website)',
                        ],
                    },
                ],
            },
            {
                label: 'Optional extras',
                cols: [
                    {
                        head: 'Accessories:',
                        items: [
                            'RN Cameras: available in Full-HD, HD und SD-resolution, Night vision camera',
                            'Motorsport mount (included in racing version)',
                            'RN LIVE – livestream module for streaming videos via LTE.',
                            'RN Telemetry – Telemetry module for streaming car data via LTE.',
                            'RN Case – sturdy plastic case with tailor-made inlets for main unit, cameras, accessories.',
                        ],
                    },
                    {
                        head: 'Software Extensions',
                        items: [
                            'Endurance/Taxi-Mode',
                            'RCN Mode',
                            'Rallye Mode',
                            'Street Mode',
                            'Touristenfahrten Mode',
                            'Pit Lane Monitor',
                            'Rear View Mirror',
                        ],
                    },
                ],
            },
        ],
        /* The photographs under the tabs: two stacked on the left, one tall beside them, and
           one across the full width underneath. */
        mood: [
            { src: '/rn/mood/mood-01.jpg', alt: 'RN ONE mounted behind the windscreen of a race car' },
            { src: '/rn/mood/mood-02.jpg', alt: 'The unit held in one hand, showing its size' },
            { src: '/rn/mood/mood-03.jpg', alt: 'RN ONE recording from the cockpit on track' },
            { src: '/rn/mood/mood-04.jpg', alt: 'The system set up in the car before a session' },
        ],
        compareHead: 'Race Navigator model comparison',
        compareLabel: 'Model Comparison',
        compareNote: 'Available with an optional module, plug or cable.',
        compareLogo: '/rn/compare/logo.jpg',
        compareModels: [
            { name: 'RN LITE', image: '/rn/compare/rn-lite.jpg' },
            { name: 'RN ONE MKII', image: '/rn/compare/rn-one.jpg' },
            { name: 'RN PRO', image: '/rn/compare/rn-pro.jpg' },
        ],
        /* The row labels are in English on the German page too. That is RN's own table, left
           as they have it rather than quietly improved. */
        compareRows: [
            { label: 'Memory', values: ['64 GB', '64 GB', '128GB or 256GB'] },
            { label: 'HD resolution', values: [true, true, true] },
            { label: 'Full HD resolution', values: [false, true, true] },
            { label: 'Video Overlay', values: [false, true, true] },
            { label: 'WiFi connection', values: [true, true, true] },
            { label: 'Bluetooth connectivity', values: [true, true, true] },
            { label: 'OBD connectivity', values: [OPTIONAL, OPTIONAL, OPTIONAL] },
            { label: 'CAN-Bus connectivity', values: [false, OPTIONAL, OPTIONAL] },
            { label: 'RN Connect (iOS)', values: [false, true, true] },
            { label: 'RN Analyzer (iOS)', values: [true, true, true] },
            { label: 'RN Analyzer (Windows)', values: [true, true, true] },
            { label: 'Telemetry connectivity', values: [false, OPTIONAL, OPTIONAL] },
            { label: 'Livestream connectivity', values: [false, false, OPTIONAL] },
            { label: 'TPMS connectivity', values: [false, true, true] },
        ],
    }, {
        eyebrow: 'RN Systeme',
        name: 'RN ONE',
        tagline: 'Das All-in-One-Tool',
        intro: 'Ein kompaktes Video- und Analysesystem, das in Sekunden an der Scheibe sitzt. Zwei eingebaute HD-Kameras nehmen Cockpit und Strecke gleichzeitig auf, der 5-Zoll-Touchscreen lässt sich mit Handschuhen bedienen, und Rundenzeit, Referenzzeit sowie Gewinn oder Verlust stehen während der Fahrt vor Ihnen.',
        buy: 'Jetzt bestellen',
        support: 'Zum Support Bereich',
        gallery: [
            { src: '/rn/product/rn-one-01.png', alt: 'RN ONE an der Scheibenhalterung, Display mit Rundenanzeige' },
            { src: '/rn/product/rn-one-02.png', alt: 'RN ONE von vorn an der Halterung' },
            { src: '/rn/product/rn-one-03.png', alt: 'RN ONE von der Seite mit den Kameras' },
        ],
        highlights: [
            'Bessere Rundenzeiten durch professionelle Datenaufzeichnung',
            'Das All-in-One-Tool für die Rennstrecke',
            'Dual-HD-Kamerasystem (Strecke und Fahrer)',
        ],
        systemHead: 'Das All-in-One Video- und Analysesystem.',
        systemBody: 'Der RN ONE ist der kompakte Allrounder unter den RN Systemen. Das Gerät wird in wenigen Schritten an der Frontscheibe montiert und ist sofort einsatzbereit. Bedient wird es über den großen Touchscreen. Zwei integrierte Kameras nehmen Strecke und Innenraum als Bild-in-Bild-Video in HD auf. Eine dritte Kamera (HD oder Full-HD) lässt sich optional anschließen und frei im Fahrzeug platzieren. Funktionsumfang, einfache Bedienung und kompakte Bauweise machen den RN ONE zum idealen System für ambitionierte Trackdayfahrer und Profis.',
        functionsHead: 'Funktionen',
        functions: [
            'Anzeige von Rundenzeit, Referenzzeit und Zeitgewinn oder -verlust während der Fahrt',
            'Zwei integrierte Kameras für Cockpit und Strecke',
            'Optionaler Anschluss einer dritten Kamera (HD oder Full-HD)',
            'Manueller oder automatischer Start und Stopp der Aufzeichnung',
            'Bild-in-Bild-Video mit bis zu drei Kameraperspektiven und Daten-Overlay',
            'RN Analyzer App für iPad und Windows-PC',
            'Drahtlose (WLAN) Daten- und Videoübertragung auf iPad oder PC',
            'Export von Videos und Daten auf USB-Stick',
            'Automatische Streckenerkennung per GPS',
            'Zusätzliche Fahrzeugdaten optional über OBD2 oder CAN-Bus',
        ],
        shopNow: 'Jetzt kaufen',
        specTabs: [
            {
                label: 'Technische Daten',
                cols: [
                    {
                        head: 'Allgemeine technische Daten',
                        items: [
                            'Kompaktes Alu-Leichtbaugehäuse',
                            'Abmessungen: 165 x 147 x 113 mm',
                            'Gewicht (Haupteinheit): 884 g',
                            'Zwei integrierte Kameras für Strecken- und Cockpitaufnahmen (HD)',
                            'Anschlüsse: Optionale Zusatzkamera, USB3, USB2, HDMI Ausgang, GPS, Mikrofon, Lautsprecher',
                            'Speicherkapazität: 64 GB',
                            'Hochdynamisches Mikrofon',
                            'Interner Akku als Puffer (bis zu 1 Stunde)',
                            'WiFi Access-Point für Datenaustausch mit iPad/Smartphone/Windows-PC und Internetzugang (z.B. für Updates)',
                            'Bluetooth für Anbindung des OBD2 Anschlusses mit dem RN OBD PLUG',
                            'Integriertes 5-Zoll Farbdisplay mit Touchscreen (auch geeignet für Rennhandschuhe)',
                        ],
                    },
                    {
                        head: 'Sensoren',
                        items: [
                            'GPS/Glonass – Position und Geschwindigkeit (10Hz)',
                            'Beschleunigungs-Sensor (20Hz, roll/yaw/pitch)',
                            'OBD2-Anbindung über optionalen OBD2 Plug oder Kabeladapter',
                            'CAN-Bus-Anbindung über optionalem CAN-Kabel und Adapter',
                        ],
                    },
                ],
            },
            {
                label: 'Einstellungen',
                cols: [
                    {
                        head: '',
                        items: [
                            'Einstellungen und Steuerung direkt über Touchscreen-Display oder über RN Connect App (für mobile iOS-Geräte)',
                            'Automatische Start-/Stopp-Funktion: abhängig von Geschwindigkeit oder Drehzahl, oder stehender Start',
                            'Manuelle Aufzeichnung möglich',
                            'Anlegen von Fahrerprofilen (mit Portraitfoto) und Fahrzeugprofilen',
                            'Verwaltung von mehreren Events',
                            'Manuelle oder automatische Einstellung der Strecke',
                            'Auswahl des Logos für die Einblendung in den Composit-Videos',
                            'Datum, Uhrzeit, Zeitzone, Videoqualität, Mikrofon Level, Lautsprecher Level',
                            'Software-Updates via Internet',
                        ],
                    },
                ],
            },
            {
                label: 'Lieferumfang',
                cols: [
                    {
                        head: 'Trackday Version',
                        items: [
                            'RN ONE Haupteinheit (64 GB) mit zwei eingebauten HD-Kameras',
                            'Trackday Mode',
                            'Saugnapf Windschutzscheibe',
                            'KFZ Kabel 12V für Zigarettenanzünder',
                            'RN Ladegerät/Adapter 230V/14V',
                            'Externe GPS-Antenne',
                            'Handbuch (PDF-Download, Deutsch/Englisch)',
                            'RN Analyzer App / Software (als Download im Apple Store und von unserer Webseite)',
                        ],
                    },
                    {
                        head: 'Racing Version',
                        items: [
                            'RN ONE Haupteinheit (64 GB) mit zwei eingebauten HD-Kameras',
                            'Trackday Mode',
                            'Saugnapf Windschutzscheibe',
                            'RN ONE MKII Motorsport Halter',
                            'Externe GPS-Antenne',
                            'KFZ Kabel 12V für Zigarettenanzünder',
                            'RN Ladegerät/Adapter 230V/14V',
                            'Handbuch (PDF-Download, Deutsch/Englisch)',
                            'RN Analyzer App / Software (als Download im Apple Store und von unserer Webseite)',
                        ],
                    },
                ],
            },
            {
                label: 'Optionales Zubehör',
                cols: [
                    {
                        head: 'Zubehör:',
                        items: [
                            'RN Kamera: Verfügbar in Full-HD, HD und SD-Auflösung, Nachtsichtkamera',
                            'Motorsporthalter (enthalten in Racing-Version)',
                            'RN LIVE – Livestream-Modul für die Übertragung von Videos per LTE.',
                            'RN Telemetry – Telemetrie-Modul für die Übertragung von Videos per LTE.',
                            'RN Case – stabiler Kunststoffkoffer mit maßgeschneiderten Einsparungen für Hauptgerät, Kameras und Zubehör.',
                        ],
                    },
                    {
                        head: 'Softwareerweiterungen',
                        items: [
                            'Endurance/Taxi-Mode',
                            'RCN Mode',
                            'Rallye Mode',
                            'Street Mode',
                            'Touristenfahrten Mode',
                            'Pit Lane Monitor',
                            'Rear View Mirror',
                        ],
                    },
                ],
            },
        ],
        mood: [
            { src: '/rn/mood/mood-01.jpg', alt: 'RN ONE hinter der Windschutzscheibe eines Rennwagens' },
            { src: '/rn/mood/mood-02.jpg', alt: 'Das Gerät in einer Hand, das seine Größe zeigt' },
            { src: '/rn/mood/mood-03.jpg', alt: 'RN ONE bei der Aufnahme aus dem Cockpit auf der Strecke' },
            { src: '/rn/mood/mood-04.jpg', alt: 'Das System im Fahrzeug, vor der Session aufgebaut' },
        ],
        compareHead: 'Race Navigator Modellvergleich',
        compareLabel: 'Modellvergleich',
        compareNote: 'Mit einem optionalen Modul, Stecker oder Kabel verfügbar.',
        compareLogo: '/rn/compare/logo.jpg',
        compareModels: [
            { name: 'RN LITE', image: '/rn/compare/rn-lite.jpg' },
            { name: 'RN ONE MKII', image: '/rn/compare/rn-one.jpg' },
            { name: 'RN PRO', image: '/rn/compare/rn-pro.jpg' },
        ],
        compareRows: [
            { label: 'Memory', values: ['64 GB', '64 GB', '128GB or 256GB'] },
            { label: 'HD resolution', values: [true, true, true] },
            { label: 'Full HD resolution', values: [false, true, true] },
            { label: 'Video Overlay', values: [false, true, true] },
            { label: 'WiFi connection', values: [true, true, true] },
            { label: 'Bluetooth connectivity', values: [true, true, true] },
            { label: 'OBD connectivity', values: [OPTIONAL, OPTIONAL, OPTIONAL] },
            { label: 'CAN-Bus connectivity', values: [false, OPTIONAL, OPTIONAL] },
            { label: 'RN Connect (iOS)', values: [false, true, true] },
            { label: 'RN Analyzer (iOS)', values: [true, true, true] },
            { label: 'RN Analyzer (Windows)', values: [true, true, true] },
            { label: 'Telemetry connectivity', values: [false, OPTIONAL, OPTIONAL] },
            { label: 'Livestream connectivity', values: [false, false, OPTIONAL] },
            { label: 'TPMS connectivity', values: [false, true, true] },
        ],
    });
}
