import { useEffect, useMemo, useRef, useState } from 'react';
import { sliderConfig } from '../config/sliderConfig';

/**
 * Create stable hash dari slide structure DAN content untuk detect changes
 * @param {Array} slides - SlideData
 * @returns {string} Hash string
 */
const createDataHash = (slides) => {
  if (!slides || slides.length === 0) return 'empty';
  
  return slides.map(slide => {
    const captions = slide.captions || [];
    const captionStructure = captions.map(cap => {
      const children = cap.children || [];
      const childContent = children.slice(0, 3).map(child => 
        `${child.type}:${String(child.content || '').substring(0, 30)}`
      ).join('|');
      // Sertakan cap.content (string HTML terus, contoh home title) supaya hash berubah bila config berubah
      const capContentStr = String(cap.content || '');
      const capContentHash = capContentStr.length > 0
        ? `${capContentStr.length}:${capContentStr.substring(0, 200)}`
        : '';
      //return `${cap.type}|${cap.transition}|${cap.transition2}|childCount:${children.length}|content:${childContent}`;
      return `${cap.type}|${cap.transition}|${cap.transition2}|childCount:${children.length}|content:${childContent}|capContent:${capContentHash}`;
    }).join(';') || 'nocaptions';

    return `${slide.transitionType}|${slide.duration}|${slide.image?.src || 'noimg'}|capCount:${captions.length}|${captionStructure}`;
  }).join('::');
};

/**
 * @param {Array} slideData - Data slide
 * @param {Object} [opts] - Pilihan. { onParkAt: { [index: number]: (current, prev) => void }, onTransitionStart, onTransitionEnd, onTransitionEvent } untuk panggil callback bila park pada slide index atau transition events.
 * @returns {Object} { sliderContainerRef, loading, sliderRef } - sliderRef dedah $CurrentIndex(), $PreviousIndex(), $NextIndex(), $OnParkAt
 */
