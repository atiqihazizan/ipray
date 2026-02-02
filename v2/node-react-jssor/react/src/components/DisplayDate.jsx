import { memo, useMemo } from 'react';
import { useIslamicTime } from '../hooks/useIslamicTime';

const DisplayDate = ({ 
  type = 1, // 1 = kiri, 2 = kanan
  dateType = 'gregorian', // 'gregorian' atau 'hijri'
  size = 72,
  color = '#ffff00',
  style: customStyle = {}
}) => {
  const { islamicTime, loading } = useIslamicTime();
  
  // Memoize date data - hanya update bila date benar-benar berubah
  // Tarikh hanya berubah pada waktu tertentu (Maghrib untuk Hijri, tengah malam untuk Gregorian)
  // Guna date key untuk comparison yang stable
  const dateKey = dateType === 'hijri' 
    ? `${islamicTime?.hijri?.day}-${islamicTime?.hijri?.month}-${islamicTime?.hijri?.year}`
    : `${islamicTime?.gregorian?.day}-${islamicTime?.gregorian?.month}-${islamicTime?.gregorian?.year}`;
  
  const dateData = useMemo(() => {
    if (!islamicTime) return null;
    return dateType === 'hijri' ? islamicTime.hijri : islamicTime.gregorian;
  }, [dateKey, dateType, islamicTime]);

  // Handle loading state
  if (loading || !dateData) {
    return null;
  }

  // Format hari - guna dayFormatted jika ada (2 digit), jika tidak guna padZero
  const daySingle = dateData.dayFormatted || (dateData.day < 10 ? `0${dateData.day}` : `${dateData.day}`);

  // Pendekkan nama bulan kepada 3 huruf pertama hanya untuk gregorian, hijri tetap full
  const displayMonthName = dateType === 'hijri' 
    ? dateData.monthName 
    : dateData.monthName;

  const getStyle = () => {
    return {
      fontFamily: "'Bebas', sans-serif",
      color: customStyle.color || color,
      textShadow: customStyle.textShadow || '3px 3px 0px rgba(0,0,0,1)',
      ...customStyle
    };
  };

  // Type 1: Kiri - number single digit | hari (baris 1), bulan tahun (baris 2)
  if (type === 1) {
    // Kira saiz font untuk nombor digit supaya sama tinggi dengan 2 baris hari dan bulan tahun
    // Hari/bulan tahun: size * 0.5 dengan lineHeight 1.2, jadi tinggi 2 baris = size * 0.5 * 1.2 * 2 = size * 1.2
    const digitFontSize = size * 1.2;
    
    return (
      <div style={getStyle()}>
        {/* Div content tarikh dengan shape trapezoid condong di kanan */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          gap: '8px',
          backgroundColor: 'rgb(71 71 71 / 78%)', // Dark grey semi-transparent
          // clipPath: 'polygon(0 0, 88% 0, 100% 100%, 0 100%)',
          clipPath: 'polygon(0px 0px, 100% 0px, 88% 100%, 0px 100%)',
          padding: '0px 16px 4px',
          width: '456px'
        }}>
          {/* Number single digit - magenta/pink */}
          <div style={{ 
            fontSize: `${digitFontSize}px`, 
            lineHeight: 1, 
            fontWeight: 'normal',
            color: '#FF00FF' // Magenta/bright pink
          }}>
            {daySingle}
          </div>
          {/* Hari dan Bulan Tahun dalam 2 baris */}
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            fontSize: `${size * 0.5}px`, 
            lineHeight: 1.2, 
            fontWeight: 'normal',
            paddingTop: '4px'
          }}>
            {/* Baris 1: Hari - putih */}
            <div style={{ color: '#FFFFFF' }}>{dateData.dayName}</div>
            {/* Baris 2: Bulan dan Tahun dalam 1 baris - cyan */}
            <div style={{ color: '#00FFFF' }}>{displayMonthName} {dateData.year}</div>
          </div>
        </div>
      </div>
    );
  }

  // Type 2: Kanan - bulan (baris 1), tahun (baris 2) | number single digit
  // Kira saiz font untuk nombor digit supaya sama tinggi dengan 2 baris bulan dan tahun
  // Bulan/tahun: size * 0.5 dengan lineHeight 1.2, jadi tinggi 2 baris = size * 0.5 * 1.2 * 2 = size * 1.2
  const digitFontSize = size * 1.2;
  
  return (
    <div style={getStyle()}>
      {/* Div content tarikh dengan shape trapezoid */}
      <div style={{ 
        display: 'flex', 
        // alignItems: 'flex-start', 
        justifyContent: 'flex-end',
        gap: '8px',
        // padding: '16px',
        backgroundColor: 'rgb(71 71 71 / 78%)', // Dark grey semi-transparent
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 12% 100%)',
        padding: '0px 16px 4px',
        width: '456px'
      }}>
        {/* Bulan dan Tahun dalam 2 baris */}
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          fontSize: `${size * 0.5}px`, 
          lineHeight: 1.2, 
          fontWeight: 'normal',
          paddingTop: '4px'
        }}>
          {/* Baris 1: Bulan - putih */}
          <div style={{ color: '#FFFFFF' }}>{displayMonthName}</div>
          {/* Baris 2: Tahun - align kanan, cyan */}
          <div style={{ textAlign: 'right', color: '#00FFFF' }}>{dateData.year}</div>
        </div>
        {/* Number single digit - magenta/pink */}
        <div style={{ 
          fontSize: `${digitFontSize}px`, 
          lineHeight: 1, 
          fontWeight: 'normal',
          color: '#FF00FF' // Magenta/bright pink
        }}>
          {daySingle}
        </div>
      </div>
    </div>
  );
};

// Memoize component - React.memo akan handle shallow comparison
// Date data sudah di-memoize dalam component, jadi hanya re-render bila date benar-benar berubah
export default memo(DisplayDate);

