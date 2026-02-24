import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface Props {
  visible: boolean;
  selectedYear: number;
  yearOptions: number[];
  onClose: () => void;
  onSelect: (year: number) => void;
}

export function YearPickerModal({ visible, selectedYear, yearOptions, onClose, onSelect }: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.container}>
          <Text style={styles.title}>Select Year</Text>
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {yearOptions.map((year) => (
              <TouchableOpacity
                key={year}
                style={[styles.option, year === selectedYear && styles.optionSelected]}
                onPress={() => onSelect(year)}
              >
                <Text style={[styles.optionText, year === selectedYear && styles.optionTextSelected]}>
                  {year}
                </Text>
                {year === selectedYear && <Ionicons name="checkmark" size={20} color="#7C9CBF" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: width * 0.8,
    maxWidth: 300,
    maxHeight: 400,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    textAlign: 'center',
    marginBottom: 16,
  },
  scroll: { maxHeight: 300 },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  optionSelected: { backgroundColor: '#F0F9FF' },
  optionText: {
    fontSize: 16,
    color: '#718096',
  },
  optionTextSelected: {
    color: '#7C9CBF',
    fontWeight: '600',
  },
});
