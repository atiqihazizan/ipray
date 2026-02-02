import { memo } from 'react';
import { useDisplayTime } from '../hooks/useDisplayTime';
import { useData } from '../contexts/DataContext';

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
  
  const { time, blink, shouldBlink, isPrayerTime, isInPrayerMinute, is30SecondsBeforePrayer, prayerTime, loading } = useDisplayTime({ 
    format, 
    showSeconds, 
    showAmPm, 
    isCurrentTime: effectiveIsCurrentTime, 
    prayerName: isPrayerTimeMode ? prayerName : null,
    nextPrayerTime: isNextPrayerMode ? nextPrayerTime : null 
  });
  // Handle loading dan default time
  const isDefaultTime = (isPrayerTimeMode && (!prayerName || !time || time === '' || (prayerName && prayerTime === null))) ||
                        (isNextPrayerMode && (!nextPrayerTime || !time || time === ''));
  const displayTime = (() => {
    if (loading) return '00:00';
    if (isDefaultTime) return '0:00';
    return time;
  })();
  
  // Untuk type 2 dengan default time, jangan highlight atau blink
  const effectiveIsPrayerTime = isDefaultTime ? false : isPrayerTime;
  const effectiveIsInPrayerMinute = isDefaultTime ? false : isInPrayerMinute;
  const effectiveIs30SecondsBeforePrayer = isDefaultTime ? false : is30SecondsBeforePrayer;
  const effectiveShouldBlink = isDefaultTime ? false : shouldBlink;

  // Check jika waktu solat ini adalah next prayer (untuk highlight perang)
  const isNextPrayer = isPrayerTimeMode && nextPrayerName && prayerName?.toLowerCase() === nextPrayerName.toLowerCase();

  const formatTimeWithBlink = () => {
    const parts = displayTime.split(':');
    if (parts.length === 1) return displayTime;
    
    const colonStyle = effectiveShouldBlink ? { opacity: blink ? 1 : 0, transition: 'opacity 0.1s' } : { opacity: 1 };
    
    if (showSeconds && parts.length === 3) {
      const ampm = parts[2].match(/\s*(AM|PM)/)?.[0] || '';
      const seconds = parts[2].replace(/\s*(AM|PM)/, '');
      return <>{parts[0]}<span style={colonStyle}>:</span>{parts[1]}<span style={colonStyle}>:</span>{seconds}{ampm}</>;
    }
    
    const ampm = parts[1].match(/\s*(AM|PM)/)?.[0] || '';
    const minutes = parts[1].replace(/\s*(AM|PM)/, '');
    return <>{parts[0]}<span style={colonStyle}>:</span>{minutes}{ampm}</>;
  };

  const getAttributes = () => {
    const attrs = { u: "caption" };
    if (transition) attrs.t = transition;
    if (transition2) attrs.t2 = transition2;
    if (delay) attrs.d = delay.toString();
    if (duration) attrs.du = duration.toString();
    return attrs;
  };

  const getStyle = () => {
    const baseStyle = {
      position: 'absolute',
      fontFamily: "'Bebas', sans-serif",
      fontSize: customStyle.fontSize ? `${customStyle.fontSize}px` : `${size}px`,
      lineHeight: customStyle.lineHeight ? `${customStyle.lineHeight}px` : 1,
      fontWeight: 'normal',
      // COMMENTED: Disabled 30 seconds warning
      // color: effectiveIsPrayerTime || effectiveIs30SecondsBeforePrayer ? '#FF0000' : (customStyle.color || color),
      color: effectiveIsPrayerTime ? '#FF0000' : (customStyle.color || color), // Highlight merah apabila waktu solat
      textShadow: customStyle.textShadow || '3px 3px 0px rgba(0,0,0,1)',
      transition: 'color 0.3s ease',
      ...customStyle
    };
    
    if (textAlign) {
      baseStyle.textAlign = textAlign;
    }
    
    return baseStyle;
  };

  const getLabelStyle = () => {
    // Priority: Merah > Perang > Kuning (dari COLOR_CONFIG)
    let labelColorFinal = labelColor || color; // Default dari props atau kuning
    
    // Jika next prayer (dan bukan warning/prayer time), guna perang
    if (isNextPrayer && !effectiveIsInPrayerMinute && !effectiveIs30SecondsBeforePrayer) {
      labelColorFinal = COLOR_CONFIG.NEXT_PRAYER; // Perang (Orange)
    }
    
    // Jika warning atau prayer time, override dengan merah
    if (effectiveIsInPrayerMinute || effectiveIs30SecondsBeforePrayer) {
      labelColorFinal = COLOR_CONFIG.WARNING_PRAYER; // Merah
    }
    
    return {
      fontFamily: "'Bebas', sans-serif",
      fontSize: labelSize ? `${labelSize}px` : `${size * 0.4}px`,
      color: labelColorFinal,
      textShadow: '4px 4px 0px rgba(0,0,0,1)',
      paddingBottom: '8px',
      lineHeight: 1,
      fontWeight: 'normal',
      margin: 'auto',
      transition: 'color 0.3s ease'
    };
  };

  const getWrapperStyle = () => {
    return {
      display: 'flex',
      flexDirection: 'column',
      alignItems: customStyle.alignItems || (textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start'),
      justifyContent: 'center',
      padding: customStyle.padding || '16px',
      backgroundColor: customStyle.backgroundColor || 'transparent',
      borderTopLeftRadius: customStyle.borderTopLeftRadius || '0px'
    };
  };

  const getBlinkContainerStyle = () => {
    // Blinking effect untuk waktu solat (selama BLINK_DURATION)
    if (effectiveIsPrayerTime) {
      return {
        opacity: blink ? 1 : 0,
        transition: 'opacity 0.1s ease',
      };
    }
    
    // Blinking effect untuk 30 saat sebelum waktu solat
    if (effectiveIs30SecondsBeforePrayer && !effectiveIsPrayerTime) {
      return {
        opacity: blink ? 1 : 0,
        transition: 'opacity 0.1s ease',
      };
    }
    
    // Selepas blinking stop, pastikan opacity kekal normal (tidak hilang)
    if (effectiveIsInPrayerMinute && !effectiveIsPrayerTime) {
      return {
        opacity: 1,
      };
    }
    
    return {};
  };

  const getTimeTextStyle = () => {
    // Priority: Merah > Perang > Inherit (dari COLOR_CONFIG)
    let timeColorFinal = 'inherit'; // Default inherit dari parent (kuning)
    
    // Jika next prayer (dan bukan warning/prayer time), guna perang
    if (isNextPrayer && !effectiveIsInPrayerMinute && !effectiveIs30SecondsBeforePrayer) {
      timeColorFinal = COLOR_CONFIG.NEXT_PRAYER; // Perang (Orange)
    }
    
    // Jika warning atau prayer time, override dengan merah
    if (effectiveIsInPrayerMinute || effectiveIs30SecondsBeforePrayer) {
      timeColorFinal = COLOR_CONFIG.WARNING_PRAYER; // Merah
    }
    
    return {
      color: timeColorFinal,
      transition: 'color 0.3s ease'
    };
  };

  const styleObj = getStyle();
  const attrs = getAttributes();
  const wrapperStyle = getWrapperStyle();
  const labelStyle = getLabelStyle();

  return (
    <div {...attrs} className={className} style={{ ...styleObj, ...wrapperStyle, ...getBlinkContainerStyle() }}>
      {label && <div style={labelStyle}>{label}</div>}
      <div style={getTimeTextStyle()}>{formatTimeWithBlink()}</div>
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

