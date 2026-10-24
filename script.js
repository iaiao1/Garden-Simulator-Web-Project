const APP_VERSION = "3.0.0";
 
let pyodideInstance = null;
let gardenGridState = {};
let displayActionHistory = [];
let currentTool = "hand";
let eodOpen = false;
 
// ---------------------------------------------------------------
// Economy & Player Statistics (start with 500 coins)
// ---------------------------------------------------------------
let playerCoins = 500;
let playerLevel = 1;
let playerXP = 0;
 
// Time & 30-Day Weather Calendar
let currentDay = 1;
let timeMinutes = 360; // 06:00 AM
let gameClockInterval = null;
let thirtyDayWeatherSchedule = [];
let currentWeather = { name: "Sunny", icon: "☀️", effect: "normal" };
 
let dailyStats = { coinsEarned: 0, salesCount: 0, harvestCount: 0 };
 
// ---------------------------------------------------------------
// Flower catalog, rarity tiers & seed shop
// ---------------------------------------------------------------
const FLOWER_CATALOG = {
    "Rose":           { emoji: "🌹", rarity: "COMMON",    price: 25,  xp: 15 },
    "Hyacinth":       { emoji: "🪻", rarity: "COMMON",    price: 30,  xp: 18 },
    "Lotus":          { emoji: "🪷", rarity: "UNCOMMON",  price: 50,  xp: 30 },
    "Hibiscus":       { emoji: "🌺", rarity: "UNCOMMON",  price: 65,  xp: 40 },
    "Cherry Blossom": { emoji: "🌸", rarity: "RARE",      price: 90,  xp: 60 },
    "Sunflower":      { emoji: "🌻", rarity: "RARE",      price: 110, xp: 75 },
    "Daisy":          { emoji: "🌼", rarity: "LEGENDARY", price: 150, xp: 110 },
    "Morning Glory":  { emoji: "🪻", rarity: "LEGENDARY", price: 180, xp: 135 },
    "Pink Cosmos":    { emoji: "🌷", rarity: "MYTHICAL",  price: 240, xp: 180 },
    "Mexican Aster":  { emoji: "💮", rarity: "MYTHICAL",  price: 300, xp: 230 }
};
 
const TIERS = {
    COMMON:    { cost: 0,    icon: "🌱", sec: 3 },
    UNCOMMON:  { cost: 300,  icon: "🍀", sec: 4 },
    RARE:      { cost: 800,  icon: "💎", sec: 5 },
    LEGENDARY: { cost: 2000, icon: "👑", sec: 6 },
    MYTHICAL:  { cost: 5000, icon: "🌈", sec: 8 }
};
let unlockedTiers = { COMMON: true, UNCOMMON: false, RARE: false, LEGENDARY: false, MYTHICAL: false };
 
const seedCost = name => Math.max(5, Math.round(FLOWER_CATALOG[name].price * 0.4));
const isUnlocked = name => !!unlockedTiers[FLOWER_CATALOG[name].rarity];
 
// Only the starter (common) seeds, a small starter bag
let seedStock = { "Rose": 3, "Hyacinth": 3 };
let flowerInventory = {};
let toolsInventory = { "Water Charges": 30, "Growth Fertilizer": 2, "Sprinkler Level": 1, "Plots": 25 };
const MAX_WATER = 100;
 
// ---------------------------------------------------------------
// Customer orders (reward coins = total flower price)
// ---------------------------------------------------------------
const orderCoins = o => Object.entries(o.items).reduce((s, [f, q]) => s + FLOWER_CATALOG[f].price * q, 0);
const orderXP = o => Object.entries(o.items).reduce((s, [f, q]) => s + FLOWER_CATALOG[f].xp * q, 0);
const orderType = o => (Object.keys(o.items).length > 1 ? "bouquet" : "single");
 
let activeCustomerOrders = [
    { id: 1, items: { "Rose": 2 } },
    { id: 2, items: { "Rose": 2, "Hyacinth": 1 } },
    { id: 3, items: { "Hyacinth": 1 } },
    { id: 4, items: { "Hyacinth": 2, "Rose": 1 } }
];
 
function generateNewOrder() {
    const pool = Object.keys(FLOWER_CATALOG).filter(isUnlocked);
    const pick = () => pool[Math.floor(Math.random() * pool.length)];
    const id = Date.now() + Math.random();
    if (pool.length < 2 || Math.random() < 0.4) return { id, items: { [pick()]: Math.floor(Math.random() * 3) + 1 } };
    const f1 = pick();
    let f2 = pick();
    while (f2 === f1) f2 = pick();
    return { id, items: { [f1]: 1, [f2]: Math.floor(Math.random() * 2) + 1 } };
}
 
// ---------------------------------------------------------------
// Student topic templates (Pyodide)
// ---------------------------------------------------------------
const topicTemplates = {
    1: {
        title: "Python OOP + Big O + Stacks (Action History)",
        code: `# Topic 1: Python OOP + Big O + Stacks
class Plant:
    def __init__(self, name, water_need):
        self.name = name
        self.water_need = water_need
        self.health = 100
 
 
print("You successfully created a plant object!")
 
# Refreshes the storage bars (coins are managed by the shop, not by Python)
updateResources(200, 90, 110, 80)
 
addPlantsToDropdown([
    ("Rose", "🌹", 25),
    ("Hyacinth", "🪻", 30),
    ("Lotus", "🪷", 50),
    ("Hibiscus", "🌺", 65),
    ("Cherry Blossom", "🌸", 90),
    ("Sunflower", "🌻", 110),
    ("Daisy", "🌼", 150),
    ("Morning Glory", "🪻", 180),
    ("Pink Cosmos", "🌷", 240),
    ("Mexican Aster", "💮", 300)
])
 
print("Resource Storage and Plant catalog refreshed!")
 
 
class ActionHistoryStack:
    def __init__(self):
        self.stack = []
 
    def push_action(self, action_string):
        self.stack.append(action_string)
        pushAction(action_string)
 
    def pop_action(self):
        if not self.is_empty():
            return self.stack.pop()
        return None
 
    def is_empty(self):
        return len(self.stack) == 0
 
 
stack = ActionHistoryStack()
stack.push_action("Initialized Shop Stack")
stack.push_action("Loaded Seed Catalog")
print("Action History Stack ready!")
`
    },
    2: {
        title: "Queues & Dèques (Climate Weather Queue)",
        code: `# Topic 2: Queues & Dèques (Climate Weather Queue)
from collections import deque
 
 
class ClimateQueue:
    def __init__(self):
        self.queue = deque(["Sunny", "Rain", "Heatwave", "Earthquake", "Windy", "Normal"])
 
    def add_challenge(self, event_name):
        self.queue.append(event_name)
 
    def get_queue(self):
        return list(self.queue)
 
 
q = ClimateQueue()
updateClimateQueue(q.get_queue())
print("Climate Queue (FIFO) successfully applied to Weather Calendar!")
`
    },
    3: {
        title: "Static/Dynamic Arrays, 2D Lists, & Memory Structures",
        code: `# Topic 3: Static/Dynamic Arrays & 2D Lists (Garden Grid)
from js import addPlantToGrid, pushAction
 
 
GRID_SIZE = 10
 
 
class GardenGrid:
    def __init__(self, size=GRID_SIZE):
        self.size = size
        self.grid = [[None for _ in range(size)] for _ in range(size)]
 
    def plant_at(self, row, col, crop_name):
        if 0 <= row < self.size and 0 <= col < self.size:
            self.grid[row][col] = crop_name
            pos = (row * self.size) + col
            addPlantToGrid(pos, crop_name)
            pushAction(f"Planted {crop_name} at Grid ({row}, {col})")
            return True
        return False
 
 
garden = GardenGrid()
 
 
def plant_crop(row, col, crop_name):
    return garden.plant_at(row, col, crop_name)
 
 
print("Topic 3 2D List Garden Grid ready!")
`
    },
    4: {
        title: "Hierarchical Trees & Plant Growth Evolution",
        code: `# Topic 4: Hierarchical Trees & Plant Growth Evolution
import json
 
 
class PlantNode:
    def __init__(self, node_id, stage_name, icon):
        self.node_id = node_id
        self.stage_name = stage_name
        self.icon = icon
        self.children = []
 
    def add_child(self, child_node):
        self.children.append(child_node)
        return child_node
 
 
class PlantGrowthTree:
    def __init__(self):
        self.root = PlantNode("node_seed", "Seed", "🌰")
        sprout = self.root.add_child(PlantNode("node_sprout", "Sprout", "🌱"))
        thriving = sprout.add_child(PlantNode("node_thriving", "Thriving", "🌿"))
        thriving.add_child(PlantNode("node_matured", "Matured", "🌸"))
 
 
tree = PlantGrowthTree()
print("Topic 4 Hierarchical Growth Tree structured successfully!")
`
    },
    5: {
        title: "Binary Search Trees (BST) & 30-Day Weather Calendar",
        code: `# Topic 5: Binary Search Trees & 30-Day Weather Calendar
import json
from js import pushAction
 
 
class WeatherCalendarNode:
    def __init__(self, day, condition, icon):
        self.day = day
        self.condition = condition
        self.icon = icon
        self.left = None
        self.right = None
 
 
class WeatherCalendarBST:
    def __init__(self):
        self.root = None
 
    def insert(self, day, condition, icon):
        node = WeatherCalendarNode(day, condition, icon)
        if not self.root:
            self.root = node
            return
        curr = self.root
        while True:
            if day < curr.day:
                if not curr.left:
                    curr.left = node
                    break
                curr = curr.left
            else:
                if not curr.right:
                    curr.right = node
                    break
                curr = curr.right
 
 
calendar_bst = WeatherCalendarBST()
for d in range(1, 31):
    calendar_bst.insert(d, "Sunny", "☀️")
 
 
pushAction("BST 30-Day Weather Calendar initialized")
print("Topic 5 BST Weather Calendar ready!")
`
    },
    6: { title: "Hash Tables, Collisions, & Rehashing", code: `# Topic 6: Hash Tables\n# ==== WRITE YOUR CODE HERE ====` },
    7: { title: "Graph Foundations & DFS/BFS", code: `# Topic 7: Graphs\n# ==== WRITE YOUR CODE HERE ====` },
    8: { title: "Sorting Algorithms", code: `# Topic 8: Sorting\n# ==== WRITE YOUR CODE HERE ====` },
    9: { title: "Searching Algorithms", code: `# Topic 9: Searching\n# ==== WRITE YOUR CODE HERE ====` },
    10: { title: "Advanced Strategic Paradigms", code: `# Topic 10: Dijkstra\n# ==== WRITE YOUR CODE HERE ====` },
    11: { title: "Dynamic Programming", code: `# Topic 11: DP\n# ==== WRITE YOUR CODE HERE ====` }
};
 
