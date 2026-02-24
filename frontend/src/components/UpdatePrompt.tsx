import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface UpdatePromptProps {
  visible: boolean;
  forceUpdate: boolean;
  latestVersion?: string;
  releaseNotes?: string;
  storeUrl?: string;
  onDismiss: () => void;
}

export const UpdatePrompt: React.FC<UpdatePromptProps> = ({
  visible,
  forceUpdate,
  latestVersion,
  releaseNotes,
  storeUrl,
  onDismiss,
}) => {
  const handleUpdate = async () => {
    if (storeUrl) {
      try {
        await Linking.openURL(storeUrl);
      } catch {
        // fallback
        const webUrl =
          Platform.OS === 'ios'
            ? 'https://apps.apple.com/app/id6740092498'
            : 'https://play.google.com/store/apps/details?id=com.anadworld.overlap';
        await Linking.openURL(webUrl);
      }
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={forceUpdate ? undefined : onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="arrow-up-circle" size={48} color="#7C9CBF" />
          </View>

          <Text style={styles.title}>
            {forceUpdate ? 'Update Required' : 'Update Available'}
          </Text>

          <Text style={styles.body}>
            {forceUpdate
              ? `A required update (v${latestVersion}) is available. Please update to continue using the app.`
              : `A new version (v${latestVersion}) is available with improvements and fixes.`}
          </Text>

          {releaseNotes ? (
            <Text style={styles.notes}>{releaseNotes}</Text>
          ) : null}

          <TouchableOpacity
            style={styles.updateBtn}
            onPress={handleUpdate}
            testID="update-now-button"
          >
            <Ionicons name="download-outline" size={18} color="#FFFFFF" />
            <Text style={styles.updateBtnText}>Update Now</Text>
          </TouchableOpacity>

          {!forceUpdate && (
            <TouchableOpacity
              style={styles.laterBtn}
              onPress={onDismiss}
              testID="update-later-button"
            >
              <Text style={styles.laterBtnText}>Maybe Later</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 8,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: '#4A5568',
    textAlign: 'center',
    marginBottom: 12,
  },
  notes: {
    fontSize: 13,
    lineHeight: 19,
    color: '#718096',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  updateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#7C9CBF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    justifyContent: 'center',
    marginTop: 4,
  },
  updateBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  laterBtn: {
    marginTop: 14,
    paddingVertical: 8,
  },
  laterBtnText: {
    color: '#718096',
    fontSize: 14,
    fontWeight: '500',
  },
});
