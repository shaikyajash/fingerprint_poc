// Type declarations for TypeScript
declare global {
    interface Navigator {
        deviceMemory?: number;
        oscpu?: string;
        gpu?: unknown;
        userAgentData?: {
            brands: Array<{ brand: string; version: string }>;
        };
    }
    interface Window {
        openDatabase?: unknown;
    }
}

export async function getFingerprint() {
    const fp = {
        /* ===== TIME / LOCALE ===== */
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
        tz_os: new Date().getTimezoneOffset(),
        dt_locale: Intl.DateTimeFormat().resolvedOptions().locale ?? null,

        language: navigator.language ?? null,

        languages: Array.isArray(navigator.languages)
            ? navigator.languages
            : navigator.language
                ? [navigator.language]
                : [],

        numbering_system:
            Intl.NumberFormat().resolvedOptions().numberingSystem ?? null,

        /* ===== PLATFORM / HARDWARE ===== */
        platform: navigator.platform ?? null,
        os_cpu: navigator.oscpu ?? null,
        arc: null, // not natively exposed
        hardware_concurrency: navigator.hardwareConcurrency ?? null,
        device_memory: navigator.deviceMemory ?? null,


        /* ===== BROWSER ===== */
        user_agent: navigator.userAgent ?? null,

        vendor_flavours:
            navigator.userAgentData?.brands && Array.isArray(navigator.userAgentData.brands)
                ? navigator.userAgentData.brands.map(
                    b => `${b.brand} ${b.version}`
                )
                : [],

        browser: null, // derived server-side
        cookie_status: navigator.cookieEnabled ? "enabled" : "disabled",

        /* ===== SCREEN / DISPLAY ===== */
        screen_res: `${screen.width}x${screen.height}`,
        avail_screen_res: `${screen.availWidth}x${screen.availHeight}`,
        screen_color_depth: screen.colorDepth ?? null,

        color_gamut: matchMedia("(color-gamut: rec2020)").matches
            ? "rec2020"
            : matchMedia("(color-gamut: p3)").matches
                ? "p3"
                : "srgb",

        forced_colors: matchMedia("(forced-colors: active)").matches
            ? "active"
            : "none",

        inverted_colors: matchMedia("(inverted-colors: inverted)").matches
            ? "inverted"
            : "normal",

        monochrome: matchMedia("(monochrome)").matches
            ? "supported"
            : "not_supported",

        /* ===== TOUCH / POINTER ===== */
        touch_event: "ontouchstart" in window ? "supported" : "not_supported",


        pointer_hover:
            matchMedia("(hover: hover)").matches ? "hover" : "no_hover",

        pointer_fine:
            matchMedia("(pointer: fine)").matches ? "fine" : "coarse",

        /* ===== STORAGE ===== */
        session_storage: (() => {
            try {
                sessionStorage.setItem("t", "1");
                sessionStorage.removeItem("t");
                return "enabled";
            } catch {
                return "disabled";
            }
        })(),

        local_storage: (() => {
            try {
                localStorage.setItem("t", "1");
                localStorage.removeItem("t");
                return "enabled";
            } catch {
                return "disabled";
            }
        })(),

        indexed_db: window.indexedDB ? "supported" : "not_supported",
        open_db: window.openDatabase ? "supported" : "not_supported",

        /* ===== AUDIO ===== */
        audio_latency: (() => {
            try {
                const ctx = new AudioContext();
                return ctx.baseLatency?.toString() ?? null;
            } catch {
                return null;
            }
        })(),

        /* ===== MEDIA / CAPABILITIES ===== */
        media_devices: navigator.mediaDevices ? "supported" : "not_supported",
        geolocation: navigator.geolocation ? "supported" : "not_supported",
        clipboard: navigator.clipboard ? "supported" : "not_supported",
        device_motion:
            "DeviceMotionEvent" in window ? "supported" : "not_supported",
        device_orientation:
            "DeviceOrientationEvent" in window ? "supported" : "not_supported",

        /* ===== GRAPHICS ===== */
        webgl_renderer: (() => {
            try {
                const canvas = document.createElement("canvas");
                const gl =
                    (canvas.getContext("webgl") ||
                        canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
                if (!gl) return null;
                const dbg = gl.getExtension("WEBGL_debug_renderer_info");
                return dbg
                    ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)
                    : gl.getParameter(gl.RENDERER);
            } catch {
                return null;
            }
        })(),

        webgl_vendor: (() => {
            try {
                const canvas = document.createElement("canvas");
                const gl = canvas.getContext("webgl") as WebGLRenderingContext | null;
                return gl?.getParameter(gl.VENDOR) ?? null;
            } catch {
                return null;
            }
        })(),

        webgl_extensions: (() => {
            try {
                const canvas = document.createElement("canvas");
                const gl = canvas.getContext("webgl") as WebGLRenderingContext | null;
                return gl?.getSupportedExtensions()?.join(",") ?? null;
            } catch {
                return null;
            }
        })(),

        /* ===== MODERN GPU ===== */
        webgpu: navigator.gpu ? "supported" : "not_supported",

        /* ===== PLUGINS ===== */
        plugins: navigator.plugins
            ? Array.from(navigator.plugins).map(p => p.name)
            : [],
    };

    /* ===== DISPLAY ===== */
    console.table(
        Object.entries(fp).map(([field, value]) => ({
            field,
            value: Array.isArray(value) ? JSON.stringify(value) : value,
        }))
    );

    /* ===== HASH ===== */
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(fp));
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

    console.log("Stable Fingerprint SHA-256:", hash);
    console.log("Total stable fields:", Object.keys(fp).length);

    return { fingerprint: fp, hash };
}