// Safe stubs for removed visualizers
window.renderPlantTree = function () {};
window.renderBSTInventory = function () {};
 
// ---------------------------------------------------------------
// Weather calendar
// ---------------------------------------------------------------
const WEATHER_INFO = {
    normal:      { text: "Sunny day: everything grows at normal speed.", bg: "rgba(255,236,170,0.55)" },
    auto_water:  { text: "Rainy day: the rain waters every plant for free.", bg: "rgba(190,215,250,0.6)" },
    soil_damage: { text: "Earthquake: one planted tile gets damaged. Repair it in Shop Upgrades.", bg: "rgba(255,190,175,0.6)" },
    speed_boost: { text: "Windy day: flowers grow 30% faster.", bg: "rgba(190,235,220,0.6)" },
    dry_fast:    { text: "Heatwave: growth is 25% slower and watering costs 2 charges.", bg: "rgba(255,200,130,0.6)" }
};
 
function initializeWeatherCalendar() {
    const weatherTypes = [
        { name: "Sunny", icon: "☀️", effect: "normal" },
        { name: "Rain", icon: "🌧️", effect: "auto_water" },
        { name: "Earthquake", icon: "🌋", effect: "soil_damage" },
        { name: "Windy", icon: "💨", effect: "speed_boost" },
        { name: "Heatwave", icon: "🔥", effect: "dry_fast" }
    ];
    thirtyDayWeatherSchedule = [];
    for (let d = 1; d <= 30; d++) {
        const w = d === 1 ? weatherTypes[0] : weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
        thirtyDayWeatherSchedule.push({ day: d, ...w });
    }
    currentWeather = thirtyDayWeatherSchedule[0];
    updateClimateQueueUI();
}
 
function updateClimateQueueUI() {
    document.getElementById("weather-icon-badge").innerText = currentWeather.icon;
    document.getElementById("day-label").innerText = `Day ${currentDay} (${currentWeather.name})`;
    const info = WEATHER_INFO[currentWeather.effect];
    document.getElementById("banner-icon").innerText = currentWeather.icon;
    document.getElementById("banner-text").innerText = info.text;
    document.getElementById("weather-banner").style.setProperty("--banner-tint", info.bg);
    renderCalendarWidget();
    refreshModal();
}
 
function updateClimateQueue() { renderCalendarWidget(); }
 
// ---------------------------------------------------------------
// Pyodide bridge
// ---------------------------------------------------------------
async function initPyodide() {
    const consoleEl = document.getElementById("output-console");
    if (pyodideInstance) return;
    if (consoleEl) consoleEl.innerHTML = `<span class="text-rose-500 font-bold">🌸 Initializing Python engine...</span><br>`;
    try {
        pyodideInstance = await loadPyodide();
        pyodideInstance.globals.set("addPlantToGrid", addPlantToGrid);
        pyodideInstance.globals.set("updateResources", updateResources);
        pyodideInstance.globals.set("addPlantsToDropdown", addPlantsToDropdown);
        pyodideInstance.globals.set("pushAction", pushAction);
        pyodideInstance.globals.set("updateClimateQueue", updateClimateQueue);
        await pyodideInstance.runPythonAsync(`
import sys
from js import document
class Console:
    def write(self, text):
        if text and text.strip():
            el = document.getElementById("output-console")
            if el: el.innerHTML += text.replace("\\n", "<br>")
    def flush(self): pass
sys.stdout = Console()
        `);
        if (consoleEl) consoleEl.innerHTML = `<span class="text-emerald-600 font-bold">✨ Python environment ready!</span><br>`;
    } catch (err) {
        if (consoleEl) consoleEl.innerHTML = `<span class="text-rose-500">Failed to load Python: ${err.message}</span>`;
    }
}
 
// Called from Python: never overwrites the shop economy, just refreshes the UI
function updateResources() { updateResourceBars(); }
function addPlantsToDropdown() { refreshSeedSelector(); }
 
// ---------------------------------------------------------------
// Stats, resource bars & selectors
// ---------------------------------------------------------------
function updatePlayerStats() {
    document.getElementById("coins-text").innerText = `${playerCoins} Coins`;
    let reqXP = playerLevel * 100;
    while (playerXP >= reqXP) {
        playerXP -= reqXP;
        playerLevel++;
        reqXP = playerLevel * 100;
        showToast(`Level Up! You are now Level ${playerLevel}! 🎉`);
    }
    document.getElementById("level-xp-text").innerText = `Lvl ${playerLevel} (${playerXP}/${reqXP} XP)`;
    refreshSeedSelector();
    updateResourceBars();
    renderInventoryView();
    renderCustomerOrders();
    renderStalls();
    refreshModal();
}
 
function updateResourceBars() {
    const water = toolsInventory["Water Charges"], fert = toolsInventory["Growth Fertilizer"];
    const seeds = Object.values(seedStock).reduce((a, b) => a + b, 0);
    const set = (id, text, pct) => {
        document.getElementById(id + "-text").innerText = text;
        document.getElementById(id + "-bar").style.width = Math.min(100, pct) + "%";
    };
    set("water", `${water} / ${MAX_WATER}`, (water / MAX_WATER) * 100);
    set("seeds", `${seeds} seeds`, seeds * 2);
    set("energy", `${fert} left`, fert * 10);
}
 
function refreshSeedSelector() {
    const select = document.getElementById("crop-selector");
    if (!select) return;
    const prev = select.value;
    select.innerHTML = "";
    Object.keys(FLOWER_CATALOG).filter(isUnlocked).forEach(name => {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = `${FLOWER_CATALOG[name].emoji} ${name} (x${seedStock[name] || 0})`;
        select.appendChild(opt);
    });
    if (prev && [...select.options].some(o => o.value === prev)) select.value = prev;
}
 
const selectedSeed = () => document.getElementById("crop-selector")?.value || "Rose";
 
// ---------------------------------------------------------------
// Greenhouse
// ---------------------------------------------------------------
const MATURE = 4;
const STAGE_ICONS = ["🌰", "🌱", "🌿", "🪴"];
const STAGE_SIZE = [18, 24, 28, 30];
 
function growSeconds(plant) {
    let s = TIERS[FLOWER_CATALOG[plant.name].rarity].sec / (1 + 0.25 * (toolsInventory["Sprinkler Level"] - 1));
    if (currentWeather.effect === "speed_boost") s *= 0.7;
    if (currentWeather.effect === "dry_fast") s *= 1.25;
    return Math.max(1, Math.round(s));
}
 
const waterCost = () => (currentWeather.effect === "dry_fast" ? 2 : 1);
 
function bloomHTML(name, big, extraClass = "") {
    const e = FLOWER_CATALOG[name].emoji;
    return `<div class="plant-wrap ${extraClass}">
        <span class="bloom-emoji" style="font-size:${big}px">${e}</span>
        <div style="width:3px;height:12px;background:#6cc28a;border-radius:3px;margin-top:-1px"></div>
        <span style="font-size:13px;margin-top:-7px">🍃</span></div>`;
}
 
function addPlantToGrid(pos, name) {
    if (!FLOWER_CATALOG[name]) name = "Rose";
    const isAutoWater = currentWeather.effect === "auto_water";
    gardenGridState[pos] = { name, stageIndex: 0, watered: isAutoWater, growing: false, growthProgress: 0, damaged: false, timer: null };
    renderTile(pos);
    if (isAutoWater) startPlantGrowthTimer(pos);
}
 
function startPlantGrowthTimer(pos) {
    const plant = gardenGridState[pos];
    if (!plant || plant.growing || plant.stageIndex >= MATURE) return;
    plant.growing = true;
    plant.growthProgress = growSeconds(plant);
    renderTile(pos);
    plant.timer = setInterval(() => {
        if (gardenGridState[pos] !== plant) { clearInterval(plant.timer); return; }
        plant.growthProgress--;
        if (plant.growthProgress <= 0) {
            clearInterval(plant.timer);
            plant.growing = false;
            plant.stageIndex++;
            if (plant.stageIndex < MATURE) {
                plant.watered = false;
                showToast(`${plant.name} grew to stage ${plant.stageIndex + 1}! Water it again.`);
            } else {
                showToast(`${plant.name} is fully bloomed and ready to harvest! ✨`);
            }
            renderTile(pos);
        } else {
            const badge = document.querySelector(`#garden-grid > [data-pos="${pos}"] .tile-badge`);
            if (badge) badge.textContent = `⏳ ${plant.growthProgress}s`;
        }
    }, 1000);
}
 
