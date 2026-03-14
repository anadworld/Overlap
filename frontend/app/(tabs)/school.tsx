import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Modal,
  TextInput,
  FlatList,
  SectionList,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Country, SchoolHoliday, Subdivision } from '../../src/types';
import { getCountryFlag } from '../../src/utils';
import { useTranslation } from 'react-i18next';
import { useFavoriteCountries } from '../../src/hooks/useFavoriteCountries';
import { getLocalizedCountryName } from '../../src/i18n/countryNames';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatDateWithYear(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRange(startDate: string, endDate: string): string {
  const sYear = new Date(startDate + 'T00:00:00').getFullYear();
  const eYear = new Date(endDate + 'T00:00:00').getFullYear();
  if (sYear !== eYear) {
    return `${formatDateWithYear(startDate)} – ${formatDateWithYear(endDate)}`;
  }
  return `${formatDate(startDate)} – ${formatDate(endDate)}`;
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
}

export default function SchoolScreen() {
  const { t } = useTranslation();

  const MONTHS = [
    t('months.january'), t('months.february'), t('months.march'), t('months.april'),
    t('months.may'), t('months.june'), t('months.july'), t('months.august'),
    t('months.september'), t('months.october'), t('months.november'), t('months.december'),
  ];

  const [supportedCountries, setSupportedCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [subdivisions, setSubdivisions] = useState<Subdivision[]>([]);
  const [selectedSubdivision, setSelectedSubdivision] = useState<string | null>(null);
  const [holidays, setHolidays] = useState<SchoolHoliday[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showSubdivisionPicker, setShowSubdivisionPicker] = useState(false);
  const { favorites, toggleFavorite } = useFavoriteCountries();

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - 1 + i);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/school-holiday-countries`);
        const data: Country[] = await res.json();
        const localized = data.map((c: Country) => ({
          ...c,
          name: getLocalizedCountryName(c.countryCode, c.name),
        }));
        setSupportedCountries(localized);
      } catch {
        setError(t('errors.loadSchoolCountries'));
      } finally {
        setIsLoadingCountries(false);
      }
    })();
  }, []);

  const fetchSubdivisions = useCallback(async (countryCode: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/subdivisions/${countryCode}`);
      const data: Subdivision[] = await res.json();
      setSubdivisions(data);
    } catch {
      setSubdivisions([]);
    }
  }, []);

  const fetchSchoolHolidays = useCallback(async (countryCode: string, year: number, subdivision?: string | null) => {
    setIsLoading(true);
    setError(null);
    try {
      let url = `${API_BASE}/api/school-holidays/${countryCode}/${year}`;
      if (subdivision) url += `?subdivision=${subdivision}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch');
      const data: SchoolHoliday[] = await res.json();
      setHolidays(data);
    } catch {
      setError(t('errors.loadSchoolHolidays'));
      setHolidays([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSelectCountry = useCallback(async (country: Country) => {
    setSelectedCountry(country);
    setSelectedSubdivision(null);
    setShowCountryPicker(false);
    await fetchSubdivisions(country.countryCode);
    fetchSchoolHolidays(country.countryCode, selectedYear);
  }, [selectedYear, fetchSubdivisions, fetchSchoolHolidays]);

  const handleSelectSubdivision = useCallback((code: string | null) => {
    setSelectedSubdivision(code);
    setShowSubdivisionPicker(false);
    if (selectedCountry) {
      fetchSchoolHolidays(selectedCountry.countryCode, selectedYear, code);
    }
  }, [selectedCountry, selectedYear, fetchSchoolHolidays]);

  const handleSelectYear = useCallback((year: number) => {
    setSelectedYear(year);
    setShowYearPicker(false);
    if (selectedCountry) {
      fetchSchoolHolidays(selectedCountry.countryCode, year, selectedSubdivision);
    }
  }, [selectedCountry, selectedSubdivision, fetchSchoolHolidays]);

  // Group holidays by month (using startDate)
  const grouped: Record<number, SchoolHoliday[]> = {};
  for (const h of holidays) {
    const m = new Date(h.startDate + 'T00:00:00').getMonth();
    if (!grouped[m]) grouped[m] = [];
    grouped[m].push(h);
  }
  const monthKeys = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" translucent={false} />

      <View style={styles.header}>
        <Text style={styles.headerTitle} data-testid="school-header-title">{t('school.title')}</Text>
        <Text style={styles.headerSubtitle}>{t('school.subtitle')}</Text>
      </View>

      {/* Country selector */}
      <TouchableOpacity
        style={styles.selectionBar}
        onPress={() => setShowCountryPicker(true)}
        activeOpacity={0.7}
        data-testid="school-country-selector"
      >
        <View style={styles.selectionInfo}>
          {selectedCountry ? (
            <View style={styles.selectedCountryRow}>
              <Text style={styles.flagEmoji}>{getCountryFlag(selectedCountry.countryCode)}</Text>
              <Text style={styles.selectedCountryName}>{selectedCountry.name}</Text>
            </View>
          ) : (
            <Text style={styles.placeholderText}>{t('school.tapToSelect')}</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.yearDropdown}
          onPress={(e) => { e.stopPropagation(); setShowYearPicker(true); }}
          data-testid="school-year-dropdown"
        >
          <Text style={styles.yearText}>{selectedYear}</Text>
          <Ionicons name="chevron-down" size={18} color="#7C9CBF" />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Subdivision selector (if available) */}
      {selectedCountry && subdivisions.length > 0 && (
        <TouchableOpacity
          style={styles.subdivisionBar}
          onPress={() => setShowSubdivisionPicker(true)}
          activeOpacity={0.7}
          data-testid="school-subdivision-selector"
        >
          <Ionicons name="location-outline" size={18} color="#718096" />
          <Text style={styles.subdivisionText}>
            {selectedSubdivision
              ? subdivisions.find(s => s.code === selectedSubdivision)?.name || selectedSubdivision
              : t('school.allRegions')}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#A0AEC0" />
        </TouchableOpacity>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color="#E57373" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Results */}
      {isLoading ? (
        <View style={styles.emptyStateContainer}>
          <ActivityIndicator size="large" color="#7C9CBF" />
        </View>
      ) : holidays.length > 0 ? (
        <ScrollView style={styles.resultsContainer}>
          <View style={styles.statsRow} data-testid="school-stats">
            <View style={styles.statBadge}>
              <Ionicons name="school-outline" size={14} color="#7C9CBF" />
              <Text style={styles.statText}>{holidays.length} {t('school.breaks')}</Text>
            </View>
            <View style={styles.statBadge}>
              <Ionicons name="flag-outline" size={14} color="#7C9CBF" />
              <Text style={styles.statText}>{selectedCountry?.name}</Text>
            </View>
          </View>

          {monthKeys.map((m) => (
            <View key={m} style={styles.monthSection}>
              <View style={styles.monthHeader}>
                <Text style={styles.monthTitle}>{MONTHS[m]}</Text>
                <Text style={styles.monthCount}>{grouped[m].length} {grouped[m].length === 1 ? t('school.break') : t('school.breaks')}</Text>
              </View>
              {grouped[m].map((h, idx) => (
                <View key={`${h.id}-${idx}`} style={styles.holidayCard} data-testid={`school-holiday-card-${m}-${idx}`}>
                  <View style={styles.cardDateBadge}>
                    <Text style={styles.cardDateMonth}>{formatDate(h.startDate).split(' ')[0]}</Text>
                    <Text style={styles.cardDateDay}>{formatDate(h.startDate).split(' ')[1]}</Text>
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardName}>{h.name}</Text>
                    <Text style={styles.cardDates}>
                      {formatRange(h.startDate, h.endDate)}
                    </Text>
                    <View style={styles.cardMeta}>
                      <View style={styles.durationBadge}>
                        <Text style={styles.durationText}>{daysBetween(h.startDate, h.endDate)} {t('school.days')}</Text>
                      </View>
                      {h.nationwide ? (
                        <View style={[styles.regionBadge, styles.nationwideBadge]}>
                          <Text style={styles.nationwideText}>{t('school.nationwide')}</Text>
                        </View>
                      ) : h.subdivisions.length > 0 ? (
                        <View style={styles.regionBadge}>
                          <Text style={styles.regionText} numberOfLines={1}>
                            {h.subdivisions.map(s => s.shortName).join(', ')}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : selectedCountry && !isLoading ? (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="school-outline" size={48} color="#CBD5E0" />
          <Text style={styles.emptyStateText}>{t('school.noHolidays', { year: selectedYear })}</Text>
        </View>
      ) : (
        <View style={styles.emptyStateContainer}>
          {isLoadingCountries ? (
            <ActivityIndicator size="large" color="#7C9CBF" />
          ) : (
            <>
              <View style={styles.heroIcon}>
                <Ionicons name="school-outline" size={52} color="#7C9CBF" />
              </View>
              <Text style={styles.emptyStateTagline}>{t('school.emptyTagline')}</Text>
              <Text style={styles.emptyStateText}>{t('school.emptyText')}</Text>
            </>
          )}
        </View>
      )}

      {/* Country Picker Modal */}
      <CountryPickerForSchool
        visible={showCountryPicker}
        supportedCountries={supportedCountries}
        onSelect={handleSelectCountry}
        onClose={() => setShowCountryPicker(false)}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
      />

      {/* Year Picker Modal */}
      <Modal visible={showYearPicker} animationType="fade" transparent>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowYearPicker(false)} activeOpacity={1}>
          <View style={styles.yearPickerContainer}>
            {yearOptions.map((y) => (
              <TouchableOpacity
                key={y}
                style={[styles.yearOption, y === selectedYear && styles.yearOptionActive]}
                onPress={() => handleSelectYear(y)}
              >
                <Text style={[styles.yearOptionText, y === selectedYear && styles.yearOptionTextActive]}>{y}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Subdivision Picker Modal */}
      <Modal visible={showSubdivisionPicker} animationType="fade" transparent>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowSubdivisionPicker(false)} activeOpacity={1}>
          <View style={styles.subdivisionPickerContainer}>
            <TouchableOpacity
              style={[styles.subdivisionOption, !selectedSubdivision && styles.subdivisionOptionActive]}
              onPress={() => handleSelectSubdivision(null)}
            >
              <Text style={[styles.subdivisionOptionText, !selectedSubdivision && styles.subdivisionOptionTextActive]}>{t('school.allRegions')}</Text>
            </TouchableOpacity>
            <FlatList
              data={subdivisions}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.subdivisionOption, item.code === selectedSubdivision && styles.subdivisionOptionActive]}
                  onPress={() => handleSelectSubdivision(item.code)}
                >
                  <Text style={[styles.subdivisionOptionText, item.code === selectedSubdivision && styles.subdivisionOptionTextActive]}>
                    {item.name}
                  </Text>
                  <Text style={styles.subdivisionCode}>{item.shortName}</Text>
                </TouchableOpacity>
              )}
              style={{ maxHeight: 400 }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// Inline Country Picker for School tab - shows only supported countries
function CountryPickerForSchool({ visible, supportedCountries, onSelect, onClose, favorites, onToggleFavorite }: {
  visible: boolean;
  supportedCountries: Country[];
  onSelect: (c: Country) => void;
  onClose: () => void;
  favorites: string[];
  onToggleFavorite: (countryCode: string) => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const filtered = supportedCountries.filter(
    c => c.name.toLowerCase().includes(search.toLowerCase()) || c.countryCode.toLowerCase().includes(search.toLowerCase())
  );

  const favSet = new Set(favorites);
  const favCountries = filtered.filter(c => favSet.has(c.countryCode));
  const otherCountries = filtered.filter(c => !favSet.has(c.countryCode));

  const sections: { title: string; data: Country[] }[] = [];
  if (favCountries.length > 0) {
    sections.push({ title: t('countryPicker.favorites'), data: favCountries });
  }
  sections.push({ title: t('countryPicker.allCountries'), data: otherCountries });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer} edges={['top', 'left', 'right']}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{t('school.selectCountry')}</Text>
          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#4A5568" />
          </TouchableOpacity>
        </View>

        <View style={styles.modalSubheader}>
          <Text style={styles.modalSubtitle}>{t('school.countriesAvailable', { count: supportedCountries.length })}</Text>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder={t('countryPicker.searchPlaceholder')}
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        <SectionList
          sections={sections}
          keyExtractor={(item) => item.countryCode}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Ionicons
                name={section.title === t('countryPicker.favorites') ? 'heart' : 'globe-outline'}
                size={14}
                color={section.title === t('countryPicker.favorites') ? '#E53E3E' : '#718096'}
              />
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const isFav = favSet.has(item.countryCode);
            return (
              <View style={styles.countryItem}>
                <TouchableOpacity
                  style={styles.countryItemTouchable}
                  onPress={() => onSelect(item)}
                >
                  <Text style={styles.countryItemFlag}>
                    {getCountryFlag(item.countryCode)}
                  </Text>
                  <View style={styles.countryItemInfo}>
                    <Text style={styles.countryItemName}>{item.name}</Text>
                    <Text style={styles.countryItemCode}>{item.countryCode}</Text>
                  </View>
                  <View style={styles.availableBadge}>
                    <Ionicons name="school" size={14} color="#7C9CBF" />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onToggleFavorite(item.countryCode)}
                  style={styles.heartButton}
                >
                  <Ionicons
                    name={isFav ? 'heart' : 'heart-outline'}
                    size={20}
                    color={isFav ? '#E53E3E' : '#CBD5E0'}
                  />
                </TouchableOpacity>
              </View>
            );
          }}
          style={styles.countryList}
          stickySectionHeadersEnabled={false}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 10,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#2D3748' },
  headerSubtitle: { fontSize: 14, color: '#718096', marginTop: 2 },
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectionInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  selectedCountryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flagEmoji: { fontSize: 24 },
  selectedCountryName: { fontSize: 16, fontWeight: '500', color: '#2D3748' },
  placeholderText: { fontSize: 16, color: '#A0AEC0' },
  yearDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 6,
  },
  yearText: { fontSize: 16, fontWeight: '600', color: '#7C9CBF' },
  subdivisionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  subdivisionText: { flex: 1, fontSize: 14, color: '#4A5568', fontWeight: '500' },
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
  errorText: { color: '#DC2626', fontSize: 14, flex: 1 },
  resultsContainer: { flex: 1, paddingHorizontal: 16 },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  statText: { fontSize: 13, fontWeight: '500', color: '#4A5568' },
  monthSection: { marginBottom: 16 },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 10,
  },
  monthTitle: { fontSize: 18, fontWeight: '700', color: '#2D3748' },
  monthCount: { fontSize: 13, color: '#718096', fontWeight: '500' },
  holidayCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  cardDateBadge: {
    width: 56,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  cardDateMonth: { fontSize: 11, fontWeight: '600', color: '#7C9CBF', textTransform: 'uppercase' },
  cardDateDay: { fontSize: 18, fontWeight: '700', color: '#2D3748' },
  cardBody: { flex: 1, padding: 12 },
  cardName: { fontSize: 15, fontWeight: '600', color: '#2D3748', marginBottom: 3 },
  cardDates: { fontSize: 13, color: '#718096', marginBottom: 8 },
  cardMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  durationBadge: {
    backgroundColor: '#EDF2F7',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  durationText: { fontSize: 12, fontWeight: '500', color: '#4A5568' },
  regionBadge: {
    backgroundColor: '#F0FFF4',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  nationwideBadge: { backgroundColor: '#FFF5F5' },
  regionText: { fontSize: 12, fontWeight: '500', color: '#38A169', maxWidth: 180 },
  nationwideText: { fontSize: 12, fontWeight: '500', color: '#E53E3E' },
  emptyStateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  heroIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#D4E6F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyStateTagline: {
    fontSize: 17,
    fontWeight: '500',
    color: '#718096',
    letterSpacing: 0.3,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  emptyStateText: { fontSize: 14, color: '#9CA3AF', marginTop: 12, textAlign: 'center' },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearPickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 8,
    minWidth: 200,
  },
  yearOption: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 10 },
  yearOptionActive: { backgroundColor: '#F0F9FF' },
  yearOptionText: { fontSize: 18, color: '#4A5568', textAlign: 'center' },
  yearOptionTextActive: { color: '#7C9CBF', fontWeight: '700' },
  subdivisionPickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 8,
    width: '85%',
    maxHeight: '60%',
  },
  subdivisionOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  subdivisionOptionActive: { backgroundColor: '#F0F9FF' },
  subdivisionOptionText: { fontSize: 16, color: '#4A5568' },
  subdivisionOptionTextActive: { color: '#7C9CBF', fontWeight: '600' },
  subdivisionCode: { fontSize: 13, color: '#A0AEC0' },
  // Country picker modal
  modalContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  modalTitle: { fontSize: 20, fontWeight: '600', color: '#2D3748' },
  modalCloseButton: { padding: 4 },
  modalSubheader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  modalSubtitle: { fontSize: 14, color: '#718096' },
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
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#2D3748' },
  countryList: { flex: 1, backgroundColor: '#FFFFFF' },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  countryItemDisabled: { backgroundColor: '#F8FAFC' },
  countryItemFlag: { fontSize: 28, marginRight: 12 },
  countryItemInfo: { flex: 1 },
  countryItemName: { fontSize: 16, fontWeight: '500', color: '#2D3748' },
  countryItemNameDisabled: { color: '#A0AEC0' },
  countryItemCode: { fontSize: 12, color: '#A0AEC0', marginTop: 2 },
  availableBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unavailableText: { fontSize: 12, color: '#CBD5E0', fontWeight: '500' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countryItemTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heartButton: {
    padding: 4,
  },
});
