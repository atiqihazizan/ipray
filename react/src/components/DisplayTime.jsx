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
  elementId = null,      // id untuk time text div
  labelElementId = null, // id untuk label div
  wrapperId = null,      // id untuk outer wrapper div
  // Type: 1 = clock/masa semasa, 2 = waktu solat, 3 = next solat
  type = 1,
  // Unique colon ID untuk DOM blink
  colonId = null,
  hourId = null,    // id untuk span jam (type=1, DOM update)
  minuteId = null,  // id untuk span minit (type=1, DOM update)
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
  
  const { blink, /* loading, */ displayTime, effectiveIsPrayerTime, effectiveIsInPrayerMinute, effectiveIs30SecondsBeforePrayer, effectiveShouldBlink, isNextPrayer, effectiveIsSyurukInFirst10Sec } = useDisplayTime({
    format,
    showSeconds,
    showAmPm,
    isCurrentTime: effectiveIsCurrentTime,
    prayerName: isPrayerTimeMode ? prayerName : (isNextPrayerMode ? label : null),
    nextPrayerTime: isNextPrayerMode ? nextPrayerTime : null,
    nextPrayerName: isPrayerTimeMode ? nextPrayerName : null,
    disablePrayerTracking: isPrayerTimeMode || isNextPrayerMode,
    disableBlinkState: isCurrentTimeMode
  });

  // Commented out — digantikan oleh renderTime() + DOM blink via useTimeDriver
  // const formatTimeWithBlink = () => {
  //   const parts = displayTime.split(':');
  //   if (parts.length === 1) return displayTime;
  //
  //   const colonClass = effectiveShouldBlink ? 'ipray-blink-colon' : undefined;
  //
  //   if (showSeconds && parts.length === 3) {
  //     const ampm = parts[2].match(/\s*(AM|PM)/)?.[0] || '';
  //     const seconds = parts[2].replace(/\s*(AM|PM)/, '');
  //     return <>{parts[0]}<span className={colonClass}>:</span>{parts[1]}<span className={colonClass}>:</span>{seconds}{ampm}</>;
  //   }
  //
  //   const ampm = parts[1].match(/\s*(AM|PM)/)?.[0] || '';
  //   const minutes = parts[1].replace(/\s*(AM|PM)/, '');
  //   return <>{parts[0]}<span className={colonClass}>:</span>{minutes}{ampm}</>;
  // };

  const renderTime = () => {
    const parts = displayTime ? displayTime.split(':') : [];
    if (parts.length < 2) return displayTime || '';

    if (type === 1) {
      if (showSeconds && parts.length === 3) {
        const ampm = parts[2].match(/\s*(AM|PM)/)?.[0] || '';
        const seconds = parts[2].replace(/\s*(AM|PM)/, '');
        return (
          <><span id={hourId || undefined}>{parts[0]}</span>
            <span id={colonId || undefined} style={{ transition: 'none' }}>:</span>
            <span id={minuteId || undefined}>{parts[1]}</span>
            <span>:</span>{seconds}{ampm}</>
        );
      }
      const ampm = parts[1].match(/\s*(AM|PM)/)?.[0] || '';
      const minutes = parts[1].replace(/\s*(AM|PM)/, '');
      return (
        <><span id={hourId || undefined}>{parts[0]}</span>
          <span id={colonId || undefined} style={{ transition: 'none' }}>:</span>
          <span id={minuteId || undefined}>{minutes}</span>{ampm}</>
      );
    }

    if (type === 2) {
      const ampm = parts[1].match(/\s*(AM|PM)/)?.[0] || '';
      const minutes = parts[1].replace(/\s*(AM|PM)/, '');
      return <>{parts[0]}<span id={colonId || undefined}>:</span>{minutes}{ampm}</>;
    }

    // type=3 atau lain — guna formatTimeWithBlink lama
    // return formatTimeWithBlink();
    return displayTime || '';
  };

  const attrs = getCaptionAttributes({ transition, transition2, delay, duration });
  const styleObj = getDisplayTimeBaseStyle({ size, customStyle, color, textAlign, effectiveIsPrayerTime, type });
  const wrapperStyle = getDisplayTimeWrapperStyle({ customStyle, textAlign });
  const labelStyle = getDisplayTimeLabelStyle({ labelColor, color, size, labelSize, isNextPrayer, effectiveIsInPrayerMinute, effectiveIs30SecondsBeforePrayer, type, effectiveIsSyurukInFirst10Sec, effectiveIsPrayerTime, COLOR_CONFIG });
  const blinkContainerStyle = getDisplayTimeBlinkContainerStyle({ effectiveIsPrayerTime, effectiveIs30SecondsBeforePrayer, effectiveIsInPrayerMinute, effectiveIsSyurukInFirst10Sec, blink, type });
  const timeTextStyle = getDisplayTimeTextStyle({ isNextPrayer, effectiveIsInPrayerMinute, effectiveIs30SecondsBeforePrayer, type, effectiveIsSyurukInFirst10Sec, effectiveIsPrayerTime, COLOR_CONFIG });

  return (
    <div {...attrs} id={wrapperId || undefined} className={className} style={{ ...styleObj, ...wrapperStyle, ...blinkContainerStyle }}>
      {label && <div id={labelElementId || undefined} style={labelStyle}>{label}</div>}
      <div id={elementId || undefined} style={timeTextStyle}>
        {renderTime()}
      </div>
    </div>
  );
};

// Memoize component - skip re-render jika props sama (type=1 gunakan DOM update)
export default memo(DisplayTime, (prevProps, nextProps) => {
  return (
    prevProps.type === nextProps.type &&
    prevProps.size === nextProps.size &&
    prevProps.color === nextProps.color &&
    prevProps.colonId === nextProps.colonId &&
    prevProps.hourId === nextProps.hourId &&
    prevProps.minuteId === nextProps.minuteId &&
    prevProps.prayerName === nextProps.prayerName &&
    prevProps.nextPrayerName === nextProps.nextPrayerName &&
    prevProps.nextPrayerTime === nextProps.nextPrayerTime &&
    JSON.stringify(prevProps.style) === JSON.stringify(nextProps.style)
  );
});

