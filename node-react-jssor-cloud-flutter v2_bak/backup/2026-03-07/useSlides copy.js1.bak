import { useState, useEffect, useMemo } from 'react';
import { slidesTemplate, buildHomeTemplate } from '../config/sliderConfig';
import { useData } from '../contexts/DataContext';
import { processAnnouncements } from '../processors/announcementProcessor';
import { processCountdowns } from '../processors/countdownProcessor';
import { processKuliahMingguan, processKuliahHarian, processKuliahBulanan } from '../processors/kuliahProcessor';
import { processSlideshow } from '../processors/slideshowProcessor';

/**
 * Debug: pilih slide untuk test.
 * - false / null / [] = papar semua
 * - Nombor (contoh 2) = papar N slide pertama
 * - Array indeks 0-based (contoh [0, 3] = slide 1 & 4, [1] = slide 2 sahaja, [0, 2] = slide 1 & 3)
 */
const DEBUG_SLIDES = false;
// const DEBUG_SLIDES = [0];

/**
 * Custom hook untuk menguruskan slides data.
 * Process data melalui announcementProcessor, kuliahProcessor, slideshowProcessor.
 */
export const useSlides = () => {
  const [slideData, setSlideData] = useState([slidesTemplate.home]);
  const [loading, setLoading] = useState(true);
  const {
    announcementsData,
    countdownsData,
    kuliahHariProcessed,
    kuliahHariReplacements,
    kuliahMingguProcessed,
    kuliahBulananProcessed,
    imagesData,
    slidesConfigData,
    slideshowData,
    HOME_TITLE_CONFIG,
    loading: dataLoading,
    isReloading,
    reloadCounter
  } = useData();

  const stableSlideData = useMemo(() => {
    if (dataLoading) return slideData;

    const applyConfig = (template, configKey) => {
      if (!slidesConfigData || !slidesConfigData[configKey]) return template;
      const cfg = slidesConfigData[configKey];
      const updated = { ...template };
      const noImageValues = ['', 'none', 'null'];
      const isNoImage = noImageValues.includes(String(cfg.image ?? '').trim().toLowerCase());
      if (isNoImage) {
        updated.image = null;
      } else if (cfg.image) {
        let imagePath = imagesData && imagesData[cfg.image] ? imagesData[cfg.image] : cfg.image;
        if (imagePath && !imagePath.startsWith('/')) imagePath = '/' + imagePath;
        updated.image = { ...updated.image, src: imagePath };
      }
      if (cfg.duration != null) updated.duration = cfg.duration;
      if (cfg.datetime != null) updated.datetime = cfg.datetime;
      return updated;
    };

    const homeTemplate = buildHomeTemplate(HOME_TITLE_CONFIG);
    const homeSlide = applyConfig(homeTemplate, 'home');
    const announceSlides = processAnnouncements(announcementsData, slidesConfigData, applyConfig);
    const countDownSlides = processCountdowns(countdownsData, slidesConfigData, applyConfig);
    const kuliahHariSlides = processKuliahHarian(kuliahHariProcessed, imagesData, slidesConfigData, applyConfig, kuliahHariReplacements);
    const kuliahMigguanSlides = processKuliahMingguan(kuliahMingguProcessed, imagesData, slidesConfigData, applyConfig);
    const kuliahBulananSlides = processKuliahBulanan(kuliahBulananProcessed, slidesConfigData, applyConfig);
    const slideshowSlides = processSlideshow(slideshowData, slidesConfigData, applyConfig);

    const slides = [
      ...(!slidesConfigData?.home?.hide ? [homeSlide] : []),
      ...(!slidesConfigData?.announce?.hide ? announceSlides : []),
      ...(!slidesConfigData?.countDown?.hide ? countDownSlides : []),
      ...(!slidesConfigData?.kuliahHari?.hide ? kuliahHariSlides : []),
      ...(!slidesConfigData?.kuliahWeekly?.hide ? kuliahMigguanSlides : []),
      ...(!slidesConfigData?.kuliahBulanan?.hide ? kuliahBulananSlides : []),
      ...(!slidesConfigData?.slideshow?.hide ? slideshowSlides : [])
    ];

    if (!DEBUG_SLIDES) return slides;
    if (Array.isArray(DEBUG_SLIDES) && DEBUG_SLIDES.length > 0) {
      return DEBUG_SLIDES.map((i) => slides[i]).filter((s) => s != null);
    }
    if (typeof DEBUG_SLIDES === 'number' && DEBUG_SLIDES > 0) {
      return slides.slice(0, DEBUG_SLIDES);
    }
    return slides;
  }, [announcementsData, countdownsData, kuliahHariProcessed, kuliahHariReplacements, kuliahMingguProcessed, kuliahBulananProcessed, imagesData, slidesConfigData, slideshowData, dataLoading, isReloading, reloadCounter]);

  useEffect(() => {
    if (dataLoading) {
      setLoading(true);
      return;
    }
    setSlideData(stableSlideData);
    setLoading(false);
  }, [stableSlideData, dataLoading]);

  return { slideData, loading };
};
