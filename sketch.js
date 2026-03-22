let container, uiWrap, controlsRow, infoLabel, titleLabel, hintLabel;
let saveBtn;
let audioStarted = false;

let blendPos = 0;
let blendStep = 0.12;

let cachedG;
let dirty = true;

const GRID_COLS = 30;
const GRID_ROWS = 30;

// Ordered from structural to organic
const layers = [
  {
    id: "infrastructure",
    label: "Infrastructure",
    imagePath: "assets/infrastructure.jpg",
    audioPath: "assets/infrastructure.mp3",
    img: null,
    snd: null,
    enabled: true,
    tileScale: 1.45,
    weight: 0,
    volume: 0,
    button: null
  },
  {
    id: "surface",
    label: "Surface",
    imagePath: "assets/surface.jpg",
    audioPath: "assets/surface.mp3",
    img: null,
    snd: null,
    enabled: true,
    tileScale: 1.0,
    weight: 0,
    volume: 0,
    button: null
  },
  {
    id: "reflection",
    label: "Reflection",
    imagePath: "assets/reflection.jpg",
    audioPath: "assets/reflection.mp3",
    img: null,
    snd: null,
    enabled: true,
    tileScale: 0.8,
    weight: 0,
    volume: 0,
    button: null
  },
  {
    id: "illumination",
    label: "Illumination",
    imagePath: "assets/illumination.jpg",
    audioPath: "assets/illumination.mp3",
    img: null,
    snd: null,
    enabled: true,
    tileScale: 0.65,
    weight: 0,
    volume: 0,
    button: null
  },
  {
    id: "water",
    label: "Water",
    imagePath: "assets/water.jpg",
    audioPath: "assets/water.mp3",
    img: null,
    snd: null,
    enabled: true,
    tileScale: 0.95,
    weight: 0,
    volume: 0,
    button: null
  },
  {
    id: "vegetation",
    label: "Vegetation",
    imagePath: "assets/vegetation.jpg",
    audioPath: "assets/vegetation.mp3",
    img: null,
    snd: null,
    enabled: true,
    tileScale: 1.2,
    weight: 0,
    volume: 0,
    button: null
  }
];

function preload() {
  for (const layer of layers) {
    layer.img = loadImage(
      layer.imagePath,
      () => {},
      () => {
        console.warn(`Failed to load image: ${layer.imagePath}`);
      }
    );

    layer.snd = loadSound(
      layer.audioPath,
      () => {},
      () => {
        console.warn(`Failed to load audio: ${layer.audioPath}`);
      }
    );
  }
}

function setup() {
  createCanvas(900, 900);
  pixelDensity(1);
  noSmooth();

  setupPage();
  setupContainer();
  setupUI();
  applyResponsiveLayout();

  cachedG = createGraphics(width, height);
  cachedG.noSmooth();

  const cnv = document.querySelector("canvas");
  cnv.style.touchAction = "none";

  updateWeights();
  updateButtonStyles();
  updateInfoLabel();
}

function draw() {
  background(255);

  if (dirty) {
    renderComposite();
    dirty = false;
  }

  image(cachedG, 0, 0);

  if (!audioStarted) {
    drawAudioHint();
  }
}

function mousePressed() {
  startAudioIfNeeded();
}

function touchStarted() {
  startAudioIfNeeded();
  return false;
}

function mouseWheel(event) {
  const active = getActiveLayers();
  if (active.length <= 1) return false;

  blendPos += event.delta > 0 ? blendStep : -blendStep;
  blendPos = constrain(blendPos, 0, Math.max(0, active.length - 1));

  updateWeights();
  updateAudioMix();
  updateInfoLabel();
  markDirty();

  return false;
}

function keyPressed() {
  if (key === "s" || key === "S") {
    saveCanvas(cachedG, "urban_tessellation", "png");
  }

  if (keyCode === RIGHT_ARROW) {
    blendPos = constrain(blendPos + blendStep, 0, Math.max(0, getActiveLayers().length - 1));
    updateWeights();
    updateAudioMix();
    updateInfoLabel();
    markDirty();
  }

  if (keyCode === LEFT_ARROW) {
    blendPos = constrain(blendPos - blendStep, 0, Math.max(0, getActiveLayers().length - 1));
    updateWeights();
    updateAudioMix();
    updateInfoLabel();
    markDirty();
  }
}

