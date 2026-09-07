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
  // Verified high-speed direct streams from Archive.org + local station bumpers
  const BROADCAST_VAULT = [
    {
      title: "Jetson Rocket Radio — Station Identification",
      meta: "Station Bumper · 88.5 FM Ether Frequency",
      url: "audio/bumpers/bumper_station_id_01.mp3",
      duration: 10
    },
    {
      title: "X Minus One — 'Mars Is Heaven' (Ray Bradbury)",
      meta: "Vintage Sci-Fi Radio · OTR Archive 1955",
      url: "https://archive.org/download/OTRR_X_Minus_One_Singles/XMinusOne55-05-08003MarsIsHeaven.mp3",
      duration: 1770
    },
    {
      title: "Jetson Rocket Radio — Paranormal Midnight ID",
      meta: "Station Bumper · Uncut Storytelling from Beyond",
      url: "audio/bumpers/bumper_station_id_02.mp3",
      duration: 9
    },
    {
      title: "Suspense — 'Murder By An Expert'",
      meta: "Dark Radio Drama · OTR Suspense Series 1947",
      url: "https://archive.org/download/SUSPENSE3/47-07-24_Murder_By_An_Expert.mp3",
      duration: 1740
    },
    {
      title: "Jetson Rocket Radio — Autonomous Playout ID",
      meta: "Station Bumper · Zero Algorithms, Pure Ether",
      url: "audio/bumpers/bumper_station_id_03.mp3",
      duration: 10
    },
    {
      title: "Lights Out — 'Poltergeist' (Archival Horror)",
      meta: "Late-Night Macabre Mystery · Archival Broadcast 1936",
      url: "https://archive.org/download/LightsOutoldTimeRadio/LightsOut-1936-12-16Poltergeist.mp3",
      duration: 1680
    },
    {
      title: "Jetson Rocket Radio — Transmission ID",
      meta: "Station Bumper · 24/7 Paranormal & Storytelling",
      url: "audio/bumpers/bumper_station_id_04.mp3",
      duration: 11
    },
    {
      title: "Suspense — 'Six Feet Under'",
      meta: "Classic Noir Suspense Thriller · CBS 1950",
      url: "https://archive.org/download/SUSPENSE5/500413SixFeetUnder.mp3",
      duration: 1780
    },
    {
      title: "Jetson Rocket Radio — San Francisco Frequency",
      meta: "Station Bumper · Broadcasting Into the Void",
      url: "audio/bumpers/bumper_station_id_05.mp3",
      duration: 8
    },
    {
      title: "X Minus One — 'No Contact'",
      meta: "Space Exploration Mystery · NBC Radio 1955",
      url: "https://archive.org/download/OTRR_X_Minus_One_Singles/XMinusOne55-04-24001NoContact.mp3",
      duration: 1750
    },
    {
      title: "Jetson Rocket Radio — Storytelling ID",
      meta: "Station Bumper · Stories from the Threshold",
      url: "audio/bumpers/bumper_station_id_06.mp3",
      duration: 10
    }
  ];

  // Calculate total cycle length in seconds
  const TOTAL_CYCLE_SECONDS = BROADCAST_VAULT.reduce((acc, t) => acc + t.duration, 0);

  let isPoweredOn = false;
  let audioCtx = null;
  let analyser = null;
  let animId = null;
  let simulatedPhase = 0;
  let currentTrackIndex = 0;

  // Set initial volume
  audio.volume = parseFloat(volumeFader.value);

  // UTC Clock
  function updateClock() {
    const now = new Date();
    const h = String(now.getUTCHours()).padStart(2, '0');
    const m = String(now.getUTCMinutes()).padStart(2, '0');
    const s = String(now.getUTCSeconds()).padStart(2, '0');
    stationClock.textContent = `${h}:${m}:${s} UTC`;

    // Highlight active schedule block based on UTC hour
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

  // Calculate synchronized program for current wall clock
  function getSynchronizedProgram() {
    const epochSec = Math.floor(Date.now() / 1000);
    const cycleOffset = epochSec % TOTAL_CYCLE_SECONDS;

    let accumulated = 0;
    for (let i = 0; i < BROADCAST_VAULT.length; i++) {
      const track = BROADCAST_VAULT[i];
      if (cycleOffset >= accumulated && cycleOffset < accumulated + track.duration) {
        return {
          index: i,
          track: track,
          seekSeconds: cycleOffset - accumulated
        };
      }
      accumulated += track.duration;
    }
    return { index: 0, track: BROADCAST_VAULT[0], seekSeconds: 0 };
  }

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

    initAudioContext();
    startTransmission();
    startOscilloscope();
  }

  function turnPowerOff() {
    isPoweredOn = false;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();

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

  function startTransmission() {
    const prog = getSynchronizedProgram();
    currentTrackIndex = prog.index;
    playTrack(prog.track, prog.seekSeconds);
  }

  function playTrack(track, seekSeconds = 0) {
    trackTitle.textContent = track.title;
    trackMeta.textContent = track.meta;

    audio.src = track.url;
    
    // Seek to synchronized point once metadata arrives
    const onMeta = () => {
      if (seekSeconds > 0 && seekSeconds < audio.duration) {
        audio.currentTime = seekSeconds;
      }
      audio.removeEventListener('loadedmetadata', onMeta);
    };
    audio.addEventListener('loadedmetadata', onMeta);

    audio.play().then(() => {
      signalBadge.textContent = 'SIGNAL: LOCKED 88.5';
    }).catch(err => {
      console.warn('Playback deferred by browser policy:', err);
      trackMeta.textContent = 'Click anywhere on page to enable audio output.';
    });
  }

  // When track ends, seamlessly roll into next scheduled item
  audio.addEventListener('ended', () => {
    if (!isPoweredOn) return;
    currentTrackIndex = (currentTrackIndex + 1) % BROADCAST_VAULT.length;
    const nextTrack = BROADCAST_VAULT[currentTrackIndex];
    playTrack(nextTrack, 0);
  });

  // Handle stream stall or error by advancing to next item
  audio.addEventListener('error', (e) => {
    if (!isPoweredOn) return;
    console.warn('Track playback issue, advancing to next segment:', e);
    setTimeout(() => {
      if (isPoweredOn) {
        currentTrackIndex = (currentTrackIndex + 1) % BROADCAST_VAULT.length;
        playTrack(BROADCAST_VAULT[currentTrackIndex], 0);
      }
    }, 1500);
  });

  // ── Web Audio API Oscilloscope ──
  function initAudioContext() {
    if (!audioCtx) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        const source = audioCtx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
      } catch (e) {
        // Cross-origin audio or browser policy restriction; use synthetic phosphor sweep
        analyser = null;
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

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

    // Subtle phosphor grid
    canvasCtx.strokeStyle = 'rgba(0, 255, 157, 0.08)';
    canvasCtx.lineWidth = 1;
    for (let x = 0; x < width; x += 30) {
      canvasCtx.beginPath(); canvasCtx.moveTo(x, 0); canvasCtx.lineTo(x, height); canvasCtx.stroke();
    }
    for (let y = 0; y < height; y += 25) {
      canvasCtx.beginPath(); canvasCtx.moveTo(0, y); canvasCtx.lineTo(width, y); canvasCtx.stroke();
    }

    let dataArray;
    let avg = 0;

    if (analyser) {
      try {
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        avg = sum / dataArray.length;
      } catch (e) {
        dataArray = null;
      }
    }

    if (!dataArray || avg === 0) {
      // Dynamic simulated vintage beam while audio plays
      simulatedPhase += 0.04;
      avg = (Math.sin(simulatedPhase * 1.5) * 0.4 + 0.6) * 55 + 15;
    }

    // VU Meters
    const vuPercent = Math.min(100, Math.max(12, (avg / 100) * 100));
    vuL.style.width = `${vuPercent}%`;
    vuR.style.width = `${Math.min(100, vuPercent * 0.92 + Math.random() * 6)}%`;

    // Phosphor oscilloscope wave
    canvasCtx.beginPath();
    canvasCtx.lineWidth = 2.2;
    canvasCtx.strokeStyle = '#00ff9d';
    canvasCtx.shadowBlur = 9;
    canvasCtx.shadowColor = '#00ff9d';

    const sliceWidth = width / 64;
    let x = 0;

    for (let i = 0; i < 64; i++) {
      let v = 0;
      if (analyser && dataArray && dataArray[i]) {
        v = (dataArray[i] / 128.0) * 0.9;
      } else {
        v = (Math.sin(i * 0.35 + simulatedPhase) * Math.cos(i * 0.15 - simulatedPhase * 0.7)) * 0.6 + 0.8;
      }
      const y = (v * (height / 2.5)) + (height * 0.18);
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

    // Flat baseline trace
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
