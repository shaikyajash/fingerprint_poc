import { useState } from 'react';
import { useDeviceStore } from '../store/deviceStore';
import './UserIdentity.css';

const CopyIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
);

const CheckIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3">
        <path d="M20 6L9 17l-5-5" />
    </svg>
);

interface CopyableValueProps {
    value: string;
    truncate?: boolean;
}

function CopyableValue({ value, truncate }: CopyableValueProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <span className="value copyable" onClick={handleCopy}>
            {truncate ? `${value.substring(0, 16)}...` : value}
            <span className="copy-icon">
                {copied ? <CheckIcon /> : <CopyIcon />}
            </span>
        </span>
    );
}

interface MatchInputProps {
    targetValue: string;
    placeholder: string;
}

function MatchInput({ targetValue, placeholder }: MatchInputProps) {
    const [inputValue, setInputValue] = useState('');

    const getMatchStatus = () => {
        if (!inputValue.trim()) return null;
        return inputValue.trim() === targetValue ? 'match' : 'no-match';
    };

    const status = getMatchStatus();

    return (
        <div className="match-section">
            <input
                type="text"
                className="match-input"
                placeholder={placeholder}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
            />
            {status && (
                <span className={`match-result ${status}`}>
                    {status === 'match' ? 'MATCH' : 'No Match'}
                </span>
            )}
        </div>
    );
}

export function UserIdentity() {
    const { profile, isLoading } = useDeviceStore();

    if (isLoading) {
        return (
            <div id="user-details">
                <p className="loading">Generating User Identity...</p>
            </div>
        );
    }

    if (!profile) {
        return (
            <div id="user-details">
                <p className="error">Failed to generate identity</p>
            </div>
        );
    }

    const confidencePercent = (parseFloat(profile.confidence_score) * 100).toFixed(0);

    return (
        <div id="user-details">
            <div className="profile-card">
                <h2>User Identity</h2>

                <div className="detail-row">
                    <span className="label">Master ID:</span>
                    <CopyableValue value={profile.master_id} />
                </div>
                <MatchInput
                    targetValue={profile.master_id}
                    placeholder="Paste Master ID to compare..."
                />

                <div className="detail-row">
                    <span className="label">Instance ID:</span>
                    <CopyableValue value={profile.instance_id} />
                </div>
                <MatchInput
                    targetValue={profile.instance_id}
                    placeholder="Paste Instance ID to compare..."
                />

                <div className="detail-row">
                    <span className="label">Confidence Score:</span>
                    <span className="value score">{confidencePercent}%</span>
                </div>

                <div className="detail-row">
                    <span className="label">Wallet Address:</span>
                    <span className={`value ${profile.wallet_address !== 'none' ? 'wallet-connected' : ''}`}>
                        {profile.wallet_address}
                    </span>
                </div>

                <h3>Device Meta</h3>

                <div className="detail-row">
                    <span className="label">GPU:</span>
                    <span className="value">{profile.meta.gpu}</span>
                </div>

                <div className="detail-row">
                    <span className="label">Timezone:</span>
                    <span className="value">{profile.meta.tz}</span>
                </div>

                <div className="detail-row">
                    <span className="label">Platform:</span>
                    <span className="value">{profile.meta.platform}</span>
                </div>

                <div className="detail-row">
                    <span className="label">Fonts Hash:</span>
                    <CopyableValue value={profile.meta.fontsHash} truncate />
                </div>
            </div>
        </div>
    );
}
