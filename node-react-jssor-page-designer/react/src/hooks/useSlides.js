import { useState, useEffect, useMemo } from 'react';
import { slidesTemplate, buildHomeTemplate } from '../config/sliderConfig';
import { useData } from '../contexts/DataContext';
import { processAnnouncements } from '../processors/announcementProcessor';
import { processCountdowns } from '../processors/countdownProcessor';
import { processKuliahMingguan, processKuliahHarian, processKuliahBulanan } from '../processors/kuliahProcessor';
import { processSlideshow } from '../processors/slideshowProcessor';
import { schemaRenderer, findPageSchema } from '../processors/schemaRenderer';
import { adaptAnnouncements, adaptCountdowns, adaptSlideshow } from '../processors/dataAdapters';

/**
 * Debug: pilih slide untuk test.
 * - false / null / [] = papar semua
 * - Nombor (contoh 2) = papar N slide pertama
 * - Array indeks 0-based (contoh [0, 3] = slide 1 & 4, [1] = slide 2 sahaja, [0, 2] = slide 1 & 3)
 */
const DEBUG_SLIDES = false;
// const DEBUG_SLIDES = [2];

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
    pageLayoutsData,
    HOME_TITLE_CONFIG,
    SLIDES_CONFIG,
    loading: dataLoading,
    isReloading,
    reloadCounter
  } = useData();

  const stableSlideData = useMemo(() => {
    if (dataLoading) return slideData;

    // Cari schema untuk sesuatu page type (dari pageLayoutsData)
    const getPageSchema = (type) => findPageSchema(pageLayoutsData, type);

    const applyConfig = (template, configKey) => {
      const updated = { ...template };

      // ── Keutamaan 1: schema dari page-layouts.json ─────────────────────────
      // Schema diutamakan untuk background, duration, datetime, enabled
      const schema = getPageSchema(configKey);
      if (schema) {
        if (configKey !== 'home' && schema.background) {
          const bg = schema.background;
          if (!bg.src || ['', 'none', 'null'].includes(String(bg.src).trim().toLowerCase())) {
            updated.image = null;
          } else {
            let imagePath = imagesData && imagesData[bg.src] ? imagesData[bg.src] : bg.src;
            if (imagePath && !imagePath.startsWith('/') && !imagePath.startsWith('http')) {
              imagePath = `/images/slides/${imagePath}.jpg`;
            }
            updated.image = { ...updated.image, src: imagePath };
          }
        }
        if (configKey !== 'home' && schema.duration != null) {
          updated.duration = schema.duration;
        }
        if (schema.datetime != null) {
          updated.datetime = schema.datetime;
        }
      }

      // ── Keutamaan 2: screen.txt (legacy — guna jika tiada schema) ──────────
      if (!schema) {
        if (!slidesConfigData || !slidesConfigData[configKey]) return updated;
        const cfg = slidesConfigData[configKey];

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

        if (cfg.datetime != null) updated.datetime = cfg.datetime;
        if (configKey !== 'home' && cfg.duration != null) updated.duration = cfg.duration;
      }

      return updated;
    };

    const rendererOptions = { imagesData };

    // ── Home ──────────────────────────────────────────────────────────────────
    // Home sentiasa guna buildHomeTemplate (styling dari HOME_TITLE_CONFIG)
    const homeTemplate = buildHomeTemplate(HOME_TITLE_CONFIG);
    const homeSlide = applyConfig(homeTemplate, 'home');

    // ── Announce ──────────────────────────────────────────────────────────────
    // Guna SchemaRenderer jika schema ada, fallback ke processor lama
    const announceSchema = findPageSchema(pageLayoutsData, 'announce');
    const announceSlides = announceSchema
      ? schemaRenderer(announceSchema, adaptAnnouncements(announcementsData), rendererOptions)
      : processAnnouncements(announcementsData, slidesConfigData, applyConfig);

    // ── CountDown ─────────────────────────────────────────────────────────────
    const countDownSchema = findPageSchema(pageLayoutsData, 'countDown');
    const countDownSlides = countDownSchema
      ? schemaRenderer(countDownSchema, adaptCountdowns(countdownsData), rendererOptions)
      : processCountdowns(countdownsData, slidesConfigData, applyConfig);

    // ── Kuliah Hari, Weekly, Bulanan ──────────────────────────────────────────
    // Masih guna processor lama (Fasa 2: migrate ke schema)
    const kuliahHariSlides = processKuliahHarian(kuliahHariProcessed, imagesData, slidesConfigData, applyConfig, kuliahHariReplacements);
    const kuliahMigguanSlides = processKuliahMingguan(kuliahMingguProcessed, imagesData, slidesConfigData, applyConfig);
    const kuliahBulananSlides = processKuliahBulanan(kuliahBulananProcessed, slidesConfigData, applyConfig);

    // ── Slideshow ─────────────────────────────────────────────────────────────
    const slideshowSchema = findPageSchema(pageLayoutsData, 'slideshow');
    const slideshowSlides = slideshowSchema
      ? (() => {
          const items = adaptSlideshow(slideshowData);
          return items.map((item, index) => ({
            type: 'slideshow',
            duration: slideshowSchema.duration || 10000,
            transitionType: 'auto',
            image: { src: item.slideshowImages, alt: `Slideshow ${index + 1}` },
            captions: [],
            datetime: slideshowSchema.datetime || [],
          }));
        })()
      : processSlideshow(slideshowData, slidesConfigData, applyConfig);

    // Periksa visibility: schema.enabled > slidesConfigData.hide
    const isVisible = (type) => {
      const schema = getPageSchema(type);
      if (schema) return schema.enabled !== false;
      return !slidesConfigData?.[type]?.hide;
    };

    const homeGroup         = isVisible('home')         ? [homeSlide]         : [];
    const announceGroup     = isVisible('announce')     ? announceSlides      : [];
    const countDownGroup    = isVisible('countDown')    ? countDownSlides     : [];
    const kuliahHariGroup   = isVisible('kuliahHari')   ? kuliahHariSlides    : [];
    const kuliahWeeklyGroup = isVisible('kuliahWeekly') ? kuliahMigguanSlides : [];
    const kuliahBulananGroup = isVisible('kuliahBulanan') ? kuliahBulananSlides : [];
    const slideshowGroup    = isVisible('slideshow')    ? slideshowSlides     : [];

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
  }, [announcementsData, countdownsData, kuliahHariProcessed, kuliahHariReplacements, kuliahMingguProcessed, kuliahBulananProcessed, imagesData, slidesConfigData, slideshowData, pageLayoutsData, HOME_TITLE_CONFIG, SLIDES_CONFIG, dataLoading, isReloading, reloadCounter]);

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
