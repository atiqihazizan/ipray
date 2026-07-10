/**
 * Process data pengumuman (announcements) ke slides.
 */
import { slidesTemplate } from '../config/sliderConfig';
import { formatDateTime, getCountdown } from '../utils/dateFormatter';

export function processAnnouncements(announcementsData, slidesConfigData, applyConfig) {
  if (!announcementsData || announcementsData.length === 0) return [];

  const activeAnnouncements = announcementsData.filter((line) => {
    const arr = line.split('|');
    const originalDateTime = arr[4]?.trim();
    if (!originalDateTime) return false;
    const countdown = getCountdown(originalDateTime);
    return countdown && countdown !== 'LEWAT';
  });

  if (activeAnnouncements.length === 0) return [];

  const restructuredAnnouncements = activeAnnouncements.map((line) => {
    const arr = line.split('|');
    const originalDateTime = arr[4]?.trim();
    if (originalDateTime) {
      const dateTimeObj = formatDateTime(originalDateTime, '12');
      arr[4] = dateTimeObj.date;
      arr.splice(5, 0, dateTimeObj.time);
      arr.push(getCountdown(originalDateTime));
    }
    return arr;
  });

  const announceTemplate = applyConfig(slidesTemplate.announce, 'announce');

  return restructuredAnnouncements.map((item, i) => {
    const announceSlide = JSON.parse(JSON.stringify(announceTemplate));
    const parent = announceSlide.captions[0];

    if (parent) {
      const isLastAnnounce = i === restructuredAnnouncements.length - 1;
      if (i > 0) parent.transition = null;
      parent.transition2 = isLastAnnounce ? 'CLIP|LR' : 'NO_CLIP_OUT';

      if (parent.children && parent.children.length >= 9) {
        parent.children[0].content = item[0] || '';
        parent.children[1].content = item[1] || '';
        parent.children[2].content = item[2] || '';
        parent.children[3].content = item[3] || '';
        parent.children[4].content = item[4] || '';
        parent.children[5].content = item[5] || '';
        parent.children[6].content = item[6] || '';
        parent.children[7].content = item[7] || '';
        parent.children[8].content = item[8] || '';
        if (i > 0) parent.children[0].transition = null;
        parent.children[0].transition2 = isLastAnnounce ? 'CLIP|LR' : 'NO_CLIP_OUT';
      }
    }

    announceSlide.transitionType = i === 0 ? 'auto' : 'static';
    return announceSlide;
  });
}
