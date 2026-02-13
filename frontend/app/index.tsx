import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Platform,
  Dimensions,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const { width } = Dimensions.get('window');

// Country flag emoji helper
const getCountryFlag = (countryCode: string): string => {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

// Types
interface Country {
  countryCode: string;
  name: string;
}

interface HolidayDetail {
  countryCode: string;
  name: string;
  localName: string;
  types: string[];
}

interface HolidayWithCountries {
  date: string;
  holidays: HolidayDetail[];
  isOverlap: boolean;
  countries: string[];
}

interface CompareResponse {
  year: number;
  countries: Country[];
  holidays: HolidayWithCountries[];
  totalOverlaps: number;
}

// Color palette for countries
const COUNTRY_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
];

export default function HolidayCompareApp() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<Country[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [comparisonResult, setComparisonResult] = useState<CompareResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOnlyOverlaps, setShowOnlyOverlaps] = useState(false);

  // Fetch available countries
  const fetchCountries = useCallback(async () => {
    try {
      setIsLoadingCountries(true);
      setError(null);
      const response = await fetch(`${BACKEND_URL}/api/countries`);
      if (!response.ok) throw new Error('Failed to fetch countries');
      const data = await response.json();
      setCountries(data);
    } catch (err) {
      setError('Failed to load countries. Please try again.');
      console.error('Error fetching countries:', err);
    } finally {
      setIsLoadingCountries(false);
    }
  }, []);

  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

  // Compare holidays
  const compareHolidays = async () => {
    if (selectedCountries.length < 2) {
      setError('Please select at least 2 countries to compare');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`${BACKEND_URL}/api/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countryCodes: selectedCountries.map((c) => c.countryCode),
          year: selectedYear,
        }),
      });

      if (!response.ok) throw new Error('Failed to compare holidays');
      const data = await response.json();
      setComparisonResult(data);
    } catch (err) {
      setError('Failed to compare holidays. Please try again.');
      console.error('Error comparing holidays:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (selectedCountries.length >= 2) {
      await compareHolidays();
    }
    setRefreshing(false);
  };

  // Toggle country selection
  const toggleCountry = (country: Country) => {
    const isSelected = selectedCountries.find((c) => c.countryCode === country.countryCode);
    if (isSelected) {
      setSelectedCountries(selectedCountries.filter((c) => c.countryCode !== country.countryCode));
    } else if (selectedCountries.length < 5) {
      setSelectedCountries([...selectedCountries, country]);
    }
  };

  // Filter countries by search
  const filteredCountries = countries.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.countryCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get color for country
  const getCountryColor = (countryCode: string): string => {
    const index = selectedCountries.findIndex((c) => c.countryCode === countryCode);
    return COUNTRY_COLORS[index % COUNTRY_COLORS.length];
  };

  // Format date
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get month name
  const getMonthName = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'long' });
  };

  // Group holidays by month
  const groupedHolidays = comparisonResult?.holidays.reduce((acc, holiday) => {
    const month = getMonthName(holiday.date);
    if (!acc[month]) acc[month] = [];
    acc[month].push(holiday);
    return acc;
  }, {} as Record<string, HolidayWithCountries[]>);

  // Year options
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);

  // Render holiday item
  const renderHolidayItem = (holiday: HolidayWithCountries) => {
    if (showOnlyOverlaps && !holiday.isOverlap) return null;

    return (
      <View
        key={holiday.date}
        style={[
          styles.holidayCard,
          holiday.isOverlap && styles.overlapCard,
        ]}
      >
        <View style={styles.holidayHeader}>
          <Text style={styles.holidayDate}>{formatDate(holiday.date)}</Text>
          {holiday.isOverlap && (
            <View style={styles.overlapBadge}>
              <Ionicons name="link" size={12} color="#FFF" />
              <Text style={styles.overlapBadgeText}>Overlap</Text>
            </View>
          )}
        </View>

        {holiday.holidays.map((h, index) => (
          <View key={`${h.countryCode}-${index}`} style={styles.holidayDetail}>
            <View
              style={[
                styles.countryIndicator,
                { backgroundColor: getCountryColor(h.countryCode) },
              ]}
            />
            <Text style={styles.countryFlag}>
              {getCountryFlag(h.countryCode)}
            </Text>
            <View style={styles.holidayInfo}>
              <Text style={styles.holidayName}>{h.name}</Text>
              {h.localName !== h.name && (
                <Text style={styles.localName}>{h.localName}</Text>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Holiday Compare</Text>
        <Text style={styles.headerSubtitle}>
          Compare public holidays across countries
        </Text>
      </View>

      {/* Selection Area */}
      <View style={styles.selectionArea}>
        {/* Country Selector */}
        <TouchableOpacity
          style={styles.selectorButton}
          onPress={() => setShowCountryPicker(true)}
          disabled={isLoadingCountries}
        >
          <View style={styles.selectorContent}>
            <Ionicons name="globe-outline" size={20} color="#3B82F6" />
            <Text style={styles.selectorLabel}>Countries</Text>
          </View>
          <View style={styles.selectorValue}>
            {isLoadingCountries ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : selectedCountries.length > 0 ? (
              <View style={styles.selectedFlags}>
                {selectedCountries.map((c) => (
                  <Text key={c.countryCode} style={styles.flagEmoji}>
                    {getCountryFlag(c.countryCode)}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.placeholderText}>Select 2-5 countries</Text>
            )}
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </View>
        </TouchableOpacity>

        {/* Year Selector */}
        <TouchableOpacity
          style={styles.selectorButton}
          onPress={() => setShowYearPicker(true)}
        >
          <View style={styles.selectorContent}>
            <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
            <Text style={styles.selectorLabel}>Year</Text>
          </View>
          <View style={styles.selectorValue}>
            <Text style={styles.selectedValue}>{selectedYear}</Text>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </View>
        </TouchableOpacity>

        {/* Compare Button */}
        <TouchableOpacity
          style={[
            styles.compareButton,
            selectedCountries.length < 2 && styles.compareButtonDisabled,
          ]}
          onPress={compareHolidays}
          disabled={selectedCountries.length < 2 || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="git-compare-outline" size={20} color="#FFF" />
              <Text style={styles.compareButtonText}>Compare Holidays</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Results */}
      {comparisonResult && (
        <ScrollView
          style={styles.resultsContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
          }
        >
          {/* Stats Card */}
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{comparisonResult.holidays.length}</Text>
              <Text style={styles.statLabel}>Total Holidays</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#10B981' }]}>
                {comparisonResult.totalOverlaps}
              </Text>
              <Text style={styles.statLabel}>Overlapping Dates</Text>
            </View>
          </View>

          {/* Country Legend */}
          <View style={styles.legendContainer}>
            {comparisonResult.countries.map((country, index) => (
              <View key={country.countryCode} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendColor,
                    { backgroundColor: COUNTRY_COLORS[index % COUNTRY_COLORS.length] },
                  ]}
                />
                <Text style={styles.legendFlag}>
                  {getCountryFlag(country.countryCode)}
                </Text>
                <Text style={styles.legendText} numberOfLines={1}>
                  {country.name}
                </Text>
              </View>
            ))}
          </View>

          {/* Filter Toggle */}
          <TouchableOpacity
            style={styles.filterToggle}
            onPress={() => setShowOnlyOverlaps(!showOnlyOverlaps)}
          >
            <Ionicons
              name={showOnlyOverlaps ? 'checkbox' : 'square-outline'}
              size={20}
              color="#3B82F6"
            />
            <Text style={styles.filterToggleText}>Show only overlapping holidays</Text>
          </TouchableOpacity>

          {/* Holidays by Month */}
          {groupedHolidays &&
            Object.entries(groupedHolidays).map(([month, holidays]) => {
              const visibleHolidays = showOnlyOverlaps
                ? holidays.filter((h) => h.isOverlap)
                : holidays;

              if (visibleHolidays.length === 0) return null;

              return (
                <View key={month} style={styles.monthSection}>
                  <Text style={styles.monthTitle}>{month}</Text>
                  {visibleHolidays.map(renderHolidayItem)}
                </View>
              );
            })}

          <View style={styles.bottomPadding} />
        </ScrollView>
      )}

      {/* Empty State */}
      {!comparisonResult && !isLoading && (
        <View style={styles.emptyState}>
          <Ionicons name="calendar" size={64} color="#4B5563" />
          <Text style={styles.emptyStateTitle}>Compare Public Holidays</Text>
          <Text style={styles.emptyStateText}>
            Select 2-5 countries and a year to see all public holidays and find overlapping dates.
          </Text>
        </View>
      )}

      {/* Country Picker Modal */}
      <Modal
        visible={showCountryPicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Countries</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCountryPicker(false)}
            >
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalSubheader}>
            <Text style={styles.modalSubtitle}>
              {selectedCountries.length}/5 selected
            </Text>
            {selectedCountries.length > 0 && (
              <TouchableOpacity onPress={() => setSelectedCountries([])}>
                <Text style={styles.clearButton}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search countries..."
              placeholderTextColor="#6B7280"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>

          {/* Country List */}
          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item.countryCode}
            renderItem={({ item }) => {
              const isSelected = selectedCountries.find(
                (c) => c.countryCode === item.countryCode
              );
              return (
                <TouchableOpacity
                  style={[
                    styles.countryItem,
                    isSelected && styles.countryItemSelected,
                  ]}
                  onPress={() => toggleCountry(item)}
                >
                  <Text style={styles.countryItemFlag}>
                    {getCountryFlag(item.countryCode)}
                  </Text>
                  <View style={styles.countryItemInfo}>
                    <Text style={styles.countryItemName}>{item.name}</Text>
                    <Text style={styles.countryItemCode}>{item.countryCode}</Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                  )}
                </TouchableOpacity>
              );
            }}
            style={styles.countryList}
          />

          {/* Done Button */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setShowCountryPicker(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Year Picker Modal */}
      <Modal
        visible={showYearPicker}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.yearPickerOverlay}>
          <View style={styles.yearPickerContainer}>
            <Text style={styles.yearPickerTitle}>Select Year</Text>
            {yearOptions.map((year) => (
              <TouchableOpacity
                key={year}
                style={[
                  styles.yearOption,
                  year === selectedYear && styles.yearOptionSelected,
                ]}
                onPress={() => {
                  setSelectedYear(year);
                  setShowYearPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.yearOptionText,
                    year === selectedYear && styles.yearOptionTextSelected,
                  ]}
                >
                  {year}
                </Text>
                {year === selectedYear && (
                  <Ionicons name="checkmark" size={20} color="#3B82F6" />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.yearPickerCancel}
              onPress={() => setShowYearPicker(false)}
            >
              <Text style={styles.yearPickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  selectionArea: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  selectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectorLabel: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '500',
  },
  selectorValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedFlags: {
    flexDirection: 'row',
    gap: 4,
  },
  flagEmoji: {
    fontSize: 20,
  },
  placeholderText: {
    fontSize: 14,
    color: '#6B7280',
  },
  selectedValue: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '500',
  },
  compareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  compareButtonDisabled: {
    backgroundColor: '#374151',
  },
  compareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7F1D1D',
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 14,
    flex: 1,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#374151',
    marginHorizontal: 16,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  legendColor: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendFlag: {
    fontSize: 14,
  },
  legendText: {
    fontSize: 12,
    color: '#E5E7EB',
    maxWidth: 80,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  filterToggleText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  monthSection: {
    marginBottom: 20,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 12,
  },
  holidayCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  overlapCard: {
    borderWidth: 1,
    borderColor: '#10B981',
  },
  holidayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  holidayDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  overlapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
  },
  overlapBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
  },
  holidayDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  countryIndicator: {
    width: 4,
    height: 32,
    borderRadius: 2,
  },
  countryFlag: {
    fontSize: 20,
  },
  holidayInfo: {
    flex: 1,
  },
  holidayName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFF',
  },
  localName: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  bottomPadding: {
    height: 40,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalSubheader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  clearButton: {
    fontSize: 14,
    color: '#3B82F6',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFF',
  },
  countryList: {
    flex: 1,
    marginTop: 8,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  countryItemSelected: {
    backgroundColor: '#1E3A5F',
  },
  countryItemFlag: {
    fontSize: 28,
    marginRight: 12,
  },
  countryItemInfo: {
    flex: 1,
  },
  countryItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFF',
  },
  countryItemCode: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  doneButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  yearPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearPickerContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    width: width * 0.8,
    maxWidth: 300,
  },
  yearPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  yearOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  yearOptionSelected: {
    backgroundColor: '#0F172A',
  },
  yearOptionText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  yearOptionTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  yearPickerCancel: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  yearPickerCancelText: {
    fontSize: 16,
    color: '#6B7280',
  },
});
