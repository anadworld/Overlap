import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';
import { Bookmark } from '../types';

const PREFS_KEY = 'overlap_notification_prefs';
const SCHEDULED_KEY = 'overlap_scheduled_notifications';

export type ReminderTiming = '1day' | '3days' | '1week' | '2weeks' | '1month';

export interface NotificationPrefs {
  enabled: boolean;
  timing: ReminderTiming;
}

const DEFAULT_PREFS: NotificationPrefs = { enabled: true, timing: '1day' };

const TIMING_MS: Record<ReminderTiming, number> = {
  '1day': 1 * 24 * 60 * 60 * 1000,
  '3days': 3 * 24 * 60 * 60 * 1000,
  '1week': 7 * 24 * 60 * 60 * 1000,
  '2weeks': 14 * 24 * 60 * 60 * 1000,
  '1month': 30 * 24 * 60 * 60 * 1000,
};

const TIMING_LABELS: Record<ReminderTiming, string> = {
  '1day': 'tomorrow',
  '3days': 'in 3 days',
  '1week': 'in a week',
  '2weeks': 'in 2 weeks',
  '1month': 'in a month',
};

import Constants from 'expo-constants';

// Detect if running in Expo Go (where expo-notifications is broken on Android SDK 53+)
const isExpoGo = Constants.appOwnership === 'expo';

// Only load expo-notifications in standalone/dev builds, never in Expo Go
let Notifications: typeof import('expo-notifications') | null = null;
if (!isExpoGo && Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
    if (Notifications?.setNotificationHandler) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
    }
  } catch {
    Notifications = null;
  }
}

async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === 'web' || !Notifications) return false;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

type ScheduledMap = Record<string, string>;

async function getScheduledMap(): Promise<ScheduledMap> {
  try {
    const json = await AsyncStorage.getItem(SCHEDULED_KEY);
    return json ? JSON.parse(json) : {};
  } catch {
    return {};
  }
}

async function saveScheduledMap(map: ScheduledMap) {
  await AsyncStorage.setItem(SCHEDULED_KEY, JSON.stringify(map));
}

export function useNotifications() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const json = await AsyncStorage.getItem(PREFS_KEY);
        if (json) setPrefs(JSON.parse(json));
      } catch { /* use defaults */ }

      if (Platform.OS !== 'web' && Notifications) {
        try {
          const { status } = await Notifications.getPermissionsAsync();
          setHasPermission(status === 'granted');
        } catch { /* ignore */ }
      }
    })();
  }, []);

  const updatePrefs = useCallback(async (update: Partial<NotificationPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...update };
      AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const enableNotifications = useCallback(async () => {
    if (Platform.OS === 'web' || !Notifications) {
      await updatePrefs({ enabled: true });
      return true;
    }

    // Check if already granted
    try {
      const { status: existing } = await Notifications.getPermissionsAsync();
      if (existing === 'granted') {
        setHasPermission(true);
        await updatePrefs({ enabled: true });
        return true;
      }
    } catch {
      await updatePrefs({ enabled: true });
      return false;
    }

    // Show custom branded prompt before the system dialog
    return new Promise<boolean>((resolve) => {
      Alert.alert(
        'Allow Overlap to send you push notifications',
        'Get timely reminders about your upcoming saved holidays so you never miss a long weekend.',
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Allow',
            onPress: async () => {
              const granted = await requestPermissions();
              setHasPermission(granted);
              if (granted) {
                await updatePrefs({ enabled: true });
              }
              resolve(granted);
            },
          },
        ],
      );
    });
  }, [updatePrefs]);

  const disableNotifications = useCallback(async () => {
    await updatePrefs({ enabled: false });
    if (Platform.OS !== 'web' && Notifications) {
      try {
        await Notifications.cancelAllScheduledNotificationsAsync();
        await saveScheduledMap({});
      } catch { /* ignore */ }
    }
  }, [updatePrefs]);

  const setTiming = useCallback(async (timing: ReminderTiming) => {
    await updatePrefs({ timing });
  }, [updatePrefs]);

  const scheduleForBookmark = useCallback(async (bookmark: Bookmark) => {
    if (Platform.OS === 'web' || !Notifications || !prefs.enabled) return;

    const granted = await requestPermissions();
    if (!granted) return;

    try {
      const startDate = new Date(bookmark.lw.startDate + 'T09:00:00');
      const triggerDate = new Date(startDate.getTime() - TIMING_MS[prefs.timing]);
      if (triggerDate <= new Date()) return;

      const countryNames = bookmark.countries
        .map((c) => bookmark.countryNameMap[c.countryCode] || c.countryCode)
        .join(', ');

      const notifId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Long Weekend Coming Up!',
          body: `Your saved ${bookmark.lw.totalDays}-day break (${countryNames}) starts ${TIMING_LABELS[prefs.timing]}!`,
          data: { bookmarkId: bookmark.id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
      });

      const map = await getScheduledMap();
      map[bookmark.id] = notifId;
      await saveScheduledMap(map);
    } catch { /* ignore scheduling errors */ }
  }, [prefs.enabled, prefs.timing]);

  const cancelForBookmark = useCallback(async (bookmarkId: string) => {
    if (Platform.OS === 'web' || !Notifications) return;

    try {
      const map = await getScheduledMap();
      const notifId = map[bookmarkId];
      if (notifId) {
        await Notifications.cancelScheduledNotificationAsync(notifId);
        delete map[bookmarkId];
        await saveScheduledMap(map);
      }
    } catch { /* ignore */ }
  }, []);

  const rescheduleAll = useCallback(async (bookmarks: Bookmark[]) => {
    if (Platform.OS === 'web' || !Notifications || !prefs.enabled) return;

    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      const newMap: ScheduledMap = {};

      for (const bookmark of bookmarks) {
        const startDate = new Date(bookmark.lw.startDate + 'T09:00:00');
        const triggerDate = new Date(startDate.getTime() - TIMING_MS[prefs.timing]);
        if (triggerDate <= new Date()) continue;

        const countryNames = bookmark.countries
          .map((c) => bookmark.countryNameMap[c.countryCode] || c.countryCode)
          .join(', ');

        const notifId = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Long Weekend Coming Up!',
            body: `Your saved ${bookmark.lw.totalDays}-day break (${countryNames}) starts ${TIMING_LABELS[prefs.timing]}!`,
            data: { bookmarkId: bookmark.id },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
        });

        newMap[bookmark.id] = notifId;
      }

      await saveScheduledMap(newMap);
    } catch { /* ignore */ }
  }, [prefs.enabled, prefs.timing]);

  return {
    prefs,
    hasPermission,
    enableNotifications,
    disableNotifications,
    setTiming,
    scheduleForBookmark,
    cancelForBookmark,
    rescheduleAll,
  };
}
