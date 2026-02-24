import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Bookmark } from '../../types';
import { getCountryFlag, formatDateRange, getWeekdayRange, formatHolidayDate, COUNTRY_COLORS } from '../../utils';

interface Props {
  bookmark: Bookmark;
  onDelete: () => void;
  onRestore: () => void;
}

const renderRightActions = (
  _progress: Animated.AnimatedInterpolation<number>,
  onDelete: () => void
) => (
  <TouchableOpacity style={styles.deleteAction} onPress={onDelete} testID="bookmark-delete-btn">
    <Ionicons name="trash-outline" size={22} color="#FFF" />
    <Text style={styles.deleteText}>Delete</Text>
  </TouchableOpacity>
);

export function SavedCard({ bookmark, onDelete, onRestore }: Props) {
  const { lw, countries, year, countryNameMap } = bookmark;
  const swipeRef = useRef<Swipeable>(null);

  const handleDelete = () => {
    swipeRef.current?.close();
    onDelete();
  };

  const savedDate = new Date(bookmark.savedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={(progress) => renderRightActions(progress, handleDelete)}
      overshootRight={false}
      friction={2}
    >
      <View style={styles.card}>
        {/* Header: flags + year + saved date */}
        <View style={styles.cardHeader}>
          <View style={styles.flagsRow}>
            {countries.map((c) => (
              <Text key={c.countryCode} style={styles.flag}>{getCountryFlag(c.countryCode)}</Text>
            ))}
          </View>
          <View style={styles.headerRight}>
            <View style={styles.yearBadge}>
              <Text style={styles.yearBadgeText}>{year}</Text>
            </View>
          </View>
        </View>

        {/* Country names */}
        <Text style={styles.countryNames}>
          {countries.map((c) => c.name).join(', ')}
        </Text>

        {/* Date + Days */}
        <View style={styles.dateSection}>
          <View style={styles.daysBox}>
            <Text style={styles.daysNumber}>{lw.totalDays}</Text>
            <Text style={styles.daysLabel}>DAYS</Text>
          </View>
          <View style={styles.dateInfo}>
            <Text style={styles.dateRange}>{formatDateRange(lw.startDate, lw.endDate)}</Text>
            <Text style={styles.weekdayRange}>{getWeekdayRange(lw.startDate, lw.endDate)}</Text>
          </View>
        </View>

        {/* Holidays list */}
        <View style={styles.holidaysList}>
          {lw.holidays.map((h, i) => {
            const colorIndex = countries.findIndex((c) => c.countryCode === h.countryCode);
            return (
              <View key={`${h.countryCode}-${i}`} style={styles.holidayRow}>
                <View style={[styles.holidayDot, { backgroundColor: COUNTRY_COLORS[Math.max(colorIndex, 0) % COUNTRY_COLORS.length] }]} />
                <Text style={styles.holidayFlag}>{getCountryFlag(h.countryCode)}</Text>
                <View style={styles.holidayInfo}>
                  <Text style={styles.holidayCountry}>{countryNameMap[h.countryCode] || h.countryCode}</Text>
                  <Text style={styles.holidayName}>{h.name}</Text>
                </View>
                {h.date && <Text style={styles.holidayDate}>{formatHolidayDate(h.date)}</Text>}
              </View>
            );
          })}
        </View>

        {/* Footer: saved date + re-run */}
        <View style={styles.cardFooter}>
          <Text style={styles.savedDate}>Saved {savedDate}</Text>
          <TouchableOpacity style={styles.rerunBtn} onPress={onRestore} testID="bookmark-rerun-btn">
            <Text style={styles.rerunText}>Re-run</Text>
            <Ionicons name="arrow-forward" size={14} color="#7C9CBF" />
          </TouchableOpacity>
        </View>
      </View>
    </Swipeable>
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  flagsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  flag: { fontSize: 22 },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  yearBadge: {
    backgroundColor: '#F0F9FF',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  yearBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C9CBF',
  },
  countryNames: {
    fontSize: 13,
    color: '#718096',
    marginBottom: 12,
  },
  dateSection: {
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
    fontSize: 24,
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
    fontSize: 17,
    fontWeight: '600',
    color: '#2D3748',
  },
  weekdayRange: {
    fontSize: 13,
    color: '#718096',
    marginTop: 2,
  },
  holidaysList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 12,
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
  holidayFlag: { fontSize: 16 },
  holidayInfo: { flex: 1 },
  holidayCountry: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7C9CBF',
    textTransform: 'uppercase',
  },
  holidayName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2D3748',
  },
  holidayDate: {
    fontSize: 11,
    color: '#718096',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  savedDate: {
    fontSize: 12,
    color: '#A0AEC0',
  },
  rerunBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 6,
  },
  rerunText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C9CBF',
  },
  // Swipe delete action
  deleteAction: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 16,
    marginLeft: 8,
    gap: 4,
  },
  deleteText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
