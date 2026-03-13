import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Linking,
  Platform,
  Share,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { useNotifications, ReminderTiming } from '../../src/hooks/useNotifications';
import { useBookmarks } from '../../src/hooks/useBookmarks';

const APP_VERSION = Constants.expoConfig?.version || '1.0.0';
const BUILD_NUMBER = Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '1';

const APP_STORE_ID = '6740092498';
const PLAY_STORE_PACKAGE = 'com.anadworld.overlap';

interface SettingsItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showArrow?: boolean;
}

const SettingsItem: React.FC<SettingsItemProps> = ({ icon, title, subtitle, onPress, showArrow = true }) => (
  <TouchableOpacity style={styles.settingsItem} onPress={onPress} data-testid={`settings-${title.toLowerCase().replace(/\s+/g, '-')}`}>
    <View style={styles.settingsItemIcon}>
      <Ionicons name={icon} size={22} color="#7C9CBF" />
    </View>
    <View style={styles.settingsItemContent}>
      <Text style={styles.settingsItemTitle}>{title}</Text>
      {subtitle && <Text style={styles.settingsItemSubtitle}>{subtitle}</Text>}
    </View>
    {showArrow && <Ionicons name="chevron-forward" size={20} color="#CBD5E0" />}
  </TouchableOpacity>
);

