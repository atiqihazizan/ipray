import { useMemo } from 'react';
import { convertTakwimToArray, parseTakwimFile } from '../utils/islamicTimeUtils';
import { useData } from '../contexts/DataContext';

/**
 * Custom hook untuk process takwim data
 * Menggunakan useMemo untuk elakkan re-processing yang tidak perlu
 * @returns {Object} { takwimArray, takwimParsed, loading, error }
 */
export const useTakwimData = () => {
  const { takwimText, loading, error } = useData();

  // Process takwim text dengan useMemo untuk elakkan re-calculation
  const takwimArray = useMemo(() => {
    if (!takwimText) return null;
    try {
      return convertTakwimToArray(takwimText);
    } catch (err) {
      console.error('Error converting takwim to array:', err);
      return null;
    }
  }, [takwimText]);

  const takwimParsed = useMemo(() => {
    if (!takwimText) return null;
    try {
      return parseTakwimFile(takwimText);
    } catch (err) {
      console.error('Error parsing takwim file:', err);
      return null;
    }
  }, [takwimText]);

  return {
    takwimArray,   // Array format untuk prayerTimeService
    takwimParsed,  // Object format {zone, hdata, wdata} untuk useIslamicTime
    loading,
    error
  };
};
