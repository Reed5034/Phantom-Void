// ============================================================
// BLOCK BREAKER
// ============================================================

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const MAX_LEVELS = 50;
const BALL_SPEED = 4;
const MAX_BALL_SPEED = BALL_SPEED * 6;
const PADDLE_WIDTH = 92;
const MAX_PADDLE_SPEED = 12;
const PADDLE_WIDE_FACTOR = 1.55;
const POWERUP_DURATION = 9000;
const SAVE_KEY = "neonBreakerProgressV1";
const SAVE_INTERVAL = 5000;
const JUICE_MILESTONE = 50;
const juices = {
  classic: { name: "CLASSIC", particles: 6, shake: 0, wave: false, trail: false },
  sparks: { name: "SPARKS", particles: 14, shake: 0, wave: false, trail: false },
  shockwave: { name: "SHOCKWAVE", particles: 18, shake: 2, wave: true, trail: false },
  overdrive: { name: "OVERDRIVE", particles: 26, shake: 5, wave: true, trail: true }
};
const juiceOrder = Object.keys(juices);

const GameState = { score: 0, lives: 3 };

const ui = {
  score: document.getElementById("score"),
  lives: document.getElementById("lives"),
  level: document.getElementById("level"),
  status: document.getElementById("effect-status"),
  screen: document.getElementById("screen"),
  screenKicker: document.getElementById("screen-kicker"),
  screenTitle: document.getElementById("screen-title"),
  screenMessage: document.getElementById("screen-message"),
  juiceStatus: document.getElementById("juice-status"),
  skinPerk: document.getElementById("skin-perk"),
  skinPicker: document.getElementById("skin-picker"),
  adminBar: document.getElementById("admin-bar"),
  unlockAll: document.getElementById("unlock-all"),
  primaryAction: document.getElementById("primary-action"),
  menuAction: document.getElementById("menu-action")
};

const skins = {
  ion: { name: "ION", ball: "#6ef5ed", paddle: "#46d9d0", glow: "#6ef5ed", unlockLevel: 1, wideFactor: 1.12, perk: "PERMANENT +12% PADDLE WIDTH. WIDE DROPS MULTIPLY IT." },
  flare: { name: "FLARE", ball: "#ffbd69", paddle: "#ff795f", glow: "#ff9a63", unlockLevel: 5, speedFactor: 0.92, perk: "PERMANENT 8% SLOWER BALL. SLOW DROPS STACK." },
  pulse: { name: "PULSE", ball: "#c9fa75", paddle: "#8edb68", glow: "#c9fa75", unlockLevel: 10, startingLives: 1, perk: "PERMANENT +1 STARTING LIFE. LIFE DROPS STACK." },
  solar: { name: "SOLAR", ball: "#ffdf75", paddle: "#ffad4c", glow: "#ffdf75", unlockLevel: 17, wideFactor: 1.2, perk: "PERMANENT +20% PADDLE WIDTH. WIDE DROPS MULTIPLY IT." },
  prism: { name: "PRISM", ball: "#b2c9ff", paddle: "#7ea1e8", glow: "#b2c9ff", unlockLevel: 25, speedFactor: 0.84, perk: "PERMANENT 16% SLOWER BALL. SLOW DROPS STACK." },
  nova: { name: "NOVA", ball: "#ff9bb4", paddle: "#f26d8d", glow: "#ff9bb4", unlockLevel: 33, startingLives: 2, perk: "PERMANENT +2 STARTING LIVES. LIFE DROPS STACK." },
  zenith: { name: "ZENITH", ball: "#f1f4ff", paddle: "#bbc8d2", glow: "#f1f4ff", unlockLevel: 50, wideFactor: 1.35, scoreFactor: 1.15, perk: "PERMANENT +35% WIDTH AND +15% SCORE. WIDE DROPS STACK." },
  admin: { name: "ADMIN", ball: "#991010", paddle: "#991010", glow: "#3b3939", unlockLevel: 1, requiresAdmin: true, maxWidth: true, speedFactor: MAX_BALL_SPEED / BALL_SPEED, paddleSpeed: MAX_PADDLE_SPEED, startingLives: 100, maxLives: 100, perk: "FULL-WIDTH PADDLE. MAX BALL AND PADDLE SPEED. 100 LIVES." }
};
let selectedSkin = "ion";
let gameState = "menu";
let currentLevel = 1;
let highestLevel = 1;
let adminUnlocked = false;
let savedProgress = null;
let bricks = [];
let powerUps = [];
let totalBricksBroken = 0;
let unlockedJuices = ["classic"];
let selectedJuice = "classic";
let juiceParticles = [];
let juiceWaves = [];
let ballTrail = [];
let screenShake = 0;
let juiceMessage = "";
let juiceMessageUntil = 0;
let wideUntil = 0;
let slowUntil = 0;
let lastSaveAt = 0;

