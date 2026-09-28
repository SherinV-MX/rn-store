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
export interface Category { id: string; label: string; icon: string; blurb: string; products: ProductCard[] }

export function rnNav(locale: string) {
    return {
        products: pick(locale, 'RN Products', 'RN Produkte'),
        support: pick(locale, 'RN Support', 'RN Support'),
        partners: pick(locale, 'Partners', 'Partner'),
        contact: pick(locale, 'Contact us', 'Kontakt'),
        store: pick(locale, 'Store', 'Shop'),
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
            blurb: 'The recording and timing units themselves — pick the one that fits the car and the class.',
            products: [
                { name: 'RN PRO', tagline: 'Autonomous, modular & flexible', href: '#', badge: 'Modular', image: '/rn/cards/rn-pro.jpg' },
                { name: 'RN ONE', tagline: 'The all-in-one system', href: 'rn-one', badge: 'Most popular', image: '/rn/cards/rn-one.jpg' },
                { name: 'RN LITE', tagline: 'The compact Race Navigator', href: '#', image: '/rn/cards/rn-lite.jpg' },
            ],
        },
        {
            id: 'data', label: 'RN Data & TPMS', icon: '/rn/tabs/data.png',
            blurb: 'Pull the numbers the car already knows, and the ones it does not.',
            products: [
                { name: 'RN OBD PLUG', tagline: 'Read vehicle data over OBD-II', href: '#', image: '/rn/cards/obd-plug.jpg' },
                { name: 'RN CAN CABLE', tagline: 'Additional vehicle data over CAN bus', href: '#', image: '/rn/cards/can-cable.jpg' },
                { name: 'RN TPMS', tagline: 'Display and record tire pressure', href: '#', image: '/rn/cards/tpms.jpg' },
            ],
        },
        {
            id: 'live', label: 'RN Live & EMS', icon: '/rn/tabs/live.png',
            blurb: 'Get it off the car and in front of the people who need it, while the session runs.',
            products: [
                { name: 'RN TELEMETRY', tagline: 'Receive vehicle data live', href: '#', image: '/rn/cards/telemetry.jpg' },
                { name: 'RN LIVE', tagline: 'Video streaming from the cockpit', href: '#', image: '/rn/cards/live.jpg' },
                { name: 'RN EMS', tagline: 'Automatic management of driving events', href: '#', image: '/rn/cards/ems.jpg' },
            ],
        },
        {
            id: 'software', label: 'Software & Apps', icon: '/rn/tabs/software.png',
            blurb: 'Where the lap gets taken apart afterwards.',
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
            blurb: 'Die Aufzeichnungs- und Zeitnahmegeräte selbst — passend zum Fahrzeug und zur Klasse.',
            products: [
                { name: 'RN PRO', tagline: 'Autonom, modular & flexibel', href: '#', badge: 'Modular', image: '/rn/cards/rn-pro.jpg' },
                { name: 'RN ONE', tagline: 'Das All-in-One-System', href: 'rn-one', badge: 'Beliebt', image: '/rn/cards/rn-one.jpg' },
                { name: 'RN LITE', tagline: 'Der kompakteste Race Navigator', href: '#', image: '/rn/cards/rn-lite.jpg' },
            ],
        },
        {
            id: 'data', label: 'RN Data & TPMS', icon: '/rn/tabs/data.png',
            blurb: 'Die Daten holen, die das Fahrzeug schon kennt — und die, die es nicht kennt.',
            products: [
                { name: 'RN OBD PLUG', tagline: 'Fahrzeugdaten über OBD-II auslesen', href: '#', image: '/rn/cards/obd-plug.jpg' },
                { name: 'RN CAN-KABEL', tagline: 'Zusätzliche Fahrzeugdaten über CAN-Bus', href: '#' },
                { name: 'RN TPMS', tagline: 'Reifendruck anzeigen und aufzeichnen', href: '#', image: '/rn/cards/tpms.jpg' },
            ],
        },
        {
            id: 'live', label: 'RN Live & EMS', icon: '/rn/tabs/live.png',
            blurb: 'Daten vom Fahrzeug zu den Menschen, die sie brauchen — noch während der Session.',
            products: [
                { name: 'RN TELEMETRY', tagline: 'Fahrzeugdaten live empfangen', href: '#', image: '/rn/cards/telemetry.jpg' },
                { name: 'RN LIVE', tagline: 'Videostreaming aus dem Cockpit', href: '#', image: '/rn/cards/live.jpg' },
                { name: 'RN EMS', tagline: 'Automatische Verwaltung von Driving Events', href: '#', image: '/rn/cards/ems.jpg' },
            ],
        },
        {
            id: 'software', label: 'Software & Apps', icon: '/rn/tabs/software.png',
            blurb: 'Hier wird die Runde hinterher auseinandergenommen.',
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
        productsEyebrow: 'Hardware & software',
        productsHead: 'RN Products',
        productsIntro: 'Four families, one ecosystem. Everything records to the same timeline, so a lap looks the same whichever box is in the car.',
        statsHead: 'Every corner already measured',
        statsIntro: 'The device recognises the circuit by GPS the moment you roll out. No setup, no picking a track from a list.',
        stats: [
            { value: '160+', label: 'Circuits mapped' },
            { value: '270', label: 'Layout variants' },
            { value: '10 Hz', label: 'GPS / GLONASS' },
            { value: '20 Hz', label: 'Acceleration sensor' },
        ],
        statsFoot: 'Europe, Middle East, Asia, North and South America, Australia and Oceania.',
        quote: 'Intuitive handling and attention to detail. Race Navigator sets the benchmark.',
        quoteName: 'Christian Menzel',
        quoteRole: 'Racing driver · Brand ambassador',
        ctaHead: 'Everything packed, let’s go to the track.',
        ctaBody: 'Unit, mount, GPS antenna, cabling and charger in one fitted case. Lift it out, stick it to the windscreen, drive.',
        ctaButton: 'Show now',
        caseItems: ['RN ONE unit, 64 GB', 'Windscreen suction mount', 'External GPS antenna', '12 V and 230 V supply'],
    }, {
        productsEyebrow: 'Hardware & Software',
        productsHead: 'RN Produkte',
        productsIntro: 'Vier Familien, ein Ökosystem. Alles zeichnet auf derselben Zeitachse auf — eine Runde sieht gleich aus, egal welches Gerät im Auto sitzt.',
        statsHead: 'Jede Kurve bereits vermessen',
        statsIntro: 'Das Gerät erkennt die Strecke per GPS, sobald Sie ausrollen. Kein Setup, keine Auswahl aus einer Liste.',
        stats: [
            { value: '160+', label: 'Strecken erfasst' },
            { value: '270', label: 'Streckenvarianten' },
            { value: '10 Hz', label: 'GPS / GLONASS' },
            { value: '20 Hz', label: 'Beschleunigungssensor' },
        ],
        statsFoot: 'Europa, Naher Osten, Asien, Nord- und Südamerika, Australien und Ozeanien.',
        quote: 'Intuitive Bedienung und Liebe zum Detail. Race Navigator — das Gerät, das es zu schlagen gilt.',
        quoteName: 'Christian Menzel',
        quoteRole: 'Rennfahrer · Markenbotschafter',
        ctaHead: 'Alles gepackt, ab auf die Strecke.',
        ctaBody: 'Gerät, Halterung, GPS-Antenne, Kabel und Ladegerät in einem passgenauen Koffer. Herausnehmen, an die Scheibe, losfahren.',
        ctaButton: 'Jetzt ansehen',
        caseItems: ['RN ONE Gerät, 64 GB', 'Scheibenhalterung mit Saugnapf', 'Externe GPS-Antenne', '12 V und 230 V Versorgung'],
    });
}

