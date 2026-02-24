import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Country } from '../../types';

interface Props {
  totalHolidays: number;
  totalOverlaps: number;
  totalLongWeekends: number;
  activeTab: 'holidays' | 'overlaps' | 'longweekends';
  selectedCountries: Country[];
  onTabChange: (tab: 'holidays' | 'overlaps' | 'longweekends') => void;
}

export function StatsBar({
  totalHolidays,
  totalOverlaps,
  totalLongWeekends,
  activeTab,
  selectedCountries,
  onTabChange,
}: Props) {
  return (
    <View style={styles.statsRowFixed}>
      <TouchableOpacity
        style={[styles.statCard, styles.statCardBlue, activeTab === 'holidays' && styles.statCardActive]}
        onPress={() => onTabChange('holidays')}
        testID="holidays-stat"
      >
        <Text style={[styles.statCardValue, styles.statCardValueBlue]}>{totalHolidays}</Text>
        <Text style={[styles.statCardLabel, styles.statCardLabelBlue]}>holidays</Text>
      </TouchableOpacity>

      {selectedCountries.length > 1 && (
        <TouchableOpacity
          style={[styles.statCard, styles.statCardGreen, activeTab === 'overlaps' && styles.statCardActive]}
          onPress={() => onTabChange('overlaps')}
          testID="overlaps-stat"
        >
          <Text style={[styles.statCardValue, styles.statCardValueGreen]}>{totalOverlaps}</Text>
          <Text style={[styles.statCardLabel, styles.statCardLabelGreen]}>overlaps</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.statCard, styles.statCardOrange, activeTab === 'longweekends' && styles.statCardActive]}
        onPress={() => onTabChange('longweekends')}
        testID="longweekends-stat"
      >
        <Text style={[styles.statCardValue, styles.statCardValueOrange]}>{totalLongWeekends}</Text>
        <Text style={[styles.statCardLabel, styles.statCardLabelOrange]}>long weekends</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  statsRowFixed: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Platform.OS === 'ios' ? 8 : 10,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  statCardBlue: { backgroundColor: '#E8F0F8' },
  statCardGreen: { backgroundColor: '#D1FAE5' },
  statCardOrange: { backgroundColor: '#FEF3C7' },
  statCardActive: {
    borderWidth: 2,
    borderColor: '#4A5568',
    ...Platform.select({
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  statCardValue: {
    fontSize: Platform.OS === 'ios' ? 14 : 16,
    fontWeight: '600',
  },
  statCardValueBlue: { color: '#7C9CBF' },
  statCardValueGreen: { color: '#059669' },
  statCardValueOrange: { color: '#D97706' },
  statCardLabel: {
    fontSize: Platform.OS === 'ios' ? 10 : 11,
    marginTop: 2,
  },
  statCardLabelBlue: { color: '#7C9CBF' },
  statCardLabelGreen: { color: '#059669' },
  statCardLabelOrange: { color: '#D97706' },
});