export default function SettingsScreen() {
  const { t } = useTranslation();
  const [showTimingDropdown, setShowTimingDropdown] = useState(false);

  const {
    prefs,
    enableNotifications,
    disableNotifications,
    setTiming,
    rescheduleAll,
  } = useNotifications();
  const { bookmarks } = useBookmarks();

  const handleToggleNotifications = async (value: boolean) => {
    if (value) {
      const granted = await enableNotifications();
      if (granted) {
        await rescheduleAll(bookmarks);
      } else {
        Alert.alert(
          t('settings.permissionsRequired'),
          t('settings.permissionsMessage'),
        );
      }
    } else {
      await disableNotifications();
    }
  };

  const handleTimingChange = async (timing: ReminderTiming) => {
    await setTiming(timing);
    if (prefs.enabled) {
      await rescheduleAll(bookmarks);
    }
  };

  const timingOptions: { value: ReminderTiming; label: string }[] = [
    { value: '1day', label: t('settings.timing1day') },
    { value: '3days', label: t('settings.timing3days') },
    { value: '1week', label: t('settings.timing1week') },
    { value: '2weeks', label: t('settings.timing2weeks') },
    { value: '1month', label: t('settings.timing1month') },
  ];

  const handleShareApp = async () => {
    const appStoreUrl = `https://apps.apple.com/app/id${APP_STORE_ID}`;
    const playStoreUrl = `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}`;
    const storeUrl = Platform.OS === 'ios' ? appStoreUrl : playStoreUrl;

    try {
      await Share.share({
        message: t('settings.shareMessage', { url: storeUrl }),
      });
    } catch (error) {
      Alert.alert(t('calendar.error'), t('settings.errorSharing'));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.appInfo')}</Text>
          <View style={styles.sectionContent}>
            <SettingsItem
              icon="information-circle-outline"
              title={t('settings.aboutOverlap')}
              subtitle={t('settings.aboutSubtitle')}
              onPress={() => WebBrowser.openBrowserAsync('https://anadworld.com/overlap')}
            />
            <SettingsItem
              icon="share-outline"
              title={t('settings.shareApp')}
              subtitle={t('settings.shareSubtitle')}
              onPress={handleShareApp}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.notifications')}</Text>
          <View style={styles.sectionContent}>
            <View style={styles.settingsItem} testID="settings-notification-toggle">
              <View style={styles.settingsItemIcon}>
                <Ionicons name="notifications-outline" size={22} color="#7C9CBF" />
              </View>
              <View style={styles.settingsItemContent}>
                <Text style={styles.settingsItemTitle}>{t('settings.holidayReminders')}</Text>
                <Text style={styles.settingsItemSubtitle}>{t('settings.remindersSubtitle')}</Text>
              </View>
              <Switch
                value={prefs.enabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: '#E2E8F0', true: '#B2CFEA' }}
                thumbColor={prefs.enabled ? '#7C9CBF' : '#CBD5E0'}
                testID="notification-switch"
              />
            </View>
            {prefs.enabled && (
              <View style={styles.timingRow} testID="reminder-timing-section">
                <Text style={styles.timingLabel}>{t('settings.remindMe')}</Text>
                <TouchableOpacity
                  style={styles.timingDropdown}
                  onPress={() => setShowTimingDropdown(!showTimingDropdown)}
                  testID="timing-dropdown-trigger"
                >
                  <Text style={styles.timingDropdownText}>
                    {timingOptions.find((o) => o.value === prefs.timing)?.label}
                  </Text>
                  <Ionicons
                    name={showTimingDropdown ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#7C9CBF"
                  />
                </TouchableOpacity>
              </View>
            )}
            {prefs.enabled && showTimingDropdown && (
              <View style={styles.timingMenu} testID="timing-dropdown-menu">
                {timingOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.timingMenuItem,
                      prefs.timing === opt.value && styles.timingMenuItemActive,
                    ]}
                    onPress={() => {
                      handleTimingChange(opt.value);
                      setShowTimingDropdown(false);
                    }}
                    testID={`timing-${opt.value}`}
                  >
                    <Text
                      style={[
                        styles.timingMenuItemText,
                        prefs.timing === opt.value && styles.timingMenuItemTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {prefs.timing === opt.value && (
                      <Ionicons name="checkmark" size={18} color="#7C9CBF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.support')}</Text>
          <View style={styles.sectionContent}>
            <SettingsItem
              icon="help-circle-outline"
              title={t('settings.helpFaq')}
              subtitle={t('settings.helpSubtitle')}
              onPress={() => WebBrowser.openBrowserAsync('https://anadworld.com/overlap-faq')}
            />
            <SettingsItem
              icon="mail-outline"
              title={t('settings.contactSupport')}
              subtitle={t('settings.contactSubtitle')}
              onPress={() => WebBrowser.openBrowserAsync('https://anadworld.com/overlap-contact')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.legal')}</Text>
          <View style={styles.sectionContent}>
            <SettingsItem
              icon="document-text-outline"
              title={t('settings.termsOfUse')}
              subtitle={t('settings.termsSubtitle')}
              onPress={() => WebBrowser.openBrowserAsync('https://anadworld.com/overlap-terms-of-use')}
            />
            <SettingsItem
              icon="shield-checkmark-outline"
              title={t('settings.privacyPolicy')}
              subtitle={t('settings.privacySubtitle')}
              onPress={() => WebBrowser.openBrowserAsync('https://anadworld.com/overlap-privacy-policy')}
            />
            <SettingsItem
              icon="code-outline"
              title={t('settings.openSource')}
              subtitle={t('settings.openSourceSubtitle')}
              onPress={() => WebBrowser.openBrowserAsync('https://anadworld.com/overlap-open-source')}
            />
          </View>
        </View>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>{t('settings.versionLabel')}</Text>
          <Text style={styles.versionNumber}>{t('settings.version', { version: APP_VERSION, build: BUILD_NUMBER })}</Text>
          <Text style={styles.copyrightText}>{t('settings.copyright')}</Text>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 16 : 10, paddingBottom: 16, backgroundColor: '#F8FAFC' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#2D3748' },
  scrollView: { flex: 1 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#718096', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 20, marginBottom: 8 },
  sectionContent: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E2E8F0' },
  settingsItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  settingsItemIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#F0F9FF', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  settingsItemContent: { flex: 1 },
  settingsItemTitle: { fontSize: 16, fontWeight: '500', color: '#2D3748' },
  settingsItemSubtitle: { fontSize: 13, color: '#718096', marginTop: 2 },
  versionContainer: { alignItems: 'center', paddingVertical: 32 },
  versionText: { fontSize: 16, fontWeight: '600', color: '#4A5568' },
  versionNumber: { fontSize: 14, color: '#718096', marginTop: 4 },
  copyrightText: { fontSize: 12, color: '#A0AEC0', marginTop: 8 },
  bottomPadding: { height: 40 },
  timingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  timingLabel: { fontSize: 14, fontWeight: '500', color: '#4A5568' },
  timingDropdown: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F1F5F9', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  timingDropdownText: { fontSize: 14, fontWeight: '500', color: '#7C9CBF' },
  timingMenu: { marginHorizontal: 20, marginBottom: 8, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  timingMenuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  timingMenuItemActive: { backgroundColor: '#F0F9FF' },
  timingMenuItemText: { fontSize: 14, color: '#4A5568' },
  timingMenuItemTextActive: { color: '#7C9CBF', fontWeight: '600' },
});
