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
  Share,
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

// Color palette
const COUNTRY_COLORS = ['#7C9CBF', '#8FBC8F', '#DDA0DD', '#F4A460', '#87CEEB'];

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
  const [activeTab, setActiveTab] = useState<'holidays' | 'longweekends'>('longweekends');

  // Country name map
  const countryNameMap = comparisonResult?.countries.reduce((acc, c) => {
    acc[c.countryCode] = c.name;
    return acc;
  }, {} as Record<string, string>) || {};

  // Fetch countries
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
    if (selectedCountries.length < 1) {
      setError('Please select at least 1 country');
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
    if (selectedCountries.length >= 1) {
      await compareHolidays();
    }
    setRefreshing(false);
  };

  const toggleCountry = (country: Country) => {
    const isSelected = selectedCountries.find((c) => c.countryCode === country.countryCode);
    if (isSelected) {
      setSelectedCountries(selectedCountries.filter((c) => c.countryCode !== country.countryCode));
    } else if (selectedCountries.length < 5) {
      setSelectedCountries([...selectedCountries, country]);
    }
  };

  const filteredCountries = countries.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.countryCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCountryColor = (countryCode: string): string => {
    const index = comparisonResult?.countries.findIndex((c) => c.countryCode === countryCode) || 0;
    return COUNTRY_COLORS[index % COUNTRY_COLORS.length];
  };

  // Format date helpers
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

  const getDayRange = (startDate: string, endDate: string): { day: string; date: number; isWeekend: boolean }[] => {
    const days = [];
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    
    let current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      days.push({
        day: dayNames[dayOfWeek],
        date: current.getDate(),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  const getWeekdayRange = (startDate: string, endDate: string): string => {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${dayNames[start.getDay()]} to ${dayNames[end.getDay()]}`;
  };

  const formatHolidayDate = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Get bridge day suggestion
  const getBridgeDaySuggestion = (lw: LongWeekendOpportunity): string | null => {
    if (lw.type === 'bridge') {
      if (lw.description.includes('Friday')) {
        return `Take Friday off for ${lw.totalDays}-day weekend!`;
      } else if (lw.description.includes('Monday')) {
        return `Take Monday off for ${lw.totalDays}-day weekend!`;
      }
      return lw.description;
    }
    return null;
  };

  // Share function
  const shareLongWeekend = async (lw: LongWeekendOpportunity) => {
    const countryFlags = [...new Set(lw.holidays.map(h => getCountryFlag(h.countryCode)))].join(' ');
    const holidayNames = lw.holidays.map(h => `• ${h.name} (${getCountryFlag(h.countryCode)})`).join('\n');
    
    const message = `🗓️ ${lw.totalDays}-Day Break Alert!\n\n` +
      `📅 ${formatDateRange(lw.startDate, lw.endDate)}\n` +
      `✨ ${lw.description}\n\n` +
      `Holidays:\n${holidayNames}\n\n` +
      `${countryFlags} Plan your getaway!\n\n` +
      `Found with Overlap – Holiday Calendar`;

    try {
      await Share.share({ message, title: `${lw.totalDays}-Day Long Weekend` });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Year options - extended range
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 12 }, (_, i) => currentYear - 2 + i);

  // Stats
  const totalHolidays = comparisonResult?.holidays.length || 0;
  const totalOverlaps = comparisonResult?.totalOverlaps || 0;
  const totalLongWeekends = comparisonResult?.longWeekends?.length || 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" translucent={false} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Overlap – Holiday Calendar</Text>
        <Text style={styles.headerSubtitle}>Find holidays & long weekends across countries</Text>
      </View>

      {/* Selection Bar - Tap to open country picker */}
      <TouchableOpacity 
        style={styles.selectionBar}
        onPress={() => setShowCountryPicker(true)}
        activeOpacity={0.7}
        data-testid="selection-bar"
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
        {/* Year Dropdown */}
        <TouchableOpacity 
          style={styles.yearDropdown}
          onPress={(e) => {
            e.stopPropagation();
            setShowYearPicker(true);
          }}
          data-testid="year-dropdown"
        >
          <Text style={styles.yearText}>{selectedYear}</Text>
          <Ionicons name="chevron-down" size={18} color="#7C9CBF" />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color="#E57373" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Results */}
      {comparisonResult ? (
        <ScrollView
          style={styles.resultsContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C9CBF" />
          }
        >
          {/* Tab Switcher - Single Line Pills */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabPill, activeTab === 'holidays' && styles.tabPillActive]}
              onPress={() => setActiveTab('holidays')}
              data-testid="holidays-tab"
            >
              <Ionicons name="calendar-outline" size={16} color={activeTab === 'holidays' ? '#FFF' : '#7C9CBF'} />
              <Text style={[styles.tabPillText, activeTab === 'holidays' && styles.tabPillTextActive]}>
                Holidays ({totalHolidays})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabPill, activeTab === 'longweekends' && styles.tabPillActiveOrange]}
              onPress={() => setActiveTab('longweekends')}
              data-testid="longweekends-tab"
            >
              <Ionicons name="sunny-outline" size={16} color={activeTab === 'longweekends' ? '#FFF' : '#D97706'} />
              <Text style={[styles.tabPillText, styles.tabPillTextOrange, activeTab === 'longweekends' && styles.tabPillTextActive]}>
                Long Weekends ({totalLongWeekends})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Stats Row - Single Line */}
          <View style={styles.statsRow}>
            <View style={styles.statBadge}>
              <Text style={styles.statBadgeValue}>{totalHolidays}</Text>
              <Text style={styles.statBadgeLabel}>holidays</Text>
            </View>
            {selectedCountries.length > 1 && (
              <View style={[styles.statBadge, styles.statBadgeGreen]}>
                <Text style={[styles.statBadgeValue, { color: '#059669' }]}>{totalOverlaps}</Text>
                <Text style={[styles.statBadgeLabel, { color: '#059669' }]}>overlaps</Text>
              </View>
            )}
            <View style={[styles.statBadge, styles.statBadgeOrange]}>
              <Text style={[styles.statBadgeValue, { color: '#D97706' }]}>{totalLongWeekends}</Text>
              <Text style={[styles.statBadgeLabel, { color: '#D97706' }]}>long weekends</Text>
            </View>
          </View>

          {/* Country Legend */}
          <View style={styles.legendContainer}>
            {comparisonResult.countries.map((country, index) => (
              <View key={country.countryCode} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COUNTRY_COLORS[index % COUNTRY_COLORS.length] }]} />
                <Text style={styles.legendFlag}>{getCountryFlag(country.countryCode)}</Text>
                <Text style={styles.legendText}>{country.name}</Text>
              </View>
            ))}
          </View>

          {/* Long Weekends Tab */}
          {activeTab === 'longweekends' && (
            <View style={styles.cardsContainer}>
              {comparisonResult.longWeekends && comparisonResult.longWeekends.length > 0 ? (
                comparisonResult.longWeekends.map((lw, index) => {
                  const isOverlap = lw.countries.length > 1;
                  const dayRange = getDayRange(lw.startDate, lw.endDate);
                  const bridgeSuggestion = getBridgeDaySuggestion(lw);
                  
                  return (
                    <View key={`${lw.startDate}-${index}`} style={[styles.card, isOverlap && styles.cardOverlap]}>
                      {/* Card Header */}
                      <View style={styles.cardHeader}>
                        {isOverlap && (
                          <View style={styles.overlapBadge}>
                            <Ionicons name="link" size={12} color="#FFF" />
                            <Text style={styles.overlapBadgeText}>Overlap</Text>
                          </View>
                        )}
                        <View style={{ flex: 1 }} />
                        <View style={styles.cardTypeBadge}>
                          {lw.type === 'bridge' && (
                            <>
                              <Ionicons name="flash" size={12} color="#D97706" />
                              <Text style={styles.cardTypeBadgeText}>Bridge Day</Text>
                            </>
                          )}
                          {lw.type === 'consecutive' && (
                            <>
                              <Ionicons name="calendar" size={12} color="#2563EB" />
                              <Text style={[styles.cardTypeBadgeText, { color: '#2563EB' }]}>Consecutive</Text>
                            </>
                          )}
                          {lw.type === 'long_weekend' && (
                            <>
                              <Ionicons name="sunny" size={12} color="#059669" />
                              <Text style={[styles.cardTypeBadgeText, { color: '#059669' }]}>Long Weekend</Text>
                            </>
                          )}
                        </View>
                      </View>

                      {/* Days Count and Date Range */}
                      <View style={styles.cardDateSection}>
                        <View style={styles.daysBox}>
                          <Text style={styles.daysNumber}>{lw.totalDays}</Text>
                          <Text style={styles.daysLabel}>DAYS</Text>
                        </View>
                        <View style={styles.dateInfo}>
                          <Text style={styles.dateRange}>{formatDateRange(lw.startDate, lw.endDate)}</Text>
                          <Text style={styles.weekdayRange}>{getWeekdayRange(lw.startDate, lw.endDate)}</Text>
                        </View>
                        <TouchableOpacity 
                          style={styles.shareBtn}
                          onPress={() => shareLongWeekend(lw)}
                          data-testid={`share-lw-${index}`}
                        >
                          <Ionicons name="share-outline" size={20} color="#7C9CBF" />
                        </TouchableOpacity>
                      </View>

                      {/* Calendar Days */}
                      <View style={styles.calendarDays}>
                        {dayRange.map((d, i) => (
                          <View 
                            key={i} 
                            style={[
                              styles.calendarDay,
                              d.isWeekend ? styles.calendarDayWeekend : styles.calendarDayHoliday
                            ]}
                          >
                            <Text style={[
                              styles.calendarDayName,
                              d.isWeekend ? styles.calendarDayNameWeekend : styles.calendarDayNameHoliday
                            ]}>{d.day}</Text>
                            <Text style={[
                              styles.calendarDayNumber,
                              d.isWeekend ? styles.calendarDayNumberWeekend : styles.calendarDayNumberHoliday
                            ]}>{d.date}</Text>
                          </View>
                        ))}
                      </View>

                      {/* Holidays Included */}
                      <View style={styles.holidaysIncluded}>
                        <Text style={styles.holidaysIncludedTitle}>HOLIDAYS INCLUDED:</Text>
                        {lw.holidays.map((h, hIndex) => (
                          <View key={`${h.countryCode}-${hIndex}`} style={styles.holidayRow}>
                            <View style={[styles.holidayDot, { backgroundColor: getCountryColor(h.countryCode) }]} />
                            <Text style={styles.holidayFlag}>{getCountryFlag(h.countryCode)}</Text>
                            <View style={styles.holidayDetails}>
                              <Text style={styles.holidayCountry}>{countryNameMap[h.countryCode] || h.countryCode}</Text>
                              <Text style={styles.holidayName}>{h.name}</Text>
                            </View>
                            <Text style={styles.holidayDate}>
                              {formatHolidayDate(lw.startDate)}
                            </Text>
                          </View>
                        ))}
                      </View>

                      {/* Bridge Day Suggestion */}
                      {bridgeSuggestion && (
                        <View style={styles.bridgeSuggestion}>
                          <Ionicons name="bulb-outline" size={16} color="#D97706" />
                          <Text style={styles.bridgeSuggestionText}>{bridgeSuggestion}</Text>
                        </View>
                      )}
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="sunny-outline" size={48} color="#CBD5E0" />
                  <Text style={styles.emptyStateText}>No long weekend opportunities found</Text>
                </View>
              )}
            </View>
          )}

          {/* Holidays Tab */}
          {activeTab === 'holidays' && (
            <View style={styles.cardsContainer}>
              {comparisonResult.holidays.map((holiday) => {
                const isOverlap = holiday.isOverlap;
                return (
                  <View key={holiday.date} style={[styles.card, isOverlap && styles.cardOverlap]}>
                    <View style={styles.cardHeader}>
                      {isOverlap && (
                        <View style={styles.overlapBadge}>
                          <Ionicons name="link" size={12} color="#FFF" />
                          <Text style={styles.overlapBadgeText}>Overlap</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.holidayCardDate}>
                      {formatHolidayDate(holiday.date)}
                    </Text>
                    {holiday.holidays.map((h, hIndex) => (
                      <View key={`${h.countryCode}-${hIndex}`} style={styles.holidayRow}>
                        <View style={[styles.holidayDot, { backgroundColor: getCountryColor(h.countryCode) }]} />
                        <Text style={styles.holidayFlag}>{getCountryFlag(h.countryCode)}</Text>
                        <View style={styles.holidayDetails}>
                          <Text style={styles.holidayCountry}>{countryNameMap[h.countryCode] || h.countryCode}</Text>
                          <Text style={styles.holidayName}>{h.name}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      ) : (
        /* Empty State */
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
                data-testid="get-started-btn"
              >
                <Text style={styles.getStartedButtonText}>Get Started</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Country Picker Modal */}
      <Modal visible={showCountryPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer} edges={['top', 'left', 'right']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Countries</Text>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowCountryPicker(false)}>
              <Ionicons name="close" size={24} color="#4A5568" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalSubheader}>
            <Text style={styles.modalSubtitle}>{selectedCountries.length}/5 countries selected</Text>
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
              const isSelected = selectedCountries.find((c) => c.countryCode === item.countryCode);
              return (
                <TouchableOpacity
                  style={[styles.countryItem, isSelected && styles.countryItemSelected]}
                  onPress={() => toggleCountry(item)}
                >
                  <Text style={styles.countryItemFlag}>{getCountryFlag(item.countryCode)}</Text>
                  <View style={styles.countryItemInfo}>
                    <Text style={styles.countryItemName}>{item.name}</Text>
                    <Text style={styles.countryItemCode}>{item.countryCode}</Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={24} color="#7C9CBF" />}
                </TouchableOpacity>
              );
            }}
            style={styles.countryList}
          />

          {/* Find Holidays Button */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.findButton, selectedCountries.length < 1 && styles.findButtonDisabled]}
              onPress={() => {
                setShowCountryPicker(false);
                compareHolidays();
              }}
              disabled={selectedCountries.length < 1}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.findButtonText}>Find Overlapping Dates</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Year Picker Modal - Dropdown Style */}
      <Modal visible={showYearPicker} animationType="fade" transparent>
        <TouchableOpacity 
          style={styles.yearPickerOverlay} 
          activeOpacity={1} 
          onPress={() => setShowYearPicker(false)}
        >
          <View style={styles.yearPickerContainer}>
            <Text style={styles.yearPickerTitle}>Select Year</Text>
            <ScrollView style={styles.yearPickerScroll} showsVerticalScrollIndicator={false}>
              {yearOptions.map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[styles.yearOption, year === selectedYear && styles.yearOptionSelected]}
                  onPress={() => {
                    setSelectedYear(year);
                    setShowYearPicker(false);
                    if (selectedCountries.length > 0) {
                      setTimeout(() => compareHolidays(), 100);
                    }
                  }}
                >
                  <Text style={[styles.yearOptionText, year === selectedYear && styles.yearOptionTextSelected]}>
                    {year}
                  </Text>
                  {year === selectedYear && <Ionicons name="checkmark" size={20} color="#7C9CBF" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
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
  flagEmoji: {
    fontSize: 24,
  },
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
  tabRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F0F8',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    gap: 6,
  },
  tabPillActive: {
    backgroundColor: '#7C9CBF',
  },
  tabPillActiveOrange: {
    backgroundColor: '#D97706',
  },
  tabPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C9CBF',
  },
  tabPillTextOrange: {
    color: '#D97706',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  statBadgeGreen: {
    backgroundColor: '#D1FAE5',
  },
  statBadgeOrange: {
    backgroundColor: '#FEF3C7',
  },
  statBadgeValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#7C9CBF',
  },
  statBadgeLabel: {
    fontSize: 13,
    color: '#7C9CBF',
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
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendFlag: {
    fontSize: 16,
  },
  legendText: {
    fontSize: 13,
    color: '#4A5568',
    fontWeight: '500',
  },
  cardsContainer: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardOverlap: {
    borderWidth: 2,
    borderColor: '#8FBC8F',
    borderLeftWidth: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
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
  cardTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardTypeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  cardDateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  daysBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginRight: 14,
  },
  daysNumber: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#D97706',
  },
  daysLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D97706',
  },
  dateInfo: {
    flex: 1,
  },
  dateRange: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
  },
  weekdayRange: {
    fontSize: 13,
    color: '#718096',
    marginTop: 2,
  },
  shareBtn: {
    padding: 8,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
  },
  calendarDays: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  calendarDay: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 50,
  },
  calendarDayHoliday: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  calendarDayWeekend: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  calendarDayName: {
    fontSize: 11,
    fontWeight: '600',
  },
  calendarDayNameHoliday: {
    color: '#D97706',
  },
  calendarDayNameWeekend: {
    color: '#718096',
  },
  calendarDayNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 2,
  },
  calendarDayNumberHoliday: {
    color: '#D97706',
  },
  calendarDayNumberWeekend: {
    color: '#4A5568',
  },
  holidaysIncluded: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  holidaysIncludedTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  holidayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  holidayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  holidayFlag: {
    fontSize: 18,
  },
  holidayDetails: {
    flex: 1,
  },
  holidayCountry: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7C9CBF',
    textTransform: 'uppercase',
  },
  holidayName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2D3748',
  },
  holidayDate: {
    fontSize: 12,
    color: '#718096',
  },
  bridgeSuggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    gap: 8,
  },
  bridgeSuggestionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#D97706',
    flex: 1,
  },
  holidayCardDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 12,
  },
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
  findButton: {
    backgroundColor: '#7C9CBF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  findButtonDisabled: {
    backgroundColor: '#CBD5E0',
  },
  findButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  // Year Picker styles
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
    maxHeight: 400,
  },
  yearPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    textAlign: 'center',
    marginBottom: 16,
  },
  yearPickerScroll: {
    maxHeight: 300,
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
});