function buildTile(i) {
    const cell = document.createElement("div");
    cell.dataset.pos = i;
    const plant = gardenGridState[i];
    let cls = "aspect-square garden-tile flex flex-col items-center justify-center" + (currentTool === "fert" ? " fert-mode" : "");
 
    if (plant && plant.damaged) {
        cell.className = cls + " damaged";
        cell.innerHTML = `<span class="text-2xl">🌋</span><span class="tile-badge bg-red-100 text-red-700">Damaged</span>`;
    } else if (plant) {
        const ready = plant.stageIndex >= MATURE;
        if (ready) cls += " ready watered";
        else if (plant.growing) cls += " growing watered";
        else if (plant.watered) cls += " watered";
        cell.className = cls;
        cell.title = `${plant.name} (stage ${Math.min(plant.stageIndex + 1, 5)}/5)`;
        const art = ready
            ? bloomHTML(plant.name, 36, "ready-plant")
            : `<span class="plant-wrap" style="font-size:${STAGE_SIZE[plant.stageIndex]}px">${STAGE_ICONS[plant.stageIndex]}</span>`;
        let badge;
        if (ready) badge = `<span class="tile-badge bg-emerald-100 text-emerald-700">Ready ✨</span>`;
        else if (plant.growing) badge = `<span class="tile-badge bg-amber-100 text-amber-700">⏳ ${plant.growthProgress}s</span>`;
        else if (!plant.watered) badge = `<span class="tile-badge bg-sky-100 text-sky-700">Dry 💧</span>`;
        else badge = `<span class="tile-badge bg-emerald-100 text-emerald-700">Watered</span>`;
        cell.innerHTML = art + badge;
    } else {
        // Empty tile: hover shows the matured look of the selected seed
        const seed = selectedSeed();
        cell.className = cls;
        cell.innerHTML = `<span class="text-rose-300/70 text-lg select-none">🌱</span>
            <div class="ghost">
                <span class="sparkle s1">✨</span><span class="sparkle s2">✨</span><span class="sparkle s3">✨</span>
                ${bloomHTML(seed, 38, "ghost-bloom")}
                <small>${seed} (matured)</small>
            </div>`;
    }
    cell.onclick = () => handleTileClick(i, cell);
    return cell;
}
 
function renderTile(i) {
    const grid = document.getElementById("garden-grid");
    const old = grid && grid.children[i];
    if (old) old.replaceWith(buildTile(i));
}
 
function renderGarden() {
    const grid = document.getElementById("garden-grid");
    if (!grid) return;
    grid.innerHTML = "";
    const totalPlots = toolsInventory["Plots"];
    grid.style.gridTemplateColumns = `repeat(${gridCols()}, minmax(0, 1fr))`;
    for (let i = 0; i < totalPlots; i++) grid.appendChild(buildTile(i));
}
 
const gridCols = () => (toolsInventory["Plots"] > 50 ? 10 : toolsInventory["Plots"] > 36 ? 8 : 5);
 
async function handleTileClick(i, el) {
    const plant = gardenGridState[i];
 
    if (plant && plant.damaged) { showToast("Tile damaged by the earthquake! Repair it in Shop Upgrades."); return; }
 
    // ---- Fertilizer tool ----
    if (currentTool === "fert") {
        if (!plant) { showToast("Plant something first, fertilizer only works on growing flowers."); return; }
        if (plant.stageIndex >= MATURE) { showToast(`${plant.name} is already bloomed!`); return; }
        if (toolsInventory["Growth Fertilizer"] <= 0) { showToast("No fertilizer left! Buy more in Shop Upgrades."); return; }
        toolsInventory["Growth Fertilizer"]--;
        clearInterval(plant.timer);
        plant.stageIndex = MATURE; plant.growing = false; plant.watered = true;
        floatPop("-1 🧪", "loss", el);
        pushAction(`Fertilized ${plant.name}`);
        renderTile(i); updatePlayerStats();
        return;
    }
 
    // ---- Empty tile: plant ----
    if (!plant) {
        const cropName = selectedSeed();
        if ((seedStock[cropName] || 0) <= 0) { showToast(`No ${cropName} seeds left! Buy more in the Seed Shop.`); return; }
        seedStock[cropName]--;
        if (seedStock[cropName] === 0) delete seedStock[cropName];
        const cols = gridCols(), row = Math.floor(i / cols), col = i % cols;
        floatPop(`-1 ${FLOWER_CATALOG[cropName].emoji} seed`, "loss", el);
        let viaPython = false;
        if (pyodideInstance) {
            try { await pyodideInstance.runPythonAsync(`plant_crop(${row}, ${col}, '${cropName.replace(/'/g, "\\'")}')`); viaPython = !!gardenGridState[i]; } catch (e) {}
        }
        if (!viaPython) { addPlantToGrid(i, cropName); pushAction(`Planted ${cropName} at Grid (${row}, ${col})`); }
        updatePlayerStats();
        showToast(`Planted ${cropName}! Click it to water.`);
        return;
    }
 
    // ---- Harvest ----
    if (plant.stageIndex >= MATURE) {
        flowerInventory[plant.name] = (flowerInventory[plant.name] || 0) + 1;
        dailyStats.harvestCount++;
        floatPop(`+1 ${FLOWER_CATALOG[plant.name].emoji} ${plant.name}`, "gain", el);
        showToast(`Harvested 1x ${plant.name} (${FLOWER_CATALOG[plant.name].rarity}) into your inventory! 🧺`);
        pushAction(`Harvested ${plant.name}`);
        delete gardenGridState[i];
        renderTile(i); updatePlayerStats();
        return;
    }
 
    if (plant.growing) { showToast(`${plant.name} is growing (${plant.growthProgress}s left)... ⏳`); return; }
 
    // ---- Water ----
    if (!plant.watered) {
        const cost = waterCost();
        if (toolsInventory["Water Charges"] < cost) { showToast("Your watering can is empty! Refill it in Shop Upgrades."); return; }
        toolsInventory["Water Charges"] -= cost;
        plant.watered = true;
        floatPop(`-${cost} 💧`, "loss", el);
        startPlantGrowthTimer(i);
        updatePlayerStats();
    }
}
 
function setTool(tool) {
    currentTool = tool;
    document.getElementById("tool-hand").classList.toggle("active", tool === "hand");
    document.getElementById("tool-fert").classList.toggle("active", tool === "fert");
    document.getElementById("tool-hint").innerText = tool === "fert" ? "Click a growing flower to bloom it instantly (uses 1 🧪)." : "";
    renderGarden();
}
 
// ---------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------
function renderInventoryView() {
    const c = document.getElementById("inventory-container");
    if (!c) return;
    const card = (title, color, body) => `<div class="bg-white/90 p-4 rounded-2xl border border-rose-200 shadow-sm"><h3 class="font-bold text-rose-900 text-sm mb-2">${title}</h3><ul class="space-y-1.5 text-xs text-rose-700 overflow-auto max-h-56">${body}</ul></div>`;
    const li = (bg, l, r) => `<li class="flex justify-between items-center ${bg} px-2.5 py-1.5 rounded-xl"><span>${l}</span><span class="font-bold">${r}</span></li>`;
    const empty = t => `<li class="text-[11px] text-rose-400 font-semibold p-2">${t}</li>`;
 
    const flowers = Object.entries(flowerInventory).filter(([, n]) => n > 0)
        .map(([f, n]) => li("bg-rose-50/70", `${FLOWER_CATALOG[f].emoji} <b>${f}</b> <span class="text-[8px] bg-rose-100 text-rose-600 px-1 py-0.5 rounded font-bold">${FLOWER_CATALOG[f].rarity}</span>`, `${n} pcs`)).join("");
    const seeds = Object.entries(seedStock).filter(([, n]) => n > 0)
        .map(([s, n]) => li("bg-emerald-50/70", `🌰 <b>${s}</b>`, `${n} seeds`)).join("");
    const tools = [
        ["💧 Water Charges", `${toolsInventory["Water Charges"]} / ${MAX_WATER}`],
        ["🧪 Growth Fertilizer", toolsInventory["Growth Fertilizer"]],
        ["⚡ Sprinkler Level", toolsInventory["Sprinkler Level"]],
        ["🌿 Plots", toolsInventory["Plots"]]
    ].map(([n, v]) => li("bg-amber-50/70", `<b>${n}</b>`, v)).join("");
 
    c.innerHTML = card("🧺 Harvested flowers", "", flowers || empty("Nothing harvested yet. Plant, water and harvest to fill this basket!"))
        + card("🌱 Seed bag", "", seeds || empty("No seeds left. Visit the Seed Shop."))
        + card("🧰 Tools", "", tools);
}
 
// ---------------------------------------------------------------
// Orders
// ---------------------------------------------------------------
function canFulfill(o) { return Object.entries(o.items).every(([f, q]) => (flowerInventory[f] || 0) >= q); }
 
function deliverOrder(orderId) {
    const idx = activeCustomerOrders.findIndex(o => o.id === orderId);
    if (idx === -1) return;
    const order = activeCustomerOrders[idx];
    if (!canFulfill(order)) { showToast("Not enough flowers in your inventory for this order!"); return; }
    for (const f in order.items) { flowerInventory[f] -= order.items[f]; if (!flowerInventory[f]) delete flowerInventory[f]; }
    const coins = orderCoins(order), xp = orderXP(order);
    playerCoins += coins; playerXP += xp;
    dailyStats.coinsEarned += coins; dailyStats.salesCount++;
    showToast(`Order fulfilled! +${coins} Coins & +${xp} XP 🪙`);
    pushAction(`Delivered order (+${coins}c)`);
    activeCustomerOrders.splice(idx, 1, generateNewOrder());
    document.getElementById("coins-text").classList.add("bump");
    setTimeout(() => document.getElementById("coins-text").classList.remove("bump"), 500);
    updatePlayerStats();
}
 
function renderCustomerOrders() {
    const c = document.getElementById("orders-list-container");
    if (!c) return;
    c.innerHTML = activeCustomerOrders.map(o => {
        const ok = canFulfill(o);
        const req = Object.entries(o.items).map(([f, q]) => {
            const have = flowerInventory[f] || 0;
            return `<span class="${have >= q ? "text-emerald-600" : "text-rose-500"} font-bold">${FLOWER_CATALOG[f].emoji} ${f} ${have}/${q}</span>`;
        }).join(" · ");
        return `<div class="bg-white/90 p-4 rounded-2xl border border-rose-200 flex flex-col justify-between gap-3 shadow-sm">
            <div class="flex items-start gap-3"><span class="text-2xl">${orderType(o) === "bouquet" ? "💐" : "🌷"}</span>
            <div><h4 class="font-bold text-rose-900 text-sm">${orderType(o) === "bouquet" ? "Custom bouquet" : "Single flower request"}</h4>
            <p class="text-[11px] mt-0.5">${req}</p>
            <p class="text-[11px] text-amber-700 font-bold mt-1">Reward: +${orderCoins(o)} coins · +${orderXP(o)} XP</p></div></div>
            <button onclick="deliverOrder(${o.id})" class="w-full btn-pastel btn-mint py-2 text-xs ${ok ? "" : "btn-disabled"}">Deliver order</button></div>`;
    }).join("");
}
 