const ball = { x: 0, y: 0, width: 12, height: 12, vx: 0, vy: 0 };
const paddle = {
  x: WIDTH / 2 - PADDLE_WIDTH / 2,
  y: HEIGHT - 30,
  width: PADDLE_WIDTH,
  height: 12,
  speed: 6
};
const keys = {};

function resetBall() {
  ball.x = WIDTH / 2 - ball.width / 2;
  ball.y = HEIGHT / 2 - ball.height / 2;
  const speed = BALL_SPEED * (skins[selectedSkin].speedFactor || 1) * (slowUntil > performance.now() ? 0.72 : 1);
  ball.vx = speed;
  ball.vy = speed;
}

function updateHud() {
  ui.score.textContent = String(GameState.score).padStart(4, "0");
  ui.lives.textContent = String(GameState.lives);
  ui.level.textContent = `${String(currentLevel).padStart(2, "0")} / ${MAX_LEVELS}`;
  updateEffectStatus();
  updateJuiceStatus();
}

function showScreen(type) {
  if (type === "paused" && gameState === "playing") saveProgress();
  gameState = type;
  ui.screen.classList.add("is-visible");
  ui.menuAction.hidden = type !== "paused" && !(type === "menu" && savedProgress);
  ui.adminBar.hidden = type !== "menu";

  const screens = {
    menu: ["ARCADE SYSTEM / 01", "NEON BREAKER", savedProgress ? `Saved run ready: level ${savedProgress.level} of ${MAX_LEVELS}.` : `50 levels. Reach milestones to unlock new colorways.`, savedProgress ? `RESUME LEVEL ${String(savedProgress.level).padStart(2, "0")}` : "START LEVEL 01"],
    paused: ["SIGNAL HELD", "PAUSED", "Your run is on standby.", "RESUME RUN"],
    gameover: ["RUN COMPLETE", "OUT OF LIVES", `Final score: ${GameState.score}. The grid is still waiting.`, "TRY AGAIN"],
    won: ["GRID CLEARED", "SYSTEM DOWN", `You cleared all ${MAX_LEVELS} levels with ${GameState.score} points.`, "PLAY AGAIN"]
  };
  const [kicker, title, message, action] = screens[type];
  ui.screenKicker.textContent = kicker;
  ui.screenTitle.textContent = title;
  ui.screenMessage.textContent = message;
  ui.primaryAction.firstChild.textContent = `${action} `;
  if (type === "menu" && savedProgress) ui.menuAction.textContent = "START A NEW RUN";
  else ui.menuAction.textContent = "RETURN TO TITLE";
  ui.skinPicker.hidden = type === "gameover" || type === "won";
}

function hideScreen() {
  ui.screen.classList.remove("is-visible");
  gameState = "playing";
  lastSaveAt = performance.now();
  saveProgress();
}

function startNewGame() {
  clearSavedRun();
  GameState.score = 0;
  currentLevel = 1;
  GameState.lives = Math.min(3 + (skins[selectedSkin].startingLives || 0), skins[selectedSkin].maxLives || 5);
  beginLevel(currentLevel);
  updateSkinPicker();
  updateHud();
  hideScreen();
}

