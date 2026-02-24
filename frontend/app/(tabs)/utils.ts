export const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export const COUNTRY_COLORS = ['#7C9CBF', '#8FBC8F', '#DDA0DD', '#F4A460', '#87CEEB'];

export const getCountryFlag = (countryCode: string): string => {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

export const formatDateRange = (startDate: string, endDate: string): string => {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
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
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
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
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${dayNames[start.getDay()]} to ${dayNames[end.getDay()]}`;
};

export const formatHolidayDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};