function windowResized() {
  applyResponsiveLayout();
  markDirty();
}

function setupPage() {
  document.body.style.margin = "0";
  document.body.style.height = "100vh";
  document.body.style.display = "flex";
  document.body.style.alignItems = "center";
  document.body.style.justifyContent = "center";
}

function setupContainer() {
  container = createDiv();
  container.parent(document.body);
  container.style("display", "flex");
  container.style("align-items", "center");
  container.style("gap", "14px");
  container.elt.appendChild(document.querySelector("canvas"));
}

function applyResponsiveLayout() {
  const isHorizontal = window.innerWidth >= window.innerHeight;
  const pad = 16;
  const gap = 14;
  let canvasSide;

  if (isHorizontal) {
    const uiW = Math.min(300, Math.floor(window.innerWidth * 0.34));
    canvasSide = Math.min(
      window.innerHeight - pad * 2,
      window.innerWidth - uiW - gap - pad * 2
    );
    container.style("flex-direction", "row");
    uiWrap.style("width", uiW + "px");
  } else {
    const uiH = 280;
    canvasSide = Math.min(
      window.innerWidth - pad * 2,
      window.innerHeight - uiH - gap - pad * 2
    );
    container.style("flex-direction", "column");
    uiWrap.style("width", canvasSide + "px");
  }

  canvasSide = Math.max(220, Math.floor(canvasSide));
  if (canvasSide % 2 === 1) canvasSide -= 1;

  resizeCanvas(canvasSide, canvasSide);

  cachedG = createGraphics(width, height);
  cachedG.noSmooth();
}

function setupUI() {
  uiWrap = createDiv();
  uiWrap.parent(container);
  uiWrap.style("display", "flex");
  uiWrap.style("flex-direction", "column");
  uiWrap.style("gap", "10px");
  uiWrap.style("align-items", "center");

  titleLabel = createDiv("Urban Tessellation");
  titleLabel.parent(uiWrap);
  titleLabel.style("font-size", "18px");
  titleLabel.style("font-weight", "bold");
  titleLabel.style("text-align", "center");

  hintLabel = createDiv("Toggle strata. Scroll to shift the blend.");
  hintLabel.parent(uiWrap);
  hintLabel.style("font-size", "13px");
  hintLabel.style("text-align", "center");
  hintLabel.style("line-height", "1.4");

  controlsRow = createDiv();
  controlsRow.parent(uiWrap);
  controlsRow.style("display", "flex");
  controlsRow.style("gap", "8px");
  controlsRow.style("flex-wrap", "wrap");
  controlsRow.style("justify-content", "center");

  for (const layer of layers) {
    const btn = createButton(layer.label);
    btn.parent(controlsRow);
    styleControl(btn);

    btn.mousePressed(() => {
      layer.enabled = !layer.enabled;

      // Prevent zero active layers
      if (getActiveLayers().length === 0) {
        layer.enabled = true;
      }

      blendPos = constrain(blendPos, 0, Math.max(0, getActiveLayers().length - 1));

      updateWeights();
      updateButtonStyles();
      updateAudioMix();
      updateInfoLabel();
      markDirty();
    });

    layer.button = btn;
  }

  saveBtn = createButton("Save");
  saveBtn.parent(uiWrap);
  styleControl(saveBtn);
  saveBtn.mousePressed(() => {
    saveCanvas(cachedG, "urban_tessellation", "png");
  });

  infoLabel = createDiv("");
  infoLabel.parent(uiWrap);
  infoLabel.style("font-size", "13px");
  infoLabel.style("text-align", "center");
  infoLabel.style("line-height", "1.5");
  infoLabel.style("max-width", "100%");
}

function styleControl(el) {
  el.style("border", "1px solid #000");
  el.style("background", "#fff");
  el.style("color", "#000");
  el.style("border-radius", "0");
  el.style("padding", "8px 10px");
  el.style("cursor", "pointer");
  el.elt.style.touchAction = "manipulation";
  el.elt.style.webkitTapHighlightColor = "transparent";
  el.elt.style.userSelect = "none";
}

