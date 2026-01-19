import { create } from 'zustand';

// Generic profile to support any structure returned by the script
export interface DeviceProfile {
    master_id: string;
    // The script returns 'fingerprint' object with various keys
    // We treat it as a Record<string, any> to display whatever the script returns
    fingerprint: Record<string, any>;
}

interface DeviceState {
    profile: DeviceProfile | null;
    isLoading: boolean;
    error: string | null;
    setProfile: (profile: DeviceProfile) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
}

export const useDeviceStore = create<DeviceState>((set) => ({
    profile: null,
    isLoading: true,
    error: null,
    setProfile: (profile) => set({ profile, isLoading: false }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error, isLoading: false })
}));
