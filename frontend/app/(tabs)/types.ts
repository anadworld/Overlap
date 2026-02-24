export interface Country {
  countryCode: string;
  name: string;
}

export interface HolidayDetail {
  countryCode: string;
  name: string;
  localName: string;
  types: string[];
  date?: string;
}

export interface HolidayWithCountries {
  date: string;
  holidays: HolidayDetail[];
  isOverlap: boolean;
  countries: string[];
}

export interface LongWeekendOpportunity {
  startDate: string;
  endDate: string;
  totalDays: number;
  holidayDays: number;
  weekendDays: number;
  type: string;
  description: string;
  holidays: HolidayDetail[];
  countries: string[];
  isOverlap: boolean;
}

export interface CompareResponse {
  year: number;
  countries: Country[];
  holidays: HolidayWithCountries[];
  totalOverlaps: number;
  longWeekends: LongWeekendOpportunity[];
}
