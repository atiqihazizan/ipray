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
  jawiTitleStyleIqamah,
} from './styles';

const JAWI_IQAMAH = 'اقامة';

/**
 * Screen IQAMAH — tunjuk countdown iqamah sebelum solat bermula.
 * @param {string} countdown - Countdown dalam format 'MM:SS'
 */
export default function IqamahScreen({ countdown }) {
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
      <div style={rightColumnCenterStyle}>
        <h1 style={jawiTitleStyleIqamah()}>{JAWI_IQAMAH}</h1>
        <div style={countdownBoxStyle}>
          <p style={{ ...countdownStyleIqamah, ...countdownBoxTextStyle }}>{countdown}</p>
        </div>
      </div>
    </div>
  );
}
