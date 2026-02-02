export const sliderConfig = {
  container: {
    id: "slider1_container",
    width: 980,
    height: 551,
    maxWidth: 980,
    minWidth: 320
  },
  options: {
    autoPlay: true,
    autoPlaySteps: 1,
    autoPlayInterval: 2000,
    pauseOnHover: 0,
    arrowKeyNavigation: true,
    slideEasing: "$JssorEasing$.$EaseOutQuint",
    slideDuration: 800,
    minDragOffsetToSlide: 20,
    slideSpacing: 0,
    displayPieces: 1,
    parkingPosition: 0,
    uiSearchMode: 1,
    playOrientation: 1,
    dragOrientation: 3
  },
  navigator: {
    bullet: {
      enabled: true,
      position: "bottom-right",
      chanceToShow: 2,
      autoCenter: 1,
      steps: 1,
      lanes: 1,
      spacingX: 4,
      spacingY: 4,
      orientation: 1
    },
    arrow: {
      enabled: true,
      chanceToShow: 1,
      autoCenter: 2,
      steps: 1,
      position: { top: 123, left: 8, right: 8 }
    }
  },
  loading: {
    enabled: true,
    background: "rgba(0, 0, 0, 0.7)",
    image: "/img/loading.gif"
  },
  shareButtons: {
    enabled: true,
    position: { top: 6, right: 16 },
    buttons: [
      { type: "facebook", url: "http://www.facebook.com/sharer.php?u=http://jssor.com", title: "Share on Facebook" },
      { type: "twitter", url: "http://twitter.com/share?url=http://jssor.com&text=JavaScript%20jQuery%20Image%20Slider/Slideshow/Carousel/Gallery/Banner%20html%20TOUCH%20SWIPE%20Responsive", title: "Share on Twitter" },
      { type: "googleplus", url: "https://plus.google.com/share?url=http://jssor.com", title: "Share on Google Plus" },
      { type: "linkedin", url: "http://www.linkedin.com/shareArticle?mini=true&url=http://jssor.com", title: "Share on LinkedIn" },
      { type: "stumbleupon", url: "http://www.stumbleupon.com/submit?url=http://jssor.com&title=JavaScript%20jQuery%20Image%20Slider/Slideshow/Carousel/Gallery/Banner%20html%20TOUCH%20SWIPE%20Responsive", title: "Share on StumbleUpon" },
      { type: "pinterest", url: "http://pinterest.com/pin/create/button/?url=http://jssor.com&media=http://jssor.com/img/site/jssor.slider.jpg&description=JavaScript%20jQuery%20Image%20Slider/Slideshow/Carousel/Gallery/Banner%20html%20TOUCH%20SWIPE%20Responsive", title: "Share on Pinterst" },
      { type: "email", url: "mailto:?Subject=Jssor%20Slider&Body=Highly%20recommended%20JavaScript%20jQuery%20Image%20Slider/Slideshow/Carousel/Gallery/Banner%20html%20TOUCH%20SWIPE%20Responsive%20http://jssor.com", title: "Share by Email" }
    ]
  },
  qrCode: {
    enabled: true,
    src: "/img/qr/jssor.com.png",
    position: { bottom: 20, right: 20 },
    size: { width: 80, height: 80 },
    opacity: 0.5
  }
};

