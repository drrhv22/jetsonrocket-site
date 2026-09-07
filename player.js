/**
 * Jetson Rocket Radio — Web Playout & Oscilloscope Engine
 * 24/7 Paranormal, Storytelling, and Good Music
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
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

  // Stream host config
  const configuredHost = document.body.dataset.streamHost;
  // If running locally, point to localhost:8000. In production, use configured stream host or relative.
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const defaultBase = isLocal ? 'http://localhost:8000' : (configuredHost || 'https://stream.jetsonrocket.org');

  const streamEndpoints = {
    mp3: `${defaultBase}/live.mp3`,
    mobile: `${defaultBase}/live.mp3` // Single high-efficiency mountpoint
  };

  let currentFormat = 'mp3';
  let isPoweredOn = false;
  let audioCtx = null;
  let analyser = null;
  let animId = null;
  let simulatedPhase = 0;

  // Initial Volume
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
      currentFormat = btn.dataset.format;
      teleBitrate.textContent = currentFormat === 'mobile' ? '64 KBPS' : '128 KBPS';
      if (isPoweredOn) {
        startStream();
      }
    });
  });

  // Power Switch Event
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
    netStatus.textContent = 'STREAMING';

    initAudioContext();
    startStream();
    startOscilloscope();
    pollMetadata();
  }

  function turnPowerOff() {
    isPoweredOn = false;
    audio.pause();
    audio.src = '';
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

  function startStream() {
    const base = streamEndpoints[currentFormat];
    const burstProofUrl = `${base}?_t=${Date.now()}`;
    trackTitle.textContent = 'ACQUIRING ETHER SIGNAL...';
    trackMeta.textContent = `Connecting to ${defaultBase}...`;

    audio.src = burstProofUrl;
    audio.play().then(() => {
      trackTitle.textContent = 'JETSON ROCKET RADIO 24/7';
      trackMeta.textContent = 'Storytelling from beyond the threshold. Paranormal & good music.';
    }).catch(err => {
      console.warn('Playback deferred or failed:', err);
      trackTitle.textContent = 'SIGNAL CONNECTING...';
      trackMeta.textContent = 'Broadcast is active. If stream does not start, click anywhere to enable audio.';
    });
  }

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
        // Cross-origin audio or browser policy; fallback to synthetic oscilloscope
        analyser = null;
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  // ── Oscilloscope Canvas Visualizer ──
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

    let dataArray;
    let avg = 0;

    if (analyser) {
      dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      avg = sum / dataArray.length;
    } else {
      // Synthetic vintage radio sweep
      simulatedPhase += 0.05;
      avg = (Math.sin(simulatedPhase) * 0.5 + 0.5) * 60 + 20;
    }

    // Update VU Meters
    const vuPercent = Math.min(100, Math.max(8, (avg / 128) * 100));
    vuL.style.width = `${vuPercent}%`;
    vuR.style.width = `${Math.min(100, vuPercent * 0.9 + Math.random() * 8)}%`;

    // Draw phosphor beam
    canvasCtx.beginPath();
    canvasCtx.lineWidth = 2.2;
    canvasCtx.strokeStyle = '#00ff9d';
    canvasCtx.shadowBlur = 10;
    canvasCtx.shadowColor = '#00ff9d';

    const sliceWidth = width / 64;
    let x = 0;

    for (let i = 0; i < 64; i++) {
      let v = 0;
      if (analyser && dataArray) {
        v = (dataArray[i] || 0) / 128.0;
      } else {
        v = (Math.sin(i * 0.3 + simulatedPhase) * Math.cos(i * 0.1 - simulatedPhase * 0.5)) * 0.8 + 1.0;
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

    // Subtle flat green line
    canvasCtx.strokeStyle = 'rgba(0, 255, 157, 0.25)';
    canvasCtx.lineWidth = 1;
    canvasCtx.beginPath();
    canvasCtx.moveTo(0, height / 2);
    canvasCtx.lineTo(width, height / 2);
    canvasCtx.stroke();
  }

  drawScopeIdle();

  // ── Icecast Metadata Polling ──
  function pollMetadata() {
    if (!isPoweredOn) return;
    const statusUrl = `${defaultBase}/status-json.xsl`;

    fetch(statusUrl)
      .then(res => res.json())
      .then(data => {
        if (data && data.icestats && data.icestats.source) {
          const source = Array.isArray(data.icestats.source) ? data.icestats.source[0] : data.icestats.source;
          if (source.title) {
            trackTitle.textContent = source.title;
          }
          if (source.server_name || source.server_description) {
            trackMeta.textContent = `${source.server_name || 'Jetson Rocket Radio'} — ${source.server_description || '24/7 Broadcast'}`;
          }
        }
      })
      .catch(() => {
        // Stream server is either starting or protected by CORS; keep graceful fallback
      });
  }

  setInterval(() => {
    if (isPoweredOn) pollMetadata();
  }, 15000);

  // ── Dispatches / Story Submissions ──
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
      // Default seed dispatches
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

  // Character meter
  storyTextarea.addEventListener('input', () => {
    charMeter.textContent = storyTextarea.value.length;
  });

  // Modal open/close
  function openModal() { modalBackdrop.classList.remove('hidden'); }
  function closeModal() { modalBackdrop.classList.add('hidden'); }

  modalOpenBtn?.addEventListener('click', openModal);
  modalOpenBtn2?.addEventListener('click', openModal);
  modalCloseBtn?.addEventListener('click', closeModal);
  modalBackdrop?.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) closeModal();
  });

  // Form Submit
  dispatchForm.addEventListener('submit', (e) => {
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
