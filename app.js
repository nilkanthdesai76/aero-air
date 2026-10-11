// AeroAir — 21-Landmark Spatial Computing Hand Tracking Engine
// 100% Client-Side WebAssembly (Zero Video Cloud Processing)

let videoElement, paintCanvas, handCanvas;
let paintCtx, handCtx;
let hands, camera;

// Drawing & Gesture State
let currentColor = "#00f0ff";
let brushRadius = 6;
let lastDrawPoint = null;
let smoothPointer = { x: 0, y: 0 };
const EMA_ALPHA = 0.35; // Exponential moving average smoothing factor

// Telemetry
let frameCount = 0;
let lastFpsTime = performance.now();
let lastInferenceTime = 0;

// Celebratory Sparkles
const particles = [];

// 21 Landmark Joint Connections
const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [5, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [9, 13], [13, 14], [14, 15], [15, 16],// Ring
  [13, 17], [17, 18], [18, 19], [19, 20],// Pinky
  [0, 17]                               // Palm base
];

function initElements() {
  videoElement = document.getElementById('webcam');
  paintCanvas = document.getElementById('paintCanvas');
  handCanvas = document.getElementById('handCanvas');
  paintCtx = paintCanvas.getContext('2d');
  handCtx = handCanvas.getContext('2d');

  resizeCanvases();
  window.addEventListener('resize', resizeCanvases);
}

function resizeCanvases() {
  const rect = paintCanvas.parentElement.getBoundingClientRect();
  paintCanvas.width = rect.width;
  paintCanvas.height = rect.height;
  handCanvas.width = rect.width;
  handCanvas.height = rect.height;
}

// ==========================================
// MediaPipe Initialization
// ==========================================
function startCamera() {
  document.getElementById('permissionOverlay').style.display = 'none';

  hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.65,
    minTrackingConfidence: 0.65
  });

  hands.onResults(onHandResults);

  camera = new Camera(videoElement, {
    onFrame: async () => {
      const t0 = performance.now();
      await hands.send({ image: videoElement });
      lastInferenceTime = performance.now() - t0;
    },
    width: 640,
    height: 480
  });

  camera.start();
}

// ==========================================
// Hand Landmark Tracking & Gestures
// ==========================================
function onHandResults(results) {
  handCtx.clearRect(0, 0, handCanvas.width, handCanvas.height);

  updateFps();
  document.getElementById('metricLatency').textContent = `${Math.round(lastInferenceTime)} ms`;

  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    document.getElementById('metricGesture').textContent = "SEARCHING";
    document.getElementById('airReticle').style.display = 'none';
    lastDrawPoint = null;
    return;
  }

  // Process Primary Hand
  const landmarks = results.multiHandLandmarks[0];
  drawSkeleton(landmarks);

  // Key Coordinates (Mirrored X for natural alignment)
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];
  const wrist = landmarks[0];

  const w = handCanvas.width;
  const h = handCanvas.height;

  // EMA Smoothed pointer location
  const rawX = indexTip.x * w;
  const rawY = indexTip.y * h;
  smoothPointer.x = EMA_ALPHA * rawX + (1 - EMA_ALPHA) * smoothPointer.x;
  smoothPointer.y = EMA_ALPHA * rawY + (1 - EMA_ALPHA) * smoothPointer.y;

  // Update Air Reticle
  const reticle = document.getElementById('airReticle');
  reticle.style.display = 'block';
  // Mirror positioning for canvas transform: scaleX(-1)
  reticle.style.left = `${w - smoothPointer.x}px`;
  reticle.style.top = `${smoothPointer.y}px`;

  // Measure Pinch (Thumb Tip to Index Tip)
  const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
  const isPinching = pinchDist < 0.065;

  // Detect Extended Fingers
  const indexUp = indexTip.y < landmarks[6].y;
  const middleUp = middleTip.y < landmarks[10].y;
  const ringUp = ringTip.y < landmarks[14].y;
  const pinkyUp = pinkyTip.y < landmarks[18].y;
  const thumbUp = thumbTip.y < wrist.y && thumbTip.y < indexTip.y && !indexUp && !middleUp && !ringUp && !pinkyUp;

  // Gesture Classifier
  if (isPinching) {
    document.getElementById('metricGesture').textContent = "DRAWING ✍️";
    reticle.classList.add('pinching');
    paintPoint(smoothPointer.x, smoothPointer.y);
  } else if (indexUp && middleUp && !ringUp && !pinkyUp) {
    // Peace Sign (V-Sign) -> Clear Canvas
    document.getElementById('metricGesture').textContent = "CLEAR (PEACE) ✌️";
    reticle.classList.remove('pinching');
    lastDrawPoint = null;
    clearCanvasWithFade();
  } else if (thumbUp) {
    // Thumbs Up -> Sparkle Confetti
    document.getElementById('metricGesture').textContent = "EXCELLENT 👍";
    reticle.classList.remove('pinching');
    lastDrawPoint = null;
    spawnSparkles(smoothPointer.x, smoothPointer.y);
  } else {
    document.getElementById('metricGesture').textContent = "HOVER 🖐️";
    reticle.classList.remove('pinching');
    lastDrawPoint = null;
  }

  renderSparkles();
}

