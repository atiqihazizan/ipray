/**
 * Process data slideshow ke slides (satu slide per imej).
 */
import { slidesTemplate } from '../config/sliderConfig';
import { withAssetBase } from '../services/apiBase';
import { buildGregorianWidget, buildHijriWidget, buildClockSmWidget, buildNextPrayerWidget } from './dateTimeWidgets';

const DEFAULT_SLIDESHOW_IMAGES = [
  '/img/slideshow/slide01.webp',
  '/img/slideshow/slide02.webp',
  '/img/slideshow/slide03.webp',
  '/img/slideshow/slide04.webp',
  '/img/slideshow/slide05.webp',
  '/img/slideshow/slide06.webp',
  '/img/slideshow/slide07.webp'
];

export function processSlideshow(slideshowData, slidesConfigData, applyConfig, datetime = []) {
  const showDate = datetime.includes('date');
  const showSmall = datetime.includes('solat-time-small');
  let list = [];
  if (slideshowData && Array.isArray(slideshowData) && slideshowData.length > 0) {
    list = slideshowData
      .map((item) => {
        const imagePath = item?.image ? item.image : typeof item === 'string' ? item : '';
        const path = imagePath && imagePath.startsWith('/') ? imagePath : `/${imagePath || ''}`;
        return { image: withAssetBase(path) };
      })
      .filter((item) => item.image);
  } else {
    list = DEFAULT_SLIDESHOW_IMAGES.map((image) => ({ image }));
  }

  if (list.length === 0) return [];

  const template = applyConfig(slidesTemplate.slideshow, 'slideshow');

  return list.map((item, index) => {
    const slide = JSON.parse(JSON.stringify(template));
    slide.image = { src: item.image, alt: `Slideshow ${index + 1}` };
    slide.duration = template.duration != null ? template.duration : 1500;
    slide.transitionType = 'auto';
    slide.captions = [
      ...(showDate ? [buildGregorianWidget(), buildHijriWidget()] : []),
      ...(showSmall ? [buildClockSmWidget(), buildNextPrayerWidget()] : [])
    ];
    return slide;
  });
}
