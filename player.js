/**
 * Jetson Rocket Radio — Web Playout & Oscilloscope Engine
 * 24/7 Paranormal, Storytelling, and Good Music
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
  const formatBtns = document.querySelectorAll('.format-btn');
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

  // ── 24/7 Ether Broadcast Schedule ──
  // Local bumpers for instant start + verified vintage radio drama episodes
  const BROADCAST_VAULT = [
    {
      title: "Jetson Rocket Radio — Station Identification",
      meta: "Station ID Bumper · 88.5 FM Ether Frequency",
      url: "audio/bumpers/bumper_station_id_01.mp3"
    },
    {
      title: "X Minus One — 'Mars Is Heaven' (Ray Bradbury)",
      meta: "Vintage Sci-Fi Radio · OTR Archive 1955",
      url: "https://archive.org/download/OTRR_X_Minus_One_Singles/XMinusOne55-05-08003MarsIsHeaven.mp3"
    },
    {
      title: "Jetson Rocket Radio — Paranormal Midnight ID",
      meta: "Station ID Bumper · Uncut Storytelling from Beyond",
      url: "audio/bumpers/bumper_station_id_02.mp3"
    },
    {
      title: "Suspense — 'Murder By An Expert'",
      meta: "Dark Radio Drama · OTR Suspense Series 1947",
      url: "https://archive.org/download/SUSPENSE3/47-07-24_Murder_By_An_Expert.mp3"
    },
    {
      title: "Jetson Rocket Radio — Autonomous Playout ID",
      meta: "Station ID Bumper · Zero Algorithms, Pure Ether",
      url: "audio/bumpers/bumper_station_id_03.mp3"
    },
    {
      title: "Lights Out — 'Poltergeist' (Archival Horror)",
      meta: "Late-Night Macabre Mystery · Archival Broadcast 1936",
      url: "https://archive.org/download/LightsOutoldTimeRadio/LightsOut-1936-12-16Poltergeist.mp3"
    },
    {
      title: "Jetson Rocket Radio — Transmission ID",
      meta: "Station ID Bumper · 24/7 Paranormal & Storytelling",
      url: "audio/bumpers/bumper_station_id_04.mp3"
    },
    {
      title: "Suspense — 'Six Feet Under'",
      meta: "Classic Noir Suspense Thriller · CBS 1950",
      url: "https://archive.org/download/SUSPENSE5/500413SixFeetUnder.mp3"
    },
    {
      title: "Jetson Rocket Radio — San Francisco Frequency",
      meta: "Station ID Bumper · Broadcasting Into the Void",
      url: "audio/bumpers/bumper_station_id_05.mp3"
    },
    {
      title: "X Minus One — 'No Contact'",
      meta: "Space Exploration Mystery · NBC Radio 1955",
      url: "https://archive.org/download/OTRR_X_Minus_One_Singles/XMinusOne55-04-24001NoContact.mp3"
    },
    {
      title: "Jetson Rocket Radio — Storytelling ID",
      meta: "Station ID Bumper · Stories from the Threshold",
      url: "audio/bumpers/bumper_station_id_06.mp3"
    }
  ];

  let isPoweredOn = false;
  let animId = null;
  let simulatedPhase = 0;
  let currentTrackIndex = 0;

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

  // Format Switcher
  formatBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      formatBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const format = btn.dataset.format;
      teleBitrate.textContent = format === 'mobile' ? '64 KBPS' : '128 KBPS';
    });
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
    signalBadge.textContent = 'SIGNAL: TUNED';
    signalBadge.style.color = 'var(--phosphor-green)';
    netStatus.textContent = 'BROADCASTING';

    playCurrentTrack();
    startOscilloscope();
  }

  function turnPowerOff() {
    isPoweredOn = false;
    audio.pause();
    audio.removeAttribute('src');

    powerBtn.classList.remove('active');
    powerText.textContent = 'STANDBY';
    onAirLamp.classList.remove('live');
    signalBadge.textContent = 'SIGNAL: STANDBY';
    signalBadge.style.color = 'var(--text-muted)';
    netStatus.textContent = 'ONLINE';
    trackTitle.textContent = 'RECEIVER STANDBY';
    trackMeta.textContent = 'Click RECEIVER POWER to tune in to the 24/7 broadcast.';
    vuL.style.width = '0%';
    vuR.style.width = '0%';
    drawScopeIdle();
  }

  function playCurrentTrack() {
    const track = BROADCAST_VAULT[currentTrackIndex];
    trackTitle.textContent = track.title;
    trackMeta.textContent = track.meta;
    signalBadge.textContent = 'BUFFERING 88.5...';
    signalBadge.style.color = 'var(--amber-glow)';

    // Directly set native HTML5 audio src — standard pipeline, no Web Audio API muting
    audio.src = track.url;
    audio.load();

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        signalBadge.textContent = 'SIGNAL: LOCKED 88.5';
        signalBadge.style.color = 'var(--phosphor-green)';
      }).catch(err => {
        console.warn('Playback error:', err);
        signalBadge.textContent = 'CLICK TO UNMUTE';
        signalBadge.style.color = 'var(--red-air)';
        trackMeta.textContent = 'Audio ready. Click anywhere on this page to start sound output.';
      });
    }
  }

  // Audio Event Listeners
  audio.addEventListener('playing', () => {
    signalBadge.textContent = 'SIGNAL: LOCKED 88.5';
    signalBadge.style.color = 'var(--phosphor-green)';
  });

  audio.addEventListener('waiting', () => {
    signalBadge.textContent = 'BUFFERING...';
    signalBadge.style.color = 'var(--amber-glow)';
  });

  audio.addEventListener('ended', () => {
    if (!isPoweredOn) return;
    // Seamlessly advance to the next track in rotation
    currentTrackIndex = (currentTrackIndex + 1) % BROADCAST_VAULT.length;
    playCurrentTrack();
  });

  audio.addEventListener('error', (e) => {
    if (!isPoweredOn) return;
    console.warn('Audio load issue on track, advancing to next:', e);
    signalBadge.textContent = 'RE-TUNING...';
    trackMeta.textContent = 'Advancing to next broadcast frequency...';
    setTimeout(() => {
      if (isPoweredOn) {
        currentTrackIndex = (currentTrackIndex + 1) % BROADCAST_VAULT.length;
        playCurrentTrack();
      }
    }, 1200);
  });

  // ── Oscilloscope Canvas Visualizer (Synthetic Phosphor Renderer) ──
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

    // Grid lines
    canvasCtx.strokeStyle = 'rgba(0, 255, 157, 0.08)';
    canvasCtx.lineWidth = 1;
    for (let x = 0; x < width; x += 30) {
      canvasCtx.beginPath(); canvasCtx.moveTo(x, 0); canvasCtx.lineTo(x, height); canvasCtx.stroke();
    }
    for (let y = 0; y < height; y += 25) {
      canvasCtx.beginPath(); canvasCtx.moveTo(0, y); canvasCtx.lineTo(width, y); canvasCtx.stroke();
    }

    // Dynamic wave calculations based on audio playing state
    const isAudioPlaying = !audio.paused && audio.currentTime > 0;
    if (isAudioPlaying) {
      simulatedPhase += 0.07;
    } else {
      simulatedPhase += 0.01;
    }

    const baseAmp = isAudioPlaying ? (Math.sin(simulatedPhase * 1.8) * 0.35 + 0.65) * 55 + 20 : 8;

    // Update VU Meters
    const vuPercent = Math.min(100, Math.max(8, (baseAmp / 85) * 100));
    vuL.style.width = `${vuPercent}%`;
    vuR.style.width = `${Math.min(100, vuPercent * 0.9 + Math.random() * 8)}%`;

    // Draw phosphor wave
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

  // ── Dispatches Submission ──
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