export const useJssorSlider = (slideData = [], opts = {}) => {
  const { onParkAt, onTransitionStart, onTransitionEnd, onTransitionEvent, dataReady = true } = opts || {};
  const sliderContainerRef = useRef(null);
  const sliderInstanceRef = useRef(null);
  const isInitializingRef = useRef(false);
  const scaleAfterInitIntervalRef = useRef(null);
  const slideDataRef = useRef([]);
  const isFirstInitRef = useRef(true);
  const scaleHandlerRef = useRef(null); // Track resize handler supaya boleh remove dengan tepat
  const [loading, setLoading] = useState(false); // Set false by default, akan set true bila start init

  const dataHash = useMemo(() => createDataHash(slideData), [slideData]);

  // Update slide data ref setiap kali slideData berubah (tanpa trigger re-init)
  useEffect(() => {
    slideDataRef.current = slideData || [];
  }, [slideData]);

  useEffect(() => {
    // Hanya init bila data siap; elak init dua kali (dulu [home] kemudian full data) yang sebabkan reload slide0
    if (dataReady === false) {
      setLoading(false);
      return;
    }

    if (isFirstInitRef.current) {
      isFirstInitRef.current = false;
    }

    const initSlider = async () => {
      try {
        setLoading(true);

        // Tunggu Jssor siap dengan had retry (elak infinite loop bila skrip gagal load)
        const MAX_JSSOR_WAIT_RETRIES = 100; // 10 saat (100 × 100ms)
        if (typeof window.$JssorSlider$ === 'undefined') {
          initSlider._retryCount = (initSlider._retryCount || 0) + 1;
          if (initSlider._retryCount > MAX_JSSOR_WAIT_RETRIES) {
            console.error('[Slider] Jssor gagal dimuatkan selepas 10s. Semak sama ada jssor.slider.mini.js berjaya dimuatkan.');
            setLoading(false);
            return;
          }
          setTimeout(initSlider, 100);
          return;
        }
        initSlider._retryCount = 0; // Reset pada kejayaan

        const { $JssorSlider$, $JssorEasing$, $JssorSlideshowFormations$, $JssorSlideshowRunner$, $JssorCaptionSlider$ } = window;

        // Pastikan semua object Jssor sudah dimuatkan
        if (!$JssorSlider$ || !$JssorEasing$ || !$JssorSlideshowFormations$ || !$JssorSlideshowRunner$ || !$JssorCaptionSlider$) {
          setTimeout(initSlider, 100);
          return;
        }

        // Pastikan $JssorEasing$ mempunyai property yang diperlukan
        if (!$JssorEasing$ || typeof $JssorEasing$ !== 'object' || !$JssorEasing$.$EaseOutQuad || !$JssorEasing$.$EaseInCubic || !$JssorEasing$.$EaseLinear) {
          setTimeout(initSlider, 100);
          return;
        }

        const _SelectedTransitions = [
          'CollapseRandom',
          'DodgeDanceInsideRandom',
          'ClipAndChessIn',
          'RotateZoomInBR',
          'RotateZoomOutTL',
          'ExpandStairs',
          'SlideInStraightStairs',
          'BounceInStraight',
          'SlideOutSquare',
          'SlideUpDownChess',
          'SlideOutSwirl',
          'SlideInStraightStairsQuart',
          'ClipIn',
          'JumpStraightStairs',
          'ClipInLarge',
          'SlideOutQuad',
          'SlideInBrother',
          'ClipInSingle',
          'SlideUpDownBrother'
        ];

        const _SlideshowTransitionsOriginal = [
          { name: 'CollapseRandom', $Duration: 1000, $Delay: 80, $Cols: 10, $Rows: 4, $Clip: 15, $SlideOut: true, $Easing: $JssorEasing$.$EaseOutQuad },
          { name: 'FadeInLRChess', $Duration: 1200, y: 0.3, $Cols: 2, $During: { $Top: [0.3, 0.7] }, $ChessMode: { $Column: 12 }, $Easing: { $Top: $JssorEasing$.$EaseInCubic, $Opacity: $JssorEasing$.$EaseLinear }, $Opacity: 2, $Outside: true },
          { name: 'FadeClipOutH', $Duration: 1200, $Delay: 20, $Clip: 3, $SlideOut: true, $Assembly: 260, $Easing: { $Clip: $JssorEasing$.$EaseOutCubic, $Opacity: $JssorEasing$.$EaseLinear }, $Opacity: 2 },
          { name: 'RotateVDoubleOut', $Duration: 1000, x: -1, y: 2, $Rows: 2, $Zoom: 11, $Rotate: 1, $SlideOut: true, $Assembly: 2049, $ChessMode: { $Row: 15 }, $Easing: { $Left: $JssorEasing$.$EaseInExpo, $Top: $JssorEasing$.$EaseInExpo, $Zoom: $JssorEasing$.$EaseInExpo, $Opacity: $JssorEasing$.$EaseLinear, $Rotate: $JssorEasing$.$EaseInExpo }, $Opacity: 2, $Round: { $Rotate: 0.85 } },
          { name: 'ZoomHDoubleOut', $Duration: 1200, x: 4, $Cols: 2, $Zoom: 11, $SlideOut: true, $Assembly: 2049, $ChessMode: { $Column: 15 }, $Easing: { $Left: $JssorEasing$.$EaseInExpo, $Zoom: $JssorEasing$.$EaseInExpo, $Opacity: $JssorEasing$.$EaseLinear }, $Opacity: 2 },
          { name: 'RotateZoomOutBL', $Duration: 1200, x: 4, y: -4, $Zoom: 11, $Rotate: 1, $SlideOut: true, $Easing: { $Left: $JssorEasing$.$EaseInExpo, $Top: $JssorEasing$.$EaseInExpo, $Zoom: $JssorEasing$.$EaseInExpo, $Opacity: $JssorEasing$.$EaseLinear, $Rotate: $JssorEasing$.$EaseInExpo }, $Opacity: 2, $Round: { $Rotate: 0.8 } },
          { name: 'RotateVForkOut', $Duration: 1200, x: -3, y: 1, $Rows: 2, $Zoom: 11, $Rotate: 1, $SlideOut: true, $Assembly: 2049, $ChessMode: { $Row: 28 }, $Easing: { $Left: $JssorEasing$.$EaseInExpo, $Top: $JssorEasing$.$EaseInExpo, $Zoom: $JssorEasing$.$EaseInExpo, $Opacity: $JssorEasing$.$EaseLinear, $Rotate: $JssorEasing$.$EaseInExpo }, $Opacity: 2, $Round: { $Rotate: 0.7 } },
          { name: 'RotateZoomOutTL', $Duration: 1200, x: 0.5, y: 0.5, $Zoom: 1, $Rotate: 1, $SlideOut: true, $Easing: { $Left: $JssorEasing$.$EaseInCubic, $Top: $JssorEasing$.$EaseInCubic, $Zoom: $JssorEasing$.$EaseInCubic, $Opacity: $JssorEasing$.$EaseLinear, $Rotate: $JssorEasing$.$EaseInCubic }, $Opacity: 2, $Round: { $Rotate: 0.5 } },
          { name: 'RotateZoomInBR', $Duration: 1200, x: -0.6, y: -0.6, $Zoom: 1, $Rotate: 1, $During: { $Left: [0.2, 0.8], $Top: [0.2, 0.8], $Zoom: [0.2, 0.8], $Rotate: [0.2, 0.8] }, $Easing: { $Zoom: $JssorEasing$.$EaseSwing, $Opacity: $JssorEasing$.$EaseLinear, $Rotate: $JssorEasing$.$EaseSwing }, $Opacity: 2, $Round: { $Rotate: 0.5 } },
          { name: 'DodgeDanceInsideRandom', $Duration: 1500, x: 0.3, y: -0.3, $Delay: 80, $Cols: 10, $Rows: 4, $Clip: 15, $During: { $Left: [0.3, 0.7], $Top: [0.3, 0.7] }, $Easing: { $Left: $JssorEasing$.$EaseInJump, $Top: $JssorEasing$.$EaseInJump, $Clip: $JssorEasing$.$EaseOutQuad }, $Round: { $Left: 0.8, $Top: 2.5 } },
          { name: 'ClipAndChessIn', $Duration: 1200, y: -1, $Cols: 10, $Rows: 4, $Clip: 15, $During: { $Top: [0.5, 0.5], $Clip: [0, 0.5] }, $Formation: $JssorSlideshowFormations$.$FormationStraight, $ChessMode: { $Column: 12 }, $ScaleClip: 0.5 },
          { name: 'WaveOutEagle', $Duration: 1500, y: -0.5, $Delay: 60, $Cols: 24, $SlideOut: true, $Formation: $JssorSlideshowFormations$.$FormationCircle, $Easing: $JssorEasing$.$EaseInWave, $Round: { $Top: 1.5 } },
          { name: 'ExpandStairs', $Duration: 1000, $Delay: 30, $Cols: 10, $Rows: 4, $Clip: 15, $Formation: $JssorSlideshowFormations$.$FormationStraightStairs, $Assembly: 2050, $Easing: $JssorEasing$.$EaseInQuad },
        ];

        const _SlideshowTransitionsIIM = [
          { name: 'WaveOutStraightStairs', $Duration: 1500, y: -0.5, $Delay: 60, $Cols: 12, $Formation: $JssorSlideshowFormations$.$FormationStraightStairs, $Easing: $JssorEasing$.$EaseInWave, $Round: { $Top: 1.5 } },
          { name: 'SlideInLRChess', $Duration: 1500, x: 0.5, $Cols: 2, $ChessMode: { $Column: 3 }, $Easing: { $Left: $JssorEasing$.$EaseInOutCubic }, $Opacity: 2, $Brother: { $Duration: 1500, $Opacity: 2 } },
          { name: 'SlideInStraightStairs', $Duration: 1000, x: 0.2, $Delay: 40, $Cols: 12, $Formation: $JssorSlideshowFormations$.$FormationStraightStairs, $Easing: { $Left: $JssorEasing$.$EaseInOutExpo, $Opacity: $JssorEasing$.$EaseInOutQuad }, $Assembly: 260, $Opacity: 2, $Outside: true, $Round: { $Top: 0.5 } },
          { name: 'RotateBrother', $Duration: 1500, x: -0.1, y: -0.7, $Rotate: 0.1, $During: { $Left: [0.6, 0.4], $Top: [0.6, 0.4], $Rotate: [0.6, 0.4] }, $Easing: { $Left: $JssorEasing$.$EaseInQuad, $Top: $JssorEasing$.$EaseInQuad, $Opacity: $JssorEasing$.$EaseLinear, $Rotate: $JssorEasing$.$EaseInQuad }, $Opacity: 2, $Brother: { $Duration: 1000, x: 0.2, y: 0.5, $Rotate: -0.1, $Easing: { $Left: $JssorEasing$.$EaseInQuad, $Top: $JssorEasing$.$EaseInQuad, $Opacity: $JssorEasing$.$EaseLinear, $Rotate: $JssorEasing$.$EaseInQuad }, $Opacity: 2 } },
          { name: 'BounceInStraight', $Duration: 1000, $Cols: 3, $Rows: 2, $Clip: 15, $Formation: $JssorSlideshowFormations$.$FormationStraight, $Easing: $JssorEasing$.$EaseInBounce },
          { name: 'SlideOutSquare', $Duration: 800, $Delay: 300, $Cols: 8, $Rows: 4, $Clip: 15, $SlideOut: true, $Formation: $JssorSlideshowFormations$.$FormationSquare, $Easing: $JssorEasing$.$EaseOutQuad },
          { name: 'SlideOutSwirl', $Duration: 500, $Delay: 30, $Cols: 8, $Rows: 4, $Clip: 15, $SlideOut: true, $Formation: $JssorSlideshowFormations$.$FormationSwirl, $Easing: $JssorEasing$.$EaseOutQuad },
          { name: 'SlideUpDownChess', $Duration: 1600, y: -1, $Cols: 2, $ChessMode: { $Column: 12 }, $Easing: { $Top: $JssorEasing$.$EaseInOutQuart, $Opacity: $JssorEasing$.$EaseLinear }, $Opacity: 2, $Brother: { $Duration: 1600, y: 1, $Cols: 2, $ChessMode: { $Column: 12 }, $Easing: { $Top: $JssorEasing$.$EaseInOutQuart, $Opacity: $JssorEasing$.$EaseLinear }, $Opacity: 2 } },
          { name: 'WaveRectangleCross', $Duration: 1500, x: -1, y: 0.5, $Delay: 60, $Cols: 8, $Rows: 4, $Formation: $JssorSlideshowFormations$.$FormationRectangleCross, $Easing: { $Left: $JssorEasing$.$EaseSwing, $Top: $JssorEasing$.$EaseInWave }, $Assembly: 260, $Round: { $Top: 1.5 } },
          { name: 'SlideOutZigZag', $Duration: 600, y: 1, $Delay: 50, $Cols: 8, $Rows: 4, $SlideOut: true, $Formation: $JssorSlideshowFormations$.$FormationZigZag, $Easing: { $Top: $JssorEasing$.$EaseInCubic, $Opacity: $JssorEasing$.$EaseOutQuad }, $Assembly: 264, $Opacity: 2 },
          { name: 'SlideOutSwirlQuart', $Duration: 600, x: -1, y: 1, $Delay: 100, $Cols: 8, $Rows: 4, $SlideOut: true, $Formation: $JssorSlideshowFormations$.$FormationSwirl, $Easing: { $Top: $JssorEasing$.$EaseInQuart, $Opacity: $JssorEasing$.$EaseLinear }, $Assembly: 264, $Opacity: 2 },
          { name: 'JumpCircle', $Duration: 1500, x: -1, y: -0.5, $Delay: 50, $Cols: 8, $Rows: 4, $Formation: $JssorSlideshowFormations$.$FormationCircle, $Easing: { $Left: $JssorEasing$.$EaseSwing, $Top: $JssorEasing$.$EaseInJump }, $Assembly: 260, $Round: { $Top: 1.5 } },
          { name: 'JumpSwirl', $Duration: 1500, x: -1, y: -0.5, $Delay: 50, $Cols: 8, $Rows: 4, $Formation: $JssorSlideshowFormations$.$FormationSwirl, $Easing: { $Left: $JssorEasing$.$EaseSwing, $Top: $JssorEasing$.$EaseInJump }, $Assembly: 260, $Round: { $Top: 1.5 } },
          { name: 'SlideInStraightStairsQuart', $Duration: 600, x: -1, y: 1, $Delay: 30, $Cols: 8, $Rows: 4, $Formation: $JssorSlideshowFormations$.$FormationStraightStairs, $Easing: { $Left: $JssorEasing$.$EaseInQuart, $Top: $JssorEasing$.$EaseInQuart, $Opacity: $JssorEasing$.$EaseLinear }, $Opacity: 2 },
          { name: 'WaveCircle15', $Duration: 1500, y: -0.5, $Delay: 60, $Cols: 15, $Formation: $JssorSlideshowFormations$.$FormationCircle, $Easing: $JssorEasing$.$EaseInWave, $Round: { $Top: 1.5 } },
          { name: 'WaveRectangleCross2', $Duration: 1500, x: -1, y: 0.5, $Delay: 60, $Cols: 8, $Rows: 4, $Formation: $JssorSlideshowFormations$.$FormationRectangleCross, $Easing: { $Left: $JssorEasing$.$EaseSwing, $Top: $JssorEasing$.$EaseInWave }, $Assembly: 260, $Round: { $Top: 1.5 } },
          { name: 'ClipIn', $Duration: 1500, x: 0.3, y: -0.3, $Delay: 20, $Cols: 8, $Rows: 4, $Clip: 15 },
          { name: 'JumpStraightStairs', $Duration: 1200, x: 0.3, y: 0.3, $Delay: 60, $Zoom: 1, $Formation: $JssorSlideshowFormations$.$FormationStraightStairs, $Easing: { $Left: $JssorEasing$.$EaseInJump, $Top: $JssorEasing$.$EaseInJump, $Opacity: $JssorEasing$.$EaseLinear }, $Opacity: 2, $Round: { $Left: 0.8, $Top: 0.8 } },
          { name: 'ClipInLarge', $Duration: 1800, x: 1, y: 0.2, $Delay: 30, $Cols: 10, $Rows: 5, $Clip: 15 },
          { name: 'SlideOutQuad', $Duration: 1000, $Delay: 80, $Cols: 8, $Rows: 4, $Clip: 15, $SlideOut: true, $Easing: $JssorEasing$.$EaseOutQuad },
          { name: 'SlideInBrother', $Duration: 1200, x: 1, $Delay: 40, $Cols: 6, $Formation: $JssorSlideshowFormations$.$FormationStraight, $Easing: { $Left: $JssorEasing$.$EaseInOutQuart, $Opacity: $JssorEasing$.$EaseLinear }, $Opacity: 2, $ZIndex: -10, $Brother: { $Duration: 1200, x: 1, $Delay: 40, $Cols: 6, $Formation: $JssorSlideshowFormations$.$FormationStraight, $Easing: { $Top: $JssorEasing$.$EaseInOutQuart, $Opacity: $JssorEasing$.$EaseLinear }, $Opacity: 2, $ZIndex: -10, $Shift: -100 } }
        ];

        const _SlideshowTransitionsFixed = [
          { name: 'SlideInQuad', $Duration: 400, x: 1, $Easing: $JssorEasing$.$EaseInQuad },
          { name: 'ClipInSingle', $Duration: 1000, $Cols: 8, $Clip: 1 },
          { name: 'SlideUpDownBrother', $Duration: 1200, y: -1, $Easing: { $Top: $JssorEasing$.$EaseInOutQuart, $Opacity: $JssorEasing$.$EaseLinear }, $Opacity: 2, $ZIndex: -10, $Brother: { $Duration: 1200, y: -1, $Easing: { $Top: $JssorEasing$.$EaseInOutQuart, $Opacity: $JssorEasing$.$EaseLinear }, $Opacity: 2, $ZIndex: -10, $Shift: -100 } }
        ];

        const _SlideshowTransitionsCombined = [
          ..._SlideshowTransitionsOriginal,
          ..._SlideshowTransitionsIIM,
          ..._SlideshowTransitionsFixed
        ];

        const _SlideshowTransitionsFiltered = _SlideshowTransitionsCombined.filter(transition => 
          _SelectedTransitions.includes(transition.name)
        );

        const shuffleArray = (array) => {
          const shuffled = [...array];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          return shuffled;
        };

        const _SlideshowTransitions = shuffleArray(_SlideshowTransitionsFiltered);

        const _CaptionTransitions = [];
        _CaptionTransitions["L"] = { $Duration: 900, x: 0.6, $Easing: { $Left: $JssorEasing$.$EaseInOutSine }, $Opacity: 2 };
        _CaptionTransitions["R"] = { $Duration: 900, x: -0.6, $Easing: { $Left: $JssorEasing$.$EaseInOutSine }, $Opacity: 2 };
        _CaptionTransitions["T"] = { $Duration: 900, y: 0.6, $Easing: { $Top: $JssorEasing$.$EaseInOutSine }, $Opacity: 2 };
        _CaptionTransitions["B"] = { $Duration: 900, y: -0.6, $Easing: { $Top: $JssorEasing$.$EaseInOutSine }, $Opacity: 2 };
        _CaptionTransitions["TR"] = { $Duration: 900, x: -0.6, y: 0.6, $Easing: { $Left: $JssorEasing$.$EaseInOutSine, $Top: $JssorEasing$.$EaseInOutSine }, $Opacity: 2 };
        _CaptionTransitions["L|IB"] = { $Duration: 1200, x: 0.6, $Easing: { $Left: $JssorEasing$.$EaseInOutBack }, $Opacity: 2 };
        _CaptionTransitions["R|IB"] = { $Duration: 1200, x: -0.6, $Easing: { $Left: $JssorEasing$.$EaseInOutBack }, $Opacity: 2 };
        _CaptionTransitions["T|IB"] = { $Duration: 1200, y: 0.6, $Easing: { $Top: $JssorEasing$.$EaseInOutBack }, $Opacity: 2 };
        _CaptionTransitions["CLIP|LR"] = { $Duration: 900, $Clip: 3, $Easing: { $Clip: $JssorEasing$.$EaseInOutCubic }, $Opacity: 2 };
        _CaptionTransitions["NO_CLIP_OUT"] = { $Duration: 1 }; // Tiada clip, tiada opacity change (caption kekal visible)
        _CaptionTransitions["CLIP|TB"] = { $Duration: 900, $Clip: 12, $Easing: { $Clip: $JssorEasing$.$EaseInOutCubic }, $Opacity: 2 };
        _CaptionTransitions["CLIP|L"] = { $Duration: 900, $Clip: 1, $Easing: { $Clip: $JssorEasing$.$EaseInOutCubic }, $Opacity: 2 };
        _CaptionTransitions["CLIP|R"] = { $Duration: 900, $Clip: 2, $Easing: { $Clip: $JssorEasing$.$EaseInOutCubic }, $Opacity: 2 }; // clip dari kanan (tanpa Move)
        _CaptionTransitions["MCLIP|R"] = { $Duration: 900, $Clip: 2, $Move: true, $Easing: { $Clip: $JssorEasing$.$EaseInOutCubic }, $Opacity: 2 };
        _CaptionTransitions["MCLIP|T"] = { $Duration: 900, $Clip: 4, $Move: true, $Easing: { $Clip: $JssorEasing$.$EaseInOutCubic }, $Opacity: 2 };
        _CaptionTransitions["WV|B"] = { $Duration: 1200, x: -0.2, y: -0.6, $Easing: { $Left: $JssorEasing$.$EaseInWave, $Top: $JssorEasing$.$EaseLinear }, $Opacity: 2, $Round: { $Left: 1.5 } };
        _CaptionTransitions["TORTUOUS|VB"] = { $Duration: 1800, y: -0.2, $Zoom: 1, $Easing: { $Top: $JssorEasing$.$EaseOutWave, $Zoom: $JssorEasing$.$EaseOutCubic }, $Opacity: 2, $During: { $Top: [0, 0.7] }, $Round: { $Top: 1.3 } };
        _CaptionTransitions["LISTH|R"] = { $Duration: 1500, x: -0.8, $Clip: 1, $Easing: $JssorEasing$.$EaseInOutCubic, $ScaleClip: 0.8, $Opacity: 2, $During: { $Left: [0.4, 0.6], $Clip: [0, 0.4], $Opacity: [0.4, 0.6] } };
        _CaptionTransitions["RTT|360"] = { $Duration: 900, $Rotate: 1, $Easing: { $Opacity: $JssorEasing$.$EaseLinear, $Rotate: $JssorEasing$.$EaseInQuad }, $Opacity: 2 };
        _CaptionTransitions["RTT|10"] = { $Duration: 900, $Zoom: 11, $Rotate: 1, $Easing: { $Zoom: $JssorEasing$.$EaseInExpo, $Opacity: $JssorEasing$.$EaseLinear, $Rotate: $JssorEasing$.$EaseInExpo }, $Opacity: 2, $Round: { $Rotate: 0.8 } };
        _CaptionTransitions["RTTL|BR"] = { $Duration: 900, x: -0.6, y: -0.6, $Zoom: 11, $Rotate: 1, $Easing: { $Left: $JssorEasing$.$EaseInCubic, $Top: $JssorEasing$.$EaseInCubic, $Zoom: $JssorEasing$.$EaseInCubic, $Opacity: $JssorEasing$.$EaseLinear, $Rotate: $JssorEasing$.$EaseInCubic }, $Opacity: 2, $Round: { $Rotate: 0.8 } };
        _CaptionTransitions["T|IE*IE"] = { $Duration: 1800, y: 0.8, $Zoom: 11, $Rotate: -1.5, $Easing: { $Top: $JssorEasing$.$EaseInOutElastic, $Zoom: $JssorEasing$.$EaseInElastic, $Rotate: $JssorEasing$.$EaseInOutElastic }, $Opacity: 2, $During: { $Zoom: [0, 0.8], $Opacity: [0, 0.7] }, $Round: { $Rotate: 0.5 } };
        _CaptionTransitions["RTTS|R"] = { $Duration: 900, x: -0.6, $Zoom: 1, $Rotate: 1, $Easing: { $Left: $JssorEasing$.$EaseInQuad, $Zoom: $JssorEasing$.$EaseInQuad, $Rotate: $JssorEasing$.$EaseInQuad, $Opacity: $JssorEasing$.$EaseOutQuad }, $Opacity: 2, $Round: { $Rotate: 1.2 } };
        _CaptionTransitions["RTTS|T"] = { $Duration: 900, y: 0.6, $Zoom: 1, $Rotate: 1, $Easing: { $Top: $JssorEasing$.$EaseInQuad, $Zoom: $JssorEasing$.$EaseInQuad, $Rotate: $JssorEasing$.$EaseInQuad, $Opacity: $JssorEasing$.$EaseOutQuad }, $Opacity: 2, $Round: { $Rotate: 1.2 } };
        _CaptionTransitions["DDGDANCE|RB"] = { $Duration: 1800, x: -0.3, y: -0.3, $Zoom: 1, $Easing: { $Left: $JssorEasing$.$EaseInJump, $Top: $JssorEasing$.$EaseInJump, $Zoom: $JssorEasing$.$EaseOutQuad }, $Opacity: 2, $During: { $Left: [0, 0.8], $Top: [0, 0.8] }, $Round: { $Left: 0.8, $Top: 2.5 } };
        _CaptionTransitions["ZMF|10"] = { $Duration: 900, $Zoom: 11, $Easing: { $Zoom: $JssorEasing$.$EaseInExpo, $Opacity: $JssorEasing$.$EaseLinear }, $Opacity: 2 };
        _CaptionTransitions["DDG|TR"] = { $Duration: 1200, x: -0.3, y: 0.3, $Zoom: 1, $Easing: { $Left: $JssorEasing$.$EaseInJump, $Top: $JssorEasing$.$EaseInJump }, $Opacity: 2, $During: { $Left: [0, 0.8], $Top: [0, 0.8] }, $Round: { $Left: 0.8, $Top: 0.8 } };
        _CaptionTransitions["FLTTR|R"] = { $Duration: 900, x: -0.2, y: -0.1, $Easing: { $Left: $JssorEasing$.$EaseLinear, $Top: $JssorEasing$.$EaseInWave }, $Opacity: 2, $Round: { $Top: 1.3 } };
        _CaptionTransitions["FLTTRWN|LT"] = { $Duration: 1800, x: 0.5, y: 0.2, $Zoom: 1, $Easing: { $Left: $JssorEasing$.$EaseInOutSine, $Top: $JssorEasing$.$EaseInWave, $Zoom: $JssorEasing$.$EaseInOutQuad }, $Opacity: 2, $During: { $Left: [0, 0.7], $Top: [0.1, 0.7] }, $Round: { $Top: 1.3 } };
        _CaptionTransitions["ATTACK|BR"] = { $Duration: 1500, x: -0.1, y: -0.5, $Zoom: 1, $Easing: { $Left: $JssorEasing$.$EaseOutWave, $Top: $JssorEasing$.$EaseInExpo }, $Opacity: 2, $During: { $Left: [0.3, 0.7], $Top: [0, 0.7] }, $Round: { $Left: 1.3 } };
        _CaptionTransitions["FADE"] = { $Duration: 900, $Opacity: 2 };
        _CaptionTransitions["auto"] = { $Duration: 900, $Opacity: 2 }; // Tiada clip, fade sahaja (clip=auto)
        
        // Tambah transition yang menarik untuk slideshow images (menyerupai slideshow transitions)
        _CaptionTransitions["ZOOM|IN"] = { $Duration: 1000, $Zoom: 11, $Easing: { $Zoom: $JssorEasing$.$EaseInQuad, $Opacity: $JssorEasing$.$EaseLinear }, $Opacity: 2 };
        _CaptionTransitions["ZOOM|OUT"] = { $Duration: 1000, $Zoom: 1, $Easing: { $Zoom: $JssorEasing$.$EaseOutQuad, $Opacity: $JssorEasing$.$EaseLinear }, $Opacity: 2 };
        _CaptionTransitions["ZOOM|FADE"] = { $Duration: 1200, $Zoom: 11, $Easing: { $Zoom: $JssorEasing$.$EaseInOutCubic, $Opacity: $JssorEasing$.$EaseLinear }, $Opacity: 2 };
        _CaptionTransitions["SLIDE|QUAD"] = { $Duration: 1000, x: 1, $Easing: $JssorEasing$.$EaseInQuad, $Opacity: 2 };
        _CaptionTransitions["SLIDE|QUINT"] = { $Duration: 1000, x: 1, $Easing: $JssorEasing$.$EaseInOutQuint, $Opacity: 2 };
        _CaptionTransitions["WAVE|IN"] = { $Duration: 1500, y: -0.5, $Easing: { $Top: $JssorEasing$.$EaseInWave, $Opacity: $JssorEasing$.$EaseLinear }, $Opacity: 2, $Round: { $Top: 1.5 } };
        _CaptionTransitions["BOUNCE|IN"] = { $Duration: 1200, y: -0.6, $Easing: { $Top: $JssorEasing$.$EaseInBounce, $Opacity: $JssorEasing$.$EaseLinear }, $Opacity: 2 };
        _CaptionTransitions["ELASTIC|IN"] = { $Duration: 1500, y: -0.6, $Easing: { $Top: $JssorEasing$.$EaseInOutElastic, $Opacity: $JssorEasing$.$EaseLinear }, $Opacity: 2 };
        _CaptionTransitions["CLIP|CIRCLE"] = { $Duration: 1000, $Clip: 15, $Easing: { $Clip: $JssorEasing$.$EaseInOutCubic }, $Opacity: 2 };
        _CaptionTransitions["ROTATE|ZOOM"] = { $Duration: 1200, $Zoom: 11, $Rotate: 1, $Easing: { $Zoom: $JssorEasing$.$EaseInOutCubic, $Rotate: $JssorEasing$.$EaseInOutCubic, $Opacity: $JssorEasing$.$EaseLinear }, $Opacity: 2, $Round: { $Rotate: 0.8 } };
        _CaptionTransitions["SWIRL|IN"] = { $Duration: 1500, x: -0.5, y: -0.5, $Rotate: 1, $Easing: { $Left: $JssorEasing$.$EaseInOutSine, $Top: $JssorEasing$.$EaseInOutSine, $Rotate: $JssorEasing$.$EaseInOutSine, $Opacity: $JssorEasing$.$EaseLinear }, $Opacity: 2, $Round: { $Rotate: 0.5 } };
        _CaptionTransitions["COLLAPSE|IN"] = { $Duration: 1000, $Zoom: 1, $Easing: { $Zoom: $JssorEasing$.$EaseInQuad, $Opacity: $JssorEasing$.$EaseLinear }, $Opacity: 2 };
        _CaptionTransitions["EXPAND|OUT"] = { $Duration: 1000, $Zoom: 11, $Easing: { $Zoom: $JssorEasing$.$EaseOutQuad, $Opacity: $JssorEasing$.$EaseLinear }, $Opacity: 2 };
        
        // Caption transitions untuk images yang menyerupai slideshow transitions (boleh pecah image)
        // Menggunakan Cols, Rows, Clip, Formation untuk effect yang lebih complex
        _CaptionTransitions["COLLAPSE|RANDOM"] = { $Duration: 1000, $Delay: 80, $Cols: 10, $Rows: 4, $Clip: 15, $Easing: { $Clip: $JssorEasing$.$EaseOutQuad, $Opacity: $JssorEasing$.$EaseLinear }, $Opacity: 2 };
        _CaptionTransitions["CLIP|CHESS"] = { $Duration: 1200, y: -1, $Cols: 10, $Rows: 4, $Clip: 15, $During: { $Top: [0.5, 0.5], $Clip: [0, 0.5] }, $Formation: $JssorSlideshowFormations$.$FormationStraight, $ChessMode: { $Column: 12 }, $ScaleClip: 0.5, $Opacity: 2 };
        _CaptionTransitions["WAVE|STAIRS"] = { $Duration: 1500, y: -0.5, $Delay: 60, $Cols: 12, $Formation: $JssorSlideshowFormations$.$FormationStraightStairs, $Easing: { $Top: $JssorEasing$.$EaseInWave, $Opacity: $JssorEasing$.$EaseLinear }, $Opacity: 2, $Round: { $Top: 1.5 } };
        _CaptionTransitions["EXPAND|STAIRS"] = { $Duration: 1000, $Delay: 30, $Cols: 10, $Rows: 4, $Clip: 15, $Formation: $JssorSlideshowFormations$.$FormationStraightStairs, $Assembly: 2050, $Easing: { $Clip: $JssorEasing$.$EaseInQuad, $Opacity: $JssorEasing$.$EaseLinear }, $Opacity: 2 };
        _CaptionTransitions["SLIDE|SWIRL"] = { $Duration: 500, $Delay: 30, $Cols: 8, $Rows: 4, $Clip: 15, $Formation: $JssorSlideshowFormations$.$FormationSwirl, $Easing: { $Clip: $JssorEasing$.$EaseOutQuad, $Opacity: $JssorEasing$.$EaseLinear }, $Opacity: 2 };
        _CaptionTransitions["SLIDE|SQUARE"] = { $Duration: 800, $Delay: 300, $Cols: 8, $Rows: 4, $Clip: 15, $Formation: $JssorSlideshowFormations$.$FormationSquare, $Easing: { $Clip: $JssorEasing$.$EaseOutQuad, $Opacity: $JssorEasing$.$EaseLinear }, $Opacity: 2 };
        _CaptionTransitions["SLIDE|CIRCLE"] = { $Duration: 1500, y: -0.5, $Delay: 60, $Cols: 24, $Formation: $JssorSlideshowFormations$.$FormationCircle, $Easing: { $Top: $JssorEasing$.$EaseInWave, $Opacity: $JssorEasing$.$EaseLinear }, $Opacity: 2, $Round: { $Top: 1.5 } };
        _CaptionTransitions["BOUNCE|STRAIGHT"] = { $Duration: 1000, $Cols: 3, $Rows: 2, $Clip: 15, $Formation: $JssorSlideshowFormations$.$FormationStraight, $Easing: { $Clip: $JssorEasing$.$EaseInBounce, $Opacity: $JssorEasing$.$EaseLinear }, $Opacity: 2 };
        _CaptionTransitions["JUMP|CIRCLE"] = { $Duration: 1500, x: -1, y: -0.5, $Delay: 50, $Cols: 8, $Rows: 4, $Formation: $JssorSlideshowFormations$.$FormationCircle, $Easing: { $Left: $JssorEasing$.$EaseSwing, $Top: $JssorEasing$.$EaseInJump, $Clip: $JssorEasing$.$EaseOutQuad, $Opacity: $JssorEasing$.$EaseLinear }, $Clip: 15, $Opacity: 2, $Round: { $Top: 1.5 } };
        _CaptionTransitions["JUMP|SWIRL"] = { $Duration: 1500, x: -1, y: -0.5, $Delay: 50, $Cols: 8, $Rows: 4, $Formation: $JssorSlideshowFormations$.$FormationSwirl, $Easing: { $Left: $JssorEasing$.$EaseSwing, $Top: $JssorEasing$.$EaseInJump, $Clip: $JssorEasing$.$EaseOutQuad, $Opacity: $JssorEasing$.$EaseLinear }, $Clip: 15, $Opacity: 2, $Round: { $Top: 1.5 } };
        _CaptionTransitions["CLIP|IN"] = { $Duration: 1500, x: 0.3, y: -0.3, $Delay: 20, $Cols: 8, $Rows: 4, $Clip: 15, $Easing: { $Clip: $JssorEasing$.$EaseInOutCubic, $Opacity: $JssorEasing$.$EaseLinear }, $Opacity: 2 };
        _CaptionTransitions["CLIP|LARGE"] = { $Duration: 1800, x: 1, y: 0.2, $Delay: 30, $Cols: 10, $Rows: 5, $Clip: 15, $Easing: { $Clip: $JssorEasing$.$EaseInOutCubic, $Opacity: $JssorEasing$.$EaseLinear }, $Opacity: 2 };
        _CaptionTransitions["SLIDE|ZIGZAG"] = { $Duration: 600, y: 1, $Delay: 50, $Cols: 8, $Rows: 4, $Formation: $JssorSlideshowFormations$.$FormationZigZag, $Easing: { $Top: $JssorEasing$.$EaseInCubic, $Clip: $JssorEasing$.$EaseOutQuad, $Opacity: $JssorEasing$.$EaseLinear }, $Clip: 15, $Assembly: 264, $Opacity: 2 };
        _CaptionTransitions["WAVE|RECT"] = { $Duration: 1500, x: -1, y: 0.5, $Delay: 60, $Cols: 8, $Rows: 4, $Formation: $JssorSlideshowFormations$.$FormationRectangleCross, $Easing: { $Left: $JssorEasing$.$EaseSwing, $Top: $JssorEasing$.$EaseInWave, $Clip: $JssorEasing$.$EaseOutQuad, $Opacity: $JssorEasing$.$EaseLinear }, $Clip: 15, $Assembly: 260, $Opacity: 2, $Round: { $Top: 1.5 } };
        _CaptionTransitions["DANCE|INSIDE"] = { $Duration: 1500, x: 0.3, y: -0.3, $Delay: 80, $Cols: 10, $Rows: 4, $Clip: 15, $During: { $Left: [0.3, 0.7], $Top: [0.3, 0.7] }, $Easing: { $Left: $JssorEasing$.$EaseInJump, $Top: $JssorEasing$.$EaseInJump, $Clip: $JssorEasing$.$EaseOutQuad, $Opacity: $JssorEasing$.$EaseLinear }, $Opacity: 2, $Round: { $Left: 0.8, $Top: 2.5 } };

        const options = {
          $StartIndex: sliderConfig.options.startIndex ?? 0, // pada refresh/init: semula di slide 0, caption reset
          $AutoPlay: sliderConfig.options.autoPlay,
          $AutoPlaySteps: sliderConfig.options.autoPlaySteps,
          $AutoPlayInterval: sliderConfig.options.autoPlayInterval,
          $PauseOnHover: sliderConfig.options.pauseOnHover,
          $ArrowKeyNavigation: sliderConfig.options.arrowKeyNavigation,
          $SlideEasing: $JssorEasing$.$EaseOutQuint,
          $SlideDuration: sliderConfig.options.slideDuration,
          $MinDragOffsetToSlide: sliderConfig.options.minDragOffsetToSlide,
          $SlideSpacing: sliderConfig.options.slideSpacing,
          $DisplayPieces: sliderConfig.options.displayPieces,
          $ParkingPosition: sliderConfig.options.parkingPosition,
          $UISearchMode: sliderConfig.options.uiSearchMode,
          $PlayOrientation: sliderConfig.options.playOrientation,
          $DragOrientation: sliderConfig.options.dragOrientation,
          $Loop: sliderConfig.options.loop ?? 1, // 1=loop: dari slide terakhir, next = slide 0 (slide mula)
          $SlideshowOptions: {
            $Class: $JssorSlideshowRunner$,
            $Transitions: _SlideshowTransitions,
            $TransitionsOrder: 0,
            $ShowLink: true,
            $SlideTransitionMap: function (index) {
              var arr = slideDataRef.current || [];
              var s = arr[index];
              return (s && (s.transitionType === 'static' || s.transitionType === 'fixed')) ? 'static' : null;
            }
          },
          $CaptionSliderOptions: {
            $Class: $JssorCaptionSlider$,
            $CaptionTransitions: _CaptionTransitions,
            $PlayInMode: 2, // 2 = parallel (semua caption masuk serentak); 1 = chain (satu demi satu)
            // Bila 1 slide sahaja (home): skip transition hide/fadeOut pada captions
            $PlayOutMode: (slideDataRef.current || []).length === 1 ? 0 : 3
          },
        };

        if (onParkAt && typeof onParkAt === 'object') options.$OnParkAt = onParkAt;
        if (onTransitionStart && typeof onTransitionStart === 'function') options.$OnTransitionStart = onTransitionStart;
        if (onTransitionEnd && typeof onTransitionEnd === 'function') options.$OnTransitionEnd = onTransitionEnd;
        if (onTransitionEvent && typeof onTransitionEvent === 'function') options.$OnTransitionEvent = onTransitionEvent;

        if (sliderContainerRef.current && !isInitializingRef.current) {
          isInitializingRef.current = true;

          // Destroy instance lama secara synchronous sebelum create baru
          // (elak dua timer destroy berlaku serentak bila dataHash berubah cepat)
          if (sliderInstanceRef.current) {
            const oldInst = sliderInstanceRef.current;
            sliderInstanceRef.current = null;
            try {
              if (oldInst.$Elmt && typeof oldInst.$Pause === 'function') oldInst.$Pause();
              if (oldInst.$Elmt && typeof oldInst.$Destroy === 'function') oldInst.$Destroy();
            } catch (_) {}
          }

          setTimeout(() => {
            if (sliderContainerRef.current && !sliderInstanceRef.current) {
              try {
                sliderInstanceRef.current = new $JssorSlider$(sliderContainerRef.current, options);
                isInitializingRef.current = false;
              } catch (error) {
                isInitializingRef.current = false;
                setLoading(false);
                return;
              }
            } else {
              isInitializingRef.current = false;
            }

            // Timeout 150ms sahaja: scale selepas slider init
            if (sliderInstanceRef.current &&
                sliderInstanceRef.current.$Elmt &&
                typeof sliderInstanceRef.current.$TriggerEvent === 'function' &&
                typeof sliderInstanceRef.current.$ScaleWidth === 'function') {
              const ScaleSlider = () => {
                if (sliderInstanceRef.current &&
                    sliderInstanceRef.current.$Elmt &&
                    typeof sliderInstanceRef.current.$TriggerEvent === 'function' &&
                    typeof sliderInstanceRef.current.$ScaleWidth === 'function') {
                  const parentNode = sliderInstanceRef.current.$Elmt.parentNode;
                  const parentWidth = parentNode?.clientWidth;
                  const parentHeight = parentNode?.clientHeight;

                  if (parentWidth && parentHeight) {
                    const widthRatio = parentWidth / sliderConfig.container.width;
                    const heightRatio = parentHeight / sliderConfig.container.height;
                    const scale = Math.min(widthRatio, heightRatio);

                    const scaledWidth = Math.max(
                      Math.min(scale * sliderConfig.container.width, sliderConfig.container.maxWidth),
                      sliderConfig.container.minWidth
                    );

                    sliderInstanceRef.current.$ScaleWidth(scaledWidth);
                    const aspectRatio = sliderConfig.container.height / sliderConfig.container.width;
                    const scaledHeight = scaledWidth * aspectRatio;
                    if (sliderInstanceRef.current.$ScaleHeight) {
                      sliderInstanceRef.current.$ScaleHeight(scaledHeight);
                    }
                    if (sliderInstanceRef.current.$GoTo) {
                      sliderInstanceRef.current.$GoTo(0);
                    }
                  } else {
                    window.setTimeout(ScaleSlider, 30);
                  }
                }
              };
              ScaleSlider();
            }
            setLoading(false);
          }, 150);
        }
      } catch (error) {
        // Ignore initialization errors
        setLoading(false);
      }
    };

    const initSliderWithCleanup = async () => {
      await initSlider();

      if (sliderInstanceRef.current) {
        const newHandler = () => {
          if (sliderInstanceRef.current && sliderInstanceRef.current.$Elmt) {
            const parentNode = sliderInstanceRef.current.$Elmt.parentNode;
            const parentWidth = parentNode?.clientWidth;
            const parentHeight = parentNode?.clientHeight;

            if (parentWidth && parentHeight) {
              const widthRatio = parentWidth / sliderConfig.container.width;
              const heightRatio = parentHeight / sliderConfig.container.height;
              const scale = Math.min(widthRatio, heightRatio);
              const scaledWidth = Math.max(
                Math.min(scale * sliderConfig.container.width, sliderConfig.container.maxWidth),
                sliderConfig.container.minWidth
              );
              sliderInstanceRef.current.$ScaleWidth(scaledWidth);
              const aspectRatio = sliderConfig.container.height / sliderConfig.container.width;
              const scaledHeight = scaledWidth * aspectRatio;
              if (sliderInstanceRef.current.$ScaleHeight) {
                sliderInstanceRef.current.$ScaleHeight(scaledHeight);
              }
            }
          }
        };

        // Buang handler lama sebelum daftar yang baru — elak accumulate listener
        if (scaleHandlerRef.current) {
          window.removeEventListener('load', scaleHandlerRef.current);
          window.removeEventListener('resize', scaleHandlerRef.current);
          window.removeEventListener('orientationchange', scaleHandlerRef.current);
        }
        scaleHandlerRef.current = newHandler;

        window.addEventListener('load', scaleHandlerRef.current);
        window.addEventListener('resize', scaleHandlerRef.current);
        window.addEventListener('orientationchange', scaleHandlerRef.current);
      }
    };

    initSliderWithCleanup();

    return () => {
      isInitializingRef.current = false;

      if (scaleAfterInitIntervalRef.current) {
        clearTimeout(scaleAfterInitIntervalRef.current);
        scaleAfterInitIntervalRef.current = null;
      }

      // Buang resize listener guna ref supaya tidak ada orphan handlers
      if (scaleHandlerRef.current) {
        window.removeEventListener('load', scaleHandlerRef.current);
        window.removeEventListener('resize', scaleHandlerRef.current);
        window.removeEventListener('orientationchange', scaleHandlerRef.current);
        scaleHandlerRef.current = null;
      }

      // Destroy synchronously dalam cleanup — elak akses DOM stale selepas unmount
      if (sliderInstanceRef.current) {
        const inst = sliderInstanceRef.current;
        sliderInstanceRef.current = null; // null dulu untuk elak race condition
        try {
          if (inst.$Elmt && typeof inst.$Pause === 'function') inst.$Pause();
          if (inst.$Elmt && typeof inst.$Destroy === 'function') inst.$Destroy();
        } catch (_) {
          // Ignore - DOM mungkin sudah dibuang
        }
      }
    };
  }, [dataHash, dataReady]); // Hanya re-init bila dataHash atau dataReady berubah; callback dibaca dari optsRef

  return { sliderContainerRef, loading, sliderRef: sliderInstanceRef };
};

