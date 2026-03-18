import { textSize } from '../utils/screenUtils';

const DeathAnnouncementOverlay = ({ data }) => {
  if (!data || !data.active) return null;

  const ts = textSize;

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{
        background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        zIndex: 5,
      }}
    >
      {/* Bismillah */}
      <p
        className="text-white/60 font-light"
        style={{ fontSize: ts(28), marginBottom: ts(12) }}
      >
        بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
      </p>

      {/* Innalillahi */}
      <p
        className="text-white/80"
        style={{ fontSize: ts(32), marginBottom: ts(30) }}
      >
        إِنَّا لِلَّٰهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ
      </p>

      {/* Title */}
      <h1
        className="text-yellow-400 font-bold uppercase tracking-wider"
        style={{ fontSize: ts(42), marginBottom: ts(40) }}
      >
        PENGUMUMAN KEMATIAN
      </h1>

      {/* Card maklumat */}
      <div
        className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 text-center"
        style={{
          padding: `${ts(36)}px ${ts(60)}px`,
          maxWidth: '80%',
        }}
      >
        {/* Nama simati */}
        <h2
          className="text-white font-bold"
          style={{ fontSize: ts(56), marginBottom: ts(24) }}
        >
          {data.nama}
        </h2>

        {/* Separator */}
        <div
          className="mx-auto bg-yellow-400/60 rounded-full"
          style={{ width: ts(200), height: ts(3), marginBottom: ts(24) }}
        />

        {/* Info grid */}
        <div
          className="grid grid-cols-2 text-left"
          style={{ gap: `${ts(16)}px ${ts(48)}px` }}
        >
          {data.tarikhMeninggal && (
            <>
              <span className="text-yellow-300/80 text-right" style={{ fontSize: ts(28) }}>
                Tarikh Meninggal
              </span>
              <span className="text-white" style={{ fontSize: ts(28) }}>
                {data.tarikhMeninggal}
                {data.masaMeninggal ? ` — ${data.masaMeninggal}` : ''}
              </span>
            </>
          )}

          {data.tempatJenazah && (
            <>
              <span className="text-yellow-300/80 text-right" style={{ fontSize: ts(28) }}>
                Tempat Jenazah
              </span>
              <span className="text-white" style={{ fontSize: ts(28) }}>
                {data.tempatJenazah}
              </span>
            </>
          )}

          {data.masaSolat && (
            <>
              <span className="text-yellow-300/80 text-right" style={{ fontSize: ts(28) }}>
                Solat Jenazah
              </span>
              <span className="text-white" style={{ fontSize: ts(28) }}>
                {data.masaSolat}
              </span>
            </>
          )}
        </div>

        {/* Maklumat tambahan */}
        {data.maklumatTambahan && (
          <p
            className="text-white/70 italic"
            style={{ fontSize: ts(24), marginTop: ts(28) }}
          >
            {data.maklumatTambahan}
          </p>
        )}
      </div>

      {/* Doa */}
      <p
        className="text-white/50"
        style={{ fontSize: ts(22), marginTop: ts(36) }}
      >
        Semoga roh Allahyarham/Allahyarhamah dicucuri rahmat dan ditempatkan bersama orang-orang yang beriman.
      </p>
    </div>
  );
};

export default DeathAnnouncementOverlay;
