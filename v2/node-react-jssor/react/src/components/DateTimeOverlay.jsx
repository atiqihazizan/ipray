import { useEffect } from 'react';
import DisplayTime from './DisplayTime';
import DisplayDate from './DisplayDate';
import { usePrayerTimes } from '../hooks/useIslamicTime';
import { useTakwimData } from '../hooks/useTakwimData';
import prayerTimeService from '../services/prayerTimeService';
import { OVERLAY_PRAYER_TIMES } from '../utils/prayerUtils';

const DateTimeOverlay = ({ showOverlay }) => {
  const { takwimArray, takwimParsed } = useTakwimData();
  const { nextPrayerData, nextPrayerName } = usePrayerTimes(takwimParsed);

  useEffect(() => {
    if (takwimArray && takwimArray.length > 0) {
      prayerTimeService.setTakwim(takwimArray);
    }
  }, [takwimArray]);

  return (
    <>
      {/* Overlay: date=tarikh, solat=waktu solat, time=masa. Show/hide ikut slide.datetime[] */}
      <div className={`absolute inset-0 pointer-events-none overlay-datetime overlay-date ${showOverlay('date') ? 'opacity-100' : 'opacity-0'}`} aria-hidden={!showOverlay('date')}>
        <div className="absolute" style={{ top: 0, left: 0 }}>
          <DisplayDate type={1} dateType="gregorian" size={72} color="#ffff00" style={{ margin: '14px 0' }} />
        </div>
        <div className="absolute" style={{ top: 0, right: 0 }}>
          <DisplayDate type={2} dateType="hijri" size={72} color="#ffff00" style={{ margin: '14px 0' }} />
        </div>
      </div>
      <div className={`absolute inset-0 pointer-events-none overlay-datetime overlay-solat ${showOverlay('solat') ? 'opacity-100' : 'opacity-0'}`} aria-hidden={!showOverlay('solat')}>
        <div className="absolute" style={{ bottom: 0, left: 0, display: 'flex', gap: '20px' }}>
          {OVERLAY_PRAYER_TIMES.map((waktu, index) => (
            <DisplayTime key={index} type={2} label={waktu.label} size={95} format="12h" showSeconds={false} showAmPm={false} color="#ffff00" labelSize={39} labelColor="#ffff00" prayerName={waktu.prayerName} nextPrayerName={nextPrayerName} style={{ position: 'relative' }} />
          ))}
        </div>
      </div>
      {/* Next solat sahaja (1 data) - guna usePrayerTimes hook dengan type=3 */}
      <div className={`absolute inset-0 pointer-events-none overlay-datetime overlay-solat ${showOverlay('next-solat') ? 'opacity-100' : 'opacity-0'}`} aria-hidden={!showOverlay('next-solat')}>
        <div className="absolute" style={{ bottom: 0, left: 0 }}>
          {nextPrayerData && (
            <DisplayTime type={3} label={nextPrayerData.next} nextPrayerTime={nextPrayerData.nextTime} size={70} format="12h" showSeconds={false} showAmPm={false} color="#ffff00" labelSize={20} labelColor="#ffff00"
              style={{ position: 'relative', clipPath: 'polygon(80% 0, 100% 25%, 100% 100%, 0 100%, 0 0)', backgroundColor: '#000000', padding: '15px' }} />
          )}
        </div>
      </div>
      <div className={`absolute inset-0 pointer-events-none overlay-datetime overlay-time ${showOverlay('time') ? 'opacity-100' : 'opacity-0'}`} aria-hidden={!showOverlay('time')}>
        <div className="absolute" style={{ bottom: 0, right: 0 }}>
          <DisplayTime type={1} size={148} format="12h" showSeconds={false} showAmPm={false} color="#ffff00" style={{ bottom: 0, right: 0, borderTopLeftRadius: '10px', padding: '4px 18px 17px 1.5rem', backgroundColor: '#000000' }} />
        </div>
      </div>
      <div className={`absolute inset-0 pointer-events-none overlay-datetime overlay-time ${showOverlay('small-time') ? 'opacity-100' : 'opacity-0'}`} aria-hidden={!showOverlay('small-time')}>
        <div className="absolute" style={{ bottom: 0, right: 0 }}>
          <DisplayTime type={1} size={100} format="12h" showSeconds={false} showAmPm={false} color="#ffff00" style={{
            bottom: 0, right: 0, padding: '14px', paddingLeft: '1.5rem',
            clipPath: 'polygon(15% 0%, 100% 0, 100% 100%, 0 100%, 0% 25%', backgroundColor: '#000000'
          }} />
        </div>
      </div>
    </>
  );
};

export default DateTimeOverlay;
