import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { useBookmarks } from '../../src/hooks/useBookmarks';
import { useNotifications } from '../../src/hooks/useNotifications';
import { SavedCard } from '../../src/components/holiday/SavedCard';
import { setPendingRestore } from '../../src/store/pendingRestore';
import { Bookmark } from '../../src/types';

export default function SavedScreen() {
  const { bookmarks, reload, removeBookmark } = useBookmarks();
  const { cancelForBookmark } = useNotifications();
  const router = useRouter();

  // Reload bookmarks each time this tab is focused
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const handleDelete = async (bookmarkId: string) => {
    await cancelForBookmark(bookmarkId);
    await removeBookmark(bookmarkId);
  };

  const handleRestore = (bookmark: Bookmark) => {
    setPendingRestore(bookmark);
    router.navigate('/(tabs)/');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" translucent={false} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved Long Weekends</Text>
        <Text style={styles.headerSubtitle}>
          {bookmarks.length === 0
            ? 'Your favourites will appear here'
            : `${bookmarks.length} saved`}
        </Text>
      </View>

      {bookmarks.length === 0 ? (
        <View style={styles.emptyState} testID="saved-empty-state">
          <Ionicons name="bookmark-outline" size={64} color="#CBD5E0" />
          <Text style={styles.emptyTitle}>Nothing saved yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap the bookmark icon on any long weekend from the Home tab to save it here.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          testID="saved-list"
        >
          {bookmarks.map((bookmark) => (
            <SavedCard
              key={bookmark.id}
              bookmark={bookmark}
              onDelete={() => removeBookmark(bookmark.id)}
              onRestore={() => handleRestore(bookmark)}
            />
          ))}
          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
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
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#718096',
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4A5568',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  bottomPadding: { height: 40 },
});
