import { useDeviceStore, type DeviceProfile, type DeviceAnchors } from '../store/deviceStore';

/**
 * DeviceHash SDK v3.0 (Cross-Browser Stable + High Entropy)
 * Based on 2024 research on stable cross-browser fingerprinting signals
 * 
 * Signals used:
 * - GPU Vendor (WebGL)
 * - Timezone Offset (System)
 * - Platform/OS (System)
 * - Color Depth (Hardware)
 * - CPU Cores Bucket (Hardware)
 * - Screen Aspect Ratio (Hardware)
 * - Touch Support (Hardware)
 * - HDR Support (Hardware/Display)
 * - Preferred Color Scheme (System)
 * - Preferred Reduced Motion (System)
 */

const config = {
    blockedStorageKey: "DH_BLACKLIST"
};

declare global {
    interface Window {
        ethereum?: {
            request: (args: { method: string }) => Promise<string[]>;
            on: (event: string, callback: (accounts: string[]) => void) => void;
        };
    }
}

async function sha256(message: string): Promise<string> {
    try {
        if (crypto && crypto.subtle) {
            const msgBuffer = new TextEncoder().encode(message);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            return Array.from(new Uint8Array(hashBuffer))
                .map(b => b.toString(16).padStart(2, '0')).join('');
        }
    } catch { }
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
        hash = ((hash << 5) - hash) + message.charCodeAt(i);
        hash = hash & hash;
    }
    return (Math.abs(hash)).toString(16);
}

function normalize(type: string, data: string | null): string {
    if (!data) return "UNKNOWN";
    if (type === 'timezone') {
        const mapping: Record<string, string> = {
            "Asia/Kolkata": "Asia/Calcutta", "Asia/Kathmandu": "Asia/Katmandu",
            "America/Montreal": "America/Toronto", "Europe/Kyiv": "Europe/Kiev"
        };
        return mapping[data] || data;
    }
    if (type === 'platform') {
        if (data.startsWith("Win")) return "WINDOWS";
        if (data.startsWith("Mac")) return "MAC";
        if (data.startsWith("Linux")) return "LINUX";
        if (data.includes("iPhone") || data.includes("iPad")) return "IOS";
        if (data.includes("Android")) return "ANDROID";
        return "OTHER";
    }
    return data;
}

// GPU vendor - stable across browsers
function getGPUVendor(): string {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
        if (!gl) return "NO_WEBGL";

        const renderer = (gl.getParameter(gl.RENDERER) || "").toLowerCase();
        const vendor = (gl.getParameter(gl.VENDOR) || "").toLowerCase();

        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        let unmaskedRenderer = "";
        if (debugInfo) {
            unmaskedRenderer = (gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "").toLowerCase();
        }

        const combined = `${vendor} ${renderer} ${unmaskedRenderer}`;

        if (combined.includes('nvidia') || combined.includes('geforce')) return "NVIDIA";
        if (combined.includes('amd') || combined.includes('radeon')) return "AMD";
        if (combined.includes('intel')) return "INTEL";
        if (combined.includes('apple')) return "APPLE";
        if (combined.includes('qualcomm') || combined.includes('adreno')) return "QUALCOMM";
        if (combined.includes('arm') || combined.includes('mali')) return "ARM";

        return "OTHER";
    } catch { return "ERROR"; }
}

// CPU cores bucket - hardware based, stable
function getCPUBucket(): string {
    const cores = navigator.hardwareConcurrency || 0;
    if (cores === 0) return "UNKNOWN";
    if (cores <= 2) return "LOW_2";
    if (cores <= 4) return "MID_4";
    if (cores <= 8) return "HIGH_8";
    return "ULTRA_8+";
}

// Screen aspect ratio - hardware based (more stable than exact resolution)
function getScreenRatio(): string {
    const w = screen.width;
    const h = screen.height;
    const ratio = Math.max(w, h) / Math.min(w, h);

    // Round to common ratios
    if (ratio < 1.4) return "4:3";
    if (ratio < 1.6) return "3:2";
    if (ratio < 1.8) return "16:10";
    if (ratio < 2.0) return "16:9";
    if (ratio < 2.2) return "19.5:9";
    return "21:9+";
}

