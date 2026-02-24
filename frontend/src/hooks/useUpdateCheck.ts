import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const CURRENT_VERSION = Constants.expoConfig?.version || '1.0.0';

export interface VersionInfo {
  latestVersion: string;
  minVersion: string;
  releaseNotes: string;
  forceUpdate: boolean;
  iosStoreUrl: string;
  androidStoreUrl: string;
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

export function useUpdateCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch(`${API_URL}/api/app-version`);
        if (!res.ok) return;
        const data: VersionInfo = await res.json();
        setVersionInfo(data);

        if (compareVersions(CURRENT_VERSION, data.latestVersion) < 0) {
          setUpdateAvailable(true);
        }
        if (compareVersions(CURRENT_VERSION, data.minVersion) < 0) {
          setForceUpdate(true);
        }
      } catch {
        // silently fail — don't block the app
      }
    }
    check();
  }, []);

  const storeUrl =
    Platform.OS === 'ios'
      ? versionInfo?.iosStoreUrl
      : versionInfo?.androidStoreUrl;

  return { updateAvailable, forceUpdate, versionInfo, storeUrl, currentVersion: CURRENT_VERSION };
}
