import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = 'favorite_countries';

export function useFavoriteCountries() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(FAVORITES_KEY).then((data) => {
      if (data) setFavorites(JSON.parse(data));
    });
  }, []);

  const toggleFavorite = useCallback((countryCode: string) => {
    setFavorites((prev) => {
      const next = prev.includes(countryCode)
        ? prev.filter((c) => c !== countryCode)
        : [...prev, countryCode];
      AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (countryCode: string) => favorites.includes(countryCode),
    [favorites]
  );

  return { favorites, toggleFavorite, isFavorite };
}