function updateButtonStyles() {
  for (const layer of layers) {
    layer.button.style("background", layer.enabled ? "#000" : "#fff");
    layer.button.style("color", layer.enabled ? "#fff" : "#000");
  }
}

function getActiveLayers() {
  return layers.filter(layer => layer.enabled);
}

function updateWeights() {
  const active = getActiveLayers();
  if (active.length === 0) return;

  for (const layer of layers) {
    layer.weight = 0;
    layer.volume = 0;
  }

  blendPos = constrain(blendPos, 0, Math.max(0, active.length - 1));

  let total = 0;

  for (let i = 0; i < active.length; i++) {
    const distance = abs(blendPos - i);
    const w = max(0, 1 - distance);
    active[i].weight = w;
    total += w;
  }

  if (total <= 0) {
    active[0].weight = 1;
    total = 1;
  }

  for (const layer of active) {
    layer.weight /= total;
    layer.volume = layer.weight;
  }
}

function updateInfoLabel() {
  const active = getActiveLayers();
  if (active.length === 0) {
    infoLabel.html("No active strata");
    return;
  }

  const lines = active.map(layer => {
    const pct = Math.round(layer.weight * 100);
    return `${layer.label}: ${pct}%`;
  });

  infoLabel.html(lines.join("<br>"));
}

function renderComposite() {
  cachedG.background(255);
  cachedG.noStroke();

  const active = getActiveLayers();
  if (active.length === 0) return;

  const cellW = width / GRID_COLS;
  const cellH = height / GRID_ROWS;

  for (let gy = 0; gy < GRID_ROWS; gy++) {
    for (let gx = 0; gx < GRID_COLS; gx++) {
      const layer = pickLayerForCell(gx, gy, active);
      drawLayerTile(cachedG, layer, gx, gy, cellW, cellH);
    }
  }
}

function pickLayerForCell(gx, gy, activeLayers) {
  const r = hash2D(gx, gy);

  let acc = 0;
  for (const layer of activeLayers) {
    acc += layer.weight;
    if (r <= acc) return layer;
  }

  return activeLayers[activeLayers.length - 1];
}

function drawLayerTile(g, layer, gx, gy, cellW, cellH) {
  const img = layer.img;
  if (!img) return;

  const scaledCols = max(1, floor(GRID_COLS * layer.tileScale));
  const scaledRows = max(1, floor(GRID_ROWS * layer.tileScale));

  const localX = gx % scaledCols;
  const localY = gy % scaledRows;

  const sx0 = floor((localX / scaledCols) * img.width);
  const sy0 = floor((localY / scaledRows) * img.height);
  const sx1 = floor(((localX + 1) / scaledCols) * img.width);
  const sy1 = floor(((localY + 1) / scaledRows) * img.height);

  const sw = max(1, sx1 - sx0);
  const sh = max(1, sy1 - sy0);

  g.copy(
    img,
    sx0,
    sy0,
    sw,
    sh,
    gx * cellW,
    gy * cellH,
    ceil(cellW),
    ceil(cellH)
  );
}

function hash2D(x, y) {
  let n = x * 374761393 + y * 668265263;
  n = (n ^ (n >> 13)) * 1274126177;
  n = n ^ (n >> 16);
  return abs(n % 100000) / 100000;
}

function startAudioIfNeeded() {
  if (audioStarted) return;

  userStartAudio();

  for (const layer of layers) {
    if (layer.snd && !layer.snd.isPlaying()) {
      layer.snd.setLoop(true);
      layer.snd.setVolume(0, 0);
      layer.snd.play();
    }
  }

  audioStarted = true;
  updateAudioMix();
}

function updateAudioMix() {
  if (!audioStarted) return;

  for (const layer of layers) {
    if (!layer.snd) continue;
    const target = layer.enabled ? layer.volume : 0;
    layer.snd.setVolume(target, 0.2);
  }
}

function drawAudioHint() {
  push();
  fill(0, 150);
  noStroke();
  rect(0, height - 36, width, 36);

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(13);
  text("Click to activate sound", width / 2, height - 18);
  pop();
}

function markDirty() {
  dirty = true;
}
