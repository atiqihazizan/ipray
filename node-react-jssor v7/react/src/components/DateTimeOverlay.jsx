import { useEffect } from 'react';
import DisplayTime from './DisplayTime';
import DisplayDate from './DisplayDate';
import Marquee, { MARQUEE_STANDARD_HEIGHT_BASE } from './Marquee';
import { useData } from '../contexts/DataContext';
import { usePrayerTimes } from '../hooks/useIslamicTime';
import { useTakwimData } from '../hooks/useTakwimData';
import prayerTimeService from '../services/prayerTimeService';
import { OVERLAY_PRAYER_TIMES } from '../utils/prayerUtils';
import { top as topPx, left as leftPx, right as rightPx, bottom as bottomPx } from '../utils/screenUtils';

const DateTimeOverlay = ({ showOverlay, marqueeEnabled = false }) => {
  const { takwimArray, takwimParsed } = useTakwimData();
  const { MARQUEE_CONFIG } = useData();
  const timeBottom = marqueeEnabled ? MARQUEE_STANDARD_HEIGHT_BASE : 0;
  const { nextPrayerData, nextPrayerName } = usePrayerTimes(takwimParsed);
  const showSolatTimeSmall = showOverlay('solat-time-small');
  const showMarqueeInMiddle = marqueeEnabled && showSolatTimeSmall && MARQUEE_CONFIG?.TEXT;

  useEffect(() => {
    if (takwimArray && takwimArray.length > 0) {
      prayerTimeService.setTakwim(takwimArray);
    }
  }, [takwimArray]);

  return (
    <>
      {/* Overlay key: date | solat-time (waktu solat + jam besar) | solat-time-small (next solat + jam kecil). Show/hide ikut slide.datetime[] */}
      <div className={`absolute inset-0 pointer-events-none overlay-datetime overlay-date z-10 ${showOverlay('date') ? 'opacity-100' : 'opacity-0'}`} aria-hidden={!showOverlay('date')}>
        <div className="absolute" style={{ top: topPx(0), left: leftPx(0) }}>
          <DisplayDate type={1} dateType="gregorian" size={72} color="#ffff00" style={{ margin: '14px 0' }} />
        </div>
        <div className="absolute" style={{ top: topPx(0), right: rightPx(0) }}>
          <DisplayDate type={2} dateType="hijri" size={72} color="#ffff00" style={{ margin: '14px 0' }} />
        </div>
      </div>
      {/* solat-time: waktu solat + jam di atas; bila marquee on → bar marquee di bawah (bottom 0) */}
      <div className={`absolute inset-0 pointer-events-none overlay-datetime overlay-solat z-10 ${showOverlay('solat-time') ? 'opacity-100' : 'opacity-0'}`} aria-hidden={!showOverlay('solat-time')}>
        <div className="absolute" style={{ bottom: bottomPx(timeBottom), left: leftPx(0), display: 'flex', gap: '20px' }}>
          {OVERLAY_PRAYER_TIMES.map((waktu, index) => (
            <DisplayTime key={index} type={2} label={waktu.label} size={95} format="12h" showSeconds={false} showAmPm={false} color="#ffff00" labelSize={39} labelColor="#ffff00" prayerName={waktu.prayerName} nextPrayerName={nextPrayerName} style={{ position: 'relative' }} />
          ))}
        </div>
        <div className="absolute" style={{ bottom: bottomPx(timeBottom), right: rightPx(0) }}>
          <DisplayTime type={1} size={148} format="12h" showSeconds={false} showAmPm={false} color="#ffff00" style={{ bottom: 0, right: 0, borderTopLeftRadius: '10px', padding: '4px 18px 17px 1.5rem', backgroundColor: '#000000' }} />
        </div>
        {marqueeEnabled && MARQUEE_CONFIG?.TEXT && (
          <div className="absolute left-0 right-0 flex items-center bg-black/80 z-0 py-2" style={{ bottom: bottomPx(0) }}>
            <Marquee text={MARQUEE_CONFIG.TEXT} duration={MARQUEE_CONFIG.DURATION} className="w-full" />
          </div>
        )}
      </div>
      {/* solat-time-small: satu struktur flex (next solat | tengah | jam) supaya DisplayTime tak unmount bila slide tukar — show/hide dengan opacity sahaja */}
      <div className={`absolute inset-0 pointer-events-none overlay-datetime overlay-solat z-10 flex ${showSolatTimeSmall ? 'opacity-100' : 'opacity-0'}`} aria-hidden={!showSolatTimeSmall}>
        <div className="absolute left-0 right-0 flex items-end justify-between" style={{ bottom: bottomPx(0) }}>
          <div className="shrink-0">
            {nextPrayerData && (
              <DisplayTime key="next-solat" type={3} label={nextPrayerData.next} nextPrayerTime={nextPrayerData.nextTime} size={70} format="12h" showSeconds={false} showAmPm={false} color="#ffff00" labelSize={20} labelColor="#ffff00"
                style={{ position: 'relative', clipPath: 'polygon(80% 0, 100% 25%, 100% 100%, 0 100%, 0 0)', backgroundColor: '#000000', padding: '15px' }} />
            )}
          </div>
          <div className={`flex-1 min-w-0 items-center overflow-hidden min-w-[80px] py-2 ${showMarqueeInMiddle ? 'bg-black/80' : ''}`}>
            {showMarqueeInMiddle && (
              <Marquee text={MARQUEE_CONFIG.TEXT} duration={MARQUEE_CONFIG.DURATION} />
            )}
          </div>
          <div className="shrink-0">
            <DisplayTime key="clock-small" type={1} size={100} format="12h" showSeconds={false} showAmPm={false} color="#ffff00" style={{
              bottom: 0, right: 0, padding: '14px', paddingLeft: '1.5rem', position: 'relative',
              clipPath: 'polygon(15% 0%, 100% 0, 100% 100%, 0 100%, 0% 25%', backgroundColor: '#000000'
            }} />
          </div>
        </div>
      </div>
    </>
  );
};

export default DateTimeOverlay;