function setSkin(name) {
  if (!isSkinUnlocked(name)) return;
  const oldSpeedFactor = skins[selectedSkin].speedFactor || 1;
  const oldWidth = paddle.width;
  selectedSkin = name;
  GameState.lives = skins[selectedSkin].maxLives
    ? skins[selectedSkin].maxLives
    : Math.min(GameState.lives, 9);
  const speedRatio = (skins[selectedSkin].speedFactor || 1) / oldSpeedFactor;
  ball.vx *= speedRatio;
  ball.vy *= speedRatio;
  paddle.speed = skins[selectedSkin].paddleSpeed || 6;
  resizePaddle(oldWidth);
  ui.skinPerk.textContent = skins[selectedSkin].perk;
  document.querySelectorAll("[data-skin]").forEach((button) => {
    const isSelected = button.dataset.skin === name;
    button.setAttribute("aria-pressed", String(isSelected));
  });
  updateHud();
  if (savedProgress) {
    savedProgress.skin = selectedSkin;
    savedProgress.lives = GameState.lives;
    savedProgress.ball = { ...ball };
    savedProgress.paddleX = paddle.x;
    savedProgress.wideRemaining = Math.max(0, wideUntil - performance.now());
    savedProgress.slowRemaining = Math.max(0, slowUntil - performance.now());
  }
  saveProfile();
}

function onBrickDestroyed(brick) {
  totalBricksBroken += 1;
  GameState.score += Math.round(100 * (skins[selectedSkin].scoreFactor || 1));
  spawnJuiceEffects(brick);
  saveProfile();
  updateHud();
  if (selectedSkin !== "admin" && Math.random() < (selectedSkin === "zenith" ? 0.26 : 0.22)) {
    const types = ["wide", "slow", "life"];
    powerUps.push({
      x: brick.x + brick.width / 2 - 10,
      y: brick.y + brick.height / 2 - 10,
      width: 20,
      height: 20,
      type: types[Math.floor(Math.random() * types.length)]
    });
  }
}

function spawnJuiceEffects(brick) {
  const style = juices[selectedJuice];
  for (let index = 0; index < style.particles; index++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3.2;
    const lifetime = 18 + Math.random() * 20;
    juiceParticles.push({
      x: brick.x + brick.width / 2,
      y: brick.y + brick.height / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: lifetime,
      maxLife: lifetime,
      radius: 1.5 + Math.random() * 2.5,
      color: brick.color
    });
  }
  if (style.wave) {
    juiceWaves.push({ x: brick.x + brick.width / 2, y: brick.y + brick.height / 2, radius: 3, life: 22, color: brick.color });
  }
  screenShake = Math.max(screenShake, style.shake);
}

function updateJuiceEffects() {
  for (let index = juiceParticles.length - 1; index >= 0; index--) {
    const particle = juiceParticles[index];
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.035;
    particle.life -= 1;
    if (particle.life <= 0) juiceParticles.splice(index, 1);
  }
  for (let index = juiceWaves.length - 1; index >= 0; index--) {
    const wave = juiceWaves[index];
    wave.radius += 2.6;
    wave.life -= 1;
    if (wave.life <= 0) juiceWaves.splice(index, 1);
  }
  screenShake *= 0.82;
  if (screenShake < 0.15) screenShake = 0;
}

function handleJuiceKey() {
  const nextJuice = juiceOrder[unlockedJuices.length];
  if (nextJuice && totalBricksBroken >= unlockedJuices.length * JUICE_MILESTONE) {
    unlockedJuices.push(nextJuice);
    selectedJuice = nextJuice;
    ballTrail = [];
    announceJuice(`${juices[nextJuice].name} UNLOCKED`);
    saveProfile();
  } else if (unlockedJuices.length > 1) {
    const currentIndex = unlockedJuices.indexOf(selectedJuice);
    selectedJuice = unlockedJuices[(currentIndex + 1) % unlockedJuices.length];
    ballTrail = [];
    announceJuice(`${juices[selectedJuice].name} JUICE`);
    saveProfile();
  } else {
    announceJuice(`${Math.max(0, JUICE_MILESTONE - totalBricksBroken)} MORE BLOCKS TO UNLOCK JUICE`);
  }
  updateJuiceStatus();
}

