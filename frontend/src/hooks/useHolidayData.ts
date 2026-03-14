import { useState, useEffect, useCallback, useRef } from 'react';
import { BACKEND_URL } from '../utils';
import { Country, CompareResponse } from '../types';
import { getLocalizedCountryName } from '../i18n/countryNames';

export function useHolidayData() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<Country[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [comparisonResult, setComparisonResult] = useState<CompareResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'holidays' | 'overlaps' | 'longweekends'>('holidays');

  // Refs ensure callbacks always see latest values without stale closures
  const selectedCountriesRef = useRef(selectedCountries);
  const selectedYearRef = useRef(selectedYear);
  useEffect(() => { selectedCountriesRef.current = selectedCountries; }, [selectedCountries]);
  useEffect(() => { selectedYearRef.current = selectedYear; }, [selectedYear]);

  const localizeCountries = (list: Country[]): Country[] =>
    list.map((c) => ({ ...c, name: getLocalizedCountryName(c.countryCode, c.name) }));

  const fetchCountries = useCallback(async () => {
    try {
      setIsLoadingCountries(true);
      setError(null);
      const response = await fetch(`${BACKEND_URL}/api/countries`);
      if (!response.ok) throw new Error('Failed to fetch countries');
      const data = await response.json();
      setCountries(localizeCountries(data));
    } catch {
      setError('Failed to load countries. Please try again.');
    } finally {
      setIsLoadingCountries(false);
    }
  }, []);

  useEffect(() => { fetchCountries(); }, [fetchCountries]);

  // Accepts optional overrides so bookmark restores bypass stale closures
  const compareHolidays = useCallback(async (overrideYear?: number, overrideCountries?: Country[]) => {
    const currentCountries = overrideCountries ?? selectedCountriesRef.current;
    const year = overrideYear ?? selectedYearRef.current;
    if (currentCountries.length < 1) {
      setError('Please select at least 1 country');
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`${BACKEND_URL}/api/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countryCodes: currentCountries.map((c) => c.countryCode), year }),
      });
      if (!response.ok) throw new Error('Failed to compare holidays');
      const data: CompareResponse = await response.json();
      // Localize country names in comparison results
      const localizedResult: CompareResponse = {
        ...data,
        countries: localizeCountries(data.countries),
      };
      setComparisonResult(localizedResult);
      setActiveTab('holidays');
    } catch {
      setError('Failed to compare holidays. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleCountry = useCallback((country: Country) => {
    setSelectedCountries((prev) => {
      const isSelected = prev.find((c) => c.countryCode === country.countryCode);
      if (isSelected) return prev.filter((c) => c.countryCode !== country.countryCode);
      if (prev.length < 5) return [...prev, country];
      return prev;
    });
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (selectedCountriesRef.current.length >= 1) await compareHolidays();
    setRefreshing(false);
  }, [compareHolidays]);

  return {
    countries,
    selectedCountries,
    setSelectedCountries,
    selectedYear,
    setSelectedYear,
    comparisonResult,
    isLoading,
    isLoadingCountries,
    error,
    setError,
    refreshing,
    activeTab,
    setActiveTab,
    compareHolidays,
    toggleCountry,
    onRefresh,
  };
}
