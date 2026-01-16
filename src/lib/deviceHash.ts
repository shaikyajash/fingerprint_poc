import { useDeviceStore, type DeviceProfile, type DeviceAnchors } from '../store/deviceStore';

const config = {
    blockedStorageKey: "DH_BLACKLIST",
    fontList: [
        "Arial", "Arial Black", "Calibri", "Cambria", "Comic Sans MS", "Consolas",
        "Courier New", "Georgia", "Helvetica", "Impact", "Lucida Console",
        "Microsoft Sans Serif", "Segoe UI", "Tahoma", "Times New Roman",
        "Trebuchet MS", "Verdana", "Roboto", "Open Sans", "Ubuntu"
    ]
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
    } catch (e) { }
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
        const char = message.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
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

async function getFontHash(): Promise<string> {
    const container = document.body || document.documentElement;
    if (!container) return "DOM_ERROR";

    const baseFonts = ["monospace", "sans-serif", "serif"];
    const testString = "mmMwWlli";
    const span = document.createElement("span");
    span.style.cssText = "font-size:72px; position:absolute; left:-9999px; pointer-events:none;";
    span.textContent = testString;

    try { container.appendChild(span); } catch { return "DOM_BLOCKED"; }

    const detected: string[] = [];
    for (const font of config.fontList) {
        let found = false;
        for (const base of baseFonts) {
            span.style.fontFamily = base;
            const w1 = span.offsetWidth;
            span.style.fontFamily = `"${font}", ${base}`;
            if (span.offsetWidth !== w1) {
                found = true;
                break;
            }
        }
        if (found) detected.push(font);
    }
    try { container.removeChild(span); } catch { }
    return await sha256(detected.join("|"));
}

async function getCanvasHash(): Promise<string> {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return "CTX_BLOCKED";
        ctx.textBaseline = "top";
        ctx.font = "14px 'Arial'";
        ctx.fillStyle = "#f60";
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = "#069";
        ctx.fillText("DeviceHash v2", 2, 15);
        return await sha256(canvas.toDataURL());
    } catch { return "CANVAS_BLOCKED"; }
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

    console.log("DeviceHash: Generating Identity...");

    const gpuData = ((): string => {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
            if (!gl) return "NO_WEBGL";
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (!debugInfo) return "GENERIC_RENDERER";
            return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
        } catch { return "GPU_BLOCKED"; }
    })();

    let gpuVendor = "OTHER";
    if (gpuData.includes('intel')) gpuVendor = "INTEL";
    else if (gpuData.includes('nvidia')) gpuVendor = "NVIDIA";
    else if (gpuData.includes('amd') || gpuData.includes('radeon')) gpuVendor = "AMD";
    else if (gpuData.includes('apple')) gpuVendor = "APPLE";

    const rawTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const rawPlat = navigator.platform;
    const fontsHash = await getFontHash();

    let confidence = 0.5;
    if (gpuVendor !== "OTHER") confidence += 0.2;
    if (fontsHash !== "DOM_BLOCKED") confidence += 0.2;

    const anchors: DeviceAnchors = {
        gpu: gpuVendor,
        tz: normalize('timezone', rawTz),
        platform: normalize('platform', rawPlat),
        fontsHash: fontsHash
    };

    const masterString = `${anchors.gpu}||${anchors.tz}||${anchors.platform}||${anchors.fontsHash}`;
    const masterID = await sha256(masterString);

    const canvasHash = await getCanvasHash();
    const instanceString = `${masterID}||${canvasHash}||${screen.width}`;
    const instanceID = await sha256(instanceString);

    return {
        master_id: masterID,
        instance_id: instanceID,
        confidence_score: confidence.toFixed(2),
        wallet_address: "none",
        meta: anchors
    };
}