function announceJuice(message) {
  juiceMessage = message;
  juiceMessageUntil = performance.now() + 2200;
}

function updateJuiceStatus() {
  const nextMilestone = unlockedJuices.length * JUICE_MILESTONE;
  const progress = Math.min(totalBricksBroken, nextMilestone);
  ui.juiceStatus.textContent = `${juices[selectedJuice].name} · ${String(progress).padStart(3, "0")}/${String(nextMilestone).padStart(3, "0")} · J`;
}

function applyPowerUp(type) {
  const now = performance.now();
  if (type === "wide") {
    wideUntil = now + POWERUP_DURATION;
    resizePaddle();
  } else if (type === "slow") {
    if (slowUntil <= now) {
      ball.vx *= 0.72;
      ball.vy *= 0.72;
    }
    slowUntil = now + POWERUP_DURATION;
  } else if (type === "life") {
    GameState.lives = Math.min(GameState.lives + 1, skins[selectedSkin].maxLives || 9);
    updateHud();
  }
}

function updatePowerUps() {
  const now = performance.now();
  if (wideUntil && now >= wideUntil) {
    wideUntil = 0;
    resizePaddle();
  }
  if (slowUntil && now >= slowUntil) {
    ball.vx /= 0.72;
    ball.vy /= 0.72;
    slowUntil = 0;
  }

  for (let index = powerUps.length - 1; index >= 0; index--) {
    const powerUp = powerUps[index];
    powerUp.y += 2.2;
    if (boxesTouch(powerUp, paddle)) {
      applyPowerUp(powerUp.type);
      powerUps.splice(index, 1);
    } else if (powerUp.y > HEIGHT) {
      powerUps.splice(index, 1);
    }
  }

  updateEffectStatus(now);
}

function updateEffectStatus(now = performance.now()) {
  if (!ui.status) return;
  const effects = [];
  const skin = skins[selectedSkin];
  if (skin.maxWidth) effects.push("MAX PADDLE WIDTH");
  else if (skin.wideFactor) effects.push(`PASSIVE WIDE +${Math.round((skin.wideFactor - 1) * 100)}%`);
  if (skin.speedFactor >= MAX_BALL_SPEED / BALL_SPEED) effects.push("MAX BALL SPEED");
  else if (skin.speedFactor) effects.push(`PASSIVE SLOW ${Math.round((1 - skin.speedFactor) * 100)}%`);
  if (skin.maxLives) effects.push(`${skin.maxLives} STARTING LIVES`);
  else if (skin.startingLives) effects.push(`PASSIVE +${skin.startingLives} LIFE${skin.startingLives > 1 ? "S" : ""}`);
  if (wideUntil > now) effects.push(`WIDE ${Math.ceil((wideUntil - now) / 1000)}S`);
  if (slowUntil > now) effects.push(`SLOW ${Math.ceil((slowUntil - now) / 1000)}S`);
  ui.status.textContent = effects.length ? effects.join(" · ") : "NO ACTIVE BOOST";
}

function resizePaddle(previousWidth = paddle.width) {
  const center = paddle.x + previousWidth / 2;
  const widthFactor = skins[selectedSkin].wideFactor || 1;
  paddle.width = skins[selectedSkin].maxWidth
    ? WIDTH
    : Math.min(WIDTH, PADDLE_WIDTH * widthFactor * (wideUntil > performance.now() ? PADDLE_WIDE_FACTOR : 1));
  paddle.x = Math.max(0, Math.min(WIDTH - paddle.width, center - paddle.width / 2));
}

function beginLevel(level) {
  currentLevel = level;
  highestLevel = Math.max(highestLevel, level);
  bricks = makeBricks(currentLevel);
  powerUps = [];
  wideUntil = 0;
  slowUntil = 0;
  resizePaddle();
  paddle.x = WIDTH / 2 - paddle.width / 2;
  resetBall();
  updateHud();
  updateSkinPicker();
  saveProfile();
}

