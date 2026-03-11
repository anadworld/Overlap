import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

import { useHolidayData } from '../../src/hooks/useHolidayData';
import { useBookmarks } from '../../src/hooks/useBookmarks';
import { useNotifications } from '../../src/hooks/useNotifications';
import { useFavoriteCountries } from '../../src/hooks/useFavoriteCountries';
import { useRecentSearches } from '../../src/hooks/useRecentSearches';
import { CountryPickerModal } from '../../src/components/holiday/CountryPickerModal';
import { YearPickerModal } from '../../src/components/holiday/YearPickerModal';
import { StatsBar } from '../../src/components/holiday/StatsBar';
import { CountryLegend } from '../../src/components/holiday/CountryLegend';
import { HolidayCard } from '../../src/components/holiday/HolidayCard';
import { LongWeekendCard } from '../../src/components/holiday/LongWeekendCard';
import { MonthCalendar } from '../../src/components/holiday/MonthCalendar';
import { AddToCalendarButton } from '../../src/components/holiday/AddToCalendarButton';
import { getCountryFlag, COUNTRY_COLORS } from '../../src/utils';
import { getPendingRestore, clearPendingRestore } from '../../src/store/pendingRestore';

function AnimatedPlane() {
  const rotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 6000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [rotation]);

  const translateX = rotation.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, 44, 0, -44, 0],
  });
  const translateY = rotation.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [-44, 0, 44, 0, -44],
  });
  const rotate = rotation.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['45deg', '135deg', '225deg', '315deg', '405deg'],
  });
  const scale = rotation.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [1, 0.85, 0.7, 0.85, 1],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        transform: [{ translateX }, { translateY }, { rotate }, { scale }],
      }}
    >
      <Ionicons name="paper-plane" size={20} color="#F6AD55" />
    </Animated.View>
  );
}

