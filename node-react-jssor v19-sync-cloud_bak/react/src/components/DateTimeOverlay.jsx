import { useEffect, useState, useRef } from 'react';
import DisplayTime from './DisplayTime';
import DisplayDate from './DisplayDate';
import Marquee, { MARQUEE_STANDARD_HEIGHT_BASE } from './Marquee';
import { useData } from '../contexts/DataContext';
import { usePrayerTimes } from '../hooks/useIslamicTime';
import { useTakwimData } from '../hooks/useTakwimData';
import prayerTimeService from '../services/prayerTimeService';
import { OVERLAY_PRAYER_TIMES } from '../utils/prayerUtils';
import { TIME_EVENTS } from '../utils/timeEvents';
import { top as topPx, left as leftPx, right as rightPx, bottom as bottomPx } from '../utils/screenUtils';
import { MOSQUE_NAME } from '../config/mosqueInfo';

const resolveOverlay = (dt, key) => {
  if (dt == null) return true;
  if (!Array.isArray(dt)) return false;
  if (dt.includes(key)) return true;
  if (key === 'solat-time' && dt.includes('solat') && dt.includes('time')) return true;
  if (key === 'solat-time-small' && dt.includes('next-solat') && dt.includes('small-time')) return true;
  if (key === 'time-small-clock') return dt.includes('time-small-clock');
  return false;
};