export function rnFooter(locale: string) {
    return pick(locale, {
        tagline: 'The way of driving faster.',
        groups: [
            { head: 'Products', links: ['RN LITE', 'RN ONE', 'RN PRO', 'RN Modes', 'Software & Apps', 'RN Data', 'RN Live', 'RN EMS'] },
            { head: 'Support', links: ['FAQ', 'Track list', 'Manuals', 'Device updates', 'Mode activation', 'Video layouts'] },
            { head: 'Partners', links: ['Distribution partners', 'Brand ambassadors', 'References'] },
            { head: 'Legal', links: ['Imprint', 'Privacy policy', 'Terms and conditions'] },
        ],
        rights: 'RN Vision GmbH. Rebuild demo — not the live site.',
    }, {
        tagline: 'The way of driving faster.',
        groups: [
            { head: 'Produkte', links: ['RN LITE', 'RN ONE', 'RN PRO', 'RN Modes', 'Software & Apps', 'RN Data', 'RN Live', 'RN EMS'] },
            { head: 'Support', links: ['FAQ', 'Streckenliste', 'Anleitungen', 'Geräte-Updates', 'MODE-Aktivierung', 'Video-Layouts'] },
            { head: 'Partner', links: ['Vertriebspartner', 'Markenbotschafter', 'Referenzen'] },
            { head: 'Rechtliches', links: ['Impressum', 'Datenschutzerklärung', 'AGB'] },
        ],
        rights: 'RN Vision GmbH. Rebuild-Demo — nicht die Live-Seite.',
    });
}

