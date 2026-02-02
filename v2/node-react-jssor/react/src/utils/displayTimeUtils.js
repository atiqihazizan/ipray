/**
 * Pure helpers untuk DisplayTime component (caption attributes & styles).
 * Tiada dependency React/JSX.
 */

/**
 * @param {Object} opts - { transition, transition2, delay, duration }
 * @returns {Object} Jssor caption attributes
 */
export const getCaptionAttributes = ({ transition, transition2, delay, duration }) => {
  const attrs = { u: 'caption' };
  if (transition) attrs.t = transition;
  if (transition2) attrs.t2 = transition2;
  if (delay) attrs.d = delay.toString();
  if (duration) attrs.du = duration.toString();
  return attrs;
};

/**
 * @param {Object} opts - { size, customStyle, color, textAlign, effectiveIsPrayerTime }
 * @returns {Object} Base style object
 */
export const getDisplayTimeBaseStyle = ({
  size,
  customStyle = {},
  color,
  textAlign,
  effectiveIsPrayerTime
}) => {
  const baseStyle = {
    position: 'absolute',
    fontFamily: "'Bebas', sans-serif",
    fontSize: customStyle.fontSize ? `${customStyle.fontSize}px` : `${size}px`,
    lineHeight: customStyle.lineHeight ? `${customStyle.lineHeight}px` : 1,
    fontWeight: 'normal',
    color: effectiveIsPrayerTime ? '#FF0000' : (customStyle.color || color),
    textShadow: customStyle.textShadow || '3px 3px 0px rgba(0,0,0,1)',
    transition: 'color 0.3s ease',
    ...customStyle
  };
  if (textAlign) baseStyle.textAlign = textAlign;
  return baseStyle;
};

/**
 * @param {Object} opts - { labelColor, color, size, labelSize, isNextPrayer, effectiveIsInPrayerMinute, effectiveIs30SecondsBeforePrayer, COLOR_CONFIG }
 * @returns {Object} Label style object
 */
export const getDisplayTimeLabelStyle = ({
  labelColor,
  color,
  size,
  labelSize,
  isNextPrayer,
  effectiveIsInPrayerMinute,
  effectiveIs30SecondsBeforePrayer,
  COLOR_CONFIG
}) => {
  let labelColorFinal = labelColor || color;
  if (isNextPrayer && !effectiveIsInPrayerMinute && !effectiveIs30SecondsBeforePrayer) {
    labelColorFinal = COLOR_CONFIG.NEXT_PRAYER;
  }
  if (effectiveIsInPrayerMinute || effectiveIs30SecondsBeforePrayer) {
    labelColorFinal = COLOR_CONFIG.WARNING_PRAYER;
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

/**
 * @param {Object} opts - { customStyle, textAlign }
 * @returns {Object} Wrapper style object
 */
export const getDisplayTimeWrapperStyle = ({ customStyle = {}, textAlign }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems:
    customStyle.alignItems ||
    (textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start'),
  justifyContent: 'center',
  padding: customStyle.padding || '16px',
  backgroundColor: customStyle.backgroundColor || 'transparent',
  borderTopLeftRadius: customStyle.borderTopLeftRadius || '0px'
});

/**
 * @param {Object} opts - { effectiveIsPrayerTime, effectiveIs30SecondsBeforePrayer, effectiveIsInPrayerMinute, blink }
 * @returns {Object} Blink container style object
 */
export const getDisplayTimeBlinkContainerStyle = ({
  effectiveIsPrayerTime,
  effectiveIs30SecondsBeforePrayer,
  effectiveIsInPrayerMinute,
  blink
}) => {
  if (effectiveIsPrayerTime) {
    return { opacity: blink ? 1 : 0, transition: 'opacity 0.1s ease' };
  }
  if (effectiveIs30SecondsBeforePrayer && !effectiveIsPrayerTime) {
    return { opacity: blink ? 1 : 0, transition: 'opacity 0.1s ease' };
  }
  if (effectiveIsInPrayerMinute && !effectiveIsPrayerTime) {
    return { opacity: 1 };
  }
  return {};
};

/**
 * @param {Object} opts - { isNextPrayer, effectiveIsInPrayerMinute, effectiveIs30SecondsBeforePrayer, COLOR_CONFIG }
 * @returns {Object} Time text style object
 */
export const getDisplayTimeTextStyle = ({
  isNextPrayer,
  effectiveIsInPrayerMinute,
  effectiveIs30SecondsBeforePrayer,
  COLOR_CONFIG
}) => {
  let timeColorFinal = 'inherit';
  if (isNextPrayer && !effectiveIsInPrayerMinute && !effectiveIs30SecondsBeforePrayer) {
    timeColorFinal = COLOR_CONFIG.NEXT_PRAYER;
  }
  if (effectiveIsInPrayerMinute || effectiveIs30SecondsBeforePrayer) {
    timeColorFinal = COLOR_CONFIG.WARNING_PRAYER;
  }
  return { color: timeColorFinal, transition: 'color 0.3s ease' };
};
