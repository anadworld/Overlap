import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { HolidayWithCountries } from '../../types';
import { getCountryFlag, formatHolidayDate } from '../../utils';

interface Props {
  holiday: HolidayWithCountries;
  countryNameMap: Record<string, string>;
  getCountryColor: (code: string) => string;
}

export function HolidayCard({ holiday, countryNameMap, getCountryColor }: Props) {
  const { t } = useTranslation();
  return (
    <View style={[styles.card, holiday.isOverlap && styles.cardOverlap]}>
      <View style={styles.cardHeader}>
        {holiday.isOverlap && (
          <View style={styles.overlapBadge}>
            <Ionicons name="link" size={12} color="#FFF" />
            <Text style={styles.overlapBadgeText}>{t('holidayCard.overlap')}</Text>
          </View>
        )}
      </View>
      <Text style={styles.holidayCardDate}>{formatHolidayDate(holiday.date)}</Text>
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
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  cardOverlap: { borderWidth: 2, borderColor: '#8FBC8F', borderLeftWidth: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  overlapBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#8FBC8F', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, gap: 4 },
  overlapBadgeText: { fontSize: 11, fontWeight: '600', color: '#FFF' },
  holidayCardDate: { fontSize: 16, fontWeight: '600', color: '#2D3748', marginBottom: 12 },
  holidayRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  holidayDot: { width: 6, height: 6, borderRadius: 3 },
  holidayFlag: { fontSize: 18 },
  holidayDetails: { flex: 1 },
  holidayCountry: { fontSize: 11, fontWeight: '600', color: '#7C9CBF', textTransform: 'uppercase' },
  holidayName: { fontSize: 14, fontWeight: '500', color: '#2D3748' },
});