// ---------------------------------------------------------------
// Shops (random stock), calendar & pop-up windows
// ---------------------------------------------------------------
const SEED_CHANCE = { COMMON: 1, UNCOMMON: 0.85, RARE: 0.65, LEGENDARY: 0.4, MYTHICAL: 0.2 };
const SEED_QTY = { COMMON: [3, 10], UNCOMMON: [2, 6], RARE: [1, 4], LEGENDARY: [1, 2], MYTHICAL: [1, 1] };
const TOOL_META = {
    water:     { icon: "💧", name: "Water Refill",       range: [2, 6] },
    fert:      { icon: "🧪", name: "Growth Fertilizer",  range: [2, 8] },
    sprinkler: { icon: "⚡", name: "Sprinkler Upgrade",  range: [0, 2] },
    plots:     { icon: "🌿", name: "Soil Plot Pack",     range: [0, 2] },
    repair:    { icon: "🛠️", name: "Repair Kit",         range: [1, 4] }
};
const shopStock = { seeds: {}, tools: {} };
let openModalName = null;
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
 
// Roll a fresh random shelf: which seeds show up, and how many of each
function restockShops(announce) {
    shopStock.seeds = {};
    Object.entries(FLOWER_CATALOG).forEach(([name, d]) => {
        if (Math.random() < SEED_CHANCE[d.rarity]) shopStock.seeds[name] = rand(...SEED_QTY[d.rarity]);
    });
    shopStock.tools = {};
    for (const k in TOOL_META) shopStock.tools[k] = rand(...TOOL_META[k].range);
    if (announce) showToast("The shops restocked their shelves with new goods! 🧺");
    renderStalls();
    refreshModal();
}
 
function spend(cost) {
    if (playerCoins < cost) { showToast(`Not enough coins! (Need ${cost})`); return false; }
    playerCoins -= cost;
    return true;
}
 
function unlockTier(tier) {
    if (unlockedTiers[tier]) return;
    if (!spend(TIERS[tier].cost)) return;
    unlockedTiers[tier] = true;
    showToast(`${TIERS[tier].icon} ${tier} seeds unlocked!`);
    pushAction(`Unlocked ${tier} tier`);
    updatePlayerStats();
}
 
function buySeed(name, qty) {
    if (!isUnlocked(name)) { showToast("Unlock this tier first!"); return; }
    const stock = shopStock.seeds[name] || 0;
    if (stock <= 0) { showToast(`${name} seeds are sold out until the next dawn.`); return; }
    qty = Math.min(qty, stock);
    const total = seedCost(name) * qty;
    if (!spend(total)) return;
    shopStock.seeds[name] -= qty;
    seedStock[name] = (seedStock[name] || 0) + qty;
    showToast(`Bought ${qty}x ${name} seed for ${total} coins.`);
    updatePlayerStats();
}
 
const toolCost = k => ({ water: 30, fert: 25, sprinkler: 150 * toolsInventory["Sprinkler Level"], plots: 250 + (toolsInventory["Plots"] - 25) * 45, repair: 50 })[k];
const toolDesc = k => ({
    water: `+20 charges (you have ${toolsInventory["Water Charges"]}/${MAX_WATER})`,
    fert: "Instantly blooms one growing flower",
    sprinkler: `Level ${toolsInventory["Sprinkler Level"]}/5 · flowers grow 25% faster`,
    plots: `${toolsInventory["Plots"]}/100 plots · adds 5 soil plots`,
    repair: "Fixes one earthquake-damaged tile"
})[k];
 
function buyTool(k) {
    if ((shopStock.tools[k] || 0) <= 0) { showToast("Sold out until the next dawn."); return; }
    const damaged = Object.keys(gardenGridState).filter(i => gardenGridState[i].damaged);
    if (k === "water" && toolsInventory["Water Charges"] >= MAX_WATER) { showToast("Your watering can is already full!"); return; }
    if (k === "sprinkler" && toolsInventory["Sprinkler Level"] >= 5) { showToast("Sprinkler is at max level!"); return; }
    if (k === "plots" && toolsInventory["Plots"] >= 100) { showToast("Greenhouse is at max 10x10 capacity!"); return; }
    if (k === "repair" && !damaged.length) { showToast("No earthquake-damaged tiles to repair!"); return; }
    if (!spend(toolCost(k))) return;
    shopStock.tools[k]--;
    if (k === "water") toolsInventory["Water Charges"] = Math.min(MAX_WATER, toolsInventory["Water Charges"] + 20);
    if (k === "fert") toolsInventory["Growth Fertilizer"]++;
    if (k === "sprinkler") toolsInventory["Sprinkler Level"]++;
    if (k === "plots") { toolsInventory["Plots"] = Math.min(100, toolsInventory["Plots"] + 5); renderGarden(); }
    if (k === "repair") { delete gardenGridState[damaged[0]]; renderGarden(); }
    showToast(`${TOOL_META[k].icon} ${TOOL_META[k].name} purchased!`);
    updatePlayerStats();
}
 
function renderStalls() {
    const seedCount = Object.values(shopStock.seeds).reduce((a, b) => a + b, 0);
    const toolCount = Object.values(shopStock.tools).reduce((a, b) => a + b, 0);
    const s = document.getElementById("seed-badge"), t = document.getElementById("tool-badge");
    if (s) s.textContent = `${seedCount} in stock`;
    if (t) t.textContent = `${toolCount} in stock`;
}
 
// ---- Calendar ----
function renderCalendarWidget() {
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    set("cal-day-num", currentDay);
    set("cal-icon", currentWeather.icon);
    set("cal-name", currentWeather.name);
    const next = thirtyDayWeatherSchedule[currentDay % 30];
    set("cal-sub", next ? `Tomorrow: ${next.icon} ${next.name}` : "Tap to see the month");
}
 
function buildCalendarModal() {
    const cells = thirtyDayWeatherSchedule.map(w => {
        const cls = w.day < currentDay ? "past" : w.day === currentDay ? "today" : "";
        return `<div class="cal-cell ${cls}" title="${w.name}: ${WEATHER_INFO[w.effect].text}">
            ${w.day === currentDay ? '<span class="tdy">Today</span>' : ""}${w.day < currentDay ? '<span class="chk">✓</span>' : ""}
            <span class="d">${w.day}</span><span class="i">${w.icon}</span><span class="n">${w.name}</span></div>`;
    }).join("");
    const legend = [["☀️ Sunny", "normal"], ["🌧️ Rain", "auto_water"], ["💨 Windy", "speed_boost"], ["🔥 Heatwave", "dry_fast"], ["🌋 Earthquake", "soil_damage"]]
        .map(([n, e]) => `<div class="text-[11px] font-bold"><span style="color:var(--plum)">${n}</span> <span style="color:var(--ink-soft)">${WEATHER_INFO[e].text}</span></div>`).join("");
    return {
        title: "Bloom Calendar",
        sub: `Day ${currentDay} of 30 · the weather for the whole month is rolled at random.`,
        html: `<div class="cal-grid pt-3">${cells}</div><div class="mt-4 p-3 rounded-2xl space-y-1" style="background:rgba(255,255,255,.55)">${legend}</div>`
    };
}
 
// ---- Seed shop ----
function buildSeedModal() {
    const order = Object.keys(TIERS);
    const chips = order.map(t => unlockedTiers[t]
        ? `<span class="tier-chip open">${TIERS[t].icon} ${t[0] + t.slice(1).toLowerCase()} ✓</span>`
        : `<button onclick="unlockTier('${t}')" class="tier-chip cursor-pointer ${playerCoins < TIERS[t].cost ? "btn-disabled" : ""}">🔓 ${t[0] + t.slice(1).toLowerCase()} · ${TIERS[t].cost}c</button>`).join("");
    const names = Object.keys(shopStock.seeds).sort((a, b) => order.indexOf(FLOWER_CATALOG[a].rarity) - order.indexOf(FLOWER_CATALOG[b].rarity));
    const rows = names.map(name => {
        const d = FLOWER_CATALOG[name], open = unlockedTiers[d.rarity], left = shopStock.seeds[name], off = !open || left <= 0;
        const action = !open ? `<span class="text-[11px] font-bold" style="color:var(--rose-deep)">🔒 Unlock ${d.rarity.toLowerCase()} first</span>`
            : left <= 0 ? `<span class="text-[11px] font-bold" style="color:var(--ink-soft)">Sold out</span>`
            : `<div class="flex gap-1.5"><button onclick="buySeed('${name}',1)" class="btn-pastel px-3 py-1.5 text-[11px]">Buy 1 · ${seedCost(name)}c</button>
               <button onclick="buySeed('${name}',5)" class="btn-pastel btn-sky px-3 py-1.5 text-[11px]">x${Math.min(5, left)} · ${seedCost(name) * Math.min(5, left)}c</button></div>`;
        return `<div class="shop-row ${!open ? "locked" : left <= 0 ? "soldout" : ""}">
            <div class="flex items-center gap-3"><span class="text-3xl">${open ? d.emoji : "🔒"}</span>
            <div><div class="font-bold text-sm" style="color:var(--plum)">${name} <span class="rar rar-${d.rarity}">${d.rarity}</span></div>
            <div class="text-[11px] font-semibold" style="color:var(--ink-soft)">Sells for ${d.price}c · In stock: <b>${left}</b> · You own: ${seedStock[name] || 0}</div></div></div>${action}</div>`;
    }).join("");
    return {
        title: "Seed Shop",
        sub: `Today's shelf is random and restocks every dawn (Day ${currentDay + 1}). Unlock a tier to buy its seeds.`,
        html: `<div class="flex gap-2 flex-wrap mb-3">${chips}</div>${rows || "<p class='text-sm font-bold p-3'>The shelves are empty today.</p>"}`
    };
}
 
