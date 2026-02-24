import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LongWeekendOpportunity } from '../types';
import { getCountryFlag, formatDateRange, getDayRange, getWeekdayRange, formatHolidayDate } from '../utils';

interface Props {
  lw: LongWeekendOpportunity;
  index: number;
  countryNameMap: Record<string, string>;
  getCountryColor: (code: string) => string;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
}

function getCountryDaysBreakdown(
  lw: LongWeekendOpportunity,
  countryNameMap: Record<string, string>
): { country: string; flag: string; days: number }[] {
  const holidaysByCountry: Record<string, Set<string>> = {};
  for (const h of lw.holidays) {
    if (!holidaysByCountry[h.countryCode]) holidaysByCountry[h.countryCode] = new Set();
    if (h.date) holidaysByCountry[h.countryCode].add(h.date);
  }

  const breakdown: { country: string; flag: string; days: number }[] = [];
  for (const [countryCode, holidayDates] of Object.entries(holidaysByCountry)) {
    const dates = Array.from(holidayDates).sort();
    if (dates.length === 0) continue;
    const firstHoliday = new Date(dates[0] + 'T00:00:00');
    const lastHoliday = new Date(dates[dates.length - 1] + 'T00:00:00');
    const startDate = new Date(firstHoliday);
    const endDate = new Date(lastHoliday);
    if (lastHoliday.getDay() === 5) endDate.setDate(endDate.getDate() + 2);
    if (firstHoliday.getDay() === 1) startDate.setDate(startDate.getDate() - 2);
    const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    breakdown.push({ country: countryNameMap[countryCode] || countryCode, flag: getCountryFlag(countryCode), days: totalDays });
  }
  return breakdown.sort((a, b) => b.days - a.days);
}

export function LongWeekendCard({ lw, index, countryNameMap, getCountryColor, isBookmarked, onToggleBookmark }: Props) {
  const dayRange = getDayRange(lw.startDate, lw.endDate);
  const countryBreakdown = getCountryDaysBreakdown(lw, countryNameMap);
  const showBreakdown = countryBreakdown.length >= 2 && countryBreakdown.some((b) => b.days !== countryBreakdown[0].days);

  let bridgeSuggestion: string | null = null;
  if (lw.type === 'bridge') {
    if (lw.description.includes('Friday')) bridgeSuggestion = `Take Friday off for ${lw.totalDays}-day weekend!`;
    else if (lw.description.includes('Monday')) bridgeSuggestion = `Take Monday off for ${lw.totalDays}-day weekend!`;
    else bridgeSuggestion = lw.description;
  }

  const handleShare = async () => {
    const countryNames = [...new Set(lw.holidays.map((h) => countryNameMap[h.countryCode] || h.countryCode))].join(', ');
    const holidayLines = lw.holidays.map((h) => `- ${h.name} (${countryNameMap[h.countryCode] || h.countryCode})`).join('\n');
    const bridgeLine = lw.type === 'bridge' ? `\nTip: ${lw.description}` : '';
    const shareText =
      `${lw.totalDays}-Day Weekend: ${formatDateRange(lw.startDate, lw.endDate)}\n` +
      `${getWeekdayRange(lw.startDate, lw.endDate)}\n\n` +
      `Countries: ${countryNames}\n\n` +
      `Holidays:\n${holidayLines}` +
      bridgeLine +
      `\n\nFound with Overlap - Holiday Calendar`;
    try {
      await Share.share({ message: shareText, title: 'Overlap - Holiday Calendar' });
    } catch (e) {
      console.error('Share error:', e);
    }
  };

  return (
    <View style={[styles.card, lw.isOverlap && styles.cardOverlap]}>
      {/* Card Header */}
      <View style={styles.cardHeader}>
        {lw.isOverlap && (
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

      {/* Days + Date + Share */}
      <View style={styles.cardDateSection}>
        <View style={styles.daysBox}>
          <Text style={styles.daysNumber}>{lw.totalDays}</Text>
          <Text style={styles.daysLabel}>DAYS</Text>
        </View>
        <View style={styles.dateInfo}>
          <Text style={styles.dateRange}>{formatDateRange(lw.startDate, lw.endDate)}</Text>
          <Text style={styles.weekdayRange}>{getWeekdayRange(lw.startDate, lw.endDate)}</Text>
          {showBreakdown && (
            <View style={styles.countryDaysBreakdown}>
              {countryBreakdown.map((cb, i) => (
                <Text key={i} style={styles.countryDaysText}>
                  {cb.flag} {cb.days}d
                </Text>
              ))}
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} data-testid={`share-lw-${index}`}>
          <Ionicons name="share-outline" size={20} color="#7C9CBF" />
        </TouchableOpacity>
      </View>

      {/* Calendar Days */}
      <View style={styles.calendarDays}>
        {dayRange.map((d, i) => (
          <View
            key={i}
            style={[styles.calendarDay, d.isWeekend ? styles.calendarDayWeekend : styles.calendarDayHoliday]}
          >
            <Text
              style={[
                styles.calendarDayName,
                d.isWeekend ? styles.calendarDayNameWeekend : styles.calendarDayNameHoliday,
              ]}
            >
              {d.day}
            </Text>
            <Text
              style={[
                styles.calendarDayNumber,
                d.isWeekend ? styles.calendarDayNumberWeekend : styles.calendarDayNumberHoliday,
              ]}
            >
              {d.date}
            </Text>
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
            <Text style={styles.holidayDate}>{formatHolidayDate(h.date || lw.startDate)}</Text>
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
}

const styles = StyleSheet.create({
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
  dateInfo: { flex: 1 },
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
  countryDaysBreakdown: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  countryDaysText: {
    fontSize: 12,
    color: '#7C9CBF',
    fontWeight: '500',
  },
  shareBtn: {
    padding: 8,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
  },
  calendarDays: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  calendarDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    minWidth: 44,
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
  calendarDayNameHoliday: { color: '#D97706' },
  calendarDayNameWeekend: { color: '#718096' },
  calendarDayNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 2,
  },
  calendarDayNumberHoliday: { color: '#D97706' },
  calendarDayNumberWeekend: { color: '#4A5568' },
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
  holidayFlag: { fontSize: 18 },
  holidayDetails: { flex: 1 },
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
});
