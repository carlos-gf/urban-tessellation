let container, uiWrap, controlsRow, infoLabel, titleLabel, hintLabel;
let saveBtn;
let audioStarted = false;

let blendPos = 0;
let blendStep = 0.04;

let cachedG;
let dirty = true;

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
    tessDivisions: 24,
    squareImg: null,
    tessImg: null,
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
    tessDivisions: 18,
    squareImg: null,
    tessImg: null,
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
    tessDivisions: 32,
    squareImg: null,
    tessImg: null,
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
    tessDivisions: 40,
    squareImg: null,
    tessImg: null,
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
    tessDivisions: 14,
    squareImg: null,
    tessImg: null,
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
    tessDivisions: 22,
    squareImg: null,
    tessImg: null,
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

  buildAllLayerTessellations();

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

  const direction = event.delta > 0 ? 1 : -1;
  blendPos += direction * blendStep;
  blendPos = wrapBlendPos(blendPos, active.length);

  updateWeights();
  updateAudioMix();
  updateInfoLabel();
  markDirty();

  return false;
}

function keyPressed() {
  const active = getActiveLayers();
  const count = active.length;

  if (key === "s" || key === "S") {
    saveCanvas(cachedG, "urban_tessellation", "png");
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
    updateInfoLabel();
    markDirty();
    return;
  }

  if (keyCode === UP_ARROW) {
    blendPos -= blendStep;
    blendPos = wrapBlendPos(blendPos, count);
    updateWeights();
    updateAudioMix();
    updateInfoLabel();
    markDirty();
    return;
  }
}

function windowResized() {
  applyResponsiveLayout();
  buildAllLayerTessellations();
  markDirty();
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

/* ---------------- UI ---------------- */

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

  hintLabel = createDiv("Toggle strata. Scroll or use up/down to shift the blend. Left/right arrows change tessellation.");
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

      if (getActiveLayers().length === 0) {
        layer.enabled = true;
      }

      blendPos = wrapBlendPos(blendPos, Math.max(1, getActiveLayers().length));

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

/* ---------------- Layer state ---------------- */

function updateButtonStyles() {
  for (const layer of layers) {
    layer.button.style("background", layer.enabled ? "#000" : "#fff");
    layer.button.style("color", layer.enabled ? "#fff" : "#000");
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
  updateInfoLabel();
  markDirty();
}

function rebuildSingleLayer(layer) {
  if (!layer.img) return;

  layer.squareImg = cropCenterSquare(layer.img);
  layer.tessImg = buildLayerTessellation(layer.squareImg, layer.tessDivisions);
}

function updateInfoLabel() {
  const active = getActiveLayers();
  if (active.length === 0) {
    infoLabel.html("No active strata");
    return;
  }

  const dominant = getDominantActiveLayer();

  let text = "";
  if (dominant) {
    text += `Editing: ${dominant.label}<br>`;
    text += `Tessellation: ${dominant.tessDivisions}<br><br>`;
  }

  const lines = active.map(layer => {
    const pct = Math.round(layer.weight * 100);
    return `${layer.label}: ${pct}%`;
  });

  infoLabel.html(text + lines.join("<br>"));
}

function getBlendGrid() {
  const dominant = getDominantActiveLayer();

  if (!dominant) {
    return { cols: 12, rows: 12 };
  }

  let d = Math.max(2, dominant.tessDivisions || 2);

  // fewer divisions = bigger collage blocks
  // more divisions = smaller collage blocks
  d = constrain(d, 6, 36);

  return {
    cols: d,
    rows: d
  };
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
  const r = hash2D(gx, gy);

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

  const zoom = Math.max(0.01, layer.tileScale);

  const sampleW = img.width / zoom;
  const sampleH = img.height / zoom;

  const offsetX = (img.width - sampleW) * 0.5;
  const offsetY = (img.height - sampleH) * 0.5;

  const sx0 = Math.floor(offsetX + (gx / blendCols) * sampleW);
  const sy0 = Math.floor(offsetY + (gy / blendRows) * sampleH);
  const sx1 = Math.floor(offsetX + ((gx + 1) / blendCols) * sampleW);
  const sy1 = Math.floor(offsetY + ((gy + 1) / blendRows) * sampleH);

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

  if (divisions <= 0) {
    return base;
  }

  if (divisions === 2) {
    return renderMirroredSquare(base);
  }

  const mirrored = renderMirroredSquare(base);
  const v = reorderVerticalStripes(mirrored, divisions);
  const out = reorderHorizontalStripes(v, divisions);
  return out;
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