// ---- Tool shop ----
function buildToolModal() {
    const rows = Object.keys(TOOL_META).map(k => {
        const m = TOOL_META[k], left = shopStock.tools[k];
        return `<div class="shop-row ${left <= 0 ? "soldout" : ""}">
            <div class="flex items-center gap-3"><span class="text-3xl">${m.icon}</span>
            <div><div class="font-bold text-sm" style="color:var(--plum)">${m.name}</div>
            <div class="text-[11px] font-semibold" style="color:var(--ink-soft)">${toolDesc(k)} · In stock: <b>${left}</b></div></div></div>
            ${left <= 0 ? `<span class="text-[11px] font-bold" style="color:var(--ink-soft)">Sold out</span>` : `<button onclick="buyTool('${k}')" class="btn-pastel btn-mint px-4 py-1.5 text-[11px]">Buy · ${toolCost(k)}c</button>`}</div>`;
    }).join("");
    return { title: "Tool Shop", sub: `Quantities are random and restock every dawn (Day ${currentDay + 1}).`, html: rows };
}
 
// ---- Pop-up window plumbing ----
function openModal(name) {
    openModalName = name;
    document.getElementById("modal").classList.add("open");
    refreshModal(true);
}
 
function closeModal() {
    openModalName = null;
    document.getElementById("modal").classList.remove("open");
}
 
function refreshModal(fresh) {
    if (!openModalName) return;
    const build = { calendar: buildCalendarModal, seeds: buildSeedModal, tools: buildToolModal }[openModalName];
    const body = document.getElementById("modal-body"), scroll = fresh ? 0 : body.scrollTop;
    const m = build();
    document.getElementById("modal-title").textContent = m.title;
    document.getElementById("modal-sub").textContent = m.sub;
    body.innerHTML = m.html;
    body.scrollTop = scroll;
}
 
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });
 
// ---------------------------------------------------------------
// Game clock & day cycle
// ---------------------------------------------------------------
function startGameClock() {
    initializeWeatherCalendar();
    if (gameClockInterval) clearInterval(gameClockInterval);
    gameClockInterval = setInterval(() => {
        if (eodOpen) return;
        timeMinutes += 15;
        if (timeMinutes >= 1440) { timeMinutes = 360; triggerEndOfDayModal(); }
        updateClockDisplay();
    }, 2000);
}
 
function updateClockDisplay() {
    const h = Math.floor(timeMinutes / 60), m = timeMinutes % 60;
    const el = document.getElementById("clock-text");
    if (el) el.innerText = `${h % 12 || 12}:${m < 10 ? "0" + m : m} ${h >= 12 ? "PM" : "AM"}`;
}
 
function triggerEndOfDayModal() {
    const closedDay = currentDay;
    currentDay++;
    if (currentDay > 30) { currentDay = 1; initializeWeatherCalendar(); }
    currentWeather = thirtyDayWeatherSchedule[currentDay - 1];
 
    if (currentWeather.effect === "auto_water") {
        Object.keys(gardenGridState).forEach(k => {
            const p = gardenGridState[k];
            if (p && !p.damaged && !p.watered && !p.growing && p.stageIndex < MATURE) { p.watered = true; startPlantGrowthTimer(k); }
        });
        showToast("🌧️ Rain is watering your whole greenhouse for free!");
    } else if (currentWeather.effect === "soil_damage") {
        const keys = Object.keys(gardenGridState).filter(k => !gardenGridState[k].damaged);
        if (keys.length) {
            const k = keys[Math.floor(Math.random() * keys.length)];
            clearInterval(gardenGridState[k].timer);
            gardenGridState[k].damaged = true;
            renderTile(k);
        }
        showToast("🌋 Earthquake! The ground is shaking.");
        const main = document.querySelector("main");
        main.classList.add("shake-world");
        setTimeout(() => main.classList.remove("shake-world"), 3000);
    }
    updateClimateQueueUI();
 
    document.getElementById("eod-title").innerText = `Day ${closedDay} closed`;
    document.getElementById("eod-coins").innerText = `+${dailyStats.coinsEarned}`;
    document.getElementById("eod-sales").innerText = dailyStats.salesCount;
    document.getElementById("eod-harvests").innerText = dailyStats.harvestCount;
    eodOpen = true;
    document.getElementById("eod-modal").classList.remove("hidden");
}
 
function closeEndOfDayModal() {
    document.getElementById("eod-modal").classList.add("hidden");
    eodOpen = false;
    dailyStats = { coinsEarned: 0, salesCount: 0, harvestCount: 0 };
    timeMinutes = 360;
    updateClockDisplay();
    restockShops(true);
    showToast(`Welcome to Day ${currentDay} (${currentWeather.name})! 🌱`);
}
 
// ---------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------
function pushAction(action) {
    displayActionHistory.push(action);
    if (displayActionHistory.length > 8) displayActionHistory.shift();
    renderActionStack();
}
 
function renderActionStack() {
    const L = document.getElementById("book-left"), Rt = document.getElementById("book-right");
    if (!L || !Rt) return;
    const esc = t => t.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
    const entries = [...displayActionHistory].reverse();
    const page = (title, items, offset, num) => `<div class="pg-title">${title}</div>` +
        Array.from({ length: 4 }, (_, i) => items[i]
            ? `<div class="pg-line"><span class="pg-n">${offset + i + 1}.</span> ${esc(items[i])}</div>`
            : `<div class="pg-line">${!offset && !i && !entries.length ? "Nothing written yet..." : ""}</div>`).join("") + `<div class="pg-num">${num}</div>`;
    L.innerHTML = page(`Today · Day ${currentDay}`, entries.slice(0, 4), 0, 1);
    Rt.innerHTML = page("Earlier pages", entries.slice(4, 8), 4, 2);
}
 
function triggerUndo() {
    if (displayActionHistory.length) {
        const undone = displayActionHistory.pop();
        renderActionStack();
        showToast(`Undid: ${undone}`);
    } else showToast("Action stack is empty.");
}
 
function showToast(msg) {
    const toast = document.createElement("div");
    toast.className = "toast-cute";
    toast.textContent = `✨ ${msg}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}
 
function floatPop(text, kind, el) {
    const r = el.getBoundingClientRect();
    const p = document.createElement("div");
    p.className = `float-pop ${kind}`;
    p.textContent = text;
    p.style.left = `${r.left + r.width / 2 - 30}px`;
    p.style.top = `${r.top + 4}px`;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1100);
}
 
async function runPythonCode() {
    const consoleEl = document.getElementById("output-console");
    consoleEl.innerHTML = `<span class="text-rose-500 font-bold">🌸 Running python script...</span><br>`;
    try {
        await initPyodide();
        await pyodideInstance.runPythonAsync(document.getElementById("code-editor").value.trim());
    } catch (err) {
        consoleEl.innerHTML += `<span class="text-rose-500">Error: ${err.message}</span>`;
    }
}
 
async function runAllPythonCode() {
    const consoleEl = document.getElementById("output-console");
    consoleEl.innerHTML = `<span class="text-rose-500 font-bold">🌸 Running all topic codes...</span><br>`;
    try {
        await initPyodide();
        for (let key = 1; key <= 5; key++) {
            if (topicTemplates[key] && topicTemplates[key].code) {
                consoleEl.innerHTML += `<br><span class="text-amber-700 font-bold">--- Running: Topic ${key} (${topicTemplates[key].title}) ---</span><br>`;
                await pyodideInstance.runPythonAsync(topicTemplates[key].code);
            }
        }
        consoleEl.innerHTML += `<br><span class="text-emerald-600 font-bold">✨ Successfully ran all topics!</span><br>`;
        showToast("All topics have been run! ✨");
    } catch (err) {
        consoleEl.innerHTML += `<span class="text-rose-500">Error: ${err.message}</span>`;
    }
}
 
function loadTopic() {
    document.getElementById("code-editor").value = topicTemplates[document.getElementById("topic-selector").value].code;
}
 
const TABS = ["greenhouse", "inventory", "orders", "code"];
function switchTab(tab) {
    TABS.forEach(key => {
        document.getElementById("view-" + key).classList.toggle("hidden", key !== tab);
        document.getElementById("tab-" + key).className = "tab-btn" + (key === tab ? " active" : "");
    });
}
 
// ---------------------------------------------------------------
// Living background: dreamy golden-hour garden with visible weather
// ---------------------------------------------------------------
const env = { rain: 0, wind: 0, heat: 0, quake: 0, night: 0, cloud: 0.25, gold: 0 };
const bg = { cv: null, ctx: null, W: 0, H: 0, flowers: [], stones: [], trees: [], far: [], arches: [], bokeh: [], clouds: [], drops: [], splashes: [], petals: [], pollen: [], flies: [], bflies: [], dust: [], pads: [], ripples: [], pond: null };
const PALETTE = ["#ff9fb2", "#ffd1dc", "#fff2a8", "#ffb36b", "#d9b8ff", "#ffffff", "#9fd8ff", "#ff8fab"];
const LAV = ["#b79be6", "#c9a8f0", "#a58ad8"], TUL = ["#ff8fb8", "#ffa3c4", "#ff7aa8", "#ffb6c9"], LEAF = ["#8fbf6f", "#b5cf72", "#7fae6a", "#e0c070"];
const SKY_KEYS = [
    [360, [186, 160, 214], [255, 206, 170]], [720, [150, 190, 235], [255, 236, 200]], [1050, [190, 140, 190], [255, 190, 130]],
    [1200, [90, 70, 130], [235, 140, 140]], [1320, [30, 30, 70], [80, 60, 120]], [1440, [30, 30, 70], [80, 60, 120]]
];
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = v => Math.max(0, Math.min(1, v));
const mixRGB = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgbStr = (c, al = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${al})`;
const R = () => Math.random();
 
function skyAt(t) {
    for (let i = 0; i < SKY_KEYS.length - 1; i++) {
        const [t0, a0, b0] = SKY_KEYS[i], [t1, a1, b1] = SKY_KEYS[i + 1];
        if (t <= t1) { const k = clamp01((t - t0) / (t1 - t0)); return { top: mixRGB(a0, a1, k), bot: mixRGB(b0, b1, k) }; }
    }
    return { top: SKY_KEYS[5][1], bot: SKY_KEYS[5][2] };
}
 
function tint(hex) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const k = 1 - 0.55 * env.night - 0.14 * env.rain;
    r = r * k + env.heat * 18 + env.gold * 16; g = g * k + env.heat * 4 + env.gold * 4; b = b * k - env.heat * 20 - env.gold * 14 + env.night * 25;
    const c = v => Math.max(0, Math.min(255, v)) | 0;
    return `rgb(${c(r)},${c(g)},${c(b)})`;
}
 
