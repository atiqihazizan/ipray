import { memo } from 'react';
import { useDisplayTime } from '../hooks/useDisplayTime';
import { useData } from '../contexts/DataContext';
import {
  getCaptionAttributes,
  getDisplayTimeBaseStyle,
  getDisplayTimeLabelStyle,
  getDisplayTimeWrapperStyle,
  getDisplayTimeBlinkContainerStyle,
  getDisplayTimeTextStyle
} from '../utils/displayTimeUtils';

const DisplayTime = ({ 
  size = 72, 
  format = '24h', 
  showSeconds = true, 
  showAmPm = true, 
  isCurrentTime = true, 
  color = '#FFD700', 
  className = '',
  // Label props
  label,
  labelSize,
  labelColor,
  // Prayer time props
  prayerName = null,
  // Next prayer name (untuk detect highlight perang)
  nextPrayerName = null,
  // Next prayer time props (untuk type=3)
  nextPrayerTime = null,
  // Type: 1 = clock/masa semasa, 2 = waktu solat, 3 = next solat
  type = 1,
  // Caption attributes
  transition,
  transition2,
  delay,
  duration,
  style: customStyle = {},
  textAlign
}) => {
  // Get config from context
  const { COLOR_CONFIG } = useData();
  
  // Tentukan isCurrentTime berdasarkan type
  const isCurrentTimeMode = type === 1;
  const isPrayerTimeMode = type === 2;
  const isNextPrayerMode = type === 3;
  
  // Jika type 2 atau 3, pastikan isCurrentTime = false
  const effectiveIsCurrentTime = isCurrentTimeMode ? isCurrentTime : false;
  
  const { blink, loading, displayTime, effectiveIsPrayerTime, effectiveIsInPrayerMinute, effectiveIs30SecondsBeforePrayer, effectiveShouldBlink, isNextPrayer, effectiveIsSyurukInFirst10Sec } = useDisplayTime({
    format,
    showSeconds,
    showAmPm,
    isCurrentTime: effectiveIsCurrentTime,
    prayerName: isPrayerTimeMode ? prayerName : (isNextPrayerMode ? label : null),
    nextPrayerTime: isNextPrayerMode ? nextPrayerTime : null,
    nextPrayerName: isPrayerTimeMode ? nextPrayerName : null
  });

  const formatTimeWithBlink = () => {
    const parts = displayTime.split(':');
    if (parts.length === 1) return displayTime;

    const colonStyle = effectiveShouldBlink ? { opacity: blink ? 1 : 0, transition: 'opacity 0.35s ease' } : { opacity: 1 };

    if (showSeconds && parts.length === 3) {
      const ampm = parts[2].match(/\s*(AM|PM)/)?.[0] || '';
      const seconds = parts[2].replace(/\s*(AM|PM)/, '');
      return <>{parts[0]}<span style={colonStyle}>:</span>{parts[1]}<span style={colonStyle}>:</span>{seconds}{ampm}</>;
    }

    const ampm = parts[1].match(/\s*(AM|PM)/)?.[0] || '';
    const minutes = parts[1].replace(/\s*(AM|PM)/, '');
    return <>{parts[0]}<span style={colonStyle}>:</span>{minutes}{ampm}</>;
  };

  const attrs = getCaptionAttributes({ transition, transition2, delay, duration });
  const styleObj = getDisplayTimeBaseStyle({ size, customStyle, color, textAlign, effectiveIsPrayerTime, type });
  const wrapperStyle = getDisplayTimeWrapperStyle({ customStyle, textAlign });
  const labelStyle = getDisplayTimeLabelStyle({ labelColor, color, size, labelSize, isNextPrayer, effectiveIsInPrayerMinute, effectiveIs30SecondsBeforePrayer, type, effectiveIsSyurukInFirst10Sec, effectiveIsPrayerTime, COLOR_CONFIG });
  const blinkContainerStyle = getDisplayTimeBlinkContainerStyle({ effectiveIsPrayerTime, effectiveIs30SecondsBeforePrayer, effectiveIsInPrayerMinute, effectiveIsSyurukInFirst10Sec, blink, type });
  const timeTextStyle = getDisplayTimeTextStyle({ isNextPrayer, effectiveIsInPrayerMinute, effectiveIs30SecondsBeforePrayer, type, effectiveIsSyurukInFirst10Sec, effectiveIsPrayerTime, COLOR_CONFIG });

  return (
    <div {...attrs} className={className} style={{ ...styleObj, ...wrapperStyle, ...blinkContainerStyle }}>
      {label && <div style={labelStyle}>{label}</div>}
      <div style={timeTextStyle}>{formatTimeWithBlink()}</div>
    </div>
  );
};

// Memoize component - hanya re-render bila props atau time data berubah
// Untuk type=1 (masa semasa): re-render setiap saat (perlu)
// Untuk type=2 & 3 (waktu solat): hanya re-render bila prayer time berubah
export default memo(DisplayTime, (prevProps, nextProps) => {
  // Untuk type=1 (masa semasa), biarkan re-render (perlu update setiap saat)
  if (prevProps.type === 1 || nextProps.type === 1) {
    return false; // Re-render untuk type=1
  }
  
  // Untuk type=2 & 3, skip re-render jika props sama
  return (
    prevProps.type === nextProps.type &&
    prevProps.format === nextProps.format &&
    prevProps.showSeconds === nextProps.showSeconds &&
    prevProps.showAmPm === nextProps.showAmPm &&
    prevProps.prayerName === nextProps.prayerName &&
    prevProps.nextPrayerName === nextProps.nextPrayerName &&
    prevProps.nextPrayerTime === nextProps.nextPrayerTime &&
    prevProps.size === nextProps.size &&
    prevProps.color === nextProps.color &&
    JSON.stringify(prevProps.style) === JSON.stringify(nextProps.style)
  );
});

