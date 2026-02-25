import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LongWeekendOpportunity } from '../../types';
import { getCountryFlag } from '../../utils';

interface MonthCalendarProps {
  year: number;
  month: number; // 0-indexed
  longWeekends: LongWeekendOpportunity[];
}

export const MonthCalendar: React.FC<MonthCalendarProps> = ({ year, month, longWeekends }) => {
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Collect all highlighted dates from long weekends
  const holidayDates = new Set<number>();
  const weekendDates = new Set<number>();
  const bridgeDates = new Set<number>();
  // Map day → Set of country codes that have a holiday on that day
  const dayFlags = new Map<number, Set<string>>();

  for (const lw of longWeekends) {
    const start = new Date(lw.startDate + 'T00:00:00');
    const end = new Date(lw.endDate + 'T00:00:00');
    const holidayDateStrings = new Set(
      (lw.holidays || []).map((h: any) => h.date)
    );
    // Map holiday date → country codes
    const holidayCountries = new Map<string, string[]>();
    for (const h of (lw.holidays || [])) {
      const codes = holidayCountries.get(h.date) || [];
      codes.push(h.countryCode);
      holidayCountries.set(h.date, codes);
    }

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getMonth() !== month) continue;
      const day = d.getDate();
      const dow = d.getDay();
      const dateStr = d.toISOString().split('T')[0];

      // Collect flags for this day from holidays
      const countries = holidayCountries.get(dateStr);
      if (countries) {
        if (!dayFlags.has(day)) dayFlags.set(day, new Set());
        countries.forEach(c => dayFlags.get(day)!.add(c));
      }

      if (dow === 0 || dow === 6) {
        weekendDates.add(day);
      } else if (holidayDateStrings.has(dateStr)) {
        holidayDates.add(day);
      } else if (lw.type === 'bridge') {
        bridgeDates.add(day);
      } else {
        holidayDates.add(day);
      }
    }
  }

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = Array(firstDay).fill(null);

  for (let d = 1; d <= daysInMonth; d++) {
    currentWeek.push(d);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const getDayStyle = (day: number | null) => {
    if (!day) return {};
    if (holidayDates.has(day)) return styles.holidayDay;
    if (bridgeDates.has(day)) return styles.bridgeDay;
    if (weekendDates.has(day)) return styles.weekendDay;
    const dow = new Date(year, month, day).getDay();
    if (dow === 0 || dow === 6) return styles.regularWeekend;
    return {};
  };

  const getDayTextStyle = (day: number | null) => {
    if (!day) return {};
    if (holidayDates.has(day)) return styles.holidayDayText;
    if (bridgeDates.has(day)) return styles.bridgeDayText;
    if (weekendDates.has(day)) return styles.weekendDayText;
    const dow = new Date(year, month, day).getDay();
    if (dow === 0 || dow === 6) return styles.regularWeekendText;
    return {};
  };

  return (
    <View style={styles.container} testID={`month-calendar-${month}`}>
      {/* Day headers */}
      <View style={styles.row}>
        {DAYS.map((d) => (
          <View key={d} style={styles.headerCell}>
            <Text style={styles.headerText}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Weeks */}
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.row}>
          {week.map((day, di) => (
            <View key={di} style={[styles.cell, day ? getDayStyle(day) : null]}>
              {day && <Text style={[styles.dayText, getDayTextStyle(day)]}>{day}</Text>}
              {day && dayFlags.has(day) && (
                <Text style={styles.flagText}>
                  {[...dayFlags.get(day)!].map(c => getCountryFlag(c)).join('')}
                </Text>
              )}
            </View>
          ))}
        </View>
      ))}

      {/* Legend */}
      <View style={styles.legend}>
        {holidayDates.size > 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F6AD55' }]} />
            <Text style={styles.legendText}>Holiday</Text>
          </View>
        )}
        {weekendDates.size > 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#E2E8F0' }]} />
            <Text style={styles.legendText}>Weekend</Text>
          </View>
        )}
        {bridgeDates.size > 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#9AE6B4' }]} />
            <Text style={styles.legendText}>Bridge Day</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  row: {
    flexDirection: 'row',
  },
  headerCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  headerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A0AEC0',
    textTransform: 'uppercase',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    margin: 1,
  },
  dayText: {
    fontSize: 14,
    color: '#2D3748',
    fontWeight: '500',
  },
  // Holiday dates (amber/yellow)
  holidayDay: {
    backgroundColor: '#FEEBC8',
    borderRadius: 8,
  },
  holidayDayText: {
    color: '#C05621',
    fontWeight: '700',
  },
  // Bridge days (green)
  bridgeDay: {
    backgroundColor: '#C6F6D5',
    borderRadius: 8,
  },
  bridgeDayText: {
    color: '#276749',
    fontWeight: '700',
  },
  // Long weekend's weekend dates (light blue)
  weekendDay: {
    backgroundColor: '#EBF4FF',
    borderRadius: 8,
  },
  weekendDayText: {
    color: '#7C9CBF',
    fontWeight: '600',
  },
  // Regular weekend (subtle)
  regularWeekend: {},
  regularWeekendText: {
    color: '#A0AEC0',
  },
  legend: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: '#718096',
  },
});
