import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Modal,
  Linking,
  Platform,
  Share,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
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
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showLicensesModal, setShowLicensesModal] = useState(false);
  const [showFaqModal, setShowFaqModal] = useState(false);
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

  const handleRateApp = async () => {
    let url: string;
    
    if (Platform.OS === 'ios') {
      // iOS App Store URL
      url = `itms-apps://apps.apple.com/app/id${APP_STORE_ID}?action=write-review`;
    } else {
      // Google Play Store URL
      url = `market://details?id=${PLAY_STORE_PACKAGE}`;
    }
    
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        // Fallback to web URLs
        const webUrl = Platform.OS === 'ios' 
          ? `https://apps.apple.com/app/id${APP_STORE_ID}`
          : `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}`;
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      console.error('Error opening store:', error);
      Alert.alert('Error', 'Unable to open the app store. Please try again later.');
    }
  };

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

  const renderModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    content: React.ReactNode
  ) => (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer} edges={['top', 'left', 'right']}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
            <Ionicons name="close" size={24} color="#4A5568" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {content}
          <View style={styles.modalBottomPadding} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

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
              onPress={() => setShowAboutModal(true)}
            />
            <SettingsItem
              icon="star-outline"
              title="Rate the App"
              subtitle="Love the app? Leave a review!"
              onPress={handleRateApp}
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
              onPress={() => setShowFaqModal(true)}
            />
            <SettingsItem
              icon="mail-outline"
              title="Contact Support"
              subtitle="We're here to help"
              onPress={handleContactSupport}
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
              onPress={() => setShowTermsModal(true)}
            />
            <SettingsItem
              icon="shield-checkmark-outline"
              title="Privacy Policy"
              subtitle="How we protect your data"
              onPress={() => setShowPrivacyModal(true)}
            />
            <SettingsItem
              icon="code-outline"
              title="Open Source Licenses"
              subtitle="Third-party attributions"
              onPress={() => setShowLicensesModal(true)}
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

      {/* About Modal */}
      {renderModal(showAboutModal, () => setShowAboutModal(false), 'About Overlap', (
        <View>
          <View style={styles.aboutHeader}>
            <View style={styles.appIconContainer}>
              <Ionicons name="calendar" size={48} color="#7C9CBF" />
            </View>
            <Text style={styles.aboutAppName}>Overlap – Holiday Calendar</Text>
            <Text style={styles.aboutVersion}>Version {APP_VERSION}</Text>
          </View>
          
          <Text style={styles.modalParagraph}>
            Overlap – Holiday Calendar is your go-to app for exploring public holidays and discovering the best opportunities 
            to maximize your time off. Whether you're planning a solo vacation in your home country, coordinating 
            international travel, or syncing schedules with global teams, we've got you covered.
          </Text>
          
          <Text style={styles.modalSubheading}>Key Features</Text>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#8FBC8F" />
              <Text style={styles.featureText}>View holidays for 1-5 countries at once</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#8FBC8F" />
              <Text style={styles.featureText}>100+ countries supported worldwide</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#8FBC8F" />
              <Text style={styles.featureText}>Smart long weekend detection (3-4+ days)</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#8FBC8F" />
              <Text style={styles.featureText}>Bridge day suggestions to maximize time off</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#8FBC8F" />
              <Text style={styles.featureText}>Identify overlapping holidays across countries</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#8FBC8F" />
              <Text style={styles.featureText}>Spot consecutive holiday streaks</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#8FBC8F" />
              <Text style={styles.featureText}>Save and bookmark your favourite long weekends</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#8FBC8F" />
              <Text style={styles.featureText}>Push notification reminders before saved holidays</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#8FBC8F" />
              <Text style={styles.featureText}>Share long weekends with friends and colleagues</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#8FBC8F" />
              <Text style={styles.featureText}>Add holidays directly to your personal calendar</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#8FBC8F" />
              <Text style={styles.featureText}>Monthly calendar preview with highlighted opportunities</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#8FBC8F" />
              <Text style={styles.featureText}>Plan ahead with multi-year support</Text>
            </View>
          </View>
          
          <Text style={styles.modalSubheading}>Long Weekend Detection</Text>
          <Text style={styles.modalParagraph}>
            Our smart algorithm automatically detects:{"\n"}
            • Friday holidays → 3-day weekends{"\n"}
            • Monday holidays → 3-day weekends{"\n"}
            • Thursday holidays → Bridge day opportunities{"\n"}
            • Tuesday holidays → Bridge day opportunities{"\n"}
            • Friday + Monday combos → 4-day weekends{"\n"}
            • Consecutive holidays → Extended time off
          </Text>
          
          <Text style={styles.modalSubheading}>Data Source</Text>
          <Text style={styles.modalParagraph}>
            Holiday data is provided by the Nager.Date API, a free and reliable source for public holiday 
            information worldwide.
          </Text>
        </View>
      ))}

      {/* Terms of Use Modal */}
      {renderModal(showTermsModal, () => setShowTermsModal(false), 'Terms of Use', (
        <View>
          <Text style={styles.modalLastUpdated}>Last Updated: February 2026</Text>
          
          <Text style={styles.modalSubheading}>1. Acceptance of Terms</Text>
          <Text style={styles.modalParagraph}>
            By downloading, installing, or using the Overlap – Holiday Calendar application ("App"), you agree to be 
            bound by these Terms of Use. If you do not agree to these terms, please do not use the App.
          </Text>
          
          <Text style={styles.modalSubheading}>2. Description of Service</Text>
          <Text style={styles.modalParagraph}>
            Overlap – Holiday Calendar provides information about public holidays in various countries. The App allows 
            users to view holidays for one or more countries, compare holidays across multiple countries, 
            identify overlapping dates, discover long weekend opportunities including bridge days and 
            consecutive holiday streaks, save favourite long weekends for quick access, receive push 
            notification reminders before upcoming saved holidays, and share holiday details with others.
          </Text>
          
          <Text style={styles.modalSubheading}>3. Accuracy of Information</Text>
          <Text style={styles.modalParagraph}>
            While we strive to provide accurate holiday information, we cannot guarantee the accuracy, 
            completeness, or timeliness of the data. Holiday dates may change based on government decisions, 
            religious observations, or other factors. Users should verify important dates through official 
            sources.
          </Text>
          
          <Text style={styles.modalSubheading}>4. User Conduct</Text>
          <Text style={styles.modalParagraph}>
            You agree to use the App only for lawful purposes and in accordance with these Terms. You agree 
            not to use the App in any way that could damage, disable, or impair the App or interfere with 
            any other party's use of the App.
          </Text>
          
          <Text style={styles.modalSubheading}>5. Intellectual Property</Text>
          <Text style={styles.modalParagraph}>
            The App and its original content, features, and functionality are owned by Overlap – Holiday Calendar and 
            are protected by international copyright, trademark, and other intellectual property laws.
          </Text>
          
          <Text style={styles.modalSubheading}>6. Disclaimer of Warranties</Text>
          <Text style={styles.modalParagraph}>
            THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS 
            OR IMPLIED. WE DO NOT WARRANT THAT THE APP WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
          </Text>
          
          <Text style={styles.modalSubheading}>7. Limitation of Liability</Text>
          <Text style={styles.modalParagraph}>
            IN NO EVENT SHALL OVERLAP – HOLIDAY CALENDAR BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, 
            OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF THE APP.
          </Text>
          
          <Text style={styles.modalSubheading}>8. Changes to Terms</Text>
          <Text style={styles.modalParagraph}>
            We reserve the right to modify these Terms at any time. We will notify users of any material 
            changes by updating the "Last Updated" date. Your continued use of the App after such changes 
            constitutes acceptance of the new Terms.
          </Text>
          
          <Text style={styles.modalSubheading}>9. Contact Information</Text>
          <Text style={styles.modalParagraph}>
            For questions about these Terms, please contact us at: overlap@anadworld.com
          </Text>
        </View>
      ))}

      {/* Privacy Policy Modal */}
      {renderModal(showPrivacyModal, () => setShowPrivacyModal(false), 'Privacy Policy', (
        <View>
          <Text style={styles.modalLastUpdated}>Last Updated: February 2026</Text>
          
          <Text style={styles.modalSubheading}>1. Introduction</Text>
          <Text style={styles.modalParagraph}>
            Overlap – Holiday Calendar ("we," "our," or "us") is committed to protecting your privacy. This Privacy 
            Policy explains how we collect, use, and safeguard your information when you use our mobile 
            application.
          </Text>
          
          <Text style={styles.modalSubheading}>2. Information We Collect</Text>
          <Text style={styles.modalParagraph}>
            <Text style={styles.modalBold}>Information You Provide:</Text> We do not require you to create 
            an account or provide personal information to use the App.
          </Text>
          <Text style={styles.modalParagraph}>
            <Text style={styles.modalBold}>Automatically Collected Information:</Text> We may collect 
            certain information automatically, including device type, operating system version, and app 
            usage statistics to improve our service.
          </Text>
          
          <Text style={styles.modalSubheading}>3. How We Use Your Information</Text>
          <Text style={styles.modalParagraph}>
            We use the information we collect to:
            {"\n"}• Provide and maintain the App
            {"\n"}• Display holiday data and long weekend opportunities
            {"\n"}• Store your saved long weekends locally on your device
            {"\n"}• Schedule local notification reminders for saved holidays
            {"\n"}• Improve user experience
            {"\n"}• Analyze usage patterns
            {"\n"}• Fix bugs and technical issues
          </Text>
          
          <Text style={styles.modalSubheading}>4. Data Storage and Security</Text>
          <Text style={styles.modalParagraph}>
            Your country selections, saved long weekends, and notification preferences are stored locally 
            on your device using AsyncStorage. Holiday data is fetched in real-time from our servers. 
            Notification reminders are scheduled locally on your device and are not sent through external 
            servers. We implement appropriate security measures to protect against unauthorized access 
            to or alteration of your data.
          </Text>
          
          <Text style={styles.modalSubheading}>5. Third-Party Services</Text>
          <Text style={styles.modalParagraph}>
            The App uses the Nager.Date API to retrieve holiday information. This third-party service may 
            collect certain technical information. We encourage you to review their privacy policy.
          </Text>
          
          <Text style={styles.modalSubheading}>6. Children's Privacy</Text>
          <Text style={styles.modalParagraph}>
            Our App is not directed to children under 13. We do not knowingly collect personal information 
            from children under 13. If you believe we have collected such information, please contact us.
          </Text>
          
          <Text style={styles.modalSubheading}>7. Your Rights</Text>
          <Text style={styles.modalParagraph}>
            You have the right to:
            {"\n"}• Access your personal data
            {"\n"}• Request deletion of your data
            {"\n"}• Opt out of analytics collection
            {"\n"}• Request a copy of your data
          </Text>
          
          <Text style={styles.modalSubheading}>8. Changes to This Policy</Text>
          <Text style={styles.modalParagraph}>
            We may update this Privacy Policy from time to time. We will notify you of any changes by 
            posting the new Privacy Policy in the App and updating the "Last Updated" date.
          </Text>
          
          <Text style={styles.modalSubheading}>9. Contact Us</Text>
          <Text style={styles.modalParagraph}>
            If you have questions or concerns about this Privacy Policy, please contact us at:
            {"\n"}Email: overlap@anadworld.com
          </Text>
        </View>
      ))}

      {/* Licenses Modal */}
      {renderModal(showLicensesModal, () => setShowLicensesModal(false), 'Open Source Licenses', (
        <View>
          <Text style={styles.modalParagraph}>
            Overlap – Holiday Calendar uses the following open source software:
          </Text>
          
          <Text style={styles.licenseTitle}>React Native</Text>
          <Text style={styles.licenseText}>MIT License - Copyright (c) Meta Platforms, Inc.</Text>
          
          <Text style={styles.licenseTitle}>Expo</Text>
          <Text style={styles.licenseText}>MIT License - Copyright (c) 2015-present 650 Industries, Inc.</Text>
          
          <Text style={styles.licenseTitle}>Nager.Date API</Text>
          <Text style={styles.licenseText}>MIT License - Free public holiday API</Text>
          
          <Text style={styles.licenseTitle}>@expo/vector-icons</Text>
          <Text style={styles.licenseText}>MIT License - Icon library for Expo</Text>
          
          <Text style={styles.licenseTitle}>react-native-safe-area-context</Text>
          <Text style={styles.licenseText}>MIT License - Safe area handling for React Native</Text>
          
          <Text style={styles.licenseTitle}>@react-native-async-storage/async-storage</Text>
          <Text style={styles.licenseText}>MIT License - Local data storage for React Native</Text>
          
          <Text style={styles.licenseTitle}>expo-notifications</Text>
          <Text style={styles.licenseText}>MIT License - Local push notifications for Expo</Text>
          
          <Text style={styles.licenseTitle}>react-native-reanimated</Text>
          <Text style={styles.licenseText}>MIT License - Animations library for React Native</Text>
          
          <View style={styles.licenseDivider} />
          
          <Text style={styles.modalParagraph}>
            The MIT License grants permission to use, copy, modify, merge, publish, distribute, sublicense, 
            and/or sell copies of the software, subject to including the copyright notice and permission 
            notice in all copies.
          </Text>
          
          <Text style={styles.modalParagraph}>
            For full license texts and additional attributions, please visit our website or contact us at overlap@anadworld.com.
          </Text>
        </View>
      ))}

      {/* FAQ Modal */}
      {renderModal(showFaqModal, () => setShowFaqModal(false), 'Help & FAQ', (
        <View>
          <Text style={styles.modalSubheading}>How do I use the app?</Text>
          <Text style={styles.modalParagraph}>
            1. Tap the selection bar to choose 1-5 countries{"\n"}
            2. Select a year from the dropdown{"\n"}
            3. Browse holidays, overlaps, or long weekends using the colored cards
          </Text>
          
          <Text style={styles.modalSubheading}>What are "Overlaps"?</Text>
          <Text style={styles.modalParagraph}>
            Overlaps are dates when ALL your selected countries have a public holiday on the same day. 
            Perfect for planning trips or meetings when everyone has the day off!
          </Text>
          
          <Text style={styles.modalSubheading}>What is a "Long Weekend"?</Text>
          <Text style={styles.modalParagraph}>
            A long weekend is when a public holiday falls near a weekend, giving you 3 or more 
            consecutive days off. We detect Friday holidays (3 days), Monday holidays (3 days), 
            and combinations that create 4+ day breaks.
          </Text>
          
          <Text style={styles.modalSubheading}>What is a "Bridge Day"?</Text>
          <Text style={styles.modalParagraph}>
            A bridge day is when a holiday falls on Thursday or Tuesday. By taking just one day off 
            (Friday or Monday), you can create a 4-day weekend! Look for the yellow suggestions.
          </Text>
          
          <Text style={styles.modalSubheading}>How many countries can I compare?</Text>
          <Text style={styles.modalParagraph}>
            You can select between 1 and 5 countries at a time. With just 1 country, you'll see 
            all holidays and long weekends. With 2-5 countries, you'll also see overlapping dates.
          </Text>
          
          <Text style={styles.modalSubheading}>How far ahead can I plan?</Text>
          <Text style={styles.modalParagraph}>
            The app supports multiple years of holiday data. Use the year dropdown to explore 
            past and future holidays for your vacation planning.
          </Text>
          
          <Text style={styles.modalSubheading}>Can I share my findings?</Text>
          <Text style={styles.modalParagraph}>
            Yes! Tap the share icon on any long weekend card to share the dates and holiday 
            details with friends, family, or colleagues via WhatsApp, Messages, email, or any sharing app.
          </Text>
          
          <Text style={styles.modalSubheading}>How do I save a long weekend?</Text>
          <Text style={styles.modalParagraph}>
            Tap the bookmark icon on any long weekend card to save it. Your saved long weekends 
            appear in the "Saved" tab for quick access. Tap the bookmark again to remove it, or 
            swipe left on a saved long weekend in the "Saved" tab to delete it.
          </Text>
          
          <Text style={styles.modalSubheading}>How do holiday reminders work?</Text>
          <Text style={styles.modalParagraph}>
            When you save a long weekend, Overlap can send you a push notification before it starts. 
            Go to Settings and toggle "Holiday Reminders" on. You can choose to be reminded 1 day, 
            3 days, 1 week, 2 weeks, or 1 month before. Reminders are scheduled locally on your 
            device and work even without an internet connection.
          </Text>
          
          <Text style={styles.modalSubheading}>How do I change reminder timing?</Text>
          <Text style={styles.modalParagraph}>
            In Settings under "Notifications", tap the dropdown next to "Remind me" and choose 
            your preferred timing. All existing reminders will be rescheduled automatically.
          </Text>
          
          <Text style={styles.modalSubheading}>Where does the holiday data come from?</Text>
          <Text style={styles.modalParagraph}>
            We use the Nager.Date API, a reliable source for public holiday information covering 
            100+ countries worldwide. Data is updated regularly to reflect official changes.
          </Text>
          
          <Text style={styles.modalSubheading}>Still have questions?</Text>
          <Text style={styles.modalParagraph}>
            Contact us at overlap@anadworld.com and we'll be happy to help!
          </Text>
        </View>
      ))}
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
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D3748',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalBottomPadding: {
    height: 40,
  },
  modalLastUpdated: {
    fontSize: 12,
    color: '#718096',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  modalSubheading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginTop: 20,
    marginBottom: 8,
  },
  modalParagraph: {
    fontSize: 14,
    lineHeight: 22,
    color: '#4A5568',
    marginBottom: 12,
  },
  modalBold: {
    fontWeight: '600',
  },
  // About modal styles
  aboutHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 20,
  },
  appIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  aboutAppName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  aboutVersion: {
    fontSize: 14,
    color: '#718096',
    marginTop: 4,
  },
  featureList: {
    marginTop: 8,
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#4A5568',
    flex: 1,
  },
  // License styles
  licenseTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3748',
    marginTop: 16,
    marginBottom: 4,
  },
  licenseText: {
    fontSize: 13,
    color: '#718096',
  },
  licenseDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 20,
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
