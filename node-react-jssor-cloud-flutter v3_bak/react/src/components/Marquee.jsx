const MARQUEE_STANDARD_CLASS = 'text-yellow-400 text-xl font-medium py-2';
export const MARQUEE_STANDARD_HEIGHT_BASE = 72;
const Marquee = ({ text = '', duration = 25, className = '', enabled = true, style = {} }) => {
  if (!enabled || !text) return null;

  const durationSec = Number(duration) > 0 ? Number(duration) : 25;

  return (
    <div className={`overflow-hidden pointer-events-none m-0 p-0 -mt-[2px] h-[95px] ${MARQUEE_STANDARD_CLASS} w-full ${className}`.trim()} aria-hidden="true" style={{ ...style }}>
      <div
        className="inline-flex whitespace-nowrap will-change-transform pt-3 pb-1"
        style={{ animation: `marquee-from-right ${durationSec}s linear infinite` }}
      >
        {/* <span className="text-5xl" style={{ textShadow: '2px 2px 6px rgba(0,0,0,1), 0px 0px 10px rgba(0,0,0,1.9)' }}>{text}</span> */}
        <span className="text-5xl" style={{ textShadow: 'rgb(0, 0, 0) 3px 3px 0px', fontFamily: 'Amiri' }}>{text}</span>
      </div>
    </div>
  );
};

export default Marquee;
