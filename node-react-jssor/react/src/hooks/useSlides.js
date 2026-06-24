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
// const DEBUG_SLIDES = [4];

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
    SLIDES_CONFIG,
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

      // Untuk semua jenis kecuali 'home', image boleh override dan dibenarkan kosong.
      // Untuk 'home', image asal dari HOME_TITLE_CONFIG (background) akan dikekalkan.
      if (configKey !== 'home') {
        const noImageValues = ['', 'none', 'null'];
        const isNoImage = noImageValues.includes(String(cfg.image ?? '').trim().toLowerCase());
        if (isNoImage) {
          updated.image = null;
        } else if (cfg.image) {
          let imagePath = imagesData && imagesData[cfg.image] ? imagesData[cfg.image] : cfg.image;
          if (imagePath && !imagePath.startsWith('/')) imagePath = '/' + imagePath;
          updated.image = { ...updated.image, src: imagePath };
        }
      }

      // Datetime sentiasa boleh override dari screen.txt jika ada
      if (cfg.datetime != null) {
        updated.datetime = cfg.datetime;
      }

      // Tempoh:
      // - 'home' guna DURATION_SEC dari HOME_TITLE_CONFIG (dah ditetapkan dalam buildHomeTemplate)
      // - jenis lain guna duration dari screen.txt jika ada
      if (configKey !== 'home' && cfg.duration != null) {
        updated.duration = cfg.duration;
      }

      return updated;
    };

    const homeTemplate = buildHomeTemplate(HOME_TITLE_CONFIG);
    const homeSlide = applyConfig(homeTemplate, 'home');
    const announceSlides = processAnnouncements(announcementsData, slidesConfigData, applyConfig);
    const countDownSlides = processCountdowns(countdownsData, slidesConfigData, applyConfig, imagesData);
    const kuliahHariSlides = processKuliahHarian(kuliahHariProcessed, imagesData, slidesConfigData, applyConfig, kuliahHariReplacements);
    const kuliahMigguanSlides = processKuliahMingguan(kuliahMingguProcessed, imagesData, slidesConfigData, applyConfig);
    const kuliahBulananSlides = processKuliahBulanan(kuliahBulananProcessed, imagesData, slidesConfigData, applyConfig);
    const slideshowSlides = processSlideshow(slideshowData, slidesConfigData, applyConfig);

    const homeGroup    = !slidesConfigData?.home?.hide        ? [homeSlide]          : [];
    const announceGroup  = !slidesConfigData?.announce?.hide    ? announceSlides        : [];
    const countDownGroup = !slidesConfigData?.countDown?.hide   ? countDownSlides       : [];
    const kuliahHariGroup  = !slidesConfigData?.kuliahHari?.hide  ? kuliahHariSlides      : [];
    const kuliahWeeklyGroup = !slidesConfigData?.kuliahWeekly?.hide ? kuliahMigguanSlides  : [];
    const kuliahBulananGroup = !slidesConfigData?.kuliahBulanan?.hide ? kuliahBulananSlides : [];
    const slideshowGroup = !slidesConfigData?.slideshow?.hide   ? slideshowSlides       : [];

    const nonHomeGroups = [
      announceGroup, countDownGroup, kuliahHariGroup,
      kuliahWeeklyGroup, kuliahBulananGroup, slideshowGroup
    ].filter(g => g.length > 0);

    const shuffleArray = (arr) => {
      const result = [...arr];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    };

    const slidesOrder = SLIDES_CONFIG?.ORDER || 'A';
    let slides;
    if (slidesOrder === 'B') {
      slides = [...homeGroup, ...shuffleArray(nonHomeGroups).flat()];
    } else if (slidesOrder === 'C') {
      slides = [...homeGroup, ...shuffleArray(nonHomeGroups.flat())];
    } else {
      slides = [...homeGroup, ...nonHomeGroups.flat()];
    }

    if (!DEBUG_SLIDES) return slides;
    if (Array.isArray(DEBUG_SLIDES) && DEBUG_SLIDES.length > 0) {
      return DEBUG_SLIDES.map((i) => slides[i]).filter((s) => s != null);
    }
    if (typeof DEBUG_SLIDES === 'number' && DEBUG_SLIDES > 0) {
      return slides.slice(0, DEBUG_SLIDES);
    }
    return slides;
  }, [announcementsData, countdownsData, kuliahHariProcessed, kuliahHariReplacements, kuliahMingguProcessed, kuliahBulananProcessed, imagesData, slidesConfigData, slideshowData, HOME_TITLE_CONFIG, SLIDES_CONFIG, dataLoading, isReloading, reloadCounter]);

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
