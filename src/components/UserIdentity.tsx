import { useState } from 'react';
import { useDeviceStore } from '../store/deviceStore';
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

export function UserIdentity() {
    const { profile, isLoading } = useDeviceStore();
    const [copied, setCopied] = useState(false);
    const [compareInput, setCompareInput] = useState('');
    const [compareData, setCompareData] = useState<Record<string, any> | null>(null);
    const [compareError, setCompareError] = useState('');

    const handleCopy = async () => {
        if (!profile?.fingerprint) return;
        await navigator.clipboard.writeText(JSON.stringify(profile.fingerprint, null, 2));
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

    if (isLoading) {
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

    const fingerprint = profile.fingerprint;
    const items = Object.entries(fingerprint);

    return (
        <div className="container">
            {/* Header */}
            <header className="header">
                <h1 className="title">Fingerprint Debugger</h1>
                <p className="subtitle">Raw device signals collected by the script</p>
            </header>

            {/* Main Grid */}
            <div className="main-grid">
                {/* Left: Current Identity */}
                <div className="panel identity-panel">
                    <div className="panel-content">
                        <label className="label">Master ID (SHA-256)</label>
                        <div className="hash-display">{profile.master_id}</div>

                        <label className="label">Total Signals</label>
                        <div className="confidence">{items.length} fields</div>

                        {profile.wallet_address && profile.wallet_address !== 'none' && (
                            <>
                                <label className="label">Wallet</label>
                                <div className="wallet connected">
                                    {profile.wallet_address}
                                </div>
                            </>
                        )}
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
                    <h3>Fingerprint Signals</h3>
                    <span className="hint">RED = mismatch between browsers</span>
                </div>
                <div className="table-wrapper">
                    {items.length > 0 ? (
                        <table className="metrics-table">
                            <thead>
                                <tr>
                                    <th>Field Name</th>
                                    <th>Current Value</th>
                                    <th>Imported Value</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(([key, rawVal]) => {
                                    const valStr = typeof rawVal === 'object' ? JSON.stringify(rawVal) : String(rawVal);

                                    const hasCompare = compareData !== null;
                                    const compareVal = hasCompare ? compareData[key] : undefined;
                                    const compareStr = hasCompare
                                        ? (typeof compareVal === 'object' ? JSON.stringify(compareVal) : String(compareVal ?? '-'))
                                        : '-';

                                    const isMatch = !hasCompare || valStr === compareStr;

                                    return (
                                        <tr key={key} className={hasCompare ? (isMatch ? 'match' : 'mismatch') : ''}>
                                            <td className="metric-label">{key}</td>
                                            <td className="metric-value">{valStr}</td>
                                            <td className="metric-value">{compareStr}</td>
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
                    ) : (
                        <div className="loading">No fingerprint signals found. Script might have failed or return empty object.</div>
                    )}
                </div>
            </div>

            {/* Raw Output */}
            <div className="panel raw-panel">
                <label className="label">Raw JSON Output</label>
                <textarea
                    className="raw-output"
                    readOnly
                    value={JSON.stringify(fingerprint, null, 2)}
                />
            </div>
        </div>
    );
}
