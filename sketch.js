let container, uiWrap, layersPanel, titleLabel, hintLabel;
let bottomControlsRow, muteBtn, autoBtn, saveBtn;

let audioStarted = false;
let isMuted = false;
let autoMode = false;

let blendPos = 0;
let blendStep = 0.04;

let cachedG;
let dirty = true;

let assetsReady = false;
let totalAssets = 0;
let loadedAssets = 0;

// autonomous mode timing
let lastAutoMs = 0;
let lastAutoTessMs = 0;
const autoBlendIntervalMs = 120;
const autoTessIntervalMin = 2200;
const autoTessIntervalMax = 4200;
let nextAutoTessMs = 2600;

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
    tessDivisions: 24,
    squareImg: null,
    tessImg: null,
    weight: 0,
    volume: 0,
    row: null,
    buttonWrap: null,
    fillBar: null,
    labelDiv: null,
    tessLabel: null,
    reverb: null,
    delay: null,
    filter: null
  },
  {
    id: "surface",
    label: "Surface",
    imagePath: "assets/surface.jpg",
    audioPath: "assets/surface.mp3",
    img: null,
    snd: null,
    enabled: true,
    tessDivisions: 18,
    squareImg: null,
    tessImg: null,
    weight: 0,
    volume: 0,
    row: null,
    buttonWrap: null,
    fillBar: null,
    labelDiv: null,
    tessLabel: null,
    reverb: null,
    delay: null,
    filter: null
  },
  {
    id: "reflection",
    label: "Reflection",
    imagePath: "assets/reflection.jpg",
    audioPath: "assets/reflection.mp3",
    img: null,
    snd: null,
    enabled: true,
    tessDivisions: 32,
    squareImg: null,
    tessImg: null,
    weight: 0,
    volume: 0,
    row: null,
    buttonWrap: null,
    fillBar: null,
    labelDiv: null,
    tessLabel: null,
    reverb: null,
    delay: null,
    filter: null
  },
  {
    id: "illumination",
    label: "Illumination",
    imagePath: "assets/illumination.jpg",
    audioPath: "assets/illumination.mp3",
    img: null,
    snd: null,
    enabled: true,
    tessDivisions: 40,
    squareImg: null,
    tessImg: null,
    weight: 0,
    volume: 0,
    row: null,
    buttonWrap: null,
    fillBar: null,
    labelDiv: null,
    tessLabel: null,
    reverb: null,
    delay: null,
    filter: null
  },
  {
    id: "water",
    label: "Water",
    imagePath: "assets/water.jpg",
    audioPath: "assets/water.mp3",
    img: null,
    snd: null,
    enabled: true,
    tessDivisions: 14,
    squareImg: null,
    tessImg: null,
    weight: 0,
    volume: 0,
    row: null,
    buttonWrap: null,
    fillBar: null,
    labelDiv: null,
    tessLabel: null,
    reverb: null,
    delay: null,
    filter: null
  },
  {
    id: "vegetation",
    label: "Vegetation",
    imagePath: "assets/vegetation.jpg",
    audioPath: "assets/vegetation.mp3",
    img: null,
    snd: null,
    enabled: true,
    tessDivisions: 22,
    squareImg: null,
    tessImg: null,
    weight: 0,
    volume: 0,
    row: null,
    buttonWrap: null,
    fillBar: null,
    labelDiv: null,
    tessLabel: null,
    reverb: null,
    delay: null,
    filter: null
  }
];

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
  updateLayerRows();

  beginAssetLoading();
}

function draw() {
  background(255);

  if (!assetsReady) {
    drawLoadingScreen();
    return;
  }

  if (autoMode) {
    updateAutonomousMode();
  }

  if (dirty) {
    renderComposite();
    dirty = false;
  }

  image(cachedG, 0, 0);

  if (!audioStarted) {
    drawAudioHint();
  }
}

function beginAssetLoading() {
  totalAssets = layers.length * 2;
  loadedAssets = 0;
  assetsReady = false;

  for (const layer of layers) {
    loadImage(
      layer.imagePath,
      (img) => {
        layer.img = img;
        handleAssetLoaded();
      },
      () => {
        console.warn(`Failed to load image: ${layer.imagePath}`);
        handleAssetLoaded();
      }
    );

    loadSound(
      layer.audioPath,
      (snd) => {
        layer.snd = snd;
        handleAssetLoaded();
      },
      () => {
        console.warn(`Failed to load audio: ${layer.audioPath}`);
        handleAssetLoaded();
      }
    );
  }
}