function completeLevel() {
  if (currentLevel >= MAX_LEVELS) {
    clearSavedRun();
    showScreen("won");
    return;
  }
  beginLevel(currentLevel + 1);
  saveProgress();
}

function updateSkinPicker() {
  document.querySelectorAll("[data-skin]").forEach((button) => {
    const skin = skins[button.dataset.skin];
    const locked = !isSkinUnlocked(button.dataset.skin);
    button.disabled = locked;
    button.setAttribute("aria-pressed", String(button.dataset.skin === selectedSkin));
    const adminLocked = skin.requiresAdmin && !adminUnlocked;
    button.setAttribute("aria-label", locked ? `${skin.name}, ${adminLocked ? "unlock with admin override" : `unlock at level ${skin.unlockLevel}`}` : `${skin.name} skin. ${skin.perk}`);
    button.title = locked ? (adminLocked ? "Unlock with admin override" : `Unlock at level ${skin.unlockLevel}`) : skin.perk;
    button.querySelector(".skin-unlock-label").textContent = locked ? (adminLocked ? "LOCKED" : `LVL ${String(skin.unlockLevel).padStart(2, "0")}`) : "UNLOCKED";
  });
}

function isSkinUnlocked(name) {
  const skin = skins[name];
  return Boolean(skin && highestLevel >= skin.unlockLevel && (!skin.requiresAdmin || adminUnlocked));
}

function updateAdminControls() {
  ui.unlockAll.disabled = adminUnlocked;
  ui.unlockAll.textContent = adminUnlocked ? "ALL SKINS UNLOCKED" : "UNLOCK ALL SKINS";
}

function unlockAll() {
  const code = window.prompt("Enter unlock code:");
  if (code !== "mem427Hac") {
    if (code !== null) window.alert("Incorrect code.");
    return;
  }

  highestLevel = MAX_LEVELS;
  adminUnlocked = true;
  updateSkinPicker();
  updateAdminControls();
  saveProfile();
}

function saveProfile(run = savedProgress) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 1, highestLevel, adminUnlocked, run, totalBricksBroken, unlockedJuices, selectedJuice }));
  } catch (error) {
    ui.status.textContent = "SAVE UNAVAILABLE";
  }
}

function saveProgress() {
  if (gameState !== "playing") return;
  const now = performance.now();
  savedProgress = {
    level: currentLevel,
    score: GameState.score,
    lives: GameState.lives,
    bricks: bricks.map((brick) => ({ ...brick })),
    powerUps: powerUps.map((powerUp) => ({ ...powerUp })),
    ball: { ...ball },
    paddleX: paddle.x,
    skin: selectedSkin,
    wideRemaining: Math.max(0, wideUntil - now),
    slowRemaining: Math.max(0, slowUntil - now)
  };
  saveProfile(savedProgress);
}

function loadProfile() {
  try {
    const profile = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!profile || profile.version !== 1) return;
    highestLevel = Math.max(1, Math.min(MAX_LEVELS, Number(profile.highestLevel) || 1));
    adminUnlocked = profile.adminUnlocked === true;
    totalBricksBroken = Math.max(0, Math.floor(Number(profile.totalBricksBroken) || 0));
    unlockedJuices = ["classic", ...juiceOrder.filter((name) => name !== "classic" && Array.isArray(profile.unlockedJuices) && profile.unlockedJuices.includes(name))];
    selectedJuice = unlockedJuices.includes(profile.selectedJuice) ? profile.selectedJuice : "classic";
    const run = profile.run;
    if (
      run && Number.isInteger(run.level) && run.level >= 1 && run.level <= MAX_LEVELS &&
      Array.isArray(run.bricks) && run.ball &&
      [run.ball.x, run.ball.y, run.ball.vx, run.ball.vy, run.score, run.lives, run.paddleX].every(Number.isFinite)
    ) {
      savedProgress = run;
    }
  } catch (error) {
    savedProgress = null;
  }
}

