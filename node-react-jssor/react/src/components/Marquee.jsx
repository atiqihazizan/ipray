/** Saiz dan gaya standard hebahan (font, warna, padding). */
const MARQUEE_STANDARD_CLASS = 'text-yellow-400 text-xl font-medium py-2';

/** Tinggi bar hebahan ikut font + padding (px asas 1080p). Export untuk offset overlay waktu. */
export const MARQUEE_STANDARD_HEIGHT_BASE = 72;

/**
 * Marquee (Hebahan) — teks scroll dari kanan ke kiri, seamless loop.
 * Kelajuan = tempoh satu pusingan penuh (saat). Lebih kecil = lebih laju. Default 25s.
 */
const Marquee = ({ text = 'Selamat datang • Maklumat masjid • ', duration = 25, className = '' }) => {
  const durationSec = Number(duration) > 0 ? Number(duration) : 25;

  return (
    <div className={`overflow-hidden pointer-events-none ${MARQUEE_STANDARD_CLASS} ${className}`.trim()} aria-hidden="true">
      {/* ✅ inline-flex (bukan inline-block + flex), tanpa w-screen pada inner div */}
      <div
        className="inline-flex whitespace-nowrap will-change-transform"
        style={{ animation: `marquee-from-right ${durationSec}s linear infinite` }}
      >
        <span className="text-5xl">{text}</span>
        {/* Salinan kedua untuk seamless loop */}
        {/* <span aria-hidden="true" className="pr-[2em]">{text}</span> */}
      </div>
    </div>
  );
};

export default Marquee;
