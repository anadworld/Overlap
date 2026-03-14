import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Share, Platform, Alert } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import { Bookmark } from '../../types';
import { getCountryFlag, formatDateRange, getWeekdayRange, formatHolidayDate, COUNTRY_COLORS } from '../../utils';
import { getLocalizedHolidayName } from '../../i18n/holidayNames';

const isExpoGo = Constants.appOwnership === 'expo';
let Calendar: typeof import('expo-calendar') | null = null;
if (!isExpoGo && Platform.OS !== 'web') { try { Calendar = require('expo-calendar'); } catch { Calendar = null; } }

interface Props { bookmark: Bookmark; onDelete: () => void; onRestore: () => void; }

export function SavedCard({ bookmark, onDelete, onRestore }: Props) {
  const { t } = useTranslation();
  const { lw, countries, year, countryNameMap } = bookmark;
  const swipeRef = useRef<Swipeable>(null);
  const [addingCal, setAddingCal] = useState(false);

  const handleDelete = () => { swipeRef.current?.close(); onDelete(); };

  const renderRightActions = (_progress: Animated.AnimatedInterpolation<number>) => (
    <TouchableOpacity style={styles.deleteAction} onPress={handleDelete} testID="bookmark-delete-btn">
      <Ionicons name="trash-outline" size={22} color="#FFF" />
      <Text style={styles.deleteText}>{t('saved.delete')}</Text>
    </TouchableOpacity>
  );

  const handleAddToCalendar = async () => {
    setAddingCal(true);
    const countryNames = [...new Set(lw.holidays.map((h) => countryNameMap[h.countryCode] || h.countryCode))].join(', ');
    const holidayNames = lw.holidays.map((h) => getLocalizedHolidayName(h.name)).join(', ');
    const title = `${lw.totalDays}-${t('longWeekend.days')} (${countryNames})`;
    const notes = `${t('share.holidays')}: ${holidayNames}\n\n${t('share.savedWith')}`;
    const startDate = new Date(lw.startDate + 'T00:00:00');
    const endDate = new Date(lw.endDate + 'T23:59:59');

    if (!Calendar) {
      if (Platform.OS === 'web') {
        const dStart = lw.startDate.replace(/-/g, '');
        const dEndNext = new Date(lw.endDate + 'T00:00:00'); dEndNext.setDate(dEndNext.getDate() + 1);
        const dEnd = `${dEndNext.getFullYear()}${String(dEndNext.getMonth() + 1).padStart(2, '0')}${String(dEndNext.getDate()).padStart(2, '0')}`;
        const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Overlap//Holiday Calendar//EN\nBEGIN:VEVENT\nDTSTART;VALUE=DATE:${dStart}\nDTEND;VALUE=DATE:${dEnd}\nSUMMARY:${title}\nDESCRIPTION:${holidayNames}\nEND:VEVENT\nEND:VCALENDAR`;
        const blob = new Blob([ics], { type: 'text/calendar' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `long-weekend-${lw.startDate}.ics`; a.click(); URL.revokeObjectURL(url);
      } else { Alert.alert(t('calendar.productionRequired'), t('calendar.productionMessage')); }
      setAddingCal(false); return;
    }

    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') { Alert.alert(t('calendar.permissionTitle'), t('calendar.permissionNeeded')); setAddingCal(false); return; }
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCal = calendars.find((c) => c.isPrimary || c.allowsModifications);
      const calId = defaultCal?.id || calendars[0]?.id;
      if (!calId) { Alert.alert(t('calendar.noCalendar'), t('calendar.noCalendarMessage')); setAddingCal(false); return; }
      await Calendar.createEventAsync(calId, { title, startDate, endDate, allDay: true, notes });
      Alert.alert(t('saved.addedTitle'), t('saved.addedMessage', { days: lw.totalDays }));
    } catch { Alert.alert(t('calendar.error'), t('calendar.errorMessage')); }
    setAddingCal(false);
  };

  const handleShare = async () => {
    const countryNames = [...new Set(lw.holidays.map((h) => countryNameMap[h.countryCode] || h.countryCode))].join(', ');
    const holidayLines = lw.holidays.map((h) => `- ${getLocalizedHolidayName(h.name)} (${countryNameMap[h.countryCode] || h.countryCode})`).join('\n');
    const bridgeLine = lw.type === 'bridge' ? `\n${t('share.tip')}: ${lw.description}` : '';
    const shareText = `${lw.totalDays}-${t('longWeekend.days')}: ${formatDateRange(lw.startDate, lw.endDate)}\n${getWeekdayRange(lw.startDate, lw.endDate)}\n\n${t('share.countries')}: ${countryNames}\n\n${t('share.holidays')}:\n${holidayLines}${bridgeLine}\n\n${t('share.foundWith')}`;
    try { await Share.share({ message: shareText }, Platform.OS === 'android' ? { dialogTitle: t('share.dialogTitle') } : {}); } catch (e) { console.error('Share error:', e); }
  };

  const savedDate = new Date(bookmark.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <Swipeable ref={swipeRef} renderRightActions={renderRightActions} overshootRight={false} friction={2}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.flagsRow}>{countries.map((c) => (<Text key={c.countryCode} style={styles.flag}>{getCountryFlag(c.countryCode)}</Text>))}</View>
          <View style={styles.headerRight}><View style={styles.yearBadge}><Text style={styles.yearBadgeText}>{year}</Text></View></View>
        </View>
        <Text style={styles.countryNames}>{countries.map((c) => c.name).join(', ')}</Text>
        <View style={styles.dateSection}>
          <View style={styles.daysBox}><Text style={styles.daysNumber}>{lw.totalDays}</Text><Text style={styles.daysLabel}>{t('longWeekend.days')}</Text></View>
          <View style={styles.dateInfo}><Text style={styles.dateRange}>{formatDateRange(lw.startDate, lw.endDate)}</Text><Text style={styles.weekdayRange}>{getWeekdayRange(lw.startDate, lw.endDate)}</Text></View>
        </View>
        <View style={styles.holidaysList}>
          {lw.holidays.map((h, i) => {
            const colorIndex = countries.findIndex((c) => c.countryCode === h.countryCode);
            return (
              <View key={`${h.countryCode}-${i}`} style={styles.holidayRow}>
                <View style={[styles.holidayDot, { backgroundColor: COUNTRY_COLORS[Math.max(colorIndex, 0) % COUNTRY_COLORS.length] }]} />
                <Text style={styles.holidayFlag}>{getCountryFlag(h.countryCode)}</Text>
                <View style={styles.holidayInfo}><Text style={styles.holidayCountry}>{countryNameMap[h.countryCode] || h.countryCode}</Text><Text style={styles.holidayName}>{getLocalizedHolidayName(h.name)}</Text></View>
                {h.date && <Text style={styles.holidayDate}>{formatHolidayDate(h.date)}</Text>}
              </View>
            );
          })}
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.savedDate}>{t('saved.savedLabel', { date: savedDate })}</Text>
          <View style={styles.footerActions}>
            <TouchableOpacity style={styles.calendarBtn} onPress={handleAddToCalendar} disabled={addingCal} testID="bookmark-add-to-calendar-btn">
              <Ionicons name="calendar-outline" size={16} color="#D97706" />{addingCal && <Text style={styles.calendarBtnText}>...</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} testID="bookmark-share-btn"><Ionicons name="share-outline" size={16} color="#7C9CBF" /></TouchableOpacity>
            <TouchableOpacity style={styles.rerunBtn} onPress={onRestore} testID="bookmark-rerun-btn"><Text style={styles.rerunText}>{t('saved.rerun')}</Text><Ionicons name="arrow-forward" size={14} color="#7C9CBF" /></TouchableOpacity>
          </View>
        </View>
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  flagsRow: { flexDirection: 'row', gap: 4 }, flag: { fontSize: 22 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  yearBadge: { backgroundColor: '#F0F9FF', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
  yearBadgeText: { fontSize: 13, fontWeight: '600', color: '#7C9CBF' },
  countryNames: { fontSize: 13, color: '#718096', marginBottom: 12 },
  dateSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  daysBox: { backgroundColor: '#FEF3C7', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center', marginRight: 14 },
  daysNumber: { fontSize: 24, fontWeight: 'bold', color: '#D97706' },
  daysLabel: { fontSize: 10, fontWeight: '600', color: '#D97706' },
  dateInfo: { flex: 1 }, dateRange: { fontSize: 17, fontWeight: '600', color: '#2D3748' },
  weekdayRange: { fontSize: 13, color: '#718096', marginTop: 2 },
  holidaysList: { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, gap: 8, marginBottom: 12 },
  holidayRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  holidayDot: { width: 6, height: 6, borderRadius: 3 }, holidayFlag: { fontSize: 16 },
  holidayInfo: { flex: 1 }, holidayCountry: { fontSize: 10, fontWeight: '600', color: '#7C9CBF', textTransform: 'uppercase' },
  holidayName: { fontSize: 13, fontWeight: '500', color: '#2D3748' }, holidayDate: { fontSize: 11, color: '#718096' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  calendarBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', padding: 8, borderRadius: 8, gap: 4 },
  calendarBtnText: { fontSize: 11, color: '#D97706', fontWeight: '600' },
  shareBtn: { backgroundColor: '#F0F9FF', padding: 8, borderRadius: 8 },
  savedDate: { fontSize: 12, color: '#A0AEC0' },
  rerunBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9FF', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, gap: 6 },
  rerunText: { fontSize: 13, fontWeight: '600', color: '#7C9CBF' },
  deleteAction: { backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', width: 80, borderRadius: 16, marginLeft: 8, gap: 4 },
  deleteText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
});