const DateTimeOverlay = ({ overlayOverride = null }) => {
  const dtRef = useRef(null);
  const [, forceRender] = useState(0);
  const { takwimArray, takwimParsed } = useTakwimData();
  const { MARQUEE_CONFIG, hebahanData, COLOR_CONFIG, slidesMarqueeShow } = useData();
  const currentTimeColor = COLOR_CONFIG?.CURRENT_TIME ?? '#FFFF00';
  const prayerTimeColor = COLOR_CONFIG?.DEFAULT ?? '#FFFF00';
  // Marquee ikut flag per-slide (datetime overlay), fallback slidesMarqueeShow bila slide belum berubah. Tiada global ENABLED.
  const marqueeFromSlide = dtRef.current != null ? resolveOverlay(dtRef.current, 'marquee') : slidesMarqueeShow;
  const marqueeEnabled = marqueeFromSlide !== false;
  const timeBottom = marqueeEnabled ? MARQUEE_STANDARD_HEIGHT_BASE : 0;
  const { nextPrayerData, nextPrayerName } = usePrayerTimes(takwimParsed);

  useEffect(() => {
    const handler = (e) => {
      dtRef.current = e.detail?.datetime ?? null;
      forceRender(c => c + 1);
    };
    window.addEventListener(TIME_EVENTS.SLIDE_CHANGED, handler);
    return () => window.removeEventListener(TIME_EVENTS.SLIDE_CHANGED, handler);
  }, []);

  const hasOverride = overlayOverride != null;
  const showOverlay = (key) => {
    if (hasOverride) {
      if (key === 'date') return overlayOverride.showDate !== false;
      if (key === 'solat-time-small') return overlayOverride.showSmallTime !== false;
      if (key === 'time-small-clock') return overlayOverride.showTimeSmallClock === true;
      if (key === 'solat-time') return false;
      return false;
    }
    return resolveOverlay(dtRef.current, key);
  };
  const showMarqueeOverride = hasOverride ? (overlayOverride.showMarquee !== false) : true;
  const showSolatTimeSmall = showOverlay('solat-time-small');

  const separator = MARQUEE_CONFIG?.SEPARATOR ?? '•';
  const sep = `\u00A0\u00A0${separator}\u00A0\u00A0`;
  const hebahanMessages = hebahanData && hebahanData.length > 0
    ? hebahanData.map(h => h.text).join(sep)
    : '';
  const showMosqueName = MARQUEE_CONFIG?.SHOW_MOSQUE_NAME !== false;
  const hebahanText = showMosqueName
    ? (hebahanMessages ? `${MOSQUE_NAME}${sep}${hebahanMessages}` : MOSQUE_NAME).toUpperCase()
    : (hebahanMessages ? hebahanMessages.toUpperCase() : '');
  
  useEffect(() => {
    if (takwimArray && takwimArray.length > 0) {
      prayerTimeService.setTakwim(takwimArray);
    }
  }, [takwimArray]);

  return (
    <>
      {/* <div className={`fixed top-0 left-0 right-0 flex justify-between items-center z-10 px-0 py-[14px] ${showOverlay('date') ? 'opacity-100' : 'opacity-0'}`} aria-hidden={!showOverlay('date')}> */}
      
      {showOverlay('date') && (
        <div className={`fixed top-0 left-0 right-0 flex justify-between items-center z-[10000] px-0 py-[14px]`}>
            <DisplayDate type={1} dateType="gregorian" size={72} color={currentTimeColor} />
            <DisplayDate type={2} dateType="hijri" size={72} color={currentTimeColor} />
        </div>
      )}

      <div className={`fixed bottom-0 left-0 right-0 z-[10000]`}>
        {showOverlay('solat-time') && (
          <div className={`flex justify-between items-center`}>
            <div className="flex gap-[20px]">
              {OVERLAY_PRAYER_TIMES.map((waktu, index) => (
                <DisplayTime key={index} type={2} label={waktu.label} size={95} format="12h" showSeconds={false} showAmPm={false} color={prayerTimeColor} labelSize={39} labelColor={prayerTimeColor} prayerName={waktu.prayerName} nextPrayerName={nextPrayerName} style={{ position: 'relative' }} />
              ))}
            </div>
            <DisplayTime type={1} size={148} format="12h" showSeconds={false} showAmPm={false} color={currentTimeColor} style={{ borderTopLeftRadius: '10px', padding: '4px 18px 17px 1.5rem', backgroundColor: '#000000',position: 'relative' }} />
          </div>
        )}
        
        <div className='relative'>
          {showOverlay('solat-time-small') && (
            <div className="flex justify-between items-center absolute bottom-0 right-0 left-0 z-10">
              <div style={{clipPath: 'polygon(80% 0, 100% 25%, 100% 100%, 0 100%, 0 0)', backgroundColor: '#000000', padding: '0' }}>
                {nextPrayerData && (
                  <DisplayTime key="next-solat" type={3} label={nextPrayerData.next} nextPrayerTime={nextPrayerData.nextTime} nextPrayerName={nextPrayerName} size={70} format="12h" showSeconds={false} showAmPm={false} color={prayerTimeColor} labelSize={20} labelColor={prayerTimeColor}
                    style={{ position: 'relative'}} />
                )}
              </div>
              <DisplayTime key="clock-small" type={1} size={100} format="12h" showSeconds={false} showAmPm={false} color={currentTimeColor} style={{
                bottom: 0, right: 0, padding: '14px', paddingLeft: '1.5rem', position: 'relative',
                clipPath: 'polygon(15% 0%, 100% 0, 100% 100%, 0 100%, 0% 25%', backgroundColor: '#000000'
              }} />
            </div>
          )}

          {showOverlay('time-small-clock') && (
            <DisplayTime key="clock-small" type={1} size={100} format="12h" showSeconds={false} showAmPm={false} color={currentTimeColor} style={{
              bottom: 0, right: 0, padding: '14px', paddingLeft: '1.5rem', position: 'absolute',zIndex: 100,
              clipPath: 'polygon(15% 0%, 100% 0, 100% 100%, 0 100%, 0% 25%', backgroundColor: '#000000'
            }} />
          )}
          {marqueeEnabled && showMarqueeOverride && hebahanText && (<Marquee text={hebahanText} duration={MARQUEE_CONFIG.DURATION} className="w-full bg-black/80" />)}
        </div>
      </div>
    </>
  );
};

export default DateTimeOverlay;