function handleAssetLoaded() {
  loadedAssets++;

  if (loadedAssets >= totalAssets && !assetsReady) {
    assetsReady = true;
    buildAllLayerTessellations();
    setupAudioEffects();
    updateWeights();
    updateLayerRows();
    updateMuteButton();
    updateAutoButton();
    markDirty();
  }
}

function drawLoadingScreen() {
  background(255);

  const cx = width * 0.5;
  const cy = height * 0.5 - 6;
  const r = 18;

  push();
  translate(cx, cy);
  noFill();
  stroke(0);
  strokeWeight(1);

  circle(0, 0, r * 2);

  const a0 = frameCount * 0.07;
  const a1 = a0 + PI * 0.55;
  arc(0, 0, r * 2, r * 2, a0, a1);

  pop();

  noStroke();
  fill(0);
  textAlign(CENTER, CENTER);
  textSize(13);
  text("Loading...", width * 0.5, cy + 38);
}

function mousePressed() {
  if (!assetsReady) return;
  startAudioIfNeeded();
}

function touchStarted() {
  if (!assetsReady) return false;
  startAudioIfNeeded();
  return false;
}

function mouseWheel(event) {
  if (!assetsReady) return false;

  const active = getActiveLayers();
  if (active.length <= 1) return false;

  const direction = event.delta > 0 ? 1 : -1;
  blendPos += direction * blendStep;
  blendPos = wrapBlendPos(blendPos, active.length);

  updateWeights();
  updateAudioMix();
  updateLayerRows();
  markDirty();

  return false;
}

function keyPressed() {
  if (!assetsReady) return;

  const active = getActiveLayers();
  const count = active.length;

  if (key === "s" || key === "S") {
    saveCanvas(cachedG, "urban_tessellation", "png");
    return;
  }

  if (key === "m" || key === "M") {
    toggleMute();
    return;
  }

  if (key === "a" || key === "A") {
    toggleAutoMode();
    return;
  }

  if (count <= 1) {
    if (keyCode === RIGHT_ARROW) {
      adjustDominantLayerTessellation(2);
      return;
    }
    if (keyCode === LEFT_ARROW) {
      adjustDominantLayerTessellation(-2);
      return;
    }
    return;
  }

  if (keyCode === RIGHT_ARROW) {
    adjustDominantLayerTessellation(2);
    return;
  }

  if (keyCode === LEFT_ARROW) {
    adjustDominantLayerTessellation(-2);
    return;
  }

  if (keyCode === DOWN_ARROW) {
    blendPos += blendStep;
    blendPos = wrapBlendPos(blendPos, count);
    updateWeights();
    updateAudioMix();
    updateLayerRows();
    markDirty();
    return;
  }

  if (keyCode === UP_ARROW) {
    blendPos -= blendStep;
    blendPos = wrapBlendPos(blendPos, count);
    updateWeights();
    updateAudioMix();
    updateLayerRows();
    markDirty();
    return;
  }
}

function windowResized() {
  applyResponsiveLayout();

  if (assetsReady) {
    buildAllLayerTessellations();
    markDirty();
  }
}

/* ---------------- Autonomous mode ---------------- */

function toggleAutoMode() {
  autoMode = !autoMode;
  updateAutoButton();

  if (autoMode) {
    lastAutoMs = millis();
    lastAutoTessMs = millis();
    nextAutoTessMs = random(autoTessIntervalMin, autoTessIntervalMax);
  }
}

function updateAutoButton() {
  if (!autoBtn) return;
  autoBtn.html(autoMode ? "Auto On" : "Auto");
  autoBtn.style("background", autoMode ? "#000" : "#fff");
  autoBtn.style("color", autoMode ? "#fff" : "#000");
}

