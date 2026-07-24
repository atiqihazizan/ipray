const MARQUEE_STANDARD_CLASS = 'text-yellow-400 text-xl font-medium py-1';
export const MARQUEE_STANDARD_HEIGHT_BASE = 72;
const Marquee = ({ texts = [], separator = '•', duration = 25, className = '', enabled = false, style = {} }) => {
  if (!enabled || !texts || texts.length === 0) return null;

  const durationSec = Number(duration) > 0 ? Number(duration) : 25;

  const isArabic = (str) => {
    const arabicRegex = /[\u0600-\u06FF]/;
    return arabicRegex.test(str);
  };

  const sep = `\u00A0\u00A0${separator}\u00A0\u00A0`;

  return (
    <div className={`overflow-hidden pointer-events-none m-0 p-0 -mt-[2px] ${MARQUEE_STANDARD_CLASS} w-full ${className}`.trim()} aria-hidden="true" style={{ ...style }}>
      <div
        className="inline-flex whitespace-nowrap will-change-transform"
        style={{ animation: `marquee-from-right ${durationSec}s linear infinite` }}
      >
        <span style={{ textShadow: 'rgb(0, 0, 0) 3px 3px 0px', display: 'inline-flex', alignItems: 'center' }}>
          {texts.flatMap((text, index) => {
            const isArab = isArabic(text);
            const elements = [];
            if (index > 0) {
              elements.push(
                <span key={`sep-${index}`} style={{ fontSize: '40px', fontFamily: 'bebas', verticalAlign: 'middle', lineHeight: '1', paddingLeft: '10px',paddingRight: '10px' }}>{sep}</span>
              );
            }
            elements.push(
              <span key={`text-${index}`} style={{ fontSize: isArab ? '35px' : '60px', fontFamily: isArab ? 'Amiri' : 'SairaCondensed', verticalAlign: 'middle', lineHeight: '1', direction: isArab ? 'rtl' : 'ltr', unicodeBidi: 'isolate' }}>
                {text}
              </span>
            );
            return elements;
          })}
        </span>
      </div>
    </div>
  );
};

export default Marquee;
