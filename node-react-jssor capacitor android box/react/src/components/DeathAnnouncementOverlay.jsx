import { textSize } from '../utils/screenUtils';

const DeathAnnouncementOverlay = ({ data }) => {
  if (!data || !data.active) return null;

  const ts = textSize;

  return (
    <div
      className="absolute inset-0 flex flex-col items-center"
      style={{
        background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        backgroundImage: 'url(/img/bg-page4.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        zIndex: 5,
      }}
    >

      {/* Title */}
      {/* <h1
        className="text-yellow-400 font-bold uppercase tracking-wider"
        style={{ fontSize: ts(42), marginBottom: ts(40) }}
      >
        PENGUMUMAN KEMATIAN
      </h1> */}

      {/* Bismillah */}
      {/* <p
        className="text-white/60 font-light"
        style={{ fontSize: ts(28), marginBottom: ts(12) }}
      >
        بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
      </p> */}

      {/* Innalillahi */}
      <img
        src="/img/innalillah.svg"
        alt="إِنَّا لِلَّٰهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ"
        style={{ width: ts(600), marginBottom: ts(30), marginTop: ts(60) }}
      />

      {/* Card maklumat */}
      <div
        className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 text-center"
        style={{
          padding: `${ts(36)}px ${ts(60)}px`,
          maxWidth: '80%',
        }}
      >
        {/* Gambar simati */}
        <img
          src="/img/Random_user.svg"
          alt={data.nama || 'Gambar simati'}
          style={{
            width: ts(280),
            height: ts(280),
            objectFit: 'cover',
            objectPosition: 'center',
            display: 'block',
            marginLeft: 'auto',
            marginRight: 'auto',
            borderRadius: '5px',
            marginBottom: ts(24),
          }}
        />

        {/* Nama simati */}
        <h2
          className="text-white font-bold"
          style={{ fontSize: ts(78), marginBottom: ts(24) }}
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
          {/* {data.tarikhMeninggal && (
            <>
              <span className="text-yellow-300/80 text-right" style={{ fontSize: ts(28) }}>
                Tarikh Meninggal
              </span>
              <span className="text-white" style={{ fontSize: ts(28) }}>
                {data.tarikhMeninggal}
                {data.masaMeninggal ? ` — ${data.masaMeninggal}` : ''}
              </span>
            </>
          )} */}

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

          {data.tempatJenazah && (
            <>
              <span className="text-yellow-300/80 text-right" style={{ fontSize: ts(28) }}>
                Tempat Perkuburan
              </span>
              <span className="text-white" style={{ fontSize: ts(28) }}>
                {data.tempatJenazah}
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
        className="text-white/80"
        style={{ fontSize: ts(22), marginTop: ts(36) }}
      >
        Semoga roh Allahyarham/Allahyarhamah dicucuri rahmat dan ditempatkan bersama orang-orang yang beriman.
      </p>
    </div>
  );
};

export default DeathAnnouncementOverlay;
