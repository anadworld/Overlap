import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { getCountryFlag } from '../../utils';

const isExpoGo = Constants.appOwnership === 'expo';

let Calendar: typeof import('expo-calendar') | null = null;
if (!isExpoGo && Platform.OS !== 'web') {
  try {
    Calendar = require('expo-calendar');
  } catch {
    Calendar = null;
  }
}

interface Holiday {
  date: string;
  holidays: Array<{ countryCode: string; name: string; localName: string; types: string[] }>;
  countries: string[];
}

interface Props {
  holidays: Holiday[];
  selectedCountries: Array<{ countryCode: string }>;
  countryNameMap: Record<string, string>;
}

async function getDefaultCalendarId(): Promise<string | null> {
  if (!Calendar) return null;
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Calendar access is needed to add holiday events.');
      return null;
    }
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const defaultCal = calendars.find(
      (c) => c.isPrimary || c.allowsModifications
    );
    return defaultCal?.id || calendars[0]?.id || null;
  } catch {
    return null;
  }
}

export function AddToCalendarButton({ holidays, selectedCountries, countryNameMap }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [adding, setAdding] = useState(false);

  const countryCodes = selectedCountries.map((c) => c.countryCode);

  const addHolidays = async (forCountry?: string) => {
    setShowPicker(false);
    setAdding(true);

    if (!Calendar) {
      if (Platform.OS === 'web') {
        // Web: download .ics file
        const filtered = forCountry
          ? holidays.filter((h) => h.countries.includes(forCountry))
          : holidays;
        const icsEvents = filtered.map((h) => {
          const names = h.holidays
            .filter((hh) => !forCountry || hh.countryCode === forCountry)
            .map((hh) => hh.name)
            .join(', ');
          const d = h.date.replace(/-/g, '');
          const nextDay = new Date(h.date + 'T00:00:00');
          nextDay.setDate(nextDay.getDate() + 1);
          const nd = `${nextDay.getFullYear()}${String(nextDay.getMonth() + 1).padStart(2, '0')}${String(nextDay.getDate()).padStart(2, '0')}`;
          return `BEGIN:VEVENT\nDTSTART;VALUE=DATE:${d}\nDTEND;VALUE=DATE:${nd}\nSUMMARY:${names}\nDESCRIPTION:Public Holiday${forCountry ? ' - ' + (countryNameMap[forCountry] || forCountry) : ''}\nEND:VEVENT`;
        });
        const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Overlap//Holiday Calendar//EN\n${icsEvents.join('\n')}\nEND:VCALENDAR`;
        const blob = new Blob([ics], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `holidays-${forCountry || 'all'}.ics`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        Alert.alert(
          'Production Build Required',
          'Adding holidays to your calendar is available in the full app from the App Store or Google Play.',
        );
      }
      setAdding(false);
      return;
    }

    // Native: use expo-calendar
    const calId = await getDefaultCalendarId();
    if (!calId) {
      setAdding(false);
      return;
    }

    const filtered = forCountry
      ? holidays.filter((h) => h.countries.includes(forCountry))
      : holidays;

    let count = 0;
    for (const h of filtered) {
      const names = h.holidays
        .filter((hh) => !forCountry || hh.countryCode === forCountry)
        .map((hh) => hh.name)
        .join(', ');
      try {
        await Calendar.createEventAsync(calId, {
          title: names,
          startDate: new Date(h.date + 'T00:00:00'),
          endDate: new Date(h.date + 'T23:59:59'),
          allDay: true,
          notes: `Public Holiday${forCountry ? ' - ' + (countryNameMap[forCountry] || forCountry) : ''}`,
        });
        count++;
      } catch { /* skip */ }
    }

    setAdding(false);
    Alert.alert('Added to Calendar', `${count} holiday${count !== 1 ? 's' : ''} added to your calendar.`);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => {
          if (countryCodes.length === 1) {
            addHolidays(countryCodes[0]);
          } else {
            setShowPicker(true);
          }
        }}
        disabled={adding}
        testID="add-to-calendar-btn"
      >
        <Ionicons name="calendar-outline" size={16} color="#7C9CBF" />
        <Text style={styles.addBtnText}>
          {adding ? 'Adding...' : 'Add to Calendar'}
        </Text>
      </TouchableOpacity>

      <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowPicker(false)}>
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Add holidays to calendar</Text>

            {countryCodes.map((code) => (
              <TouchableOpacity
                key={code}
                style={styles.pickerOption}
                onPress={() => addHolidays(code)}
                testID={`cal-country-${code}`}
              >
                <Text style={styles.pickerFlag}>{getCountryFlag(code)}</Text>
                <Text style={styles.pickerOptionText}>{countryNameMap[code] || code}</Text>
                <Text style={styles.pickerCount}>
                  {holidays.filter((h) => h.countries.includes(code)).length}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.pickerOption, styles.pickerOptionAll]}
              onPress={() => addHolidays()}
              testID="cal-all-countries"
            >
              <Ionicons name="globe-outline" size={20} color="#7C9CBF" />
              <Text style={[styles.pickerOptionText, { fontWeight: '600' }]}>All Countries</Text>
              <Text style={styles.pickerCount}>{holidays.length}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#F0F9FF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D4E6F6',
    marginBottom: 8,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C9CBF',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  pickerCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  pickerOptionAll: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginTop: 8,
    paddingTop: 16,
  },
  pickerFlag: {
    fontSize: 20,
  },
  pickerOptionText: {
    flex: 1,
    fontSize: 15,
    color: '#2D3748',
  },
  pickerCount: {
    fontSize: 13,
    color: '#A0AEC0',
    fontWeight: '500',
  },
});
