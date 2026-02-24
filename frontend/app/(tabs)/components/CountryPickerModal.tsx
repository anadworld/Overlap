import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Country } from '../types';
import { getCountryFlag } from '../utils';

interface Props {
  visible: boolean;
  countries: Country[];
  selectedCountries: Country[];
  isLoading: boolean;
  onClose: () => void;
  onToggleCountry: (country: Country) => void;
  onClearAll: () => void;
  onFind: () => void;
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
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = countries.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.countryCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.countryCode}
          renderItem={({ item }) => {
            const isSelected = !!selectedCountries.find((c) => c.countryCode === item.countryCode);
            return (
              <TouchableOpacity
                style={[styles.countryItem, isSelected && styles.countryItemSelected]}
                onPress={() => onToggleCountry(item)}
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

        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={[styles.findButton, selectedCountries.length < 1 && styles.findButtonDisabled]}
            onPress={() => { onClose(); onFind(); }}
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
