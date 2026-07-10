import { textSize } from '../../utils/screenUtils';
import { useData } from '../../contexts/DataContext';
import { PegawaiTable, PEGAWAI_LIST } from './OfficerRow';
import {
  countdownStyleIqamah,
  gridScreenStyle,
  leftColumnPegawaiStyle,
  rightColumnCenterStyle,
  pegawaiTitleStyle,
  pegawaiSmallStyle,
  countdownBoxStyle,
  countdownBoxTextStyle,
  jawiTitleStyleAzan,
} from './styles';

/** Nama waktu solat dalam Arab (untuk paparan Jawi) */
const JAWI_PRAYER_NAME = {
  subuh: 'صبح',
  zohor: 'الظهر',
  asar: 'العصر',
  maghrib: 'المغرب',
  isyak: 'العشاء',
};

/** Teks Jawi: أذان + nama waktu (e.g. أذان الظهر) */
function getAzanJawiText(prayerName) {
  const key = prayerName?.trim()?.toLowerCase();
  const nameJawi = key && JAWI_PRAYER_NAME[key] ? JAWI_PRAYER_NAME[key] : (prayerName || '');
  // return `أذان ${nameJawi}`.trim();
  return `أذان`;
}

/**
 * Screen AZAN — layout dan style ikut IqamahScreen: grid 2 lajur, lajur 1 pegawai bertugas, lajur 2 tajuk + countdown.
 * @param {string} prayerName - Nama waktu solat (e.g. 'Zohor')
 * @param {string} countdown - Countdown dalam format 'MM:SS'
 */
export default function AzanScreen({ prayerName, countdown }) {
  const { petugasData } = useData();
  const pegawaiList = (petugasData && petugasData.length > 0)
    ? petugasData.map((p) => ({ label: p.label, name: p.name, imageSrc: p.imageSrc }))
    : PEGAWAI_LIST;
  return (
    <div style={gridScreenStyle}>
      <div style={leftColumnPegawaiStyle}>
        <h2 style={pegawaiTitleStyle()}>PEGAWAI BERTUGAS</h2>
        <small style={pegawaiSmallStyle}>(Tertakluk kepada perubahan)</small>
        <br />
        <PegawaiTable list={pegawaiList} />
      </div>
      <div style={{...rightColumnCenterStyle, gap: `${textSize(56)}px`}}>
        <h1 style={jawiTitleStyleAzan()}>{getAzanJawiText(prayerName)}</h1>
        <div style={countdownBoxStyle}>
          <p style={{ ...countdownStyleIqamah, ...countdownBoxTextStyle }}>{countdown}</p>
        </div>
      </div>
    </div>
  );
}