/* ------------------------------------------------------------------ RN ONE */

export function rnOne(locale: string) {
    return pick(locale, {
        eyebrow: 'RN Systems',
        name: 'RN ONE',
        tagline: 'The all-in-one tool',
        intro: 'A compact video and analysis system that sticks to the windscreen in seconds. Two built-in HD cameras record cockpit and track at once, the 5-inch touchscreen works in gloves, and the lap time, reference time and gain or loss sit in front of you while you drive.',
        buy: 'Order now',
        support: 'To the support area',
        gallery: [
            { src: '/rn/product/rn-one-1.png', alt: 'RN ONE from the front, screen showing a lap' },
            { src: '/rn/product/rn-one-2.png', alt: 'RN ONE from the side with the suction mount' },
            { src: '/rn/product/rn-one-3.png', alt: 'RN ONE from the rear showing the connections' },
        ],
        quickSpecs: [
            { label: 'Weight', value: '884 g' },
            { label: 'Size', value: '165 × 147 × 113 mm' },
            { label: 'Display', value: '5″ touchscreen' },
            { label: 'Storage', value: '64 GB' },
        ],
        featureHead: 'What it does',
        features: [
            {
                title: 'Two cameras, one picture',
                body: 'Track and cockpit record simultaneously, composed picture-in-picture with the data overlay. A third camera can be added in HD or Full HD.',
            },
            {
                title: 'The lap, while you drive',
                body: 'Lap time, reference time and the gap you are gaining or losing, on screen in the moment rather than in the debrief.',
            },
            {
                title: 'It knows where it is',
                body: 'GPS recognises the circuit automatically. Roll out of the pit lane and it is already timing the right layout.',
            },
            {
                title: 'Off the car without cables',
                body: 'Video and data move over WiFi to an iPad or Windows PC, or onto a USB stick if the paddock WiFi is having a bad day.',
            },
            {
                title: 'The car’s own numbers',
                body: 'Optional OBD-II plug or CAN bus adapter brings throttle, brake, revs and gear onto the same timeline as the video.',
            },
            {
                title: 'Takes the session it is given',
                body: 'Recording starts and stops by hand or on its own, and the internal battery buffers up to an hour if power drops.',
            },
        ],
        specHead: 'Technical data',
        specGroups: [
            {
                head: 'Housing',
                rows: [
                    ['Construction', 'Compact aluminium lightweight housing'],
                    ['Dimensions', '165 × 147 × 113 mm'],
                    ['Weight', '884 g'],
                    ['Display', '5″ colour touchscreen, usable with racing gloves'],
                ],
            },
            {
                head: 'Cameras and storage',
                rows: [
                    ['Built-in cameras', 'Two HD cameras — track and cockpit'],
                    ['Third camera', 'Optional, HD or Full HD'],
                    ['Storage', '64 GB'],
                    ['Microphone', 'High-dynamic'],
                ],
            },
            {
                head: 'Sensors',
                rows: [
                    ['Positioning', 'GPS / GLONASS, position and speed at 10 Hz'],
                    ['Acceleration', '20 Hz, roll / yaw / pitch'],
                    ['OBD-II', 'Via optional plug or cable adapter'],
                    ['CAN bus', 'Via optional cable and adapter'],
                ],
            },
            {
                head: 'Connections and power',
                rows: [
                    ['Wireless', 'WiFi access point for iPad, phone and Windows PC'],
                    ['Bluetooth', 'For OBD-II'],
                    ['Ports', 'Optional camera, USB3, USB2, HDMI out, GPS, microphone, speaker'],
                    ['Battery', 'Internal buffer, up to 1 hour'],
                ],
            },
        ],
        boxHead: 'In the box',
        boxIntro: 'Two versions. The difference is the mount.',
        versions: [
            {
                name: 'Trackday',
                note: 'For trackdays and open pit lane',
                items: [
                    'RN ONE unit, 64 GB, two built-in HD cameras',
                    'Trackday Mode',
                    'Windscreen suction mount',
                    '12 V cable for the cigarette lighter',
                    '230 V / 14 V charger',
                    'External GPS antenna',
                    'Manual (PDF, DE / EN)',
                    'RN Analyzer app and software',
                ],
            },
            {
                name: 'Racing',
                note: 'For competition use',
                items: [
                    'RN ONE unit, 64 GB, two built-in HD cameras',
                    'Trackday Mode',
                    'Windscreen suction mount',
                    'RN ONE MKII motorsport holder',
                    '12 V cable for the cigarette lighter',
                    '230 V / 14 V charger',
                    'External GPS antenna',
                    'Manual (PDF, DE / EN)',
                    'RN Analyzer app and software',
                ],
            },
        ],
        modesHead: 'Modes',
        modesIntro: 'Each one changes what the device times and what it shows. Activated per unit.',
        modes: ['Endurance / Taxi', 'RCN', 'Rallye', 'Street', 'Tourist drive', 'Pit lane monitor', 'Rear view mirror'],
        accHead: 'Options',
        accessories: [
            { name: 'RN Camera', note: 'Full HD, HD, SD or night vision' },
            { name: 'Motorsport holder', note: 'Bolted mount for competition' },
            { name: 'RN LIVE', note: 'LTE livestream module', image: '/rn/cards/live.jpg' },
            { name: 'RN Telemetry', note: 'LTE video and data transmission' },
            { name: 'RN Case', note: 'Fitted protective case' },
        ],
    }, {
        eyebrow: 'RN Systeme',
        name: 'RN ONE',
        tagline: 'Das All-in-One-Tool',
        intro: 'Ein kompaktes Video- und Analysesystem, das in Sekunden an der Scheibe sitzt. Zwei eingebaute HD-Kameras nehmen Cockpit und Strecke gleichzeitig auf, der 5-Zoll-Touchscreen lässt sich mit Handschuhen bedienen, und Rundenzeit, Referenzzeit sowie Gewinn oder Verlust stehen während der Fahrt vor Ihnen.',
        buy: 'Jetzt bestellen',
        support: 'Zum Support-Bereich',
        gallery: [
            { src: '/rn/product/rn-one-1.png', alt: 'RN ONE von vorn, Display mit Rundenanzeige' },
            { src: '/rn/product/rn-one-2.png', alt: 'RN ONE von der Seite mit Saugnapfhalterung' },
            { src: '/rn/product/rn-one-3.png', alt: 'RN ONE von hinten mit den Anschlüssen' },
        ],
        quickSpecs: [
            { label: 'Gewicht', value: '884 g' },
            { label: 'Maße', value: '165 × 147 × 113 mm' },
            { label: 'Display', value: '5″ Touchscreen' },
            { label: 'Speicher', value: '64 GB' },
        ],
        featureHead: 'Was es kann',
        features: [
            { title: 'Zwei Kameras, ein Bild', body: 'Strecke und Cockpit zeichnen gleichzeitig auf, zusammengesetzt als Bild-in-Bild mit Daten-Overlay. Eine dritte Kamera lässt sich in HD oder Full HD ergänzen.' },
            { title: 'Die Runde, während Sie fahren', body: 'Rundenzeit, Referenzzeit und der Abstand, den Sie gerade gewinnen oder verlieren — auf dem Display statt erst im Debriefing.' },
            { title: 'Es weiß, wo es ist', body: 'GPS erkennt die Strecke automatisch. Einmal aus der Box rollen, und die richtige Variante wird bereits gemessen.' },
            { title: 'Ohne Kabel vom Fahrzeug', body: 'Video und Daten gehen per WLAN auf iPad oder Windows-PC — oder auf einen USB-Stick, wenn das Fahrerlager-WLAN einen schlechten Tag hat.' },
            { title: 'Die Daten des Fahrzeugs', body: 'Optionaler OBD-II-Stecker oder CAN-Bus-Adapter bringt Gas, Bremse, Drehzahl und Gang auf dieselbe Zeitachse wie das Video.' },
            { title: 'Nimmt die Session, wie sie kommt', body: 'Aufnahme startet und stoppt manuell oder automatisch, und der interne Akku puffert bis zu einer Stunde, falls die Versorgung wegbricht.' },
        ],
        specHead: 'Technische Daten',
        specGroups: [
            { head: 'Gehäuse', rows: [['Bauweise', 'Kompaktes Aluminium-Leichtbaugehäuse'], ['Maße', '165 × 147 × 113 mm'], ['Gewicht', '884 g'], ['Display', '5″ Farb-Touchscreen, mit Rennhandschuhen bedienbar']] },
            { head: 'Kameras und Speicher', rows: [['Eingebaute Kameras', 'Zwei HD-Kameras — Strecke und Cockpit'], ['Dritte Kamera', 'Optional, HD oder Full HD'], ['Speicher', '64 GB'], ['Mikrofon', 'Hochdynamisch']] },
            { head: 'Sensorik', rows: [['Positionierung', 'GPS / GLONASS, Position und Geschwindigkeit mit 10 Hz'], ['Beschleunigung', '20 Hz, Roll / Gier / Nick'], ['OBD-II', 'Über optionalen Stecker oder Kabeladapter'], ['CAN-Bus', 'Über optionales Kabel und Adapter']] },
            { head: 'Anschlüsse und Strom', rows: [['Funk', 'WLAN-Access-Point für iPad, Smartphone und Windows-PC'], ['Bluetooth', 'Für OBD-II'], ['Anschlüsse', 'Optionale Kamera, USB3, USB2, HDMI-Ausgang, GPS, Mikrofon, Lautsprecher'], ['Akku', 'Interne Pufferung, bis zu 1 Stunde']] },
        ],
        boxHead: 'Lieferumfang',
        boxIntro: 'Zwei Versionen. Der Unterschied ist die Halterung.',
        versions: [
            { name: 'Trackday', note: 'Für Trackdays und Open Pit Lane', items: ['RN ONE Gerät, 64 GB, zwei eingebaute HD-Kameras', 'Trackday Mode', 'Scheibenhalterung mit Saugnapf', '12-V-Kabel für den Zigarettenanzünder', '230 V / 14 V Ladegerät', 'Externe GPS-Antenne', 'Anleitung (PDF, DE / EN)', 'RN Analyzer App und Software'] },
            { name: 'Racing', note: 'Für den Wettbewerbseinsatz', items: ['RN ONE Gerät, 64 GB, zwei eingebaute HD-Kameras', 'Trackday Mode', 'Scheibenhalterung mit Saugnapf', 'RN ONE MKII Motorsport-Halterung', '12-V-Kabel für den Zigarettenanzünder', '230 V / 14 V Ladegerät', 'Externe GPS-Antenne', 'Anleitung (PDF, DE / EN)', 'RN Analyzer App und Software'] },
        ],
        modesHead: 'Modes',
        modesIntro: 'Jeder Mode ändert, was gemessen und angezeigt wird. Pro Gerät freischaltbar.',
        modes: ['Endurance / Taxi', 'RCN', 'Rallye', 'Street', 'Tourist drive', 'Pit-Lane-Monitor', 'Rückspiegel'],
        accHead: 'Optionen',
        accessories: [
            { name: 'RN Camera', note: 'Full HD, HD, SD oder Nachtsicht' },
            { name: 'Motorsport-Halterung', note: 'Verschraubte Halterung für den Wettbewerb' },
            { name: 'RN LIVE', note: 'LTE-Livestream-Modul', image: '/rn/cards/live.jpg' },
            { name: 'RN Telemetry', note: 'LTE-Video- und Datenübertragung' },
            { name: 'RN Case', note: 'Passgenauer Schutzkoffer' },
        ],
    });
}
