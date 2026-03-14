import i18n from './i18n';

export const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export const COUNTRY_COLORS = ['#7C9CBF', '#8FBC8F', '#DDA0DD', '#F4A460', '#87CEEB'];

export const getCountryFlag = (countryCode: string): string => {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

const getDayNamesUpper = (): string[] => [
  i18n.t('dayNames.sun'), i18n.t('dayNames.mon'), i18n.t('dayNames.tue'),
  i18n.t('dayNames.wed'), i18n.t('dayNames.thu'), i18n.t('dayNames.fri'), i18n.t('dayNames.sat'),
];

const getDayNamesShort = (): string[] => [
  i18n.t('dayNamesShort.sun'), i18n.t('dayNamesShort.mon'), i18n.t('dayNamesShort.tue'),
  i18n.t('dayNamesShort.wed'), i18n.t('dayNamesShort.thu'), i18n.t('dayNamesShort.fri'), i18n.t('dayNamesShort.sat'),
];

const getMonthNamesShort = (): string[] => {
  const lang = i18n.language;
  const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthShort: Record<string, string[]> = {
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    fr: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
    nl: ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'],
    de: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
    es: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
    pt: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  };
  return monthShort[lang] || monthShort['en'];
};

export const formatDateRange = (startDate: string, endDate: string): string => {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const months = getMonthNamesShort();
  const startMonth = months[start.getMonth()];
  const endMonth = months[end.getMonth()];
  const startDay = start.getDate();
  const endDay = end.getDate();
  if (startMonth === endMonth) return `${startMonth} ${startDay}-${endDay}`;
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
};

export const getDayRange = (
  startDate: string,
  endDate: string
): { day: string; date: number; isWeekend: boolean }[] => {
  const days: { day: string; date: number; isWeekend: boolean }[] = [];
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const dayNames = getDayNamesUpper();
  let current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    days.push({ day: dayNames[dayOfWeek], date: current.getDate(), isWeekend: dayOfWeek === 0 || dayOfWeek === 6 });
    current.setDate(current.getDate() + 1);
  }
  return days;
};

export const getWeekdayRange = (startDate: string, endDate: string): string => {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const dayNames = getDayNamesShort();
  return `${dayNames[start.getDay()]} - ${dayNames[end.getDay()]}`;
};

export const formatHolidayDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  const dayNames = getDayNamesShort();
  const months = getMonthNamesShort();
  return `${dayNames[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
};