function updateAutonomousMode() {
  const active = getActiveLayers();
  if (active.length <= 1) return;

  const now = millis();

  if (now - lastAutoMs >= autoBlendIntervalMs) {
    blendPos += blendStep * 0.22;
    blendPos = wrapBlendPos(blendPos, active.length);

    updateWeights();
    updateAudioMix();
    updateLayerRows();
    markDirty();

    lastAutoMs = now;
  }

  if (now - lastAutoTessMs >= nextAutoTessMs) {
    const activeLayers = getActiveLayers();

    for (const layer of activeLayers) {
      const chance = map(layer.weight, 0, 1, 0.25, 1.0);

      if (random() < chance) {
        const deltas = [-10, -8, -6, 6, 8, 10];
        const delta = random(deltas);

        layer.tessDivisions += delta;
        layer.tessDivisions = Math.floor(layer.tessDivisions / 2) * 2;
        layer.tessDivisions = constrain(layer.tessDivisions, 4, 44);

        rebuildSingleLayer(layer);
        updateLayerAudioEffects(layer);
      }
    }

    updateLayerRows();
    markDirty();

    lastAutoTessMs = now;
    nextAutoTessMs = random(autoTessIntervalMin, autoTessIntervalMax);
  }
}

/* ---------------- Layout ---------------- */

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
  container.style("gap", "18px");
  container.elt.appendChild(document.querySelector("canvas"));
}

