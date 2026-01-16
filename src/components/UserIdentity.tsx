import { useState, useEffect } from 'react';
import { useDeviceStore } from '../store/deviceStore';
import { getSignals } from '../lib/deviceHash';
import './UserIdentity.css';

const CopyIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
);

const RefreshIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M23 4v6h-6M1 20v-6h6" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
);

const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 6L9 17l-5-5" />
    </svg>
);

interface SignalData {
    gpuVendor: string;
    cpuBucket: string;
    screenRatio: string;
    colorDepth: number;
    touchSupport: string;
    hoverType: string;
    hdrSupport: boolean;
    reducedMotion: boolean;
    pdfViewer: boolean;
    tzOffset: number;
    platform: string;
}

export function UserIdentity() {
    const { profile, isLoading } = useDeviceStore();
    const [copied, setCopied] = useState(false);
    const [compareInput, setCompareInput] = useState('');
    const [compareData, setCompareData] = useState<SignalData | null>(null);
    const [compareError, setCompareError] = useState('');
    const [signals, setSignals] = useState<SignalData | null>(null);

    useEffect(() => {
        setSignals(getSignals());
    }, []);

    const handleCopy = async () => {
        if (!signals) return;
        await navigator.clipboard.writeText(JSON.stringify(signals, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCompare = () => {
        try {
            const parsed = JSON.parse(compareInput);
            setCompareData(parsed);
            setCompareError('');
        } catch {
            setCompareError('Invalid JSON');
            setCompareData(null);
        }
    };

    const handleRecalculate = () => {
        window.location.reload();
    };

    if (isLoading || !signals) {
        return (
            <div className="container">
                <p className="loading">Calculating fingerprint...</p>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="container">
                <p className="error">Failed to generate identity</p>
            </div>
        );
    }

    const metrics = [
        { label: 'GPU Vendor', current: signals.gpuVendor, compare: compareData?.gpuVendor },
        { label: 'CPU Bucket', current: signals.cpuBucket, compare: compareData?.cpuBucket },
        { label: 'Screen Ratio', current: signals.screenRatio, compare: compareData?.screenRatio },
        { label: 'Color Depth', current: String(signals.colorDepth), compare: String(compareData?.colorDepth || '') },
        { label: 'Touch Support', current: signals.touchSupport, compare: compareData?.touchSupport },
        { label: 'Hover Type', current: signals.hoverType, compare: compareData?.hoverType },
        { label: 'HDR Support', current: String(signals.hdrSupport), compare: String(compareData?.hdrSupport ?? '') },
        { label: 'Reduced Motion', current: String(signals.reducedMotion), compare: String(compareData?.reducedMotion ?? '') },
        { label: 'PDF Viewer', current: String(signals.pdfViewer), compare: String(compareData?.pdfViewer ?? '') },
        { label: 'Timezone Offset', current: String(signals.tzOffset), compare: String(compareData?.tzOffset || '') },
        { label: 'Platform', current: signals.platform, compare: compareData?.platform },
    ];

    return (
        <div className="container">
            {/* Header */}
            <header className="header">
                <h1 className="title">Fingerprint Debugger</h1>
                <p className="subtitle">11 cross-browser stable signals for unique device identification</p>
            </header>

            {/* Main Grid */}
            <div className="main-grid">
                {/* Left: Current Identity */}
                <div className="panel identity-panel">
                    <div className="panel-accent cyan"></div>
                    <div className="panel-content">
                        <label className="label">Master ID</label>
                        <div className="hash-display">{profile.master_id}</div>

                        <label className="label">Confidence</label>
                        <div className="confidence">{(parseFloat(profile.confidence_score) * 100).toFixed(0)}%</div>

                        <label className="label">Wallet</label>
                        <div className={`wallet ${profile.wallet_address !== 'none' ? 'connected' : ''}`}>
                            {profile.wallet_address}
                        </div>
                    </div>

                    <div className="button-row">
                        <button className="btn btn-secondary" onClick={handleCopy}>
                            {copied ? <CheckIcon /> : <CopyIcon />}
                            <span>{copied ? 'Copied!' : 'Copy Data'}</span>
                        </button>
                        <button className="btn btn-primary" onClick={handleRecalculate}>
                            <RefreshIcon />
                            <span>Recalculate</span>
                        </button>
                    </div>
                </div>

                {/* Right: Comparator */}
                <div className="panel compare-panel">
                    <div className="panel-accent orange"></div>
                    <div className="panel-content">
                        <label className="label">Cross-Browser Comparator</label>
                        <textarea
                            className="compare-input"
                            placeholder="Paste JSON data from another browser to compare..."
                            value={compareInput}
                            onChange={(e) => setCompareInput(e.target.value)}
                        />
                        {compareError && <p className="error-text">{compareError}</p>}
                        <button className="btn btn-orange full-width" onClick={handleCompare}>
                            Compare & Highlight Diffs
                        </button>
                    </div>
                </div>
            </div>

            {/* Metrics Table */}
            <div className="panel table-panel">
                <div className="table-header">
                    <h3>Fingerprint Vectors (11 Signals)</h3>
                    <span className="hint">RED = mismatch between browsers</span>
                </div>
                <table className="metrics-table">
                    <thead>
                        <tr>
                            <th>Signal</th>
                            <th>Current Browser</th>
                            <th>Imported</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {metrics.map((m, i) => {
                            const hasCompare = compareData !== null;
                            const isMatch = !hasCompare || m.current === m.compare;
                            return (
                                <tr key={i} className={hasCompare ? (isMatch ? 'match' : 'mismatch') : ''}>
                                    <td className="metric-label">{m.label}</td>
                                    <td className="metric-value">{m.current}</td>
                                    <td className="metric-value">{hasCompare ? (m.compare || '-') : '-'}</td>
                                    <td className="status">
                                        {hasCompare && (isMatch ?
                                            <span className="status-match">MATCH</span> :
                                            <span className="status-mismatch">DIFF</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Raw Output */}
            <div className="panel raw-panel">
                <label className="label">Raw JSON Output (Copy this to compare in another browser)</label>
                <textarea
                    className="raw-output"
                    readOnly
                    value={JSON.stringify(signals, null, 2)}
                />
            </div>
        </div>
    );
}