export const slidesData = [
  {
    id: 1,
    image: {
      src: "/img/home/01.jpg",
      alt: "Slide 1"
    },
    captions: [
      {
        type: "div",
        transition: "CLIP|LR",
        duration: 1500,
        className: "captionOrange",
        style: { left: 20, top: 30, width: 500, height: 30 },
        content: "Touch swipe and responsive javascript image slider"
      },
      // {
      //   type: "div",
      //   transition: "L|IB",
      //   transition2: "L",
      //   delay: -900,
      //   className: "captionBlack",
      //   style: { left: 360, top: 130, width: 60, height: 30 },
      //   content: "comes"
      // },
      // {
      //   type: "div",
      //   transition: "RTT|360",
      //   delay: -200,
      //   className: "captionBlack",
      //   style: { left: 360, top: 180, width: 60, height: 30 },
      //   content: "with"
      // },
      // {
      //   type: "div",
      //   transition: "DDGDANCE|RB",
      //   transition2: "RTT|10",
      //   delay: -1800,
      //   duration: 3800,
      //   className: "captionOrange",
      //   style: { left: 560, top: 110, width: 200, height: 120 },
      //   content: "&nbsp; Banner Slider<br />&nbsp; Image Gallery Slider<br />&nbsp; Image Slider<br />&nbsp; Carousel Slider",
      //   textAlign: "left"
      // },
      // {
      //   type: "div",
      //   transition: "T|IE*IE",
      //   transition2: "B",
      //   delay: -1600,
      //   duration: 3800,
      //   className: "captionOrange",
      //   style: { left: 20, top: 310, width: 330, height: 30 },
      //   content: "slideshow and responsive slider ..."
      // },
      // {
      //   type: "div",
      //   transition: "ZMF|10",
      //   transition2: "B",
      //   delay: -1300,
      //   className: "",
      //   style: { left: 420, top: 280, width: 90, height: 40, fontSize: 36, color: "#fff", lineHeight: 40 },
      //   content: "390+"
      // },
      // {
      //   type: "div",
      //   transition: "CLIP|L",
      //   delay: -300,
      //   className: "",
      //   style: { left: 520, top: 280, width: 160, height: 40, fontSize: 36, color: "#fff", lineHeight: 40 },
      //   content: "caption",
      //   textAlign: "center"
      // },
      {
        type: "link",
        transition: "CLIP|L",
        delay: -300,
        className: "captionOrange",
        style: { left: 720, bottom: 0, width: 220, height: 40, fontSize: 36, color: "#fff", lineHeight: 40 },
        href: "http://www.jssor.com/development/tool-caption-transition-viewer.html",
        content: "transitions"
      }
    ]
  },
  // {
  //   id: 2,
  //   image: {
  //     src: "/img/home/02.jpg",
  //     alt: "Slide 2"
  //   },
  //   captions: [
  //     {
  //       type: "link",
  //       className: "captionOrange",
  //       style: { top: 300, left: 630, width: 250, height: 30 },
  //       href: "http://www.jssor.com/development/tool-slideshow-transition-viewer.html",
  //       content: "360+ Slideshow Transitions"
  //     },
  //     {
  //       type: "div",
  //       transition: "CLIP|LR",
  //       transition2: "B",
  //       duration: 2000,
  //       className: "captionOrange",
  //       style: { left: 20, top: 300, width: 500, height: 30 },
  //       content: "Jssor Slider is one of best performance sliders"
  //     },
  //     {
  //       type: "div",
  //       transition: "FADE",
  //       transition2: "B",
  //       delay: -450,
  //       className: "captionBlack",
  //       style: { left: 700, top: 120, width: 200, height: 90 },
  //       content: "No-JQuery<br />Independent<br />Javascript Code"
  //     },
  //     {
  //       type: "div",
  //       transition: "T|IB",
  //       transition2: "R",
  //       delay: -600,
  //       className: "captionOrange",
  //       style: { top: 90, left: 720, width: 160, height: 90, lineHeight: 90 },
  //       content: "Compress"
  //     },
  //     {
  //       type: "div",
  //       transition: "MCLIP|T",
  //       transition2: "T",
  //       delay: -450,
  //       className: "",
  //       style: { left: 505, top: 40, width: 200, height: 30, fontSize: 18, color: "#fff", lineHeight: 30 },
  //       content: "Size&nbsp; &nbsp; &nbsp;CPU Usage",
  //       textAlign: "center"
  //     },
  //     {
  //       type: "div",
  //       transition: "MCLIP|R",
  //       delay: -300,
  //       className: "",
  //       style: { left: 325, top: 90, width: 350, height: 30, fontSize: 18, color: "#fff", lineHeight: 30 },
  //       content: "Slider with Slideshow&nbsp; &nbsp; &nbsp; 23KB&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; ~4%"
  //     },
  //     {
  //       type: "div",
  //       transition: "MCLIP|R",
  //       delay: -300,
  //       className: "",
  //       style: { left: 325, top: 140, width: 350, height: 30, fontSize: 18, color: "#fff", lineHeight: 30 },
  //       content: "Slider with Caption&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; 18KB&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; ~4%"
  //     },
  //     {
  //       type: "div",
  //       transition: "MCLIP|R",
  //       delay: -300,
  //       className: "",
  //       style: { left: 325, top: 190, width: 350, height: 30, fontSize: 18, color: "#fff", lineHeight: 30 },
  //       content: "Slider&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;17KB&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; ~1%"
  //     }
  //   ]
  // },
  // {
  //   id: 3,
  //   image: {
  //     src: "/img/home/03.jpg",
  //     alt: "Slide 3"
  //   },
  //   captions: [
  //     {
  //       type: "link",
  //       className: "captionOrange",
  //       style: { top: 50, right: 30, width: 200 },
  //       href: "http://www.jssor.com/demos/index.html",
  //       content: "30+ Templates"
  //     },
  //     {
  //       type: "div",
  //       transition: "T",
  //       transition2: "NO",
  //       className: "",
  //       style: { left: 20, top: 30, width: 600, height: 90, color: "#fff", lineHeight: 30 },
  //       content: "Jssor Slider is touch swipe image slideshow with 360+ javascript slideshow effects.<br />When touch Jssor Slider,<br />it will freeze and then move to the direction that finger swipes to.",
  //       textAlign: "center"
  //     },
  //     {
  //       type: "div",
  //       transition: "L",
  //       delay: -750,
  //       className: "captionOrange",
  //       style: { left: 20, top: 300, width: 130, height: 30 },
  //       content: "Jssor slider"
  //     },
  //     {
  //       type: "div",
  //       transition: "CLIP|L",
  //       transition2: "B",
  //       delay: -450,
  //       className: "captionBlack",
  //       style: { left: 160, top: 300, width: 30, height: 30 },
  //       content: "is"
  //     },
  //     {
  //       type: "div",
  //       transition: "DDG|TR",
  //       transition2: "TORTUOUS|VB",
  //       delay: -750,
  //       className: "captionOrange",
  //       style: { left: 200, top: 300, width: 300, height: 30 },
  //       content: "most scalable photo slideshow"
  //     },
  //     {
  //       type: "div",
  //       transition: "RTT|10",
  //       delay: -450,
  //       className: "captionBlack",
  //       style: { left: 430, top: 240, width: 30, height: 30 },
  //       content: "for"
  //     },
  //     {
  //       type: "div",
  //       transition: "TORTUOUS|VB",
  //       delay: -750,
  //       className: "captionOrange",
  //       style: { left: 590, top: 220, width: 80, height: 30 },
  //       content: "photo"
  //     },
  //     {
  //       type: "div",
  //       transition: "T",
  //       delay: -450,
  //       className: "captionOrange",
  //       style: { left: 720, top: 200, width: 80, height: 30 },
  //       content: "image"
  //     },
  //     {
  //       type: "div",
  //       transition: "FLTTR|R",
  //       transition2: "B",
  //       delay: -600,
  //       className: "captionOrange",
  //       style: { left: 560, top: 300, width: 80, height: 30 },
  //       content: "picture"
  //     },
  //     {
  //       type: "div",
  //       transition: "ATTACK|BR",
  //       delay: -600,
  //       className: "captionOrange",
  //       style: { left: 760, top: 310, width: 80, height: 30 },
  //       content: "content"
  //     },
  //     {
  //       type: "div",
  //       transition: "FLTTRWN|LT",
  //       delay: -900,
  //       className: "",
  //       style: { left: 460, top: 160, width: 130, height: 30, fontSize: 28, color: "#fff", lineHeight: 30 },
  //       content: "html code"
  //     },
  //     {
  //       type: "div",
  //       transition: "RTTS|R",
  //       delay: -900,
  //       className: "",
  //       style: { left: 760, top: 120, width: 130, height: 30, fontSize: 28, color: "#fff", lineHeight: 30 },
  //       content: "web page"
  //     },
  //     {
  //       type: "div",
  //       transition: "R|IB",
  //       transition2: "R",
  //       delay: -900,
  //       className: "",
  //       style: { left: 860, top: 250, width: 60, height: 30, fontSize: 28, color: "#fff", lineHeight: 30 },
  //       content: "text"
  //     }
  //   ]
  // },
  // {
  //   id: 4,
  //   image: {
  //     src: "/img/home/04.jpg",
  //     alt: "Slide 4"
  //   },
  //   captions: [
  //     {
  //       type: "div",
  //       transition: "RTTS|T",
  //       delay: -300,
  //       transition2: "B",
  //       className: "captionOrange",
  //       style: { left: 20, top: 330, width: 300, height: 30 },
  //       content: "one of the most reliable sliders"
  //     },
  //     {
  //       type: "div",
  //       transition: "T|IB",
  //       transition2: "T",
  //       delay: -300,
  //       className: "captionOrange",
  //       style: { left: 20, top: 100, width: 130, height: 30 },
  //       content: "All browsers"
  //     },
  //     {
  //       type: "div",
  //       transition: "T|IB",
  //       transition2: "L",
  //       delay: -900,
  //       className: "captionBlack",
  //       style: { left: 60, top: 170, width: 100, height: 30 },
  //       content: "supported"
  //     },
  //     {
  //       type: "div",
  //       transition: "WV|B",
  //       transition2: "T",
  //       delay: -600,
  //       className: "bricon",
  //       style: { top: 50, left: 220, width: 30, height: 30, backgroundPosition: "0px 0px" },
  //       isIcon: true
  //     },
  //     {
  //       type: "div",
  //       transition: "WV|B",
  //       transition2: "T",
  //       delay: -1100,
  //       className: "bricon",
  //       style: { top: 100, left: 220, width: 30, height: 30, backgroundPosition: "-30px 0px" },
  //       isIcon: true
  //     },
  //     {
  //       type: "div",
  //       transition: "WV|B",
  //       transition2: "T",
  //       delay: -1100,
  //       className: "bricon",
  //       style: { top: 150, left: 220, width: 30, height: 30, backgroundPosition: "-60px 0px" },
  //       isIcon: true
  //     },
  //     {
  //       type: "div",
  //       transition: "WV|B",
  //       transition2: "T",
  //       delay: -1100,
  //       className: "bricon",
  //       style: { top: 200, left: 220, width: 30, height: 30, backgroundPosition: "-90px 0px" },
  //       isIcon: true
  //     },
  //     {
  //       type: "div",
  //       transition: "WV|B",
  //       transition2: "T",
  //       delay: -1100,
  //       className: "bricon",
  //       style: { top: 250, left: 220, width: 30, height: 30, backgroundPosition: "-120px 0px" },
  //       isIcon: true
  //     },
  //     {
  //       type: "div",
  //       transition: "LISTH|R",
  //       transition2: "CLIP|TB",
  //       delay: -600,
  //       className: "captionOrange",
  //       style: { top: 40, left: 280, width: 180, height: 250, lineHeight: 50 },
  //       content: "&nbsp; Chrome&nbsp; &nbsp; &nbsp; 3+<br />&nbsp; Firerfox&nbsp; &nbsp; &nbsp; 2+<br />&nbsp; IE&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; 6+<br />&nbsp; Safari&nbsp; &nbsp; &nbsp; &nbsp; 3.1+<br />&nbsp; Opera&nbsp; &nbsp; &nbsp; &nbsp;10+",
  //       textAlign: "left"
  //     },
  //     {
  //       type: "div",
  //       transition: "TR",
  //       transition2: "T",
  //       delay: -900,
  //       className: "captionOrange",
  //       style: { left: 700, top: 40, width: 130, height: 30 },
  //       content: "All devices"
  //     },
  //     {
  //       type: "div",
  //       transition: "R",
  //       transition2: "R",
  //       delay: -900,
  //       className: "captionBlack",
  //       style: { left: 780, top: 55, width: 100, height: 30 },
  //       content: "supported"
  //     },
  //     {
  //       type: "div",
  //       transition: "T|IB",
  //       delay: -900,
  //       className: "",
  //       style: { left: 525, top: 90, width: 220, height: 30, fontSize: 28, color: "#fff", lineHeight: 30 },
  //       content: "Windows Phone"
  //     },
  //     {
  //       type: "div",
  //       transition: "T|IB",
  //       transition2: "ZMF|10",
  //       delay: -900,
  //       className: "",
  //       style: { left: 560, top: 160, width: 120, height: 30, fontSize: 28, color: "#fff", lineHeight: 30 },
  //       content: "Android"
  //     },
  //     {
  //       type: "div",
  //       transition: "T|IB",
  //       transition2: "R",
  //       delay: -900,
  //       className: "",
  //       style: { left: 760, top: 140, width: 60, height: 30, fontSize: 28, color: "#fff", lineHeight: 30 },
  //       content: "iOS"
  //     },
  //     {
  //       type: "image",
  //       transition: "T|IB",
  //       transition2: "B",
  //       delay: -900,
  //       src: "/img/home/moc-iphone.png",
  //       alt: "iPhone",
  //       style: { left: 600, top: 230, width: 120, height: 80 }
  //     },
  //     {
  //       type: "image",
  //       transition: "RTTL|BR",
  //       delay: -450,
  //       src: "/img/home/moc-ipad.png",
  //       alt: "iPad",
  //       style: { left: 750, top: 220, width: 77, height: 100 }
  //     }
  //   ]
  // }
];

