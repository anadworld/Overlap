import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

import { useHolidayData } from '../../src/hooks/useHolidayData';
import { useBookmarks } from '../../src/hooks/useBookmarks';
import { CountryPickerModal } from '../../src/components/holiday/CountryPickerModal';
import { YearPickerModal } from '../../src/components/holiday/YearPickerModal';
import { StatsBar } from '../../src/components/holiday/StatsBar';
import { CountryLegend } from '../../src/components/holiday/CountryLegend';
import { HolidayCard } from '../../src/components/holiday/HolidayCard';
import { LongWeekendCard } from '../../src/components/holiday/LongWeekendCard';
import { getCountryFlag, COUNTRY_COLORS } from '../../src/utils';
import { getPendingRestore, clearPendingRestore } from '../../src/store/pendingRestore';

export default function HomeScreen() {
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

  const { isBookmarked, toggleBookmark, reload: reloadBookmarks } = useBookmarks();

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
        <Text style={styles.headerSubtitle}>Find holidays & long weekends across countries</Text>
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
            <CountryLegend countries={comparisonResult.countries} />

            {activeTab === 'longweekends' && (
              <View style={styles.cardsContainer}>
                {comparisonResult.longWeekends?.length > 0 ? (
                  comparisonResult.longWeekends.map((lw, i) => (
                    <LongWeekendCard
                      key={`${lw.startDate}-${i}`}
                      lw={lw}
                      index={i}
                      countryNameMap={countryNameMap}
                      getCountryColor={getCountryColor}
                      isBookmarked={isBookmarked(lw, selectedYear, selectedCountries)}
                      onToggleBookmark={() =>
                        toggleBookmark(lw, selectedYear, selectedCountries, countryNameMap)
                      }
                    />
                  ))
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
              <Ionicons name="calendar" size={64} color="#CBD5E0" />
              <Text style={styles.emptyStateTitle}>Discover Holidays</Text>
              <Text style={styles.emptyStateText}>
                Tap above to select 1-5 countries and find holidays and long weekend opportunities.
              </Text>
              <TouchableOpacity
                style={styles.getStartedButton}
                onPress={() => setShowCountryPicker(true)}
                testID="get-started-btn"
              >
                <Text style={styles.getStartedButtonText}>Get Started</Text>
              </TouchableOpacity>
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
        onFind={compareHolidays}
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
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4A5568',
    marginTop: 16,
  },
  getStartedButton: {
    backgroundColor: '#7C9CBF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 24,
  },
  getStartedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
