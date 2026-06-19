import {
  officerTableStyle,
  officerTdImageStyle,
  officerTdLabelStyle,
  officerTdNameStyle,
  officerImgStyle,
} from './styles';
import { resolveServerImageUrl } from '../../services/apiBase';

/**
 * Satu baris pegawai dalam jadual: col1 imej (200px), col2 label (100px), col3 nama (full width).
 * Kongsi antara AzanScreen & IqamahScreen.
 */
export function OfficerRow({ imageSrc = '/img/Random_user.svg', label, name }) {
  return (
    <>
      <tr>
        <td style={officerTdImageStyle}>
          <img src={resolveServerImageUrl(imageSrc)} alt={label} style={officerImgStyle} />
        </td>
        {/* <td style={officerTdLabelStyle}>{label}</td> */}
        <td>
          <h1 style={officerTdNameStyle}>{name}</h1>
          <h5 style={officerTdLabelStyle}>({label})</h5>
        </td>
      </tr>
      <tr>
        <td colSpan="3" style={{ height: "10px" }}></td>
      </tr>
    </>
  );
}

/** Senarai pegawai default — kongsi kedua skrin */
export const PEGAWAI_LIST = [
  { label: 'BILAL', name: '' },
  { label: 'IMAM', name: '' },
];

/**
 * Template jadual pegawai 3 lajur. Kongsi AzanScreen & IqamahScreen.
 * @param {Array<{ label: string, name: string, imageSrc?: string }>} list - Senarai pegawai
 */
export function PegawaiTable({ list = PEGAWAI_LIST }) {
  return (
    <table style={officerTableStyle}>
      <tbody>
        {list.map((item, i) => (
          <OfficerRow
            key={i}
            imageSrc={item.imageSrc}
            label={item.label}
            name={item.name}
          />
        ))}
      </tbody>
    </table>
  );
}
