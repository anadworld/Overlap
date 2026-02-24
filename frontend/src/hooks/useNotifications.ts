import { useState, useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
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
};

const TIMING_LABELS: Record<ReminderTiming, string> = {
  '1day': 'tomorrow',
  '3days': 'in 3 days',
  '1week': 'in a week',
};

// Configure how notifications are shown when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// Map of bookmarkId -> notificationId
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

  // Load prefs on mount
  useEffect(() => {
    (async () => {
      try {
        const json = await AsyncStorage.getItem(PREFS_KEY);
        if (json) setPrefs(JSON.parse(json));
      } catch { /* use defaults */ }

      if (Platform.OS !== 'web') {
        const { status } = await Notifications.getPermissionsAsync();
        setHasPermission(status === 'granted');
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
    const granted = await requestPermissions();
    setHasPermission(granted);
    if (granted) {
      await updatePrefs({ enabled: true });
    }
    return granted;
  }, [updatePrefs]);

  const disableNotifications = useCallback(async () => {
    await updatePrefs({ enabled: false });
    // Cancel all scheduled
    if (Platform.OS !== 'web') {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await saveScheduledMap({});
    }
  }, [updatePrefs]);

  const setTiming = useCallback(async (timing: ReminderTiming) => {
    await updatePrefs({ timing });
  }, [updatePrefs]);

  const scheduleForBookmark = useCallback(async (bookmark: Bookmark) => {
    if (Platform.OS === 'web' || !prefs.enabled) return;

    const granted = await requestPermissions();
    if (!granted) return;

    const startDate = new Date(bookmark.lw.startDate + 'T09:00:00');
    const triggerDate = new Date(startDate.getTime() - TIMING_MS[prefs.timing]);

    // Don't schedule if the trigger date is in the past
    if (triggerDate <= new Date()) return;

    const countryNames = bookmark.countries.map(
      (c) => bookmark.countryNameMap[c.countryCode] || c.countryCode
    ).join(', ');

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
  }, [prefs.enabled, prefs.timing]);

  const cancelForBookmark = useCallback(async (bookmarkId: string) => {
    if (Platform.OS === 'web') return;

    const map = await getScheduledMap();
    const notifId = map[bookmarkId];
    if (notifId) {
      await Notifications.cancelScheduledNotificationAsync(notifId);
      delete map[bookmarkId];
      await saveScheduledMap(map);
    }
  }, []);

  const rescheduleAll = useCallback(async (bookmarks: Bookmark[]) => {
    if (Platform.OS === 'web' || !prefs.enabled) return;

    // Cancel all existing
    await Notifications.cancelAllScheduledNotificationsAsync();
    const newMap: ScheduledMap = {};

    for (const bookmark of bookmarks) {
      const startDate = new Date(bookmark.lw.startDate + 'T09:00:00');
      const triggerDate = new Date(startDate.getTime() - TIMING_MS[prefs.timing]);

      if (triggerDate <= new Date()) continue;

      const countryNames = bookmark.countries.map(
        (c) => bookmark.countryNameMap[c.countryCode] || c.countryCode
      ).join(', ');

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
