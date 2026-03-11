import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  SectionList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Country } from '../../types';
import { getCountryFlag } from '../../utils';

interface Props {
  visible: boolean;
  countries: Country[];
  selectedCountries: Country[];
  isLoading: boolean;
  onClose: () => void;
  onToggleCountry: (country: Country) => void;
  onClearAll: () => void;
  onFind: () => void;
  favorites: string[];
  onToggleFavorite: (countryCode: string) => void;
}

export function CountryPickerModal({
  visible,
  countries,
  selectedCountries,
  isLoading,
  onClose,
  onToggleCountry,
  onClearAll,
  onFind,
  favorites,
  onToggleFavorite,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const insets = useSafeAreaInsets();

  const sections = useMemo(() => {
    const filtered = countries.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.countryCode.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const favSet = new Set(favorites);
    const favCountries = filtered.filter((c) => favSet.has(c.countryCode));
    const otherCountries = filtered.filter((c) => !favSet.has(c.countryCode));

    const result = [];
    if (favCountries.length > 0) {
      result.push({ title: 'Favorites', data: favCountries });
    }
    result.push({ title: 'All Countries', data: otherCountries });
    return result;
  }, [countries, searchQuery, favorites]);

  const renderCountryItem = ({ item }: { item: Country }) => {
    const isSelected = !!selectedCountries.find((c) => c.countryCode === item.countryCode);
    const isFav = favorites.includes(item.countryCode);
    return (
      <View style={[styles.countryItem, isSelected && styles.countryItemSelected]}>
        <TouchableOpacity
          style={styles.countryItemTouchable}
          onPress={() => onToggleCountry(item)}
        >
          <Text style={styles.countryItemFlag}>{getCountryFlag(item.countryCode)}</Text>
          <View style={styles.countryItemInfo}>
            <Text style={styles.countryItemName}>{item.name}</Text>
            <Text style={styles.countryItemCode}>{item.countryCode}</Text>
          </View>
          {isSelected && <Ionicons name="checkmark-circle" size={24} color="#7C9CBF" />}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onToggleFavorite(item.countryCode)}
          style={styles.heartButton}
          testID={`favorite-toggle-${item.countryCode}`}
        >
          <Ionicons
            name={isFav ? 'heart' : 'heart-outline'}
            size={20}
            color={isFav ? '#E53E3E' : '#CBD5E0'}
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer} edges={['top', 'left', 'right']}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Select Countries</Text>
          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#4A5568" />
          </TouchableOpacity>
        </View>

        <View style={styles.modalSubheader}>
          <Text style={styles.modalSubtitle}>{selectedCountries.length}/5 countries selected</Text>
          {selectedCountries.length > 0 && (
            <TouchableOpacity onPress={onClearAll}>
              <Text style={styles.clearButton}>Clear all</Text>
            </TouchableOpacity>
          )}
        </View>

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

        <SectionList
          sections={sections}
          keyExtractor={(item) => item.countryCode}
          renderItem={renderCountryItem}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Ionicons
                name={section.title === 'Favorites' ? 'heart' : 'globe-outline'}
                size={14}
                color={section.title === 'Favorites' ? '#E53E3E' : '#718096'}
              />
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
          )}
          style={styles.countryList}
          stickySectionHeadersEnabled={false}
        />

        <View style={[styles.modalFooter, { paddingBottom: 16 + insets.bottom }]}>
          <TouchableOpacity
            style={[styles.findButton, selectedCountries.length < 1 && styles.findButtonDisabled]}
            onPress={() => { onClose(); onFind(); }}
            disabled={selectedCountries.length < 1}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.findButtonText}>Discover Holidays</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  modalCloseButton: { padding: 4 },
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
  countryItemSelected: { backgroundColor: '#F0F9FF' },
  countryItemTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryItemFlag: {
    fontSize: 28,
    marginRight: 12,
  },
  countryItemInfo: { flex: 1 },
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
  heartButton: {
    padding: 4,
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
  findButtonDisabled: { backgroundColor: '#CBD5E0' },
  findButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
