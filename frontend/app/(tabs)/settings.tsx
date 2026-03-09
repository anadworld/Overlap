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
import { useNotifications, ReminderTiming } from '../../src/hooks/useNotifications';
import { useBookmarks } from '../../src/hooks/useBookmarks';

const APP_VERSION = Constants.expoConfig?.version || '1.0.0';
const BUILD_NUMBER = Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '1';

// Store URLs - Update these with your actual App Store and Play Store IDs
const APP_STORE_ID = '6740092498'; // Your Apple App Store ID
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
          'Permissions Required',
          'Please enable notifications in your device settings to receive holiday reminders.',
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
    { value: '1day', label: '1 Day Before' },
    { value: '3days', label: '3 Days Before' },
    { value: '1week', label: '1 Week Before' },
    { value: '2weeks', label: '2 Weeks Before' },
    { value: '1month', label: '1 Month Before' },
  ];

  const handleContactSupport = () => {
    Linking.openURL('mailto:overlap@anadworld.com?subject=Overlap – Holiday Calendar Support');
  };

  const handleShareApp = async () => {
    const appStoreUrl = `https://apps.apple.com/app/id${APP_STORE_ID}`;
    const playStoreUrl = `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}`;
    
    const storeUrl = Platform.OS === 'ios' ? appStoreUrl : playStoreUrl;
    
    try {
      const result = await Share.share({
        message: `Check out Overlap – Holiday Calendar! Discover holidays & long weekends across countries. ${storeUrl}`,
      });
      
      if (result.action === Share.sharedAction) {
        console.log('Shared successfully');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Unable to share. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* App Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          <View style={styles.sectionContent}>
            <SettingsItem
              icon="information-circle-outline"
              title="About Overlap"
              subtitle="Learn more about the app"
              onPress={() => WebBrowser.openBrowserAsync('https://anadworld.com/overlap')}
            />
            <SettingsItem
              icon="share-outline"
              title="Share App"
              subtitle="Tell your friends"
              onPress={handleShareApp}
            />
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.sectionContent}>
            <View style={styles.settingsItem} testID="settings-notification-toggle">
              <View style={styles.settingsItemIcon}>
                <Ionicons name="notifications-outline" size={22} color="#7C9CBF" />
              </View>
              <View style={styles.settingsItemContent}>
                <Text style={styles.settingsItemTitle}>Holiday Reminders</Text>
                <Text style={styles.settingsItemSubtitle}>Get notified about your upcoming saved holiday.</Text>
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
                <Text style={styles.timingLabel}>Remind me</Text>
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

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.sectionContent}>
            <SettingsItem
              icon="help-circle-outline"
              title="Help & FAQ"
              subtitle="Get answers to common questions"
              onPress={() => WebBrowser.openBrowserAsync('https://anadworld.com/overlap-faq')}
            />
            <SettingsItem
              icon="mail-outline"
              title="Contact Support"
              subtitle="We're here to help"
              onPress={() => WebBrowser.openBrowserAsync('https://anadworld.com/overlap-contact')}
            />
          </View>
        </View>

        {/* Legal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <View style={styles.sectionContent}>
            <SettingsItem
              icon="document-text-outline"
              title="Terms of Use"
              subtitle="Terms and conditions"
              onPress={() => WebBrowser.openBrowserAsync('https://anadworld.com/overlap-terms-of-use')}
            />
            <SettingsItem
              icon="shield-checkmark-outline"
              title="Privacy Policy"
              subtitle="How we protect your data"
              onPress={() => WebBrowser.openBrowserAsync('https://anadworld.com/overlap-privacy-policy')}
            />
            <SettingsItem
              icon="code-outline"
              title="Open Source Licenses"
              subtitle="Third-party attributions"
              onPress={() => WebBrowser.openBrowserAsync('https://anadworld.com/overlap-open-source')}
            />
          </View>
        </View>

        {/* Version Info */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Overlap – Holiday Calendar</Text>
          <Text style={styles.versionNumber}>Version {APP_VERSION} ({BUILD_NUMBER})</Text>
          <Text style={styles.copyrightText}>© 2026 Overlap – Holiday Calendar. All rights reserved.</Text>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 10,
    paddingBottom: 16,
    backgroundColor: '#F8FAFC',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingsItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  settingsItemContent: {
    flex: 1,
  },
  settingsItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2D3748',
  },
  settingsItemSubtitle: {
    fontSize: 13,
    color: '#718096',
    marginTop: 2,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  versionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5568',
  },
  versionNumber: {
    fontSize: 14,
    color: '#718096',
    marginTop: 4,
  },
  copyrightText: {
    fontSize: 12,
    color: '#A0AEC0',
    marginTop: 8,
  },
  bottomPadding: {
    height: 40,
  },
  // Notification styles
  timingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  timingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A5568',
  },
  timingDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timingDropdownText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7C9CBF',
  },
  timingMenu: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  timingMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  timingMenuItemActive: {
    backgroundColor: '#F0F9FF',
  },
  timingMenuItemText: {
    fontSize: 14,
    color: '#4A5568',
  },
  timingMenuItemTextActive: {
    color: '#7C9CBF',
    fontWeight: '600',
  },
});