function drawSkeleton(landmarks) {
  const w = handCanvas.width;
  const h = handCanvas.height;

  // Draw Bones
  handCtx.lineWidth = 2.5;
  handCtx.strokeStyle = "rgba(0, 240, 255, 0.4)";
  CONNECTIONS.forEach(([i, j]) => {
    const p1 = landmarks[i];
    const p2 = landmarks[j];
    handCtx.beginPath();
    handCtx.moveTo(p1.x * w, p1.y * h);
    handCtx.lineTo(p2.x * w, p2.y * h);
    handCtx.stroke();
  });

  // Draw Joint Nodes
  landmarks.forEach((p, idx) => {
    const isTip = [4, 8, 12, 16, 20].includes(idx);
    handCtx.fillStyle = isTip ? "#ec4899" : "#00f0ff";
    handCtx.beginPath();
    handCtx.arc(p.x * w, p.y * h, isTip ? 5 : 3, 0, Math.PI * 2);
    handCtx.fill();
  });
}

function paintPoint(x, y) {
  paintCtx.lineWidth = brushRadius;
  paintCtx.lineCap = "round";
  paintCtx.lineJoin = "round";
  paintCtx.strokeStyle = currentColor;
  paintCtx.shadowColor = currentColor;
  paintCtx.shadowBlur = 10;

  if (lastDrawPoint) {
    paintCtx.beginPath();
    paintCtx.moveTo(lastDrawPoint.x, lastDrawPoint.y);
    paintCtx.lineTo(x, y);
    paintCtx.stroke();
  } else {
    paintCtx.beginPath();
    paintCtx.arc(x, y, brushRadius / 2, 0, Math.PI * 2);
    paintCtx.fillStyle = currentColor;
    paintCtx.fill();
  }

  lastDrawPoint = { x, y };
}

function clearCanvasWithFade() {
  paintCtx.fillStyle = "rgba(2, 4, 8, 0.15)";
  paintCtx.fillRect(0, 0, paintCanvas.width, paintCanvas.height);
}

function clearCanvas() {
  paintCtx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
  lastDrawPoint = null;
}

function spawnSparkles(x, y) {
  for (let i = 0; i < 6; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      color: ['#00f0ff', '#ec4899', '#eab308', '#a855f7'][Math.floor(Math.random() * 4)],
      life: 1.0
    });
  }
}

function renderSparkles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.04;

    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    handCtx.fillStyle = p.color;
    handCtx.globalAlpha = p.life;
    handCtx.beginPath();
    handCtx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
    handCtx.fill();
    handCtx.globalAlpha = 1.0;
  }
}

function setColor(c, btn) {
  currentColor = c;
  document.querySelectorAll('.color-dot').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function setBrushSize(val) {
  brushRadius = parseInt(val);
  document.getElementById('brushSizeVal').textContent = brushRadius;
}

function exportArtwork() {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = paintCanvas.width;
  exportCanvas.height = paintCanvas.height;
  const expCtx = exportCanvas.getContext('2d');

  // Fill dark background
  expCtx.fillStyle = "#07090e";
  expCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

  // Draw air strokes (un-mirrored for standard viewing)
  expCtx.save();
  expCtx.translate(exportCanvas.width, 0);
  expCtx.scale(-1, 1);
  expCtx.drawImage(paintCanvas, 0, 0);
  expCtx.restore();

  const a = document.createElement('a');
  a.href = exportCanvas.toDataURL('image/png');
  a.download = `AeroAir_Spatial_Art_${Date.now()}.png`;
  a.click();
}

function updateFps() {
  frameCount++;
  const now = performance.now();
  if (now - lastFpsTime >= 1000) {
    document.getElementById('metricFps').textContent = frameCount;
    frameCount = 0;
    lastFpsTime = now;
  }
}

let isSimMode = false;
function startSimulationMode() {
  document.getElementById('permissionOverlay').style.display = 'none';
  isSimMode = true;
  document.getElementById('metricGesture').textContent = "HOVER (SIM) 🖐️";

  let simMouseDown = false;

  window.addEventListener('mousedown', () => {
    simMouseDown = true;
    document.getElementById('metricGesture').textContent = "DRAWING (PINCH) ✍️";
    const ret = document.getElementById('airReticle');
    if (ret) ret.classList.add('pinching');
  });

  window.addEventListener('mouseup', () => {
    simMouseDown = false;
    lastDrawPoint = null;
    document.getElementById('metricGesture').textContent = "HOVER (SIM) 🖐️";
    const ret = document.getElementById('airReticle');
    if (ret) ret.classList.remove('pinching');
  });

  window.addEventListener('mousemove', (e) => {
    if (!isSimMode) return;
    const rect = paintCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x < 0 || x > rect.width || y < 0 || y > rect.height) return;

    // Reticle
    const reticle = document.getElementById('airReticle');
    if (reticle) {
      reticle.style.display = 'block';
      reticle.style.left = `${x}px`;
      reticle.style.top = `${y}px`;
    }

    // Mirrored point for un-mirrored canvas coords
    const ptX = handCanvas.width - x;
    const ptY = y;

    // Draw simulated holographic fingertip node
    handCtx.clearRect(0, 0, handCanvas.width, handCanvas.height);
    handCtx.fillStyle = simMouseDown ? "#ec4899" : "#00f0ff";
    handCtx.shadowColor = handCtx.fillStyle;
    handCtx.shadowBlur = 12;
    handCtx.beginPath();
    handCtx.arc(ptX, ptY, simMouseDown ? 7 : 4, 0, Math.PI * 2);
    handCtx.fill();

    if (simMouseDown) {
      paintPoint(ptX, ptY);
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'c' || e.key === 'C') {
      clearCanvasWithFade();
      document.getElementById('metricGesture').textContent = "CLEAR (V-SIGN) ✌️";
    } else if (e.key === 't' || e.key === 'T') {
      spawnSparkles(handCanvas.width / 2, handCanvas.height / 2);
      document.getElementById('metricGesture').textContent = "SPARKLES 👍";
    }
  });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initElements);