function applyResponsiveLayout() {
  const isHorizontal = window.innerWidth >= window.innerHeight;
  const pad = 16;
  const gap = 18;
  let canvasSide;

  if (isHorizontal) {
    const uiW = Math.min(360, Math.floor(window.innerWidth * 0.36));
    canvasSide = Math.min(
      window.innerHeight - pad * 2,
      window.innerWidth - uiW - gap - pad * 2
    );
    container.style("flex-direction", "row");
    uiWrap.style("width", uiW + "px");
  } else {
    const uiH = 340;
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

/* ---------------- UI ---------------- */

function setupUI() {
  uiWrap = createDiv();
  uiWrap.parent(container);
  uiWrap.style("display", "flex");
  uiWrap.style("flex-direction", "column");
  uiWrap.style("gap", "12px");
  uiWrap.style("align-items", "stretch");

  titleLabel = createDiv("Urban Tessellation");
  titleLabel.parent(uiWrap);
  titleLabel.style("font-size", "18px");
  titleLabel.style("font-weight", "bold");
  titleLabel.style("text-align", "left");

  hintLabel = createDiv("Scroll or use up/down to shift the blend. Left/right arrows change tessellation.");
  hintLabel.parent(uiWrap);
  hintLabel.style("font-size", "12px");
  hintLabel.style("line-height", "1.45");
  hintLabel.style("text-align", "left");

  layersPanel = createDiv();
  layersPanel.parent(uiWrap);
  layersPanel.style("display", "flex");
  layersPanel.style("flex-direction", "column");
  layersPanel.style("gap", "8px");

  for (const layer of layers) {
    const row = createDiv();
    row.parent(layersPanel);
    row.style("display", "grid");
    row.style("grid-template-columns", "1fr 46px");
    row.style("gap", "8px");
    row.style("align-items", "center");

    const buttonWrap = createDiv();
    buttonWrap.parent(row);
    buttonWrap.style("position", "relative");
    buttonWrap.style("height", "38px");
    buttonWrap.style("border", "1px solid #000");
    buttonWrap.style("background", "#fff");
    buttonWrap.style("overflow", "hidden");
    buttonWrap.style("cursor", "pointer");

    const fillBar = createDiv();
    fillBar.parent(buttonWrap);
    fillBar.style("position", "absolute");
    fillBar.style("left", "0");
    fillBar.style("top", "0");
    fillBar.style("bottom", "0");
    fillBar.style("width", "0%");
    fillBar.style("background", "#000");

    const labelDiv = createDiv(layer.label);
    labelDiv.parent(buttonWrap);
    labelDiv.style("position", "absolute");
    labelDiv.style("left", "0");
    labelDiv.style("top", "0");
    labelDiv.style("width", "100%");
    labelDiv.style("height", "100%");
    labelDiv.style("display", "flex");
    labelDiv.style("align-items", "center");
    labelDiv.style("justify-content", "center");
    labelDiv.style("font-size", "13px");
    labelDiv.style("text-align", "center");
    labelDiv.style("pointer-events", "none");
    labelDiv.style("color", "#fff");
    labelDiv.style("mix-blend-mode", "difference");

    const tessLabel = createDiv(String(layer.tessDivisions));
    tessLabel.parent(row);
    tessLabel.style("font-size", "12px");
    tessLabel.style("text-align", "right");

    buttonWrap.mousePressed(() => {
      layer.enabled = !layer.enabled;

      if (getActiveLayers().length === 0) {
        layer.enabled = true;
      }

      blendPos = wrapBlendPos(blendPos, Math.max(1, getActiveLayers().length));

      updateWeights();
      updateAudioMix();
      updateLayerRows();
      markDirty();
    });

    layer.row = row;
    layer.buttonWrap = buttonWrap;
    layer.fillBar = fillBar;
    layer.labelDiv = labelDiv;
    layer.tessLabel = tessLabel;
  }

  bottomControlsRow = createDiv();
  bottomControlsRow.parent(uiWrap);
  bottomControlsRow.style("display", "flex");
  bottomControlsRow.style("gap", "8px");
  bottomControlsRow.style("align-items", "center");
  bottomControlsRow.style("justify-content", "flex-start");

  muteBtn = createButton("Mute");
  muteBtn.parent(bottomControlsRow);
  styleSimpleButton(muteBtn);
  muteBtn.mousePressed(() => {
    toggleMute();
  });

  autoBtn = createButton("Auto");
  autoBtn.parent(bottomControlsRow);
  styleSimpleButton(autoBtn);
  autoBtn.mousePressed(() => {
    toggleAutoMode();
  });

  saveBtn = createButton("Save");
  saveBtn.parent(bottomControlsRow);
  styleSimpleButton(saveBtn);
  saveBtn.mousePressed(() => {
    saveCanvas(cachedG, "urban_tessellation", "png");
  });

  updateMuteButton();
  updateAutoButton();
}

function styleSimpleButton(el) {
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

/* ---------------- Layer state ---------------- */

function updateLayerRows() {
  const dominant = getDominantActiveLayer();

  for (const layer of layers) {
    const pct = layer.enabled ? Math.round(layer.weight * 100) : 0;

    layer.fillBar.style("width", `${pct}%`);
    layer.tessLabel.html(String(layer.tessDivisions));

    layer.row.style("opacity", layer.enabled ? "1" : "0.45");
    layer.buttonWrap.style("border", dominant && dominant.id === layer.id ? "2px solid #000" : "1px solid #000");

    if (dominant && dominant.id === layer.id) {
      layer.tessLabel.style("font-weight", "bold");
    } else {
      layer.tessLabel.style("font-weight", "normal");
    }
  }
}

function getActiveLayers() {
  return layers.filter(layer => layer.enabled);
}

function getDominantActiveLayer() {
  const active = getActiveLayers();
  if (active.length === 0) return null;

  let dominant = active[0];
  for (const layer of active) {
    if (layer.weight > dominant.weight) {
      dominant = layer;
    }
  }
  return dominant;
}

function wrapBlendPos(pos, count) {
  if (count <= 0) return 0;
  return ((pos % count) + count) % count;
}

function updateWeights() {
  const active = getActiveLayers();
  const count = active.length;
  if (count === 0) return;

  for (const layer of layers) {
    layer.weight = 0;
    layer.volume = 0;
  }

  blendPos = wrapBlendPos(blendPos, count);

  let total = 0;

  for (let i = 0; i < count; i++) {
    const directDist = Math.abs(blendPos - i);
    const circularDist = Math.min(directDist, count - directDist);
    const w = Math.max(0, 1 - circularDist);

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

function adjustDominantLayerTessellation(delta) {
  const layer = getDominantActiveLayer();
  if (!layer) return;

  layer.tessDivisions = Math.max(0, layer.tessDivisions + delta);
  layer.tessDivisions = Math.floor(layer.tessDivisions / 2) * 2;

  rebuildSingleLayer(layer);
  updateLayerAudioEffects(layer);
  updateLayerRows();
  markDirty();
}

function rebuildSingleLayer(layer) {
  if (!layer.img) return;

  layer.squareImg = cropCenterSquare(layer.img);
  layer.tessImg = buildLayerTessellation(layer.squareImg, layer.tessDivisions);
}

function getBlendGrid() {
  const dominant = getDominantActiveLayer();

  if (!dominant) {
    return { cols: 12, rows: 12 };
  }

  let d = Math.max(2, dominant.tessDivisions || 2);
  d = constrain(d, 6, 36);

  return { cols: d, rows: d };
}

/* ---------------- Rendering ---------------- */

function renderComposite() {
  cachedG.background(255);
  cachedG.noStroke();

  const active = getActiveLayers();
  if (active.length === 0) return;

  const grid = getBlendGrid();
  const cols = grid.cols;
  const rows = grid.rows;

  const cellW = width / cols;
  const cellH = height / rows;

  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const layer = pickLayerForCell(gx, gy, active);
      drawLayerTile(cachedG, layer, gx, gy, cellW, cellH, cols, rows);
    }
  }
}

function pickLayerForCell(gx, gy, activeLayers) {
  const r = hash2D(gx + 101, gy + 313);

  let acc = 0;
  for (const layer of activeLayers) {
    acc += layer.weight;
    if (r <= acc) return layer;
  }

  return activeLayers[activeLayers.length - 1];
}

function drawLayerTile(g, layer, gx, gy, cellW, cellH, blendCols, blendRows) {
  const img = layer.tessImg || layer.img;
  if (!img) return;

  const sx0 = Math.floor((gx / blendCols) * img.width);
  const sy0 = Math.floor((gy / blendRows) * img.height);
  const sx1 = Math.floor(((gx + 1) / blendCols) * img.width);
  const sy1 = Math.floor(((gy + 1) / blendRows) * img.height);

  const sw = Math.max(1, sx1 - sx0);
  const sh = Math.max(1, sy1 - sy0);

  g.copy(
    img,
    sx0,
    sy0,
    sw,
    sh,
    gx * cellW,
    gy * cellH,
    Math.ceil(cellW),
    Math.ceil(cellH)
  );
}

/* ---------------- Tessellation build ---------------- */

function buildAllLayerTessellations() {
  for (const layer of layers) {
    if (!layer.img) continue;
    layer.squareImg = cropCenterSquare(layer.img);
    layer.tessImg = buildLayerTessellation(layer.squareImg, layer.tessDivisions);
  }
}

function buildLayerTessellation(img, divisions) {
  const base = fitSquareImage(img, width);

  if (divisions <= 0) return base;
  if (divisions === 2) return renderMirroredSquare(base);

  const mirrored = renderMirroredSquare(base);
  const v = reorderVerticalStripes(mirrored, divisions);
  return reorderHorizontalStripes(v, divisions);
}

function fitSquareImage(img, side) {
  const g = createGraphics(side, side);
  g.noSmooth();
  g.background(255);
  g.imageMode(CENTER);

  const s = min(side / img.width, side / img.height);
  g.image(img, side / 2, side / 2, img.width * s, img.height * s);

  return g.get();
}

function cropCenterSquare(img) {
  const s = min(img.width, img.height);
  const x = floor((img.width - s) / 2);
  const y = floor((img.height - s) / 2);

  const out = createImage(s, s);
  out.copy(img, x, y, s, s, 0, 0, s, s);
  return out;
}

function renderMirroredSquare(img) {
  const qW = floor(img.width / 2);
  const qH = floor(img.height / 2);

  const fit = fitIntoRect(img, qW, qH);

  const g = createGraphics(img.width, img.height);
  g.noSmooth();
  g.background(255);

  g.image(fit, 0, 0);
  g.image(mirrorH(fit), qW, 0);
  g.image(mirrorV(fit), 0, qH);
  g.image(mirrorV(mirrorH(fit)), qW, qH);

  return g.get();
}

function fitIntoRect(img, w, h) {
  const g = createGraphics(w, h);
  g.noSmooth();
  g.background(255);
  g.imageMode(CENTER);

  const s = min(w / img.width, h / img.height);
  g.image(img, w / 2, h / 2, img.width * s, img.height * s);

  return g.get();
}

function mirrorH(img) {
  const g = createGraphics(img.width, img.height);
  g.noSmooth();
  g.translate(img.width, 0);
  g.scale(-1, 1);
  g.image(img, 0, 0);
  return g.get();
}

function mirrorV(img) {
  const g = createGraphics(img.width, img.height);
  g.noSmooth();
  g.translate(0, img.height);
  g.scale(1, -1);
  g.image(img, 0, 0);
  return g.get();
}

function alternatingEndsOrder(n) {
  const order = [];
  let l = 0;
  let r = n - 1;

  while (l <= r) {
    order.push(l++);
    if (l <= r) order.push(r--);
  }

  return order;
}

function reorderVerticalStripes(src, n) {
  const g = createGraphics(src.width, src.height);
  g.noSmooth();
  g.background(255);

  let dx = 0;
  const order = alternatingEndsOrder(n);

  for (let i = 0; i < n; i++) {
    const id = order[i];
    const x0 = round(id * src.width / n);
    const x1 = round((id + 1) * src.width / n);
    const w = max(1, x1 - x0);
    g.copy(src, x0, 0, w, src.height, dx, 0, w, src.height);
    dx += w;
  }

  return g.get();
}

function reorderHorizontalStripes(src, n) {
  const g = createGraphics(src.width, src.height);
  g.noSmooth();
  g.background(255);

  let dy = 0;
  const order = alternatingEndsOrder(n);

  for (let i = 0; i < n; i++) {
    const id = order[i];
    const y0 = round(id * src.height / n);
    const y1 = round((id + 1) * src.height / n);
    const h = max(1, y1 - y0);
    g.copy(src, 0, y0, src.width, h, 0, dy, src.width, h);
    dy += h;
  }

  return g.get();
}

/* ---------------- Audio ---------------- */

function setupAudioEffects() {
  for (const layer of layers) {
    if (!layer.snd) continue;

    layer.reverb = new p5.Reverb();
    layer.delay = new p5.Delay();
    layer.filter = new p5.LowPass();

    layer.snd.disconnect();
    layer.snd.connect(layer.filter);

    layer.reverb.process(layer.filter, 1.5, 1.5);
    layer.delay.process(layer.filter, 0.12, 0.2, 1200);

    updateLayerAudioEffects(layer);
  }
}

function normalizeTessellation(divisions) {
  return constrain(map(divisions, 0, 40, 0, 1), 0, 1);
}

function updateLayerAudioEffects(layer) {
  if (!layer.filter || !layer.reverb || !layer.delay) return;

  const t = normalizeTessellation(layer.tessDivisions);

  const cutoff = lerp(6000, 1200, t);
  const reverbTime = lerp(0.8, 4.5, t);
  const reverbDecay = lerp(1.0, 3.0, t);
  const delayTime = lerp(0.05, 0.22, t);
  const delayFeedback = lerp(0.05, 0.35, t);

  layer.filter.freq(cutoff);
  layer.filter.res(1.5);

  layer.reverb.set(reverbTime, reverbDecay);
  layer.delay.delayTime(delayTime);
  layer.delay.feedback(delayFeedback);
  layer.delay.filter(cutoff);
}

function startAudioIfNeeded() {
  if (audioStarted) return;

  userStartAudio();

  for (const layer of layers) {
    if (layer.snd && !layer.snd.isPlaying()) {
      layer.snd.setLoop(true);
      layer.snd.setVolume(0, 0);
      layer.snd.play(0, 1, 0, random(0, layer.snd.duration()));
    }
  }

  audioStarted = true;
  updateAudioMix();
  updateMuteButton();
}

function toggleMute() {
  isMuted = !isMuted;
  updateAudioMix();
  updateMuteButton();
}

function updateMuteButton() {
  if (!muteBtn) return;
  muteBtn.html(isMuted ? "Unmute" : "Mute");
  muteBtn.style("background", isMuted ? "#000" : "#fff");
  muteBtn.style("color", isMuted ? "#fff" : "#000");
}

function updateAudioMix() {
  if (!audioStarted) return;

  const globalFactor = isMuted ? 0 : 1;

  for (const layer of layers) {
    if (!layer.snd) continue;
    const target = layer.enabled ? layer.volume * globalFactor : 0;
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

/* ---------------- Utilities ---------------- */

function hash2D(x, y) {
  let n = x * 374761393 + y * 668265263;
  n = (n ^ (n >> 13)) * 1274126177;
  n = n ^ (n >> 16);
  return abs(n % 100000) / 100000;
}

function markDirty() {
  dirty = true;
}
