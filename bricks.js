// ============================================================
// bricks.js: where the bricks are, and how they are drawn
// ============================================================

const BRICK_COLUMNS = 8;
const BRICK_ROWS = 4;
const BRICK_WIDTH = 60;
const BRICK_HEIGHT = 20;
const BRICK_GAP = 6;     // empty space between bricks
const BRICKS_TOP = 50;   // how far down the first row starts
const BRICK_COLORS = ["#ff795f", "#ffbd69", "#c9fa75", "#6ef5ed"];

// Builds the list of bricks. Each brick is an object with an
// x, y, width, and height.
function makeBricks(level = 1) {
  const list = [];
  const rows = Math.min(BRICK_ROWS + Math.floor((level - 1) / 7), 8);
  const hitPoints = 1 + Math.floor((level - 1) / 10);

  // Center the whole block of bricks on the screen.
  const totalWidth = BRICK_COLUMNS * BRICK_WIDTH + (BRICK_COLUMNS - 1) * BRICK_GAP;
  const left = (WIDTH - totalWidth) / 2;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < BRICK_COLUMNS; col++) {
      list.push({
        x: left + col * (BRICK_WIDTH + BRICK_GAP),
        y: BRICKS_TOP + row * (BRICK_HEIGHT + BRICK_GAP),
        row,
        width: BRICK_WIDTH,
        height: BRICK_HEIGHT,
        color: BRICK_COLORS[row % BRICK_COLORS.length],
        hitPoints,
        strategy: "slide",
        strategySpeed: row % 2 === 0 ? 2 : -2
      });
    }
  }

  return list;
}

function slideBrickRow(rowBricks) {
  const left = Math.min(...rowBricks.map((brick) => brick.x));
  const right = Math.max(...rowBricks.map((brick) => brick.x + brick.width));
  const speed = rowBricks[0].strategySpeed;
  if (left + speed < 0 || right + speed > WIDTH) {
    for (const brick of rowBricks) brick.strategySpeed *= -1;
  }
  for (const brick of rowBricks) brick.x += brick.strategySpeed;
}

const brickStrategies = new Map([
  ["slide", slideBrickRow],
  ["stayStill", () => {}]
]);

function updateBrickStrategies() {
  const strategyRows = new Map();
  for (const brick of bricks) {
    if (!Number.isInteger(brick.row)) {
      brick.row = Math.round((brick.y - BRICKS_TOP) / (BRICK_HEIGHT + BRICK_GAP));
    }
    if (typeof brick.strategy !== "string") brick.strategy = "slide";
    if (brick.strategy === "slide" && !Number.isFinite(brick.strategySpeed)) {
      brick.strategySpeed = brick.row % 2 === 0 ? 2 : -2;
    }

    if (!strategyRows.has(brick.strategy)) strategyRows.set(brick.strategy, new Map());
    const rows = strategyRows.get(brick.strategy);
    if (!rows.has(brick.row)) rows.set(brick.row, []);
    rows.get(brick.row).push(brick);
  }

  for (const [name, rows] of strategyRows) {
    const strategy = brickStrategies.get(name);
    if (!strategy) continue;
    for (const rowBricks of rows.values()) strategy(rowBricks);
  }
}

// Draws every brick in the list.
function drawBricks() {
  for (const brick of bricks) {
    ctx.fillStyle = brick.color;
    ctx.shadowColor = brick.color;
    ctx.shadowBlur = 8;
    ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#071116";
    ctx.font = "700 11px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(brick.hitPoints), brick.x + brick.width / 2, brick.y + brick.height / 2);
  }
  ctx.shadowBlur = 0;
}
