import { memo } from 'react';

const DisplayDate = ({
  type = 1, // 1 = kiri, 2 = kanan
  dateType = 'gregorian', // 'gregorian' atau 'hijri'
  size = 72,
  color = '#ffff00',
  style: customStyle = {}
}) => {


  const snapshot = typeof window !== 'undefined' ? window.data_ipray?.snapshot ?? null : null;
  const gregorian = snapshot?.gregorian ?? null;
  const hijri = snapshot?.hijri ?? null;
  const dateData = dateType === 'hijri' ? hijri : gregorian;

  const getStyle = () => {
    return {
      fontFamily: "'Bebas', sans-serif",
      color: customStyle.color || color,
      textShadow: customStyle.textShadow || '3px 3px 0px rgba(0,0,0,1)',
      ...customStyle
    };
  };

  const digitFontSize = size * 1.2;

  if (!dateData) {
    // Render struktur kosong dengan id — useTimeDriver akan isi pada tick pertama
    if (type === 1) {
      return (
        <div style={getStyle()}>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '8px',
            backgroundColor: 'rgb(71 71 71 / 78%)',
            clipPath: 'polygon(0px 0px, 100% 0px, 88% 100%, 0px 100%)',
            padding: '0px 16px 4px', width: '456px'
          }}>
            {dateType === 'hijri' ? (
              <div id="ipray-date-h-day" style={{ fontSize: `${digitFontSize}px`, lineHeight: 1, fontWeight: 'normal', color: '#FF00FF' }}></div>
            ) : (
              <div id="ipray-date-g-day" style={{ fontSize: `${digitFontSize}px`, lineHeight: 1, fontWeight: 'normal', color: '#FF00FF' }}></div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', fontSize: `${size * 0.5}px`, lineHeight: 1.2, fontWeight: 'normal', paddingTop: '4px' }}>
              {dateType === 'hijri' ? (
                <div id="ipray-date-h-month" style={{ color: '#FFFFFF' }}></div>
              ) : (
                <div id="ipray-date-g-dayname" style={{ color: '#FFFFFF' }}></div>
              )}
              {dateType === 'hijri' ? (
                <div id="ipray-date-h-year" style={{ color: '#00FFFF' }}></div>
              ) : (
                <div style={{ color: '#00FFFF' }}><span id="ipray-date-g-month"></span> <span id="ipray-date-g-year"></span></div>
              )}
            </div>
          </div>
        </div>
      );
    }
    // type === 2
    return (
      <div style={getStyle()}>
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: '8px',
          backgroundColor: 'rgb(71 71 71 / 78%)',
          clipPath: 'polygon(0 0, 100% 0, 100% 100%, 12% 100%)',
          padding: '0px 16px 4px', width: '456px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: `${size * 0.5}px`, lineHeight: 1.2, fontWeight: 'normal', paddingTop: '4px' }}>
            {dateType === 'hijri' ? (
              <div id="ipray-date-h-month" style={{ color: '#FFFFFF' }}></div>
            ) : (
              <div id="ipray-date-g-month" style={{ color: '#FFFFFF' }}></div>
            )}
            {dateType === 'hijri' ? (
              <div id="ipray-date-h-year" style={{ textAlign: 'right', color: '#00FFFF' }}></div>
            ) : (
              <div id="ipray-date-g-year" style={{ textAlign: 'right', color: '#00FFFF' }}></div>
            )}
          </div>
          {dateType === 'hijri' ? (
            <div id="ipray-date-h-day" style={{ fontSize: `${digitFontSize}px`, lineHeight: 1, fontWeight: 'normal', color: '#FF00FF' }}></div>
          ) : (
            <div id="ipray-date-g-day" style={{ fontSize: `${digitFontSize}px`, lineHeight: 1, fontWeight: 'normal', color: '#FF00FF' }}></div>
          )}
        </div>
      </div>
    );
  }

  // Format hari - guna dayFormatted jika ada (2 digit), jika tidak guna padZero
  const daySingle = dateData.dayFormatted || (dateData.day < 10 ? `0${dateData.day}` : `${dateData.day}`);

  // Type 1: Kiri - number single digit | hari (baris 1), bulan tahun (baris 2)
  if (type === 1) {
    return (
      <div style={getStyle()}>
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '8px',
          backgroundColor: 'rgb(71 71 71 / 78%)',
          clipPath: 'polygon(0px 0px, 100% 0px, 88% 100%, 0px 100%)',
          padding: '0px 16px 4px', width: '456px'
        }}>
          {dateType === 'hijri' ? (
            <div id="ipray-date-h-day" style={{ fontSize: `${digitFontSize}px`, lineHeight: 1, fontWeight: 'normal', color: '#FF00FF' }}>{daySingle}</div>
          ) : (
            <div id="ipray-date-g-day" style={{ fontSize: `${digitFontSize}px`, lineHeight: 1, fontWeight: 'normal', color: '#FF00FF' }}>{daySingle}</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: `${size * 0.5}px`, lineHeight: 1.2, fontWeight: 'normal', paddingTop: '4px' }}>
            {dateType === 'hijri' ? (
              <div id="ipray-date-h-month" style={{ color: '#FFFFFF' }}>{dateData.monthName}</div>
            ) : (
              <div id="ipray-date-g-dayname" style={{ color: '#FFFFFF' }}>{dateData.dayName}</div>
            )}
            {dateType === 'hijri' ? (
              <div id="ipray-date-h-year" style={{ color: '#00FFFF' }}>{dateData.year}</div>
            ) : (
              <div style={{ color: '#00FFFF' }}><span id="ipray-date-g-month">{dateData.monthName}</span> <span id="ipray-date-g-year">{dateData.year}</span></div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Type 2: Kanan
  return (
    <div style={getStyle()}>
      <div style={{
        display: 'flex', justifyContent: 'flex-end', gap: '8px',
        backgroundColor: 'rgb(71 71 71 / 78%)',
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 12% 100%)',
        padding: '0px 16px 4px', width: '456px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: `${size * 0.5}px`, lineHeight: 1.2, fontWeight: 'normal', paddingTop: '4px' }}>
          {dateType === 'hijri' ? (
            <div id="ipray-date-h-month" style={{ color: '#FFFFFF' }}>{dateData.monthName}</div>
          ) : (
            <div id="ipray-date-g-month" style={{ color: '#FFFFFF' }}>{dateData.monthName}</div>
          )}
          {dateType === 'hijri' ? (
            <div id="ipray-date-h-year" style={{ textAlign: 'right', color: '#00FFFF' }}>{dateData.year}</div>
          ) : (
            <div id="ipray-date-g-year" style={{ textAlign: 'right', color: '#00FFFF' }}>{dateData.year}</div>
          )}
        </div>
        {dateType === 'hijri' ? (
          <div id="ipray-date-h-day" style={{ fontSize: `${digitFontSize}px`, lineHeight: 1, fontWeight: 'normal', color: '#FF00FF' }}>{daySingle}</div>
        ) : (
          <div id="ipray-date-g-day" style={{ fontSize: `${digitFontSize}px`, lineHeight: 1, fontWeight: 'normal', color: '#FF00FF' }}>{daySingle}</div>
        )}
      </div>
    </div>
  );
};

// Memoize component - sifar React re-render (DOM-driven via useTimeDriver)
export default memo(DisplayDate, () => true);

