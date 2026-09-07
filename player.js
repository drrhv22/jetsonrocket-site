/**
 * Jetson Rocket Radio — Synchronized 24/7 Live Playout Engine
 * Everyone hears the exact same moment. One station clock.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const audio = document.getElementById('audio-core');
  const powerBtn = document.getElementById('master-power-btn');
  const powerLight = document.getElementById('power-light');
  const powerText = document.getElementById('power-text');
  const onAirLamp = document.getElementById('on-air-lamp');
  const volumeFader = document.getElementById('volume-fader');
  const volumeVal = document.getElementById('volume-val');
  const trackTitle = document.getElementById('track-title');
  const trackMeta = document.getElementById('track-meta');
  const stationClock = document.getElementById('station-clock');
  const signalBadge = document.getElementById('signal-badge');
  const netStatus = document.getElementById('net-status');
  const teleBitrate = document.getElementById('tele-bitrate');
  const scopeCanvas = document.getElementById('scope-canvas');
  const canvasCtx = scopeCanvas.getContext('2d');
  const vuL = document.getElementById('vu-l');
  const vuR = document.getElementById('vu-r');

  // Modal elements
  const modalOpenBtn = document.getElementById('dispatch-modal-btn');
  const modalOpenBtn2 = document.getElementById('open-transmit-btn');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalBackdrop = document.getElementById('dispatch-modal');
  const dispatchForm = document.getElementById('dispatch-form');
  const storyTextarea = document.getElementById('story-text');
  const charMeter = document.getElementById('char-meter-num');
  const dispatchesFeed = document.getElementById('dispatches-feed');

  // Master Synchronized Live Stream Endpoint (routed via Cloudflare Tunnel)
  const LIVE_STREAM_URL = 'https://stream.jetsonrocket.online/live.mp3';
  const API_NOW_URL = 'https://stream.jetsonrocket.online/api/now';

  let isPoweredOn = false;
  let animId = null;
  let simulatedPhase = 0;
  let pollInterval = null;

  // Initial Volume
  audio.volume = parseFloat(volumeFader.value);

  // UTC Clock
  function updateClock() {
    const now = new Date();
    const h = String(now.getUTCHours()).padStart(2, '0');
    const m = String(now.getUTCMinutes()).padStart(2, '0');
    const s = String(now.getUTCSeconds()).padStart(2, '0');
    stationClock.textContent = `${h}:${m}:${s} UTC`;

    const hour = now.getUTCHours();
    document.querySelectorAll('.schedule-card').forEach(card => card.classList.remove('current'));
    if (hour >= 21 || hour < 6) {
      document.getElementById('slot-midnight')?.classList.add('current');
    } else if (hour >= 6 && hour < 12) {
      document.getElementById('slot-dawn')?.classList.add('current');
    } else {
      document.getElementById('slot-day')?.classList.add('current');
    }
  }
  setInterval(updateClock, 1000);
  updateClock();

  // Volume Fader
  volumeFader.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    audio.volume = val;
    volumeVal.textContent = `${Math.round(val * 100)}%`;
  });

  // Master Power Toggle
  powerBtn.addEventListener('click', () => {
    if (!isPoweredOn) {
      turnPowerOn();
    } else {
      turnPowerOff();
    }
  });

  function turnPowerOn() {
    isPoweredOn = true;
    powerBtn.classList.add('active');
    powerText.textContent = 'RECEIVER ON';
    onAirLamp.classList.add('live');
    signalBadge.textContent = 'SIGNAL: TUNING...';
    signalBadge.style.color = 'var(--amber-glow)';
    netStatus.textContent = 'CONNECTING';

    tuneInLiveStream();
    startOscilloscope();
    startPollingNowPlaying();
  }

  function turnPowerOff() {
    isPoweredOn = false;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();

    if (pollInterval) clearInterval(pollInterval);

    powerBtn.classList.remove('active');
    powerText.textContent = 'STANDBY';
    onAirLamp.classList.remove('live');
    signalBadge.textContent = 'SIGNAL: STANDBY';
    signalBadge.style.color = 'var(--text-muted)';
    netStatus.textContent = 'ONLINE';
    trackTitle.textContent = 'RECEIVER STANDBY';
    trackMeta.textContent = 'Click RECEIVER POWER to tune in to the live synchronized broadcast.';
    vuL.style.width = '0%';
    vuR.style.width = '0%';
    drawScopeIdle();
  }

  function tuneInLiveStream() {
    // Cache buster parameter ensures every device joins the live edge byte buffer
    const burstStream = `${LIVE_STREAM_URL}?_live=${Date.now()}`;
    trackTitle.textContent = 'CONNECTING TO LIVE STREAM...';
    trackMeta.textContent = 'Tuning into 88.5 FM Ether broadcast...';

    audio.src = burstStream;
    audio.load();

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        signalBadge.textContent = 'SIGNAL: LOCKED 88.5';
        signalBadge.style.color = 'var(--phosphor-green)';
        netStatus.textContent = 'ON AIR';
        fetchNowPlaying();
      }).catch(err => {
        console.warn('Playback deferred:', err);
        signalBadge.textContent = 'CLICK TO UNMUTE';
        signalBadge.style.color = 'var(--red-air)';
        trackMeta.textContent = 'Broadcast stream ready. Click anywhere on page to enable sound.';
      });
    }
  }

  // Audio Status Listeners
  audio.addEventListener('playing', () => {
    signalBadge.textContent = 'SIGNAL: LOCKED 88.5';
    signalBadge.style.color = 'var(--phosphor-green)';
    netStatus.textContent = 'ON AIR';
  });

  audio.addEventListener('waiting', () => {
    signalBadge.textContent = 'BUFFERING LIVE...';
    signalBadge.style.color = 'var(--amber-glow)';
  });

  audio.addEventListener('error', (e) => {
    if (!isPoweredOn) return;
    console.warn('Live stream reconnecting...', e);
    signalBadge.textContent = 'RE-CONNECTING...';
    trackMeta.textContent = 'Re-syncing with station broadcast clock...';
    setTimeout(() => {
      if (isPoweredOn) tuneInLiveStream();
    }, 2500);
  });

  // ── Poll Live "Now Playing" Metadata from Broadcaster Engine ──
  function fetchNowPlaying() {
    fetch(`${API_NOW_URL}?cb=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.now_playing) {
          trackTitle.textContent = data.now_playing.title || 'Jetson Rocket Radio';
          trackMeta.textContent = `${data.now_playing.artist || '24/7 Ether Broadcast'} · Synchronized Live Radio`;
        }
      })
      .catch(() => {
        // Fallback title if API call is in-flight
      });
  }

  function startPollingNowPlaying() {
    fetchNowPlaying();
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(fetchNowPlaying, 6000);
  }

  // ── Oscilloscope Canvas Visualizer (Synthetic Phosphor Waves) ──
  function startOscilloscope() {
    cancelAnimationFrame(animId);
    renderScopeFrame();
  }

  function renderScopeFrame() {
    if (!isPoweredOn) {
      drawScopeIdle();
      return;
    }

    const width = scopeCanvas.width;
    const height = scopeCanvas.height;

    canvasCtx.fillStyle = '#040806';
    canvasCtx.fillRect(0, 0, width, height);

    // CRT grid
    canvasCtx.strokeStyle = 'rgba(0, 255, 157, 0.08)';
    canvasCtx.lineWidth = 1;
    for (let x = 0; x < width; x += 30) {
      canvasCtx.beginPath(); canvasCtx.moveTo(x, 0); canvasCtx.lineTo(x, height); canvasCtx.stroke();
    }
    for (let y = 0; y < height; y += 25) {
      canvasCtx.beginPath(); canvasCtx.moveTo(0, y); canvasCtx.lineTo(width, y); canvasCtx.stroke();
    }

    const isAudioPlaying = !audio.paused && audio.readyState >= 2;
    if (isAudioPlaying) {
      simulatedPhase += 0.08;
    } else {
      simulatedPhase += 0.01;
    }

    const baseAmp = isAudioPlaying ? (Math.sin(simulatedPhase * 1.8) * 0.35 + 0.65) * 55 + 20 : 8;

    // Dynamic VU Meters
    const vuPercent = Math.min(100, Math.max(8, (baseAmp / 85) * 100));
    vuL.style.width = `${vuPercent}%`;
    vuR.style.width = `${Math.min(100, vuPercent * 0.92 + Math.random() * 8)}%`;

    // Phosphor Waveform
    canvasCtx.beginPath();
    canvasCtx.lineWidth = 2.2;
    canvasCtx.strokeStyle = isAudioPlaying ? '#00ff9d' : 'rgba(0, 255, 157, 0.4)';
    canvasCtx.shadowBlur = isAudioPlaying ? 10 : 2;
    canvasCtx.shadowColor = '#00ff9d';

    const sliceWidth = width / 64;
    let x = 0;

    for (let i = 0; i < 64; i++) {
      let v = 0;
      if (isAudioPlaying) {
        v = (Math.sin(i * 0.35 + simulatedPhase) * Math.cos(i * 0.18 - simulatedPhase * 0.6)) * 0.75 + 1.0;
      } else {
        v = 1.0 + Math.sin(i * 0.1 + simulatedPhase) * 0.05;
      }
      const y = (v * (height / 2.6)) + (height * 0.15);
      if (i === 0) canvasCtx.moveTo(x, y);
      else canvasCtx.lineTo(x, y);
      x += sliceWidth;
    }

    canvasCtx.stroke();
    canvasCtx.shadowBlur = 0;

    animId = requestAnimationFrame(renderScopeFrame);
  }

  function drawScopeIdle() {
    const width = scopeCanvas.width;
    const height = scopeCanvas.height;
    canvasCtx.fillStyle = '#040806';
    canvasCtx.fillRect(0, 0, width, height);

    canvasCtx.strokeStyle = 'rgba(0, 255, 157, 0.2)';
    canvasCtx.lineWidth = 1;
    canvasCtx.beginPath();
    canvasCtx.moveTo(0, height / 2);
    canvasCtx.lineTo(width, height / 2);
    canvasCtx.stroke();
  }

  drawScopeIdle();

  // ── Dispatches / Submissions ──
  const STORAGE_KEY = 'jr_listener_dispatches_v1';

  function loadDispatches() {
    const raw = localStorage.getItem(STORAGE_KEY);
    let list = [];
    try {
      list = raw ? JSON.parse(raw) : [];
    } catch (e) {
      list = [];
    }

    if (list.length === 0) {
      list = [
        {
          callsign: "Wanderer 4",
          category: "UFO / High Strangeness",
          text: "Driving across Nevada Route 375 around 03:00. Two silent amber lights hovered above the ridge for seventeen minutes before accelerating upwards into clouds at impossible velocity.",
          date: "Sep 2026"
        },
        {
          callsign: "Coast Listener",
          category: "Paranormal Apparition",
          text: "Heard the vintage AM broadcast coming through an unpowered radio receiver in the workshop attic. The story playing matched an episode aired in November 1952.",
          date: "Aug 2026"
        }
      ];
    }
    renderDispatches(list);
  }

  function renderDispatches(list) {
    dispatchesFeed.innerHTML = '';
    list.forEach(item => {
      const card = document.createElement('div');
      card.className = 'dispatch-card';
      card.innerHTML = `
        <div class="dispatch-meta">
          <span>📡 ${escapeHTML(item.callsign)} [${escapeHTML(item.category)}]</span>
          <span>${escapeHTML(item.date || 'RECENT')}</span>
        </div>
        <p class="dispatch-text">"${escapeHTML(item.text)}"</p>
      `;
      dispatchesFeed.appendChild(card);
    });
  }

  function escapeHTML(str) {
    return String(str).replace(/[&<>'"]/g, tag => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
  }

  loadDispatches();

  storyTextarea?.addEventListener('input', () => {
    charMeter.textContent = storyTextarea.value.length;
  });

  function openModal() { modalBackdrop.classList.remove('hidden'); }
  function closeModal() { modalBackdrop.classList.add('hidden'); }

  modalOpenBtn?.addEventListener('click', openModal);
  modalOpenBtn2?.addEventListener('click', openModal);
  modalCloseBtn?.addEventListener('click', closeModal);
  modalBackdrop?.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) closeModal();
  });

  dispatchForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const callsign = document.getElementById('callsign').value.trim();
    const category = document.getElementById('category').value;
    const text = storyTextarea.value.trim();

    if (!callsign || !text) return;

    const newDispatch = {
      callsign,
      category,
      text,
      date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    };

    let list = [];
    try {
      list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch(err) { list = []; }

    list.unshift(newDispatch);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

    renderDispatches(list);
    dispatchForm.reset();
    charMeter.textContent = '0';
    closeModal();
    alert('Transmission received. Your dispatch has been archived in the station vault.');
  });

});
