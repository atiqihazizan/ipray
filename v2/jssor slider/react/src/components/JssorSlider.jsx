import { useEffect, useRef } from 'react';
import '../styles/jssor.css';
import { sliderConfig, slidesData } from '../config/sliderConfig';
import SliderLayout from './SliderLayout';

const JssorSlider = () => {
  const sliderContainerRef = useRef(null);
  const sliderInstanceRef = useRef(null);

  useEffect(() => {
    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        // Semak sama ada script sudah wujud
        const existingScript = document.querySelector(`script[src="${src}"]`);
        if (existingScript) {
          // Jika script sudah dimuatkan, resolve terus
          if (existingScript.getAttribute('data-loaded') === 'true') {
            resolve();
            return;
          }
          // Jika script masih loading, tunggu sehingga selesai
          existingScript.addEventListener('load', resolve);
          existingScript.addEventListener('error', reject);
          return;
        }
        
        // Jika script belum wujud, tambah script baru
        const script = document.createElement('script');
        script.src = src;
        script.setAttribute('data-loaded', 'false');
        script.onload = () => {
          script.setAttribute('data-loaded', 'true');
          resolve();
        };
        script.onerror = reject;
        document.body.appendChild(script);
      });
    };

    const initSlider = async () => {
      try {
        await loadScript('/js/jssor.js');
        await loadScript('/js/jssor.slider.js');

        if (typeof window.$JssorSlider$ === 'undefined') {
          setTimeout(initSlider, 100);
          return;
        }

        const { $JssorSlider$, $JssorEasing$, $JssorSlideshowFormations$, $JssorSlideshowRunner$, $JssorCaptionSlider$ } = window;

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
        // Original transitions from vanilla.html
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

        // Additional transitions from iim.html (Random mode)
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

        // Additional transitions from iim.html (Fixed mode)
        const _SlideshowTransitionsFixed = [
          { name: 'SlideInQuad', $Duration: 400, x: 1, $Easing: $JssorEasing$.$EaseInQuad },
          { name: 'ClipInSingle', $Duration: 1000, $Cols: 8, $Clip: 1 },
          { name: 'SlideUpDownBrother', $Duration: 1200, y: -1, $Easing: { $Top: $JssorEasing$.$EaseInOutQuart, $Opacity: $JssorEasing$.$EaseLinear }, $Opacity: 2, $ZIndex: -10, $Brother: { $Duration: 1200, y: -1, $Easing: { $Top: $JssorEasing$.$EaseInOutQuart, $Opacity: $JssorEasing$.$EaseLinear }, $Opacity: 2, $ZIndex: -10, $Shift: -100 } }
        ];

        // Combine all transitions
        const _SlideshowTransitionsCombined = [
          ..._SlideshowTransitionsOriginal,
          ..._SlideshowTransitionsIIM,
          ..._SlideshowTransitionsFixed
        ];

        // Filter transitions based on _SelectedTransitions
        const _SlideshowTransitionsFiltered = _SlideshowTransitionsCombined.filter(transition => 
          _SelectedTransitions.includes(transition.name)
        );

        // Shuffle transitions for more randomness
        const shuffleArray = (array) => {
          const shuffled = [...array];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          return shuffled;
        };

        // Randomize transitions order for each slide
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
        _CaptionTransitions["CLIP|TB"] = { $Duration: 900, $Clip: 12, $Easing: { $Clip: $JssorEasing$.$EaseInOutCubic }, $Opacity: 2 };
        _CaptionTransitions["CLIP|L"] = { $Duration: 900, $Clip: 1, $Easing: { $Clip: $JssorEasing$.$EaseInOutCubic }, $Opacity: 2 };
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

        const options = {
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
          $SlideshowOptions: {
            $Class: $JssorSlideshowRunner$,
            $Transitions: _SlideshowTransitions,
            $TransitionsOrder: 0, // 0 = Random (from iim.html), 1 = Sequence (original)
            $ShowLink: true
          },
          $CaptionSliderOptions: {
            $Class: $JssorCaptionSlider$,
            $CaptionTransitions: _CaptionTransitions,
            $PlayInMode: 1,
            $PlayOutMode: 3
          },
          $ArrowNavigatorOptions: {
            $Class: window.$JssorArrowNavigator$,
            $ChanceToShow: sliderConfig.navigator.arrow.chanceToShow,
            $AutoCenter: sliderConfig.navigator.arrow.autoCenter,
            $Steps: sliderConfig.navigator.arrow.steps
          },
          $BulletNavigatorOptions: {
            $Class: window.$JssorBulletNavigator$,
            $ChanceToShow: sliderConfig.navigator.bullet.chanceToShow,
            $AutoCenter: sliderConfig.navigator.bullet.autoCenter,
            $Steps: sliderConfig.navigator.bullet.steps,
            $Lanes: sliderConfig.navigator.bullet.lanes,
            $SpacingX: sliderConfig.navigator.bullet.spacingX,
            $SpacingY: sliderConfig.navigator.bullet.spacingY,
            $Orientation: sliderConfig.navigator.bullet.orientation
          }
        };

        if (sliderContainerRef.current) {
          sliderInstanceRef.current = new $JssorSlider$(sliderContainerRef.current, options);

          const ScaleSlider = () => {
            if (sliderInstanceRef.current && sliderInstanceRef.current.$Elmt) {
              const parentWidth = sliderInstanceRef.current.$Elmt.parentNode.clientWidth;
              if (parentWidth) {
                sliderInstanceRef.current.$ScaleWidth(Math.max(Math.min(parentWidth, sliderConfig.container.maxWidth), sliderConfig.container.minWidth));
              } else {
                window.setTimeout(ScaleSlider, 30);
              }
            }
          };

          ScaleSlider();
        }
      } catch (error) {
        console.error('Error initializing Jssor Slider:', error);
      }
    };

    let scaleSliderHandler = null;

    const initSliderWithCleanup = async () => {
      await initSlider();
      
      if (sliderInstanceRef.current) {
        scaleSliderHandler = () => {
          if (sliderInstanceRef.current && sliderInstanceRef.current.$Elmt) {
            const parentWidth = sliderInstanceRef.current.$Elmt.parentNode.clientWidth;
            if (parentWidth) {
              sliderInstanceRef.current.$ScaleWidth(Math.max(Math.min(parentWidth, sliderConfig.container.maxWidth), sliderConfig.container.minWidth));
            }
          }
        };
        
        window.addEventListener("load", scaleSliderHandler);
        window.addEventListener("resize", scaleSliderHandler);
        window.addEventListener("orientationchange", scaleSliderHandler);
      }
    };

    initSliderWithCleanup();

    return () => {
      if (scaleSliderHandler) {
        window.removeEventListener("load", scaleSliderHandler);
        window.removeEventListener("resize", scaleSliderHandler);
        window.removeEventListener("orientationchange", scaleSliderHandler);
      }
      if (sliderInstanceRef.current) {
        try {
          sliderInstanceRef.current.$Destroy();
        } catch (e) {
          console.warn('Error destroying slider:', e);
        }
        sliderInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <SliderLayout 
      config={sliderConfig} 
      slides={slidesData} 
      containerRef={sliderContainerRef}
    />
  );
};

export default JssorSlider;
