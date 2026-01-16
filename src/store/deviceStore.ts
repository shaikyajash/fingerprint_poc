import { create } from 'zustand';

interface DeviceAnchors {
    gpu: string;
    tz: string;
    platform: string;
    fontsHash: string;
}

interface DeviceProfile {
    master_id: string;
    instance_id: string;
    confidence_score: string;
    wallet_address: string;
    meta: DeviceAnchors;
}

interface DeviceState {
    profile: DeviceProfile | null;
    isLoading: boolean;
    error: string | null;
    setProfile: (profile: DeviceProfile) => void;
    setWalletAddress: (address: string) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
}

export const useDeviceStore = create<DeviceState>((set) => ({
    profile: null,
    isLoading: true,
    error: null,
    setProfile: (profile) => set({ profile, isLoading: false }),
    setWalletAddress: (address) => set((state) => ({
        profile: state.profile ? {
            ...state.profile,
            wallet_address: address,
            confidence_score: '1.00'
        } : null
    })),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error, isLoading: false })
}));

export type { DeviceProfile, DeviceAnchors };