export default function HomeScreen() {
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(new Set());
  const {
    countries,
    selectedCountries,
    setSelectedCountries,
    selectedYear,
    setSelectedYear,
    comparisonResult,
    isLoading,
    error,
    refreshing,
    activeTab,
    setActiveTab,
    compareHolidays,
    toggleCountry,
    onRefresh,
  } = useHolidayData();

  const { isBookmarked, toggleBookmark, reload: reloadBookmarks, bookmarks } = useBookmarks();
  const { scheduleForBookmark, cancelForBookmark } = useNotifications();
  const { favorites, toggleFavorite } = useFavoriteCountries();
  const { recentSearches, saveSearch } = useRecentSearches();

  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  // On tab focus: reload bookmarks + apply any pending restore from Saved tab
  useFocusEffect(
    useCallback(() => {
      reloadBookmarks();
      const restore = getPendingRestore();
      if (restore) {
        clearPendingRestore();
        setSelectedCountries(restore.countries);
        setSelectedYear(restore.year);
        compareHolidays(restore.year, restore.countries);
      }
    }, [reloadBookmarks, compareHolidays, setSelectedCountries, setSelectedYear])
  );

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 12 }, (_, i) => currentYear - 2 + i);

  const countryNameMap =
    comparisonResult?.countries.reduce((acc, c) => {
      acc[c.countryCode] = c.name;
      return acc;
    }, {} as Record<string, string>) || {};

  const getCountryColor = (code: string) => {
    const index = comparisonResult?.countries.findIndex((c) => c.countryCode === code) ?? 0;
    return COUNTRY_COLORS[Math.max(index, 0) % COUNTRY_COLORS.length];
  };

  const totalHolidays = comparisonResult?.holidays.length || 0;
  const totalOverlaps = comparisonResult?.totalOverlaps || 0;
  const totalLongWeekends = comparisonResult?.longWeekends?.length || 0;
  const overlappingHolidays = comparisonResult?.holidays.filter((h) => h.isOverlap) || [];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" translucent={false} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Overlap – Holiday Calendar</Text>
        <Text style={styles.headerSubtitle}>Discover holidays & long weekends across countries</Text>
      </View>

      {/* Selection Bar */}
      <TouchableOpacity
        style={styles.selectionBar}
        onPress={() => setShowCountryPicker(true)}
        activeOpacity={0.7}
        testID="selection-bar"
      >
        <View style={styles.selectionInfo}>
          {selectedCountries.length > 0 ? (
            <View style={styles.selectedFlags}>
              {selectedCountries.map((c) => (
                <Text key={c.countryCode} style={styles.flagEmoji}>
                  {getCountryFlag(c.countryCode)}
                </Text>
              ))}
            </View>
          ) : (
            <Text style={styles.placeholderText}>Tap to select countries</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.yearDropdown}
          onPress={(e) => {
            e.stopPropagation();
            setShowYearPicker(true);
          }}
          testID="year-dropdown"
        >
          <Text style={styles.yearText}>{selectedYear}</Text>
          <Ionicons name="chevron-down" size={18} color="#7C9CBF" />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Error */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color="#E57373" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Results */}
      {comparisonResult ? (
        <>
          <StatsBar
            totalHolidays={totalHolidays}
            totalOverlaps={totalOverlaps}
            totalLongWeekends={totalLongWeekends}
            activeTab={activeTab}
            selectedCountries={selectedCountries}
            onTabChange={setActiveTab}
          />

          <ScrollView
            style={styles.resultsContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C9CBF" />
            }
          >
            {/* Stats bar and results */}

            {activeTab === 'longweekends' && (
              <View style={styles.cardsContainer}>
                {comparisonResult.longWeekends?.length > 0 ? (
                  (() => {
                    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                    const grouped: Record<number, typeof comparisonResult.longWeekends> = {};
                    for (const lw of comparisonResult.longWeekends) {
                      const m = new Date(lw.startDate + 'T00:00:00').getMonth();
                      if (!grouped[m]) grouped[m] = [];
                      grouped[m].push(lw);
                    }
                    const monthKeys = Object.keys(grouped).map(Number).sort((a, b) => a - b);

                    return monthKeys.map((m) => (
                      <View key={m}>
                        <TouchableOpacity
                          style={styles.monthHeader}
                          onPress={() => {
                            setExpandedMonths((prev) => {
                              const next = new Set(prev);
                              if (next.has(m)) next.delete(m);
                              else next.add(m);
                              return next;
                            });
                          }}
                          testID={`month-header-${m}`}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons
                              name={expandedMonths.has(m) ? 'calendar' : 'calendar-outline'}
                              size={18}
                              color={expandedMonths.has(m) ? '#7C9CBF' : '#A0AEC0'}
                            />
                            <Text style={styles.monthTitle}>{MONTHS[m]}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={styles.monthCount}>
                              {grouped[m].length} {grouped[m].length === 1 ? 'opportunity' : 'opportunities'}
                            </Text>
                            <Ionicons
                              name={expandedMonths.has(m) ? 'chevron-up' : 'chevron-down'}
                              size={16}
                              color="#A0AEC0"
                            />
                          </View>
                        </TouchableOpacity>
                        {expandedMonths.has(m) && (
                          <MonthCalendar
                            year={selectedYear}
                            month={m}
                            longWeekends={grouped[m]}
                          />
                        )}
                        {grouped[m].map((lw, i) => (
                          <LongWeekendCard
                            key={`${lw.startDate}-${i}`}
                            lw={lw}
                            index={i}
                            countryNameMap={countryNameMap}
                            getCountryColor={getCountryColor}
                            isBookmarked={isBookmarked(lw, selectedYear, selectedCountries)}
                            onToggleBookmark={async () => {
                              const wasBookmarked = isBookmarked(lw, selectedYear, selectedCountries);
                              await toggleBookmark(lw, selectedYear, selectedCountries, countryNameMap);
                              if (!wasBookmarked) {
                                const newBookmark = {
                                  id: '',
                                  savedAt: new Date().toISOString(),
                                  year: selectedYear,
                                  countries: selectedCountries,
                                  lw,
                                  countryNameMap,
                                };
                                scheduleForBookmark(newBookmark);
                              }
                            }}
                          />
                        ))}
                      </View>
                    ));
                  })()
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="sunny-outline" size={48} color="#CBD5E0" />
                    <Text style={styles.emptyStateText}>No long weekend opportunities found</Text>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'holidays' && (
              <View style={styles.cardsContainer}>
                <AddToCalendarButton
                  holidays={comparisonResult.holidays}
                  selectedCountries={selectedCountries}
                  countryNameMap={countryNameMap}
                />
                {comparisonResult.holidays.map((holiday) => (
                  <HolidayCard
                    key={holiday.date}
                    holiday={holiday}
                    countryNameMap={countryNameMap}
                    getCountryColor={getCountryColor}
                  />
                ))}
              </View>
            )}

            {activeTab === 'overlaps' && (
              <View style={styles.cardsContainer}>
                {overlappingHolidays.length > 0 ? (
                  overlappingHolidays.map((holiday) => (
                    <HolidayCard
                      key={holiday.date}
                      holiday={holiday}
                      countryNameMap={countryNameMap}
                      getCountryColor={getCountryColor}
                    />
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="link-outline" size={48} color="#CBD5E0" />
                    <Text style={styles.emptyStateText}>No overlapping holidays found</Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.bottomPadding} />
          </ScrollView>
        </>
      ) : (
        <View style={styles.emptyStateContainer}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#7C9CBF" />
          ) : (
            <>
              <View style={styles.heroAnimation}>
                <View style={styles.globeCircle}>
                  <Ionicons name="globe-outline" size={52} color="#7C9CBF" />
                </View>
                <AnimatedPlane />
              </View>
              <Text style={styles.emptyStateTagline}>Your next long weekend is waiting</Text>
              <Text style={styles.emptyStateText}>
                Tap above to select 1-5 countries and find holidays and long weekend opportunities.
              </Text>
            </>
          )}
        </View>
      )}

      <CountryPickerModal
        visible={showCountryPicker}
        countries={countries}
        selectedCountries={selectedCountries}
        isLoading={isLoading}
        onClose={() => setShowCountryPicker(false)}
        onToggleCountry={toggleCountry}
        onClearAll={() => setSelectedCountries([])}
        onFind={() => { saveSearch(selectedCountries); compareHolidays(); }}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        recentSearches={recentSearches}
        onRestoreSearch={(countries) => { setSelectedCountries(countries); }}
      />

      <YearPickerModal
        visible={showYearPicker}
        selectedYear={selectedYear}
        yearOptions={yearOptions}
        onClose={() => setShowYearPicker(false)}
        onSelect={(year) => {
          setSelectedYear(year);
          setShowYearPicker(false);
          if (selectedCountries.length > 0) compareHolidays(year);
        }}
      />
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
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedFlags: {
    flexDirection: 'row',
    gap: 4,
  },
  flagEmoji: { fontSize: 24 },
  placeholderText: {
    fontSize: 16,
    color: '#A0AEC0',
  },
  yearDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 6,
  },
  yearText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7C9CBF',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    flex: 1,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  cardsContainer: { gap: 12 },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginTop: 8,
    marginBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
  },
  monthCount: {
    fontSize: 13,
    color: '#718096',
    fontWeight: '500',
  },
  bottomPadding: { height: 40 },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  heroAnimation: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  globeCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#D4E6F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTagline: {
    fontSize: 17,
    fontWeight: '500',
    color: '#718096',
    letterSpacing: 0.3,
    marginBottom: 8,
    fontStyle: 'italic',
  },
});