function resumeSavedGame() {
  if (!savedProgress) return startNewGame();
  const save = savedProgress;
  currentLevel = save.level;
  GameState.score = Math.max(0, save.score);
  selectedSkin = isSkinUnlocked(save.skin) ? save.skin : "ion";
  GameState.lives = skins[selectedSkin].maxLives || Math.max(1, Math.min(9, save.lives));
  bricks = save.bricks;
  powerUps = Array.isArray(save.powerUps) ? save.powerUps : [];
  Object.assign(ball, save.ball);
  wideUntil = performance.now() + Math.max(0, Number(save.wideRemaining) || 0);
  slowUntil = performance.now() + Math.max(0, Number(save.slowRemaining) || 0);
  paddle.width = skins[selectedSkin].maxWidth
    ? WIDTH
    : Math.min(WIDTH, PADDLE_WIDTH * (skins[selectedSkin].wideFactor || 1) * (wideUntil > performance.now() ? PADDLE_WIDE_FACTOR : 1));
  paddle.speed = skins[selectedSkin].paddleSpeed || 6;
  paddle.x = Math.max(0, Math.min(WIDTH - paddle.width, save.paddleX));
  ui.skinPerk.textContent = skins[selectedSkin].perk;
  updateSkinPicker();
  updateHud();
  hideScreen();
}

function clearSavedRun() {
  savedProgress = null;
  saveProfile(null);
}

document.addEventListener("keydown", function (event) {
  const key = event.key.toLowerCase();
  keys[key] = true;
  if (event.key.startsWith("Arrow")) event.preventDefault();
  if (key === "j" && !event.repeat) handleJuiceKey();
  if (key === "escape" || key === "p") {
    if (gameState === "playing") showScreen("paused");
    else if (gameState === "paused") hideScreen();
  }
  if (key === "enter" && gameState !== "playing") ui.primaryAction.click();
});

document.addEventListener("keyup", function (event) {
  keys[event.key.toLowerCase()] = false;
});

document.querySelectorAll("[data-skin]").forEach((button) => {
  button.addEventListener("click", () => setSkin(button.dataset.skin));
});

for (const [id, direction] of [["move-left", "arrowleft"], ["move-right", "arrowright"]]) {
  const button = document.getElementById(id);
  const release = () => { keys[direction] = false; };
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    keys[direction] = true;
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
}

ui.primaryAction.addEventListener("click", () => {
  if (gameState === "paused") hideScreen();
  else if (gameState === "menu" && savedProgress) resumeSavedGame();
  else startNewGame();
});
ui.unlockAll.addEventListener("click", unlockAll);
ui.menuAction.addEventListener("click", () => {
  if (gameState === "menu") startNewGame();
  else showScreen("menu");
});

function update() {
  if (gameState !== "playing") return;
  updateBrickStrategies();
  movePaddle();
  moveBallAndResolveCollisions();
  updatePowerUps();
  updateJuiceEffects();

  if (ball.y > HEIGHT) {
    GameState.lives -= 1;
    updateHud();
    if (GameState.lives <= 0) {
      clearSavedRun();
      showScreen("gameover");
    } else {
      resetBall();
      saveProgress();
    }
  }
  if (gameState === "playing" && bricks.length === 0) completeLevel();
  if (gameState === "playing" && performance.now() - lastSaveAt >= SAVE_INTERVAL) {
    saveProgress();
    lastSaveAt = performance.now();
  }
}

function movePaddle() {
  if (keys.arrowleft || keys.a) paddle.x -= paddle.speed;
  if (keys.arrowright || keys.d) paddle.x += paddle.speed;
  paddle.x = Math.max(0, Math.min(WIDTH - paddle.width, paddle.x));
}