const pathCx = y => bg.W * (0.5 + 0.07 * Math.sin(y / bg.H * 7.5));
const pathHW = y => bg.W * (0.012 + 0.13 * Math.pow(clamp01((y - bg.H * 0.62) / (bg.H * 0.38)), 1.15));
const inPond = (x, y) => { const p = bg.pond; return ((x - p.cx) / p.rx) ** 2 + ((y - p.cy) / p.ry) ** 2 < 1.1; };
const hillY = x => bg.H * 0.62 + Math.sin(x * 0.004) * bg.H * 0.04;
 
function bgResize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), W = (bg.W = window.innerWidth), H = (bg.H = window.innerHeight);
    bg.cv.width = W * dpr; bg.cv.height = H * dpr;
    bg.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bg.pond = { cx: W * 0.84, cy: H * 0.9, rx: W * 0.14, ry: H * 0.06 };
 
    bg.flowers = [];
    for (let r = 0; r < 4; r++) {
        const scale = 0.55 + r * 0.28, gap = 44 - r * 6, baseY = H * (0.775 + r * 0.07);
        for (let x = -20; x < W + 30; x += gap) {
            const fx = x + R() * gap * 0.8, fy = baseY + R() * 12;
            if (Math.abs(fx - pathCx(fy)) < pathHW(fy) * 1.05 || (r >= 2 && inPond(fx, fy))) continue;
            const roll = R(), type = roll < 0.2 ? "lav" : roll < 0.4 ? "tulip" : roll < 0.52 && r > 0 ? "sun" : "daisy";
            bg.flowers.push({
                x: fx, y: fy, scale, type, h: (55 + R() * 70) * scale * (type === "sun" ? 1.5 : type === "lav" ? 0.8 : 1),
                head: (type === "sun" ? 15 : type === "lav" ? 5 : 7 + R() * 5) * scale, petals: type === "sun" ? 14 : 5 + Math.floor(R() * 4),
                color: type === "lav" ? LAV[(R() * 3) | 0] : type === "tulip" ? TUL[(R() * 4) | 0] : type === "sun" ? "#ffc83d" : PALETTE[(R() * PALETTE.length) | 0],
                phase: R() * 6.28
            });
        }
    }
    bg.stones = Array.from({ length: 170 }, () => {
        const v = R(), y = H * (0.63 + 0.37 * v), u = R() * 2 - 1;
        return { x: pathCx(y) + u * pathHW(y) * 0.95, y, w: 4 + v * 24, shade: 205 + R() * 35 };
    });
    bg.trees = [-1, 1].map(side => ({
        x: side < 0 ? W * 0.035 : W * 0.965, base: H * 0.84, side,
        blobs: Array.from({ length: 34 }, () => ({ dx: (R() - 0.5) * W * 0.2, dy: -(H * 0.36 + R() * H * 0.26), r: 32 + R() * 52, c: LEAF[(R() * 4) | 0], p: R() * 6 }))
    }));
    bg.far = Array.from({ length: 36 }, () => ({ x: R() * W, r: 14 + R() * 26, c: R() < 0.5 ? "#b9aedb" : "#aebfa0" }));
    bg.arches = [{ x: W * 0.27, y: H * 0.7, r: 36 }, { x: W * 0.73, y: H * 0.685, r: 30 }].map(a => ({ ...a, roses: Array.from({ length: 16 }, (_, i) => ({ a: Math.PI + (i / 15) * Math.PI, c: PALETTE[i % 2 ? 0 : 7] })) }));
    bg.bokeh = Array.from({ length: 30 }, () => ({ x: R() * W, y: R() * H, r: 8 + R() * 30, p: R() * 6, c: R() < 0.6 ? [255, 214, 140] : [255, 176, 200] }));
    bg.clouds = Array.from({ length: 7 }, (_, i) => ({ x: (i / 7) * W, y: 30 + R() * H * 0.24, s: 0.7 + R() * 0.9, v: 3 + R() * 7 }));
    bg.drops = Array.from({ length: 280 }, () => ({ x: R() * W, y: R() * H, v: 11 + R() * 8, l: 10 + R() * 12, gy: H * (0.8 + R() * 0.2) }));
    bg.petals = Array.from({ length: 70 }, () => ({ x: R() * W, y: R() * H, s: 3 + R() * 4, r: R() * 6, c: PALETTE[(R() * 5) | 0], v: 0.5 + R() }));
    bg.pollen = Array.from({ length: 40 }, () => ({ x: R() * W, y: R() * H, p: R() * 6.28 }));
    bg.flies = Array.from({ length: 26 }, () => ({ x: R() * W, y: H * (0.6 + R() * 0.38), p: R() * 6.28 }));
    bg.bflies = Array.from({ length: 6 }, (_, i) => ({ x: R() * W, y: H * (0.5 + R() * 0.3), a: R() * 6.28, c: PALETTE[(i * 2) % 8] }));
    bg.pads = Array.from({ length: 10 }, (_, i) => { const a = R() * 6.28, d = Math.sqrt(R()) * 0.85; return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, r: 7 + R() * 7, lotus: i < 4 }; });
    bg.dust = []; bg.ripples = []; bg.splashes = [];
}
 
function drawFlower(ctx, f, t, sway) {
    const ang = Math.sin(t * (1.1 + env.wind) + f.phase + f.x * 0.01) * sway + env.wind * 0.12;
    const hx = f.x + ang * f.h, hy = f.y - f.h;
    ctx.strokeStyle = tint("#4fa96a"); ctx.lineWidth = 2 * f.scale + 0.5;
    ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.quadraticCurveTo(f.x + ang * f.h * 0.2, f.y - f.h * 0.55, hx, hy); ctx.stroke();
    ctx.fillStyle = tint("#6cc28a"); ctx.beginPath(); ctx.ellipse(f.x + ang * f.h * 0.15, f.y - f.h * 0.35, 6 * f.scale, 2.6 * f.scale, -0.6, 0, 7); ctx.fill();
    ctx.fillStyle = tint(f.color);
    if (f.type === "lav") {
        for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.ellipse(hx - ang * k * 2, hy + k * f.head * 1.3, f.head * 0.7, f.head * 1.1, ang, 0, 7); ctx.fill(); }
    } else if (f.type === "tulip") {
        ctx.beginPath(); ctx.ellipse(hx, hy, f.head * 0.85, f.head * 1.2, ang, 0, 7); ctx.fill();
        ctx.fillStyle = tint("#ffd6e4"); ctx.beginPath(); ctx.ellipse(hx - f.head * 0.25, hy - f.head * 0.2, f.head * 0.3, f.head * 0.7, ang, 0, 7); ctx.fill();
    } else {
        for (let p = 0; p < f.petals; p++) {
            const a = (p / f.petals) * 6.283 + ang * 2;
            ctx.beginPath(); ctx.ellipse(hx + Math.cos(a) * f.head * 0.8, hy + Math.sin(a) * f.head * 0.8, f.head * 0.7, f.head * 0.42, a, 0, 7); ctx.fill();
        }
        ctx.fillStyle = tint(f.type === "sun" ? "#6b4226" : "#ffd84d"); ctx.beginPath(); ctx.arc(hx, hy, f.head * (f.type === "sun" ? 0.62 : 0.42), 0, 7); ctx.fill();
    }
}
 