// Touch capability - hardware based
function getTouchSupport(): string {
    const maxTouch = navigator.maxTouchPoints || 0;
    if (maxTouch === 0) return "NONE";
    if (maxTouch <= 2) return "BASIC";
    if (maxTouch <= 5) return "MULTI";
    return "FULL";
}

// HDR support - display hardware capability
function getHDRSupport(): boolean {
    return window.matchMedia('(dynamic-range: high)').matches;
}

// Removed: Dark mode preference - can differ per browser
// function getDarkMode(): boolean {
//     return window.matchMedia('(prefers-color-scheme: dark)').matches;
// }

// Reduced motion preference - system accessibility setting
function getReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Hover capability - input device type indicator
function getHoverCapability(): string {
    const hover = window.matchMedia('(hover: hover)').matches;
    const pointer = window.matchMedia('(pointer: fine)').matches;

    if (hover && pointer) return "MOUSE";
    if (!hover && !pointer) return "TOUCH";
    return "HYBRID";
}

// Platform
function getPlatform(): string {
    return normalize('platform', navigator.platform);
}

// Timezone offset
function getTimezoneOffset(): number {
    return new Date().getTimezoneOffset();
}

// Color depth
function getColorDepth(): number {
    return screen.colorDepth;
}

export function initWalletListener(): void {
    const setWalletAddress = useDeviceStore.getState().setWalletAddress;

    if (window.ethereum) {
        window.ethereum.request({ method: 'eth_accounts' })
            .then(accounts => {
                if (accounts.length > 0) {
                    console.log(`%c WALLET DETECTED: ${accounts[0]}`, "background: #5d00ff; color: white;");
                    setWalletAddress(accounts[0]);
                }
            }).catch(() => { });

        window.ethereum.on('accountsChanged', (accounts: string[]) => {
            if (accounts.length > 0) {
                console.log(`%c WALLET CHANGED: ${accounts[0]}`, "background: #5d00ff; color: white;");
                setWalletAddress(accounts[0]);
            }
        });
    }
}

export async function generateProfile(): Promise<DeviceProfile | null> {
    try {
        if (localStorage.getItem(config.blockedStorageKey) === "true") {
            console.warn("DeviceHash: User is Blacklisted.");
            return null;
        }
    } catch { }

    console.log("DeviceHash v3.0: Generating High-Entropy Cross-Browser Identity...");

    // Collect all stable signals (dark mode removed - browser specific)
    const signals = {
        gpuVendor: getGPUVendor(),
        cpuBucket: getCPUBucket(),
        screenRatio: getScreenRatio(),
        colorDepth: getColorDepth(),
        touchSupport: getTouchSupport(),
        hoverType: getHoverCapability(),
        hdrSupport: getHDRSupport(),
        reducedMotion: getReducedMotion(),
        tzOffset: getTimezoneOffset(),
        platform: getPlatform()
    };

    // Debug logging
    console.log("%c ===== V3.0 HIGH-ENTROPY SIGNALS =====", "background: purple; color: white; font-size: 14px;");
    console.table(signals);

    // Master string from all stable signals (10 signals)
    const masterString = [
        signals.gpuVendor,
        signals.cpuBucket,
        signals.screenRatio,
        signals.colorDepth,
        signals.touchSupport,
        signals.hoverType,
        signals.hdrSupport,
        signals.reducedMotion,
        signals.tzOffset,
        signals.platform
    ].join("||");

    console.log("%c MASTER STRING:", "color: cyan;", masterString);

    const masterID = await sha256(masterString);
    const timezone = normalize('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone);

    const anchors: DeviceAnchors = {
        gpu: signals.gpuVendor,
        tz: timezone,
        platform: signals.platform,
        fontsHash: `CPU:${signals.cpuBucket}|SCR:${signals.screenRatio}|TOUCH:${signals.touchSupport}`
    };

    return {
        master_id: masterID,
        confidence_score: "0.90",
        wallet_address: "none",
        meta: anchors
    };
}

// Export signals for UI display (10 signals)
export function getSignals() {
    return {
        gpuVendor: getGPUVendor(),
        cpuBucket: getCPUBucket(),
        screenRatio: getScreenRatio(),
        colorDepth: getColorDepth(),
        touchSupport: getTouchSupport(),
        hoverType: getHoverCapability(),
        hdrSupport: getHDRSupport(),
        reducedMotion: getReducedMotion(),
        tzOffset: getTimezoneOffset(),
        platform: getPlatform()
    };
}