function moveBallAndResolveCollisions() {
  if (juices[selectedJuice].trail) {
    ballTrail.unshift({ x: ball.x + ball.width / 2, y: ball.y + ball.height / 2 });
    if (ballTrail.length > 10) ballTrail.pop();
  }

  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(ball.vx), Math.abs(ball.vy)) / 6));
  for (let step = 0; step < steps; step++) {
    ball.x += ball.vx / steps;
    ball.y += ball.vy / steps;
    bounceOffWalls();
    bounceOffPaddle();
    bounceOffBricks();
  }
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, "#101e2a");
  gradient.addColorStop(1, "#071116");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = "rgba(102, 224, 217, 0.075)";
  ctx.lineWidth = 1;
  for (let x = 24; x < WIDTH; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }
  for (let y = 18; y < HEIGHT; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
}

function drawPaddle() {
  const skin = skins[selectedSkin];
  const gradient = ctx.createLinearGradient(paddle.x, 0, paddle.x + paddle.width, 0);
  gradient.addColorStop(0, skin.paddle);
  gradient.addColorStop(0.5, skin.ball);
  gradient.addColorStop(1, skin.paddle);
  ctx.shadowColor = skin.glow;
  ctx.shadowBlur = 18;
  ctx.fillStyle = gradient;
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
  ctx.shadowBlur = 0;
}

function drawBall() {
  const skin = skins[selectedSkin];
  if (juices[selectedJuice].trail) {
    for (let index = ballTrail.length - 1; index >= 0; index--) {
      const point = ballTrail[index];
      ctx.globalAlpha = (1 - index / ballTrail.length) * 0.35;
      ctx.fillStyle = skin.ball;
      ctx.beginPath();
      ctx.arc(point.x, point.y, ball.width * (1 - index / ballTrail.length) * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.shadowColor = skin.glow;
  ctx.shadowBlur = 18;
  ctx.fillStyle = skin.ball;
  ctx.beginPath();
  ctx.arc(ball.x + ball.width / 2, ball.y + ball.height / 2, ball.width / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawJuiceEffects() {
  for (const wave of juiceWaves) {
    ctx.globalAlpha = wave.life / 22;
    ctx.strokeStyle = wave.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const particle of juiceParticles) {
    ctx.globalAlpha = particle.life / particle.maxLife;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (juiceMessage && performance.now() < juiceMessageUntil) {
    ctx.fillStyle = "rgba(4, 12, 16, 0.78)";
    ctx.fillRect(WIDTH / 2 - 150, HEIGHT - 66, 300, 30);
    ctx.fillStyle = "#c9fa75";
    ctx.font = "700 11px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(juiceMessage, WIDTH / 2, HEIGHT - 51, 280);
  }
}

function drawPowerUps() {
  const colors = { wide: "#ffbd69", slow: "#6ef5ed", life: "#c9fa75" };
  const labels = { wide: "W", slow: "S", life: "+" };
  for (const powerUp of powerUps) {
    ctx.fillStyle = colors[powerUp.type];
    ctx.shadowColor = colors[powerUp.type];
    ctx.shadowBlur = 12;
    ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#081116";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(labels[powerUp.type], powerUp.x + 10, powerUp.y + 10);
  }
}

function draw() {
  ctx.save();
  if (screenShake) ctx.translate((Math.random() - 0.5) * screenShake * 2, (Math.random() - 0.5) * screenShake * 2);
  drawBackground();
  drawPaddle();
  drawBall();
  drawBricks();
  drawPowerUps();
  drawJuiceEffects();
  ctx.restore();
}

const STEP = 1000 / 60;
let lastTime = 0;
let leftover = 0;

function frame(now) {
  leftover = Math.min(leftover + (now - lastTime), 250);
  lastTime = now;
  while (leftover >= STEP) {
    update();
    leftover -= STEP;
  }
  draw();
  requestAnimationFrame(frame);
}

function start() {
  loadProfile();
  updateHud();
  setSkin(selectedSkin);
  ui.skinPerk.textContent = skins[selectedSkin].perk;
  updateSkinPicker();
  updateAdminControls();
  updateJuiceStatus();
  showScreen("menu");
  lastTime = performance.now();
  requestAnimationFrame(frame);
}

window.addEventListener("beforeunload", saveProgress);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") saveProgress();
});

window.addEventListener("load", start);