function bgFrame(ms) {
    const t = ms / 1000, ctx = bg.ctx, W = bg.W, H = bg.H;
    requestAnimationFrame(bgFrame);
    if (document.hidden) return;
 
    const fx = currentWeather.effect;
    const target = {
        rain: fx === "auto_water" ? 1 : 0, wind: fx === "speed_boost" ? 1 : 0, heat: fx === "dry_fast" ? 1 : 0,
        quake: fx === "soil_damage" ? 1 : 0, night: clamp01((timeMinutes - 1140) / 150),
        cloud: fx === "auto_water" ? 1 : fx === "speed_boost" ? 0.4 : fx === "soil_damage" ? 0.35 : fx === "dry_fast" ? 0 : 0.25
    };
    for (const k in target) env[k] += (target[k] - env[k]) * 0.02;
    env.gold = clamp01(1 - Math.abs(timeMinutes - 1020) / 220) * (1 - env.rain);
    const light = (1 - env.night) * (1 - env.rain * 0.7);
 
    const sk = skyAt(timeMinutes);
    let top = mixRGB(sk.top, [150, 160, 180], env.rain * 0.8), bot = mixRGB(sk.bot, [205, 212, 224], env.rain * 0.75);
    top = mixRGB(top, [255, 200, 120], env.heat * 0.6); bot = mixRGB(bot, [255, 240, 200], env.heat * 0.6);
 
    const shake = env.quake * (Math.sin(t * 2.3) > 0.2 ? 1 : 0.25) * 5;
    ctx.save();
    ctx.translate((R() - 0.5) * shake, (R() - 0.5) * shake);
 
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.78);
    sky.addColorStop(0, rgbStr(top)); sky.addColorStop(1, rgbStr(bot));
    ctx.fillStyle = sky; ctx.fillRect(-12, -12, W + 24, H + 24);
 
    // Stars + moon
    if (env.night > 0.05) {
        ctx.fillStyle = "#fff";
        for (let i = 0; i < 60; i++) { ctx.globalAlpha = env.night * (0.4 + 0.6 * Math.abs(Math.sin(t + i))); ctx.fillRect((i * 197.3) % W, (i * 83.7) % (H * 0.5), 2, 2); }
        ctx.globalAlpha = 1;
        const mp = clamp01((timeMinutes - 1140) / 300), mx = W * (0.2 + 0.6 * mp), my = H * 0.3 - Math.sin(Math.PI * mp) * H * 0.18;
        const mg = ctx.createRadialGradient(mx, my, 4, mx, my, 80);
        mg.addColorStop(0, `rgba(255,248,220,${env.night})`); mg.addColorStop(1, "rgba(255,248,220,0)");
        ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, 80, 0, 7); ctx.fill();
        ctx.fillStyle = `rgba(255,250,228,${env.night})`; ctx.beginPath(); ctx.arc(mx, my, 20, 0, 7); ctx.fill();
    }
 
    // Sun, glow and soft light rays
    const sp = clamp01((timeMinutes - 360) / 810), sx = W * (0.12 + 0.76 * sp), sy = H * 0.46 - Math.sin(Math.PI * sp) * H * 0.28;
    const sunA = (1 - env.rain * 0.9) * (1 - env.night);
    if (sunA > 0.02) {
        const rad = 120 + env.heat * 70 + env.gold * 60 + Math.sin(t * 1.5) * 4, warm = env.heat > 0.3 ? "255,170,80" : env.gold > 0.3 ? "255,196,120" : "255,236,170";
        const g = ctx.createRadialGradient(sx, sy, 6, sx, sy, rad);
        g.addColorStop(0, `rgba(${warm},${sunA})`); g.addColorStop(1, `rgba(${warm},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, rad, 0, 7); ctx.fill();
        ctx.fillStyle = `rgba(255,${env.heat > 0.3 ? 200 : 246},150,${sunA})`; ctx.beginPath(); ctx.arc(sx, sy, 28 + env.heat * 8, 0, 7); ctx.fill();
        ctx.globalCompositeOperation = "lighter";
        for (let k = 0; k < 7; k++) {
            const a = 0.5 + k * 0.28 + Math.sin(t * 0.15 + k) * 0.04, L = Math.max(W, H) * 1.3;
            const rg = ctx.createLinearGradient(sx, sy, sx + Math.cos(a) * L, sy + Math.sin(a) * L);
            rg.addColorStop(0, `rgba(255,214,150,${0.11 * sunA * (0.6 + env.gold)})`); rg.addColorStop(1, "rgba(255,214,150,0)");
            ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(sx, sy);
            ctx.lineTo(sx + Math.cos(a - 0.05) * L, sy + Math.sin(a - 0.05) * L); ctx.lineTo(sx + Math.cos(a + 0.05) * L, sy + Math.sin(a + 0.05) * L); ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
    }
 
    // Clouds lit pink and gold by the sun
    const cc = mixRGB(mixRGB([255, 255, 255], [255, 218, 205], 0.5 + env.gold * 0.5), [125, 135, 150], env.rain);
    const cAlpha = (0.4 + env.cloud * 0.5) * (1 - env.night * 0.6);
    bg.clouds.forEach(c => {
        c.x += (c.v + env.wind * 40) * 0.016; if (c.x > W + 160) c.x = -160;
        ctx.fillStyle = rgbStr(mixRGB(cc, [70, 60, 110], env.night * 0.5), cAlpha);
        [[0, 0, 34], [32, -10, 40], [70, 0, 32], [35, 10, 36]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(c.x + dx * c.s, c.y + dy * c.s, r * c.s, 0, 7); ctx.fill(); });
    });
 
    // Dreamy distant hills, tiny far trees and mist
    ctx.fillStyle = tint("#cdbbe6"); ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 24) ctx.lineTo(x, H * 0.58 + Math.sin(x * 0.0035 + 1) * H * 0.045);
    ctx.lineTo(W, H); ctx.fill();
    bg.far.forEach(f => { ctx.fillStyle = tint(f.c); ctx.beginPath(); ctx.arc(f.x, hillY(f.x) - f.r * 0.5 + 8, f.r, 0, 7); ctx.fill(); });
    ctx.fillStyle = tint("#b9cba8"); ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 24) ctx.lineTo(x, hillY(x) + 14);
    ctx.lineTo(W, H); ctx.fill();
    const mist = ctx.createLinearGradient(0, H * 0.52, 0, H * 0.74);
    mist.addColorStop(0, "rgba(255,226,214,0)"); mist.addColorStop(0.55, `rgba(255,226,214,${0.38 * light})`); mist.addColorStop(1, "rgba(255,226,214,0)");
    ctx.fillStyle = mist; ctx.fillRect(-12, H * 0.52, W + 24, H * 0.22);
 
    // Side trees (canopies sway softly, light dapples through)
    bg.trees.forEach(tr => {
        ctx.fillStyle = tint("#7a5a4a"); ctx.beginPath();
        ctx.moveTo(tr.x - 26, tr.base); ctx.quadraticCurveTo(tr.x - 12, tr.base - H * 0.2, tr.x + tr.side * 20, tr.base - H * 0.42);
        ctx.lineTo(tr.x + tr.side * 20 + 20, tr.base - H * 0.42); ctx.quadraticCurveTo(tr.x + 26, tr.base - H * 0.2, tr.x + 26, tr.base); ctx.fill();
        tr.blobs.forEach(b => {
            const ox = Math.sin(t * 0.5 + b.p) * 4;
            ctx.fillStyle = tint(b.c); ctx.beginPath(); ctx.arc(tr.x + b.dx + ox, tr.base + b.dy, b.r, 0, 7); ctx.fill();
        });
        ctx.globalCompositeOperation = "lighter";
        tr.blobs.forEach((b, i) => { if (i % 3) return; ctx.fillStyle = `rgba(255,214,140,${0.13 * light * (0.6 + 0.4 * Math.sin(t * 1.3 + b.p))})`; ctx.beginPath(); ctx.arc(tr.x + b.dx - b.r * 0.2, tr.base + b.dy - b.r * 0.25, b.r * 0.45, 0, 7); ctx.fill(); });
        ctx.globalCompositeOperation = "source-over";
    });
 
    // Meadow, rose arches
    const gnd = ctx.createLinearGradient(0, H * 0.72, 0, H);
    gnd.addColorStop(0, tint("#a6d896")); gnd.addColorStop(1, tint("#6fbf7c"));
    ctx.fillStyle = gnd; ctx.fillRect(-12, H * 0.74, W + 24, H);
    bg.arches.forEach(a => {
        ctx.strokeStyle = tint("#8a6a58"); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(a.x, a.y, a.r, Math.PI, 0); ctx.moveTo(a.x - a.r, a.y); ctx.lineTo(a.x - a.r, a.y + 28); ctx.moveTo(a.x + a.r, a.y); ctx.lineTo(a.x + a.r, a.y + 28); ctx.stroke();
        a.roses.forEach(r => { ctx.fillStyle = tint(r.c); ctx.beginPath(); ctx.arc(a.x + Math.cos(r.a) * a.r, a.y + Math.sin(r.a) * a.r, 4.5, 0, 7); ctx.fill(); });
    });
 
    // Cobblestone path
    ctx.fillStyle = tint("#e6d3b4"); ctx.beginPath();
    for (let y = H * 0.62; y <= H; y += 8) ctx.lineTo(pathCx(y) - pathHW(y), y);
    for (let y = H; y >= H * 0.62; y -= 8) ctx.lineTo(pathCx(y) + pathHW(y), y);
    ctx.fill();
    bg.stones.forEach(s => { ctx.fillStyle = tint(`#${((s.shade | 0) << 16 | (s.shade * 0.9 | 0) << 8 | (s.shade * 0.78 | 0)).toString(16).padStart(6, "0")}`); ctx.beginPath(); ctx.ellipse(s.x, s.y, s.w, s.w * 0.5, 0, 0, 7); ctx.fill(); });
 
    // Pond with lily pads, lotus and sparkles
    const p = bg.pond;
    const wg = ctx.createLinearGradient(0, p.cy - p.ry, 0, p.cy + p.ry);
    wg.addColorStop(0, rgbStr(mixRGB(bot, [200, 190, 240], 0.5))); wg.addColorStop(1, rgbStr(mixRGB(top, [90, 170, 190], 0.6)));
    ctx.fillStyle = wg; ctx.beginPath(); ctx.ellipse(p.cx, p.cy, p.rx, p.ry, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = tint("#e7dcc4"); ctx.lineWidth = 4; ctx.stroke();
    if (R() < 0.02) bg.ripples.push({ x: p.cx + (R() - 0.5) * p.rx * 1.4, y: p.cy + (R() - 0.5) * p.ry, r: 1 });
    for (let i = bg.ripples.length - 1; i >= 0; i--) { const r = bg.ripples[i]; r.r += 0.35; ctx.strokeStyle = `rgba(255,255,255,${Math.max(0, 0.5 - r.r / 40)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r * 1.8, r.r * 0.7, 0, 0, 7); ctx.stroke(); if (r.r > 22) bg.ripples.splice(i, 1); }
    bg.pads.forEach((d, i) => {
        const x = p.cx + d.dx * p.rx * 0.9, y = p.cy + d.dy * p.ry * 0.8 + Math.sin(t + i) * 1;
        ctx.fillStyle = tint("#79c08a"); ctx.beginPath(); ctx.ellipse(x, y, d.r * 1.5, d.r * 0.6, 0, 0, 7); ctx.fill();
        if (d.lotus) { ctx.fillStyle = tint("#ff9fc0"); for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(x + (k - 2) * 3.5, y - 4 - (2 - Math.abs(k - 2)) * 2, 3, 7, (k - 2) * 0.35, 0, 7); ctx.fill(); } }
    });
    ctx.fillStyle = `rgba(255,255,255,${0.7 * light})`;
    for (let i = 0; i < 14; i++) { const a = Math.sin(t * 2 + i * 1.7); if (a > 0.6) ctx.fillRect(p.cx + Math.cos(i * 2.4) * p.rx * 0.8, p.cy + Math.sin(i * 3.1) * p.ry * 0.7, 2.5, 2.5); }
 
    // Flower field
    const sway = 0.07 + env.wind * 0.3 + env.rain * 0.06;
    for (const f of bg.flowers) drawFlower(ctx, f, t, sway);
 
    // Butterflies
    const bA = (1 - env.rain) * (1 - env.night) * (1 - env.wind * 0.6);
    if (bA > 0.05) bg.bflies.forEach(b => {
        b.a += (R() - 0.5) * 0.12; b.x += Math.cos(b.a) * 0.9; b.y += Math.sin(b.a) * 0.6 + Math.sin(t * 3 + b.x) * 0.3;
        if (b.x < -20) b.x = W + 20; if (b.x > W + 20) b.x = -20;
        b.y = Math.max(H * 0.35, Math.min(H * 0.9, b.y));
        const flap = Math.abs(Math.sin(t * 12 + b.x)) * 7 + 1.5;
        ctx.globalAlpha = bA; ctx.fillStyle = b.c;
        ctx.beginPath(); ctx.ellipse(b.x - 3, b.y, flap, 6, -0.4, 0, 7); ctx.ellipse(b.x + 3, b.y, flap, 6, 0.4, 0, 7); ctx.fill();
        ctx.fillStyle = "#6b5560"; ctx.fillRect(b.x - 0.8, b.y - 5, 1.6, 10); ctx.globalAlpha = 1;
    });
 
    // Dreamy bokeh + pollen
    ctx.globalCompositeOperation = "lighter";
    bg.bokeh.forEach(b => {
        b.y -= 0.12; b.x += Math.sin(t * 0.3 + b.p) * 0.2; if (b.y < -40) b.y = H + 40;
        const a = (0.1 + 0.08 * Math.sin(t * 0.8 + b.p)) * (0.35 + light * 0.65);
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, rgbStr(b.c, a)); g.addColorStop(0.75, rgbStr(b.c, a * 0.7)); g.addColorStop(1, rgbStr(b.c, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
    });
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgba(255,248,200,${0.75 * (1 - env.rain) * (1 - env.night)})`;
    bg.pollen.forEach(q => { q.y -= 0.25; q.x += Math.sin(t + q.p) * 0.4 + env.wind * 3; if (q.y < 0) q.y = H; if (q.x > W) q.x = 0; ctx.beginPath(); ctx.arc(q.x, q.y, 1.8, 0, 7); ctx.fill(); });
 
    // Fireflies
    if (env.night > 0.1) bg.flies.forEach(f => {
        f.x += Math.sin(t * 0.7 + f.p) * 0.5; f.y += Math.cos(t * 0.9 + f.p) * 0.4;
        const a = env.night * (0.4 + 0.6 * Math.abs(Math.sin(t * 2 + f.p)));
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 9);
        g.addColorStop(0, `rgba(255,255,160,${a})`); g.addColorStop(1, "rgba(255,255,160,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, 9, 0, 7); ctx.fill();
    });
 
    // Wind: blowing petals
    const nP = Math.floor(env.wind * 70);
    for (let i = 0; i < nP; i++) {
        const q = bg.petals[i];
        q.x += (6 + q.v * 6) * env.wind; q.y += Math.sin(t * 2 + i) * 1.4 + 0.3; q.r += 0.1;
        if (q.x > W + 20) { q.x = -20; q.y = R() * H * 0.9; }
        ctx.fillStyle = tint(q.c); ctx.beginPath(); ctx.ellipse(q.x, q.y, q.s, q.s * 0.5, q.r, 0, 7); ctx.fill();
    }
 
    // Rain
    if (env.rain > 0.03) {
        ctx.strokeStyle = `rgba(200,225,255,${0.75 * env.rain})`; ctx.lineWidth = 1.4; ctx.lineCap = "round";
        const n = Math.floor(env.rain * bg.drops.length);
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
            const d = bg.drops[i]; d.y += d.v; d.x -= 2;
            ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + 2, d.y - d.l);
            if (d.y > d.gy) { if (bg.splashes.length < 90) bg.splashes.push({ x: d.x, y: d.gy, r: 1 }); d.y = -10; d.x = R() * (W + 80); }
        }
        ctx.stroke();
        for (let i = bg.splashes.length - 1; i >= 0; i--) {
            const s = bg.splashes[i]; s.r += 0.5;
            ctx.strokeStyle = `rgba(215,235,255,${Math.max(0, 0.7 - s.r / 12)})`; ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r * 1.6, s.r * 0.6, 0, 0, 7); ctx.stroke();
            if (s.r > 9) bg.splashes.splice(i, 1);
        }
        ctx.fillStyle = `rgba(70,95,130,${env.rain * 0.16})`; ctx.fillRect(-12, -12, W + 24, H + 24);
    }
 
    // Heatwave haze + shimmer
    if (env.heat > 0.03) {
        ctx.fillStyle = `rgba(255,170,60,${env.heat * 0.14})`; ctx.fillRect(-12, -12, W + 24, H + 24);
        ctx.strokeStyle = `rgba(255,255,255,${env.heat * 0.22})`; ctx.lineWidth = 2;
        for (let k = 0; k < 7; k++) {
            const by = H * 0.6 + k * H * 0.05 - ((t * 20) % 30);
            ctx.beginPath();
            for (let x = 0; x <= W; x += 20) ctx.lineTo(x, by + Math.sin(x * 0.03 + t * 3 + k) * 5);
            ctx.stroke();
        }
    }
 
    // Earthquake dust
    if (env.quake > 0.2 && bg.dust.length < 60 && R() < 0.5) bg.dust.push({ x: R() * W, y: H * (0.8 + R() * 0.2), r: 3 + R() * 6, a: 0.5 });
    for (let i = bg.dust.length - 1; i >= 0; i--) {
        const d = bg.dust[i]; d.y -= 0.8; d.r += 0.15; d.a -= 0.008;
        ctx.fillStyle = `rgba(190,160,120,${Math.max(0, d.a)})`; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 7); ctx.fill();
        if (d.a <= 0) bg.dust.splice(i, 1);
    }
 
    ctx.restore();
    if (Music.rainGain) Music.rainGain.gain.setTargetAtTime(env.rain * 0.12, Music.ctx.currentTime, 0.5);
}
 
