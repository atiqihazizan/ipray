const MARQUEE_STANDARD_CLASS = 'text-yellow-400 text-xl font-medium py-2';
export const MARQUEE_STANDARD_HEIGHT_BASE = 72;
const Marquee = ({ text = 'Selamat datang • Maklumat masjid • ', duration = 25, className = '' }) => {
  const durationSec = Number(duration) > 0 ? Number(duration) : 25;

  return (
    <div className={`overflow-hidden pointer-events-none ${MARQUEE_STANDARD_CLASS} ${className}`.trim()} aria-hidden="true">
      <div
        className="inline-flex whitespace-nowrap will-change-transform py-1"
        style={{ animation: `marquee-from-right ${durationSec}s linear infinite` }}
      >
        <span className="text-5xl">{text}</span>
      </div>
    </div>
  );
};

export default Marquee;
