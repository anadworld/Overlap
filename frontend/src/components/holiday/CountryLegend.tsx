import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Country } from '../../types';
import { getCountryFlag, COUNTRY_COLORS } from '../../utils';

interface Props {
  countries: Country[];
}

export function CountryLegend({ countries }: Props) {
  return (
    <View style={styles.legendContainer}>
      {countries.map((country, index) => (
        <View key={country.countryCode} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COUNTRY_COLORS[index % COUNTRY_COLORS.length] }]} />
          <Text style={styles.legendFlag}>{getCountryFlag(country.countryCode)}</Text>
          <Text style={styles.legendText}>{country.name}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
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
  legendFlag: { fontSize: 16 },
  legendText: {
    fontSize: 13,
    color: '#4A5568',
    fontWeight: '500',
  },
});
