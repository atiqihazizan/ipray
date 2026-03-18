import { useData } from '../contexts/DataContext';

/**
 * Custom hook untuk akses takwim data dari context (data sudah diparse di API)
 * @returns {Object} { takwimArray, takwimParsed, loading, error }
 */
export const useTakwimData = () => {
  const { takwimArray, takwimParsed, loading, error } = useData();
  return {
    takwimArray,
    takwimParsed,
    loading,
    error
  };
};