// ---------------------------------------------------------------
// Soft procedural music box (Web Audio, no files needed)
// ---------------------------------------------------------------
const Music = { ctx: null, master: null, rainGain: null, on: false, started: false, step: 0, chord: 0, last: 3, timer: null };
const SCALE = [392, 440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5];
const CHORDS = [[130.81, 196, 261.63, 329.63], [110, 164.81, 220, 261.63], [87.31, 130.81, 174.61, 261.63], [98, 146.83, 196, 246.94]];
 
function buildMusic() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    Music.ctx = ctx;
    Music.master = ctx.createGain();
    Music.master.gain.value = document.getElementById("music-volume").value / 100 * 0.6;
    const echo = ctx.createDelay(1); echo.delayTime.value = 0.42;
    const fb = ctx.createGain(); fb.gain.value = 0.38;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2400;
    echo.connect(lp); lp.connect(fb); fb.connect(echo);
    Music.bus = ctx.createGain();
    Music.bus.connect(Music.master); Music.bus.connect(echo); lp.connect(Music.master);
    Music.master.connect(ctx.destination);
    // Soft rain ambience, volume follows the rain intensity
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1400;
    Music.rainGain = ctx.createGain(); Music.rainGain.gain.value = 0;
    noise.connect(bp); bp.connect(Music.rainGain); Music.rainGain.connect(Music.master); noise.start();
}
 
function tone(freq, type, peak, attack, decay, when = 0) {
    const ctx = Music.ctx, o = ctx.createOscillator(), g = ctx.createGain(), t0 = ctx.currentTime + when;
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
    o.connect(g); g.connect(Music.bus); o.start(t0); o.stop(t0 + attack + decay + 0.1);
}
 
function musicTick() {
    if (!Music.on) return;
    if (Music.step % 8 === 0) {
        Music.chord = (Music.chord + 1) % CHORDS.length;
        CHORDS[Music.chord].forEach((f, i) => tone(f, "sine", 0.05, 1.4, 4.2, i * 0.06));
    }
    if (Math.random() < 0.6) {
        Music.last = Math.max(0, Math.min(SCALE.length - 1, Music.last + Math.floor(Math.random() * 5) - 2));
        const f = SCALE[Music.last];
        tone(f, "triangle", 0.13, 0.01, 1.5);
        tone(f * 2, "sine", 0.025, 0.01, 0.8);
    }
    Music.step++;
}
 
function startMusic() {
    if (!Music.ctx) buildMusic();
    Music.ctx.resume();
    Music.on = true; Music.started = true;
    clearInterval(Music.timer);
    Music.timer = setInterval(musicTick, 480);
    document.getElementById("music-btn").textContent = "🎵";
}
 
function stopMusic() {
    Music.on = false;
    clearInterval(Music.timer);
    document.getElementById("music-btn").textContent = "🔇";
}
 
function toggleMusic() { Music.on ? stopMusic() : startMusic(); }
 
// ---------------------------------------------------------------
// Boot
// ---------------------------------------------------------------
window.onload = () => {
    document.getElementById("version-badge").textContent = "v" + APP_VERSION;
    lucide.createIcons();
 
    bg.cv = document.getElementById("bg-canvas");
    bg.ctx = bg.cv.getContext("2d");
    bgResize();
    window.addEventListener("resize", bgResize);
    requestAnimationFrame(bgFrame);
 
    // Browsers block audio until the first click, so music begins on your first tap
    window.addEventListener("pointerdown", e => {
        if (!Music.started && !e.target.closest("#music-btn")) startMusic();
    }, { once: true });
    document.getElementById("music-volume").addEventListener("input", e => {
        if (Music.master) Music.master.gain.value = e.target.value / 100 * 0.6;
    });
    document.getElementById("music-btn").textContent = "🔇";
 
    restockShops(false);
    refreshSeedSelector();
    document.getElementById("crop-selector").addEventListener("change", renderGarden);
    renderGarden();
    renderActionStack();
    updatePlayerStats();
    startGameClock();
 
    const select = document.getElementById("topic-selector");
    Object.keys(topicTemplates).forEach(k => {
        const opt = document.createElement("option");
        opt.value = k;
        opt.textContent = topicTemplates[k].title;
        select.appendChild(opt);
    });
    loadTopic();
 
    switchTab("greenhouse");
    initPyodide().catch(() => {});
};