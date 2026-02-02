import React from 'react'
import { DELAYS } from '../utils/animations'
import './InfoTable.css'

/**
 * Komponen Table yang seragam untuk WeeklyLecture dan Activity
 * @param {Object} props - Props untuk komponen Table
 * @param {string} props.title - Judul untuk header table
 * @param {Array} props.rows - Array of row objects dengan struktur { icon, content, colspan, className }
 * @param {string} props.animation - Animasi untuk content (default: '')
 * @param {string} props.iconClass - Class untuk icon (default: '')
 * @param {string} props.contentClass - Class untuk content text (default: '')
 * @param {string} props.tableClass - Class tambahan untuk table (default: 'table-disp striped-row')
 * @param {number} props.headerColspan - Colspan untuk header (default: 3)
 * @param {React.ReactNode} props.children - Additional content (seperti image pengajar)
 * @param {Object} props.style - Inline styles untuk tablefram
 */
export const InfoTable = ({ 
  title = 'Tiada maklumat',
  rows = [],
  animation = '',
  iconClass = '',
  contentClass = '',
  tableClass = 'table-disp striped-row',
  headerColspan = 3,
  children,
  style = {},
  fixedWidth = false
}) => {
  return (
    <div className="tablefram" style={style}>
      <table className={`${tableClass} ${fixedWidth ? 'fixed-width-table' : ''}`}>
        <thead>
          <tr>
            <th colSpan={headerColspan}>
              <h3 className={`${contentClass} animated ${animation}`}>
                {title}
              </h3>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.icon && (
                <td className={`icon ${row.iconClass || ''}`}>
                  <img src={row.icon} alt={row.alt || ''} className={iconClass} />
                </td>
              )}
              <td className={row.cellClass || ''} colSpan={row.colspan || 1}>
                <div className={`${contentClass} animated ${animation} ${row.delay || DELAYS.DELAY_1S}`}>
                  {row.content}
                </div>
              </td>
              {row.secondColumn && (
                <>
                  {row.secondColumn.icon && (
                    <td className={`icon ${row.secondColumn.iconClass || ''}`}>
                      <img src={row.secondColumn.icon} alt={row.secondColumn.alt || ''} className={iconClass} />
                    </td>
                  )}
                  <td className={row.secondColumn.cellClass || ''}>
                    <div className={`${contentClass} animated ${animation} ${row.delay || DELAYS.DELAY_1S}`}>
                      {row.secondColumn.content}
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {children}
    </div>
  )
}

/**
 * Helper function untuk membuat row dengan 2 column
 * @param {string} icon1 - Path ke icon pertama
 * @param {string|React.ReactNode} content1 - Content untuk column pertama
 * @param {string} icon2 - Path ke icon kedua
 * @param {string|React.ReactNode} content2 - Content untuk column kedua
 * @param {Object} options - Options tambahan
 */
export const createTwoColumnRow = (icon1, content1, icon2, content2, options = {}) => {
  return {
    icon: icon1,
    content: content1,
    alt: options.alt1 || '',
    colspan: 1,
    cellClass: `${options.cellClass1 || ''} fixed-width-col`,
    iconClass: options.iconClass1 || '',
    delay: options.delay || DELAYS.DELAY_1S,
    secondColumn: {
      icon: icon2,
      content: content2,
      alt: options.alt2 || '',
      cellClass: `${options.cellClass2 || ''} fixed-width-col`,
      iconClass: options.iconClass2 || ''
    },
    ...options
  }
}

/**
 * Helper function untuk membuat row data dengan struktur yang konsisten
 * @param {string} icon - Path ke icon image
 * @param {string|React.ReactNode} content - Content untuk row
 * @param {Object} options - Options tambahan
 */
export const createTableRow = (icon, content, options = {}) => {
  return {
    icon,
    content,
    alt: options.alt || '',
    colspan: options.colspan || 1,
    cellClass: options.cellClass || '',
    iconClass: options.iconClass || '',
    delay: options.delay || DELAYS.DELAY_1S,
    ...options
  }
}

/**
 * Preset untuk WeeklyLecture table rows
 */
export const WEEKLY_LECTURE_ROWS = {
  SPEAKER: (speaker) => createTableRow('./images/mic-icon.png', speaker || '', { alt: 'Speaker' }),
  DATE_TIME: (date, time) => createTableRow('./images/clock-icon.png', date && time ? formatDateTime(date, time) : '', { alt: 'Clock' }),
  EVENT: (title) => createTableRow('./images/event-icon.png', title || '', { alt: 'Event' }),
  TOPIC: (topic) => createTableRow('./images/kitab-icon.png', truncateText(topic, 60), { alt: 'Book', iconClass: 'kitab' })
}

/**
 * Preset untuk Activity table rows
 */
export const ACTIVITY_ROWS = {
  DESCRIPTION: (description) => createTableRow('./images/event-icon.png', description, { alt: 'Event', colspan: 3 }),
  DATE_TIME: (date, time) => createTwoColumnRow(
    './images/calendar-icon.png', date ? formatDate(date) : '', 
    './images/clock-icon.png', time ? formatTime12Hour(time) : '',
    { alt1: 'Calendar', alt2: 'Clock', cellClass2: 'timer' }
  ),
  LOCATION: (location) => createTableRow('./images/location-icon.png', location, { alt: 'Location', colspan: 3 }),
  AUDIENCE: (audience) => createTableRow('./images/newsletter-icon.png', audience, { alt: 'Newsletter', colspan: 3 }),
  COUNTDOWN: (daysLeft) => createTableRow('', 
    daysLeft !== undefined 
      ? daysLeft === 0 
        ? <span className="urgent-event blinking">SEKARANG</span>
        : `${daysLeft} HARI LAGI`
      : '', 
    { colspan: 4, cellClass: 'text-center', delay: DELAYS.DELAY_2S }
  )
}

/**
 * Preset untuk 2 column layouts dengan fixed width
 */
export const TWO_COLUMN_ROWS = {
  DATE_TIME: (date, time, options = {}) => createTwoColumnRow(
    './images/calendar-icon.png', date ? formatDate(date) : '',
    './images/clock-icon.png', time ? formatTime12Hour(time) : '',
    { 
      alt1: 'Calendar', 
      alt2: 'Clock',
      cellClass1: options.dateWidth ? `col-date-${options.dateWidth}` : '',
      cellClass2: options.timeWidth ? `col-time-${options.timeWidth}` : 'col-time-xlarge'
    }
  ),
  SPEAKER_TOPIC: (speaker, topic, options = {}) => createTwoColumnRow(
    './images/mic-icon.png', speaker || '',
    './images/kitab-icon.png', topic || '',
    { 
      alt1: 'Speaker', 
      alt2: 'Topic',
      cellClass1: options.speakerWidth ? `col-speaker-${options.speakerWidth}` : 'col-speaker-medium',
      cellClass2: options.topicWidth ? `col-topic-${options.topicWidth}` : 'col-topic-large'
    }
  ),
  LOCATION_AUDIENCE: (location, audience, options = {}) => createTwoColumnRow(
    './images/location-icon.png', location || '',
    './images/newsletter-icon.png', audience || '',
    { 
      alt1: 'Location', 
      alt2: 'Audience',
      cellClass1: options.locationWidth ? `col-location-${options.locationWidth}` : 'col-location-medium',
      cellClass2: options.audienceWidth ? `col-audience-${options.audienceWidth}` : 'col-audience-small'
    }
  )
}

/**
 * Helper untuk membuat custom width columns
 */
export const createCustomWidthRow = (icon1, content1, icon2, content2, width1 = 'medium', width2 = 'medium', options = {}) => {
  return createTwoColumnRow(icon1, content1, icon2, content2, {
    cellClass1: `col-custom-${width1}`,
    cellClass2: `col-custom-${width2}`,
    ...options
  })
}

// Helper functions untuk formatting
const formatDateTime = (dateString, timeString) => {
  const date = new Date(dateString)
  const wdays = ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"]
  const mname = ["", "Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogs", "Sep", "Okt", "Nov", "Dis"]
  
  const day = wdays[date.getDay()]
  const dayNum = date.getDate()
  const month = mname[date.getMonth() + 1]
  const year = date.getFullYear()
  
  return `${day}, ${dayNum} ${month} ${year}`
}

const formatDate = (dateString) => {
  if(!dateString) return '';
  const date = new Date(dateString)
  const wdays = ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"]
  const mname = ["", "Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogs", "Sep", "Okt", "Nov", "Dis"]
  
  const day = wdays[date.getDay()]
  const dayNum = date.getDate()
  const month = mname[date.getMonth() + 1]
  const year = date.getFullYear()
  
  return `${day}, ${dayNum} ${month} ${year}`
}

const formatTime12Hour = (timeString) => {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const hour24 = parseInt(hours, 10);
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  return `${hour12}:${minutes} ${ampm}`;
}

const truncateText = (text, maxLength) => {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}
