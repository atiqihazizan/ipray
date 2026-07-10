import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { textSize } from '../utils/screenUtils';

// Detect stream type: hls (.m3u8), youtube, facebook (videos), or direct video (.mp4/.webm)
const detectStreamType = (url) => {
  if (!url) return 'unknown';
  const lower = url.toLowerCase();
  if (lower.includes('.m3u8')) return 'hls';
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('facebook.com') && lower.includes('video')) return 'facebook';
  if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.ogg')) return 'video';
  return 'hls';
};

const getYouTubeEmbedUrl = (url) => {
  let videoId = '';
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      videoId = parsed.pathname.slice(1);
    } else {
      videoId = parsed.searchParams.get('v') || '';
      if (!videoId && parsed.pathname.includes('/live/')) {
        videoId = parsed.pathname.split('/live/')[1]?.split('/')[0] || '';
      }
    }
  } catch { /* ignore */ }
  // Mula muted supaya autoplay berjaya, unmute melalui YouTube IFrame API
  return videoId
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`
    : url;
};

const getFacebookEmbedUrl = (url) => {
  return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&autoplay=true&mute=false&width=1920`;
};

// Autoplay muted, kemudian unmute selepas play bermula
const autoPlayThenUnmute = (video) => {
  video.muted = true;
  video.play()
    .then(() => { video.muted = false; })
    .catch(() => {});
};

const HLS_RETRY_DELAY_MS = 3000;
const HLS_RETRY_MAX = 10;

const HlsPlayer = ({ url }) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const retryCountRef = useRef(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;

    retryCountRef.current = 0;
    setError(null);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        liveSyncDurationCount: 2,
        liveMaxLatencyDurationCount: 4,
      });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        retryCountRef.current = 0;
        autoPlayThenUnmute(video);
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            if (retryCountRef.current < HLS_RETRY_MAX) {
              retryCountRef.current += 1;
              setTimeout(() => hls.startLoad(), HLS_RETRY_DELAY_MS);
            } else {
              setError('Ralat memuat siaran (sambungan gagal)');
            }
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            setError('Ralat memuat siaran');
          }
        }
      });
      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      autoPlayThenUnmute(video);
    } else {
      setError('Pelayar tidak menyokong HLS');
    }
  }, [url]);

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <p className="text-red-400 text-xl">{error}</p>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      className="w-full h-full object-contain bg-black"
      muted
      autoPlay
      playsInline
    />
  );
};

// YouTube embed: autoplay muted, kemudian unmute via postMessage API
const YouTubePlayer = ({ url }) => {
  const iframeRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'unMute', args: [] }),
          '*'
        );
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [url]);

  return (
    <iframe
      ref={iframeRef}
      src={url}
      className="w-full h-full border-0"
      allow="autoplay; encrypted-media; fullscreen"
    />
  );
};

const IframePlayer = ({ url }) => (
  <iframe
    src={url}
    className="w-full h-full border-0"
    allow="autoplay; encrypted-media; fullscreen"
  />
);

const VideoPlayer = ({ url }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) autoPlayThenUnmute(video);
  }, [url]);

  return (
    <video
      ref={videoRef}
      src={url}
      className="w-full h-full object-contain bg-black"
      muted
      autoPlay
      playsInline
      loop
    />
  );
};

const LiveStreamOverlay = ({ data }) => {
  if (!data || !data.active || !data.url) return null;

  const streamType = detectStreamType(data.url);
  const ts = textSize;

  let player;
  switch (streamType) {
    case 'hls':
      player = <HlsPlayer url={data.url} />;
      break;
    case 'youtube':
      player = <YouTubePlayer url={getYouTubeEmbedUrl(data.url)} />;
      break;
    case 'facebook':
      player = <IframePlayer url={getFacebookEmbedUrl(data.url)} />;
      break;
    case 'video':
      player = <VideoPlayer url={data.url} />;
      break;
    default:
      player = <HlsPlayer url={data.url} />;
  }

  return (
    <div
      className="fixed inset-0 bg-black flex flex-col"
      style={{ zIndex: 60 }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-center bg-red-700 shrink-0"
        style={{ padding: `${ts(8)}px ${ts(24)}px` }}
      >
        <div className="flex items-center" style={{ gap: ts(10) }}>
          <span
            className="inline-block bg-white rounded-full animate-pulse"
            style={{ width: ts(14), height: ts(14) }}
          />
          <span className="text-white font-bold uppercase" style={{ fontSize: ts(22) }}>
            SIARAN LANGSUNG
          </span>
        </div>
        {data.title && (
          <span
            className="text-white/80 ml-4 truncate"
            style={{ fontSize: ts(18), marginLeft: ts(16) }}
          >
            — {data.title}
          </span>
        )}
      </div>

      {/* Player area */}
      <div className="flex-1 min-h-0">
        {player}
      </div>
    </div>
  );
};

export default LiveStreamOverlay;
