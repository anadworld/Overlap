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
  StatusBar,
  RefreshControl,
  Platform,
  Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

interface LongWeekendOpportunity {
  startDate: string;
  endDate: string;
  totalDays: number;
  holidayDays: number;
  weekendDays: number;
  type: string;
  description: string;
  holidays: HolidayDetail[];
  countries: string[];
}

interface CompareResponse {
  year: number;
  countries: Country[];
  holidays: HolidayWithCountries[];
  totalOverlaps: number;
  longWeekends: LongWeekendOpportunity[];
}

// Pastel color palette for countries
const COUNTRY_COLORS = [
  '#7C9CBF', // Pastel blue
  '#8FBC8F', // Pastel green
  '#DDA0DD', // Pastel purple
  '#F4A460', // Pastel orange
  '#87CEEB', // Sky blue
];

const COUNTRY_BG_COLORS = [
  '#E8F0F8', // Light blue bg
  '#E8F5E8', // Light green bg
  '#F5E8F5', // Light purple bg
  '#FDF5E6', // Light orange bg
  '#E8F8F8', // Light sky bg
];

export default function HomeScreen() {
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
  const [activeTab, setActiveTab] = useState<'holidays' | 'longweekends'>('holidays');

  // Create a map for country names
  const countryNameMap = comparisonResult?.countries.reduce((acc, c) => {
    acc[c.countryCode] = c.name;
    return acc;
  }, {} as Record<string, string>) || {};

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
    if (index === -1) {
      const comparisonIndex = comparisonResult?.countries.findIndex((c) => c.countryCode === countryCode) || 0;
      return COUNTRY_COLORS[comparisonIndex % COUNTRY_COLORS.length];
    }
    return COUNTRY_COLORS[index % COUNTRY_COLORS.length];
  };

  const getCountryBgColor = (countryCode: string): string => {
    const index = comparisonResult?.countries.findIndex((c) => c.countryCode === countryCode) || 0;
    return COUNTRY_BG_COLORS[index % COUNTRY_BG_COLORS.length];
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

  // Format date range
  const formatDateRange = (startDate: string, endDate: string): string => {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    const startDay = start.getDate();
    const endDay = end.getDate();
    
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}-${endDay}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
  };

  // Get type badge color
  const getTypeBadgeColor = (type: string): { bg: string; text: string } => {
    switch (type) {
      case 'bridge':
        return { bg: '#FEF3C7', text: '#D97706' };
      case 'consecutive':
        return { bg: '#DBEAFE', text: '#2563EB' };
      case 'long_weekend':
        return { bg: '#D1FAE5', text: '#059669' };
      default:
        return { bg: '#E5E7EB', text: '#6B7280' };
    }
  };

  // Get type icon
  const getTypeIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'bridge':
        return 'flash';
      case 'consecutive':
        return 'calendar';
      case 'long_weekend':
        return 'sunny';
      default:
        return 'time';
    }
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
          <View 
            key={`${h.countryCode}-${index}`} 
            style={[
              styles.holidayDetail,
              { backgroundColor: getCountryBgColor(h.countryCode) }
            ]}
          >
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
              <Text style={styles.countryName}>{countryNameMap[h.countryCode] || h.countryCode}</Text>
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sync Holidays</Text>
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
            <Ionicons name="globe-outline" size={20} color="#7C9CBF" />
            <Text style={styles.selectorLabel}>Countries</Text>
          </View>
          <View style={styles.selectorValue}>
            {isLoadingCountries ? (
              <ActivityIndicator size="small" color="#7C9CBF" />
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
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </View>
        </TouchableOpacity>

        {/* Year Selector */}
        <TouchableOpacity
          style={styles.selectorButton}
          onPress={() => setShowYearPicker(true)}
        >
          <View style={styles.selectorContent}>
            <Ionicons name="calendar-outline" size={20} color="#7C9CBF" />
            <Text style={styles.selectorLabel}>Year</Text>
          </View>
          <View style={styles.selectorValue}>
            <Text style={styles.selectedValue}>{selectedYear}</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
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
              <Text style={styles.compareButtonText}>Sync Holidays</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color="#E57373" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Results */}
      {comparisonResult && (
        <ScrollView
          style={styles.resultsContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C9CBF" />
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
              <Text style={[styles.statValue, { color: '#8FBC8F' }]}>
                {comparisonResult.totalOverlaps}
              </Text>
              <Text style={styles.statLabel}>Overlaps</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#D97706' }]}>
                {comparisonResult.longWeekends?.length || 0}
              </Text>
              <Text style={styles.statLabel}>Long Weekends</Text>
            </View>
          </View>

          {/* Tab Switcher */}
          <View style={styles.tabSwitcher}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'holidays' && styles.tabButtonActive]}
              onPress={() => setActiveTab('holidays')}
            >
              <Ionicons name="calendar-outline" size={18} color={activeTab === 'holidays' ? '#7C9CBF' : '#9CA3AF'} />
              <Text style={[styles.tabButtonText, activeTab === 'holidays' && styles.tabButtonTextActive]}>
                All Holidays
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'longweekends' && styles.tabButtonActive]}
              onPress={() => setActiveTab('longweekends')}
            >
              <Ionicons name="sunny-outline" size={18} color={activeTab === 'longweekends' ? '#D97706' : '#9CA3AF'} />
              <Text style={[styles.tabButtonText, activeTab === 'longweekends' && styles.tabButtonTextActive]}>
                Long Weekends
              </Text>
            </TouchableOpacity>
          </View>

          {/* Country Legend */}
          <View style={styles.legendContainer}>
            {comparisonResult.countries.map((country, index) => (
              <View key={country.countryCode} style={[styles.legendItem, { backgroundColor: COUNTRY_BG_COLORS[index % COUNTRY_BG_COLORS.length] }]}>
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

          {/* Holidays Tab Content */}
          {activeTab === 'holidays' && (
            <>
              {/* Filter Toggle */}
              <TouchableOpacity
                style={styles.filterToggle}
                onPress={() => setShowOnlyOverlaps(!showOnlyOverlaps)}
              >
                <Ionicons
                  name={showOnlyOverlaps ? 'checkbox' : 'square-outline'}
                  size={20}
                  color="#7C9CBF"
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
            </>
          )}

          {/* Long Weekends Tab Content */}
          {activeTab === 'longweekends' && (
            <>
              {comparisonResult.longWeekends && comparisonResult.longWeekends.length > 0 ? (
                <View style={styles.longWeekendsContainer}>
                  <Text style={styles.longWeekendsIntro}>
                    Plan your vacations! Here are the best opportunities to maximize your time off:
                  </Text>
                  {comparisonResult.longWeekends.map((lw, index) => {
                    const badgeColor = getTypeBadgeColor(lw.type);
                    return (
                      <View key={`${lw.startDate}-${index}`} style={styles.longWeekendCard}>
                        <View style={styles.longWeekendHeader}>
                          <View style={styles.longWeekendDays}>
                            <Text style={styles.longWeekendDaysNumber}>{lw.totalDays}</Text>
                            <Text style={styles.longWeekendDaysLabel}>days</Text>
                          </View>
                          <View style={styles.longWeekendInfo}>
                            <Text style={styles.longWeekendDateRange}>
                              {formatDateRange(lw.startDate, lw.endDate)}
                            </Text>
                            <View style={[styles.typeBadge, { backgroundColor: badgeColor.bg }]}>
                              <Ionicons name={getTypeIcon(lw.type)} size={12} color={badgeColor.text} />
                              <Text style={[styles.typeBadgeText, { color: badgeColor.text }]}>
                                {lw.type === 'bridge' ? 'Bridge Day' : lw.type === 'consecutive' ? 'Consecutive' : 'Long Weekend'}
                              </Text>
                            </View>
                          </View>
                        </View>
                        
                        <Text style={styles.longWeekendDescription}>{lw.description}</Text>
                        
                        <View style={styles.longWeekendDetails}>
                          <View style={styles.longWeekendDetailItem}>
                            <Ionicons name="calendar" size={14} color="#718096" />
                            <Text style={styles.longWeekendDetailText}>{lw.holidayDays} holiday{lw.holidayDays > 1 ? 's' : ''}</Text>
                          </View>
                          <View style={styles.longWeekendDetailItem}>
                            <Ionicons name="sunny" size={14} color="#718096" />
                            <Text style={styles.longWeekendDetailText}>{lw.weekendDays} weekend days</Text>
                          </View>
                        </View>

                        <View style={styles.longWeekendHolidays}>
                          {lw.holidays.slice(0, 3).map((h, hIndex) => (
                            <View key={`${h.countryCode}-${hIndex}`} style={styles.longWeekendHolidayItem}>
                              <Text style={styles.longWeekendHolidayFlag}>{getCountryFlag(h.countryCode)}</Text>
                              <Text style={styles.longWeekendHolidayName} numberOfLines={1}>{h.name}</Text>
                            </View>
                          ))}
                          {lw.holidays.length > 3 && (
                            <Text style={styles.longWeekendMoreHolidays}>+{lw.holidays.length - 3} more</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyLongWeekends}>
                  <Ionicons name="sunny-outline" size={48} color="#CBD5E0" />
                  <Text style={styles.emptyLongWeekendsText}>No long weekend opportunities found</Text>
                </View>
              )}
            </>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      )}

      {/* Empty State */}
      {!comparisonResult && !isLoading && (
        <View style={styles.emptyState}>
          <Ionicons name="calendar" size={64} color="#B8C5D3" />
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
        <SafeAreaView style={styles.modalContainer} edges={['top', 'left', 'right']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Countries</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCountryPicker(false)}
            >
              <Ionicons name="close" size={24} color="#4A5568" />
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
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search countries..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
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
                    <Ionicons name="checkmark-circle" size={24} color="#7C9CBF" />
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
                  <Ionicons name="checkmark" size={20} color="#7C9CBF" />
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
  headerSubtitle: {
    fontSize: 14,
    color: '#718096',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectorLabel: {
    fontSize: 16,
    color: '#4A5568',
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
    color: '#A0AEC0',
  },
  selectedValue: {
    fontSize: 16,
    color: '#4A5568',
    fontWeight: '500',
  },
  compareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C9CBF',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  compareButtonDisabled: {
    backgroundColor: '#CBD5E0',
  },
  compareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
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
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#7C9CBF',
  },
  statLabel: {
    fontSize: 12,
    color: '#718096',
    marginTop: 4,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
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
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  legendColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendFlag: {
    fontSize: 16,
  },
  legendText: {
    fontSize: 13,
    color: '#4A5568',
    fontWeight: '500',
    maxWidth: 100,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingVertical: 8,
  },
  filterToggleText: {
    fontSize: 14,
    color: '#718096',
  },
  monthSection: {
    marginBottom: 20,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 12,
  },
  holidayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  overlapCard: {
    borderWidth: 2,
    borderColor: '#8FBC8F',
    backgroundColor: '#F0FFF4',
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
    color: '#718096',
  },
  overlapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8FBC8F',
    paddingVertical: 4,
    paddingHorizontal: 10,
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
    alignItems: 'flex-start',
    marginBottom: 10,
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  countryIndicator: {
    width: 4,
    height: '100%',
    minHeight: 40,
    borderRadius: 2,
  },
  countryFlag: {
    fontSize: 24,
  },
  holidayInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C9CBF',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  holidayName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3748',
  },
  localName: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
    fontStyle: 'italic',
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
    color: '#4A5568',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
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
  modalSubheader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#718096',
  },
  clearButton: {
    fontSize: 14,
    color: '#7C9CBF',
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2D3748',
  },
  countryList: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  countryItemSelected: {
    backgroundColor: '#F0F9FF',
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
    color: '#2D3748',
  },
  countryItemCode: {
    fontSize: 12,
    color: '#A0AEC0',
    marginTop: 2,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  doneButton: {
    backgroundColor: '#7C9CBF',
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearPickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: width * 0.8,
    maxWidth: 300,
  },
  yearPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
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
    backgroundColor: '#F0F9FF',
  },
  yearOptionText: {
    fontSize: 16,
    color: '#718096',
  },
  yearOptionTextSelected: {
    color: '#7C9CBF',
    fontWeight: '600',
  },
  yearPickerCancel: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  yearPickerCancelText: {
    fontSize: 16,
    color: '#A0AEC0',
  },
});
