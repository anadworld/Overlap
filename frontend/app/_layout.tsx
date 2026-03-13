import '../src/i18n';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useUpdateCheck } from '../src/hooks/useUpdateCheck';
import { UpdatePrompt } from '../src/components/UpdatePrompt';

export default function RootLayout() {
  const { updateAvailable, forceUpdate, versionInfo, storeUrl } = useUpdateCheck();
  const [dismissed, setDismissed] = useState(false);

  const showPrompt = updateAvailable && (!dismissed || forceUpdate);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <View style={styles.container}>
          <Stack screenOptions={{ headerShown: false }} />
          <UpdatePrompt
            visible={showPrompt}
            forceUpdate={forceUpdate}
            latestVersion={versionInfo?.latestVersion}
            releaseNotes={versionInfo?.releaseNotes}
            storeUrl={storeUrl}
            onDismiss={() => setDismissed(true)}
          />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
});
