const APP_VERSION = "0.26.0";

let pyodideInstance = null;
let gardenGridState = {};
let plantSeq = 0; // planting order (the garden BST is built oldest-first)
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
    "Sakura":         { emoji: "🌸", rarity: "COMMON",    price: 30,  xp: 18 },
    "Lotus":          { emoji: "🪷", rarity: "UNCOMMON",  price: 50,  xp: 30 },
    "Hibiscus":       { emoji: "🌺", rarity: "UNCOMMON",  price: 65,  xp: 40 },
    "Cherry Blossom": { emoji: "🌸", rarity: "RARE",      price: 90,  xp: 60 },
    "Sunflower":      { emoji: "🌻", rarity: "RARE",      price: 110, xp: 75 },
    "Daisy":          { emoji: "🌼", rarity: "LEGENDARY", price: 150, xp: 110 },
    "Morning Glory":  { emoji: "🪻", rarity: "LEGENDARY", price: 180, xp: 135 },
    "Pink Cosmos":    { emoji: "🌷", rarity: "MYTHICAL",  price: 240, xp: 180 },
    "Mexican Aster":  { emoji: "💮", rarity: "MYTHICAL",  price: 300, xp: 230 }
};

// Flower pictures: put the PNGs in the same folder as index.html.
// If you keep them in a sub-folder, change IMG_DIR (for example "images/").
const IMG_DIR = "";
const FLOWER_IMG = {
    "Rose": "rose.png", "Sakura": "sakura.png", "Lotus": "lotus.png", "Hibiscus": "hibiscus.png", "Cherry Blossom": "cherry-blossom.png",
    "Sunflower": "sunflower.png", "Daisy": "daisy.png", "Morning Glory": "morning-glory.png", "Pink Cosmos": "pink-cosmos.png", "Mexican Aster": "mexican-aster.png"
};
const imgSrc = name => IMG_DIR + FLOWER_IMG[name];
function flowerImg(name, size, cls = "") {
    return `<img class="fimg ${cls}" src="${imgSrc(name)}" alt="${name}" draggable="false" style="width:${size}px;height:${size}px" data-fb="${FLOWER_CATALOG[name].emoji}" onerror="imgFail(this)">`;
}
// If a picture is missing, show a small fallback so the game still works
function imgFail(el) {
    const sp = document.createElement("span");
    sp.className = "fimg-fb"; sp.textContent = el.dataset.fb; sp.style.fontSize = parseInt(el.style.width) * 0.75 + "px";
    el.replaceWith(sp);
}

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
let seedStock = { "Rose": 3, "Sakura": 3 };
let flowerInventory = {};
let toolsInventory = { "Water Charges": 30, "Growth Fertilizer": 2, "Sprinkler Level": 1, "Plots": 25 };
const MAX_WATER = 100;
const DAILY_WATER = 30; // the watering can is topped up to 30 at every dawn

// ---------------------------------------------------------------
// Customer orders (reward coins = total flower price)
// ---------------------------------------------------------------
const orderCoins = o => Object.entries(o.items).reduce((s, [f, q]) => s + FLOWER_CATALOG[f].price * q, 0);
const orderXP = o => Object.entries(o.items).reduce((s, [f, q]) => s + FLOWER_CATALOG[f].xp * q, 0);
const orderType = o => (Object.keys(o.items).length > 1 ? "bouquet" : "single");

let activeCustomerOrders = [
    { id: 1, items: { "Rose": 2 } },
    { id: 2, items: { "Rose": 2, "Sakura": 1 } },
    { id: 3, items: { "Sakura": 1 } },
    { id: 4, items: { "Sakura": 2, "Rose": 1 } }
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
        title: "Python OOP + Big O + Stacks",
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
    ("Sakura", "🪻", 30),
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
        title: "Queues & Deques (FIFO Elements)",
        code: `# Topic 2: Queues & Deques (FIFO Elements)
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
        code: `# Topic 3: Static/Dynamic Arrays, 2D Lists, & Memory Structures
from js import addPlantToGrid, getGridCols


GRID_SIZE = 10


class GardenGrid:
    def __init__(self, size=GRID_SIZE):
        self.size = size
        self.grid = [[None for _ in range(size)] for _ in range(size)]

    def plant_at(self, row, col, crop_name):
        cols = getGridCols()                 # how many columns the greenhouse has right now
        if 0 <= row < self.size and 0 <= col < cols:
            self.grid[row][col] = crop_name
            pos = (row * cols) + col         # row-major index: use the REAL width, not GRID_SIZE
            addPlantToGrid(pos, crop_name)
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
        code: `# Topic 4: Hierarchical Trees & Traversals
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


# ---- Game integration: the Flower Almanac tree ----
# Garden Almanac (root) -> Tiers -> Flowers. The game's Flower Almanac calls
# catalog_traverse() below, so you can watch YOUR traversal code run!
from collections import deque


class CatalogNode:
    def __init__(self, name, icon):
        self.name = name
        self.icon = icon
        self.children = []

    def add_child(self, child):
        self.children.append(child)
        return child


def build_catalog_tree():
    data = json.loads(getCatalogJSON())
    root = CatalogNode("Garden Almanac", "📖")
    for tier in data:
        tier_node = root.add_child(CatalogNode(tier["tier"], tier["icon"]))
        for flower in tier["flowers"]:
            tier_node.add_child(CatalogNode(flower["name"], flower["emoji"]))
    return root


def preorder(node, out):
    out.append(node.name)           # visit the node first...
    for child in node.children:     # ...then each child, left to right
        preorder(child, out)
    return out


def postorder(node, out):
    for child in node.children:     # children first...
        postorder(child, out)
    out.append(node.name)           # ...then the node itself
    return out


def inorder(node, out):
    # many children: the first child's subtree, then the node, then the other children
    if not node.children:
        out.append(node.name)
        return out
    inorder(node.children[0], out)
    out.append(node.name)
    for child in node.children[1:]:
        inorder(child, out)
    return out


def level_order(root):
    out, queue = [], deque([root])  # BFS uses a queue
    while queue:
        node = queue.popleft()
        out.append(node.name)
        queue.extend(node.children)
    return out


catalog_root = build_catalog_tree()


def catalog_traverse(mode):
    if mode == "pre":
        return preorder(catalog_root, [])
    if mode == "in":
        return inorder(catalog_root, [])
    if mode == "post":
        return postorder(catalog_root, [])
    return level_order(catalog_root)


pushAction("Built the Flower Almanac tree")
print("Topic 4 Hierarchical Growth Tree structured successfully!")
print("Almanac tree ready: open the Flower Almanac and press a traversal button!")
`
    },
    5: {
        title: "Binary Search Trees (BST) & Node Mutation",
        code: `# Topic 5: Binary Search Trees (BST) & Node Mutation
# Part A: the Bloom Month calendar is a BST keyed by day number. Tap a day in the
#         calendar to see YOUR search path through the tree.
# Part B: every planted flower is a node in a garden BST keyed by its tile number.
#         When a special event (butterfly, rainbow, cotton candy) lands on a flower,
#         the game calls garden_mutate(), which MUTATES that flower's node in place.
import json
from js import pushAction


# ---------- Part A: the weather calendar BST ----------
class WeatherCalendarNode:
    def __init__(self, day, condition, icon, event=None):
        self.day = day
        self.condition = condition
        self.icon = icon
        self.event = event          # None, "butterfly", "rainbow" or "candy"
        self.left = None
        self.right = None


class WeatherCalendarBST:
    def __init__(self):
        self.root = None

    def insert(self, day, condition, icon, event=None):
        node = WeatherCalendarNode(day, condition, icon, event)
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

    def search(self, day):
        # walk down the tree; returns (node or None, the days we visited)
        path, curr = [], self.root
        while curr:
            path.append(curr.day)
            if day == curr.day:
                return curr, path
            curr = curr.left if day < curr.day else curr.right
        return None, path

    def mutate(self, day, event):
        # NODE MUTATION: find the day's node and change its event in place
        node, _ = self.search(day)
        if node is None:
            return False
        node.event = event
        return True


def insert_balanced(tree, items):
    # inserting the middle first keeps the tree short (about 5 levels for 30 days)
    if not items:
        return
    mid = len(items) // 2
    d = items[mid]
    tree.insert(d["day"], d["condition"], d["icon"], d["event"])
    insert_balanced(tree, items[:mid])
    insert_balanced(tree, items[mid + 1:])


calendar_bst = WeatherCalendarBST()
schedule = json.loads(getCalendarJSON())   # this month's real weather and events
insert_balanced(calendar_bst, schedule)


def calendar_search(day):
    # the game's calendar calls this when you tap a day
    node, path = calendar_bst.search(day)
    return path


# ---------- Part B: the garden BST and NODE MUTATION ----------
class FlowerNode:
    def __init__(self, tile, name, price, mutation=None, multiplier=1.0):
        self.tile = tile                # the BST key: it never changes
        self.name = name
        self.price = price
        self.mutation = mutation        # a mutation changes these two fields...
        self.multiplier = multiplier    # ...and nothing else
        self.left = None
        self.right = None

    def sell_price(self):
        return round(self.price * self.multiplier)


class GardenBST:
    def __init__(self):
        self.root = None

    def insert(self, tile, name, price, mutation=None, multiplier=1.0):
        node = FlowerNode(tile, name, price, mutation, multiplier)
        if not self.root:
            self.root = node
            return
        curr = self.root
        while True:
            if tile < curr.tile:
                if not curr.left:
                    curr.left = node
                    break
                curr = curr.left
            else:
                if not curr.right:
                    curr.right = node
                    break
                curr = curr.right

    def search(self, tile):
        path, curr = [], self.root
        while curr:
            path.append(curr.tile)
            if tile == curr.tile:
                return curr, path
            curr = curr.left if tile < curr.tile else curr.right
        return None, path

    def mutate(self, tile, mutation, multiplier):
        # NODE MUTATION: find the node, then change its data IN PLACE.
        # The key (tile) is untouched, so the tree keeps its shape and stays a valid BST.
        node, path = self.search(tile)
        if node is None:
            return None
        node.mutation = mutation
        node.multiplier = multiplier
        return node, path

    def delete(self, tile):
        # the other way a node changes: it is removed (a harvested flower)
        self.root, removed = self._delete(self.root, tile)
        return removed

    def _delete(self, node, tile):
        if node is None:
            return None, False
        if tile < node.tile:
            node.left, removed = self._delete(node.left, tile)
        elif tile > node.tile:
            node.right, removed = self._delete(node.right, tile)
        else:
            if node.left is None:
                return node.right, True
            if node.right is None:
                return node.left, True
            successor = node.right              # two children: copy the in-order successor up
            while successor.left:
                successor = successor.left
            node.tile, node.name, node.price = successor.tile, successor.name, successor.price
            node.mutation, node.multiplier = successor.mutation, successor.multiplier
            node.right, _ = self._delete(node.right, successor.tile)
            removed = True
        return node, removed

    def inorder(self):
        out = []

        def walk(node):
            if node:
                walk(node.left)
                out.append(node)
                walk(node.right)

        walk(self.root)
        return out


def garden_mutate(plants_json, tile, mutation, multiplier):
    # The game calls this when an event mutates a flower.
    # plants_json lists every planted flower (oldest first), so the tree is rebuilt in planting order.
    garden = GardenBST()
    for p in json.loads(plants_json):
        garden.insert(p["tile"], p["name"], p["price"], p["mutation"], p["multiplier"])
    result = garden.mutate(tile, mutation, multiplier)
    if result is None:
        return ""                           # no flower on that tile: the mutation is cancelled
    node, path = result
    return json.dumps({"name": node.name, "mutation": node.mutation, "sell_price": node.sell_price(), "path": path})


pushAction("BST calendar and garden tree initialized")
print("Topic 5 BST ready!")
print("Tap a day in the Bloom Calendar to see your search path.")
print("During a special event, flower mutations now run through garden_mutate()!")
`
    },
    6: { title: "Hash Tables, Collisions, & Rehashing", code: `# Topic 6: Hash Tables, Collisions, & Rehashing\n# ==== WRITE YOUR CODE HERE ====` },
    7: { title: "Graph Foundations, Adjacency Matrices/Lists, & DFS/BFS", code: `# Topic 7: Graph Foundations, Adjacency Matrices/Lists, & DFS/BFS\n# ==== WRITE YOUR CODE HERE ====` },
    8: { title: "Sorting Algorithms (Bubble, Insertion, Selection, Quick, & Merge Sort)", code: `# Topic 8: Sorting Algorithms\n# ==== WRITE YOUR CODE HERE ====` },
    9: { title: "Searching Algorithms (Linear Search vs. Binary Search)", code: `# Topic 9: Searching Algorithms\n# ==== WRITE YOUR CODE HERE ====` },
    10: { title: "Advanced Strategic Paradigms (Dijkstra's Algorithm & Greedy Patterns)", code: `# Topic 10: Advanced Strategic Paradigms\n# ==== WRITE YOUR CODE HERE ====` },
    11: { title: "Dynamic Programming (DP), Memoization, & Divide-and-Conquer", code: `# Topic 11: Dynamic Programming (DP)\n# ==== WRITE YOUR CODE HERE ====` }
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
    pickEvents(thirtyDayWeatherSchedule);
    currentWeather = thirtyDayWeatherSchedule[0];
    currentEvent = currentWeather.event || null;
    updateClimateQueueUI();
}

function updateClimateQueueUI() {
    document.getElementById("weather-icon-badge").innerText = currentWeather.icon;
    document.getElementById("day-label").innerText = `Day ${currentDay} (${currentWeather.name})`;
    const info = WEATHER_INFO[currentWeather.effect], e = currentWeather.event && EVENTS[currentWeather.event];
    document.getElementById("banner-icon").innerText = e ? e.icon : currentWeather.icon;
    document.getElementById("banner-text").innerText = info.text + (e ? `  ${e.icon} ${e.name}: ${e.text}` : "");
    document.getElementById("weather-banner").style.setProperty("--banner-tint", e ? e.tint : info.bg);
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
        pyodideInstance.globals.set("getCatalogJSON", getCatalogJSON);
        pyodideInstance.globals.set("getCalendarJSON", getCalendarJSON);
        pyodideInstance.globals.set("getGridCols", gridCols);
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

let currentSeed = "Rose";
function refreshSeedSelector() {
    const box = document.getElementById("seed-picker");
    if (!box) return;
    const names = Object.keys(FLOWER_CATALOG).filter(isUnlocked);
    if (!names.includes(currentSeed)) currentSeed = names[0];
    box.innerHTML = names.map(n => `<button class="seed-card ${n === currentSeed ? "active" : ""} ${(seedStock[n] || 0) <= 0 ? "empty" : ""}" onclick="pickSeed('${n}')" title="${n}">
        ${flowerImg(n, 46)}<span class="sn">${n}</span><span class="sc">x${seedStock[n] || 0}</span></button>`).join("");
}
function pickSeed(n) { currentSeed = n; refreshSeedSelector(); renderGarden(); }
const selectedSeed = () => currentSeed;

// ---------------------------------------------------------------
// Greenhouse
// ---------------------------------------------------------------
const MATURE = 4;
const SOIL = "<ellipse cx='24' cy='44' rx='15' ry='5' fill='#b98562' opacity='.55'/>";
const LEAFP = (x, y, rx, rot, c) => `<ellipse cx='${x}' cy='${y}' rx='${rx}' ry='4' fill='${c}' transform='rotate(${rot} ${x} ${y})'/>`;
const STAGE_NAMES = ["Seed", "Sprout", "Leafy", "Budding", "Bloomed"];
const STAGE_SVG = [
    `<svg viewBox='0 0 48 52'>${SOIL}<ellipse cx='24' cy='38' rx='7' ry='9' fill='#8a5a3a' transform='rotate(-15 24 38)'/><path d='M21 32 q3 -4 6 0' stroke='#c9a07a' fill='none' stroke-width='1.6' stroke-linecap='round'/></svg>`,
    `<svg viewBox='0 0 48 52'>${SOIL}<path d='M24 44 V30' stroke='#6fbf86' stroke-width='3' stroke-linecap='round'/>${LEAFP(17, 29, 8, -30, "#8fd3a0")}${LEAFP(31, 27, 8, 30, "#7fc995")}</svg>`,
    `<svg viewBox='0 0 48 52'>${SOIL}<path d='M24 44 V16' stroke='#6fbf86' stroke-width='3.2' stroke-linecap='round'/>${LEAFP(15, 35, 9, -30, "#8fd3a0")}${LEAFP(33, 31, 9, 30, "#7fc995")}${LEAFP(16, 23, 8, -35, "#9ddcae")}${LEAFP(32, 19, 8, 35, "#8fd3a0")}</svg>`,
    `<svg viewBox='0 0 48 52'>${SOIL}<path d='M24 44 V14' stroke='#5fb57a' stroke-width='3.4' stroke-linecap='round'/>${LEAFP(14, 36, 10, -30, "#8fd3a0")}${LEAFP(34, 32, 10, 30, "#7fc995")}${LEAFP(15, 25, 8, -35, "#9ddcae")}${LEAFP(33, 21, 8, 35, "#8fd3a0")}<circle cx='24' cy='11' r='7' fill='#ffc2d6'/><path d='M18 14 q6 6 12 0' fill='#8fd3a0'/><circle cx='22' cy='9' r='2' fill='#fff' opacity='.6'/></svg>`
];

function growSeconds(plant) {
    let s = TIERS[FLOWER_CATALOG[plant.name].rarity].sec / (1 + 0.25 * (toolsInventory["Sprinkler Level"] - 1));
    if (currentWeather.effect === "speed_boost") s *= 0.7;
    if (currentWeather.effect === "dry_fast") s *= 1.25;
    return Math.max(1, Math.round(s));
}

const waterCost = () => (currentWeather.effect === "dry_fast" ? 2 : 1);

function bloomHTML(name, big, extraClass = "") {
    return `<div class="plant-wrap ${extraClass}">${flowerImg(name, big + 14, "bloom-img")}</div>`;
}

function addPlantToGrid(pos, name) {
    if (!FLOWER_CATALOG[name]) name = "Rose";
    const isAutoWater = currentWeather.effect === "auto_water";
    gardenGridState[pos] = { name, stageIndex: 0, watered: isAutoWater, growing: false, growthProgress: 0, damaged: false, timer: null, mutation: null, seq: ++plantSeq };
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
                if (currentWeather.effect === "auto_water") { plant.watered = true; renderTile(pos); startPlantGrowthTimer(pos); return; } // the rain keeps watering
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
        if (plant.mutation) cls += ` mutated mut-${plant.mutation}`;
        cell.className = cls;
        const m = plant.mutation && MUTATIONS[plant.mutation];
        cell.title = `${m ? m.name + " " : ""}${plant.name} (stage ${Math.min(plant.stageIndex + 1, 5)}/5)`;
        const art = ready ? bloomHTML(plant.name, 36, "ready-plant") : `<div class="plant-wrap stage">${STAGE_SVG[plant.stageIndex]}</div>`;
        let badge;
        if (ready) badge = `<span class="tile-badge bg-emerald-100 text-emerald-700">Ready ✨</span>`;
        else if (plant.growing) badge = `<span class="tile-badge bg-amber-100 text-amber-700">⏳ ${plant.growthProgress}s</span>`;
        else if (!plant.watered) badge = `<span class="tile-badge bg-sky-100 text-sky-700">Dry 💧</span>`;
        else badge = `<span class="tile-badge bg-emerald-100 text-emerald-700">Watered</span>`;
        const tag = m ? `<span class="mut-tag">${m.icon} ${m.name} x${m.mult}</span>` : "";
        const perch = m && (plant.mutation === "pollinated" || plant.mutation === "winged") ? `<img class="perch" src="assets/butterfly-${(Number(i) % 8) + 1}.png" alt="" onerror="this.remove()">` : "";
        cell.innerHTML = art + badge + tag + perch;
    } else {
        // Empty tile: hover shows the matured look of the selected seed
        const seed = selectedSeed();
        cell.className = cls;
        cell.innerHTML = `<span class="faint">${STAGE_SVG[1]}</span>
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

    if (plant && plant.damaged) { showToast("Tile damaged by the earthquake! Buy a Repair Kit in the Tool Shop."); return; }

    // ---- Fertilizer tool ----
    if (currentTool === "fert") {
        if (!plant) { showToast("Plant something first, fertilizer only works on growing flowers."); return; }
        if (plant.stageIndex >= MATURE) { showToast(`${plant.name} is already bloomed!`); return; }
        if (toolsInventory["Growth Fertilizer"] <= 0) { showToast("No fertilizer left! Buy more in the Tool Shop."); return; }
        const prev = { stageIndex: plant.stageIndex, watered: plant.watered, growing: plant.growing };
        toolsInventory["Growth Fertilizer"]--;
        clearInterval(plant.timer);
        plant.stageIndex = MATURE; plant.growing = false; plant.watered = true;
        floatPop("-1 🧪", "loss", el);
        pushAction(`Fertilized ${plant.name} (was ${STAGE_NAMES[prev.stageIndex]})`, () => undoFertilize(i, plant, prev));
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
        floatPop(`-1 ${flowerImg(cropName, 20)} seed`, "loss", el);
        let viaPython = false;
        if (pyodideInstance) {
            const before = new Set(Object.keys(gardenGridState));
            journalMute++;
            try { await pyodideInstance.runPythonAsync(`plant_crop(${row}, ${col}, '${cropName.replace(/'/g, "\\'")}')`); } catch (e) {}
            journalMute--;
            // Safety net: your Python code may only ever plant on the tile that was clicked
            Object.keys(gardenGridState).forEach(k => { if (!before.has(k) && Number(k) !== i) { clearInterval(gardenGridState[k].timer); delete gardenGridState[k]; renderTile(k); } });
            viaPython = !!gardenGridState[i];
        }
        if (!viaPython) addPlantToGrid(i, cropName);
        const planted = gardenGridState[i];
        pushAction(`Planted ${cropName} (${row},${col})`, () => undoPlant(i, planted, cropName));
        updatePlayerStats();
        showToast(currentWeather.effect === "auto_water" ? `Planted ${cropName}! The rain waters it for you.` : `Planted ${cropName}! Click it to water.`);
        return;
    }

    // ---- Harvest ----
    if (plant.stageIndex >= MATURE) {
        const snap = plant, wasNew = !discovered[plant.name];
        const mutName = plant.mutation ? MUTATIONS[plant.mutation].name + " " : "";
        if (plant.mutation) { const mk = `${plant.name}|${plant.mutation}`; mutInventory[mk] = (mutInventory[mk] || 0) + 1; }
        else flowerInventory[plant.name] = (flowerInventory[plant.name] || 0) + 1;
        discoverFlower(plant.name);
        dailyStats.harvestCount++;
        floatPop(`+1 ${flowerImg(plant.name, 20)} ${mutName}${plant.name}`, "gain", el);
        showToast(`Harvested 1x ${mutName}${plant.name} (${FLOWER_CATALOG[plant.name].rarity}) into your inventory! 🧺`);
        pushAction(`Harvested ${mutName}${plant.name}`, () => undoHarvest(i, snap, wasNew));
        delete gardenGridState[i];
        renderTile(i); updatePlayerStats();
        return;
    }

    if (plant.growing) { showToast(`${plant.name} is growing (${plant.growthProgress}s left)... ⏳`); return; }

    // ---- Water (free on rainy days) ----
    if (!plant.watered) {
        const cost = currentWeather.effect === "auto_water" ? 0 : waterCost();
        if (toolsInventory["Water Charges"] < cost) { showToast("Your watering can is empty! Buy a refill in the Tool Shop."); return; }
        toolsInventory["Water Charges"] -= cost;
        plant.watered = true;
        const stageAt = plant.stageIndex;
        if (cost) floatPop(`-${cost} 💧`, "loss", el);
        startPlantGrowthTimer(i);
        pushAction(`Watered ${plant.name} (${STAGE_NAMES[stageAt]} stage)`, () => undoWater(i, plant, stageAt, cost));
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
// Inventory (big satchel) & Customer orders (big tickets)
// ---------------------------------------------------------------
const CUSTOMERS = [["Mia", "👧"], ["Lola Rosa", "👵"], ["Kuya Ben", "🧑‍🌾"], ["Ate Luz", "👩‍🎤"], ["Tito Jun", "👨‍🍳"], ["Nene", "🧒"], ["Mang Tonyo", "👴"], ["Ms. Cruz", "👩‍🏫"]];
const orderWho = o => CUSTOMERS[Math.floor(Math.abs(Number(o.id)) * 7919) % CUSTOMERS.length];

// Mutated flowers are stored apart as "Rose|prismatic". They count for orders and pay extra.
const mutKeys = f => Object.keys(mutInventory).filter(k => k.startsWith(f + "|") && mutInventory[k] > 0);
const ownedTotal = f => (flowerInventory[f] || 0) + mutKeys(f).reduce((s, k) => s + mutInventory[k], 0);

// Which flowers an order would use: best mutations first, then plain ones
function consumePlan(o) {
    const picks = []; let coins = 0, ok = true;
    for (const [f, q] of Object.entries(o.items)) {
        let need = q;
        const stacks = mutKeys(f).sort((a, b) => MUTATIONS[b.split("|")[1]].mult - MUTATIONS[a.split("|")[1]].mult);
        for (const k of stacks) {
            if (!need) break;
            const mk = k.split("|")[1], n = Math.min(need, mutInventory[k]);
            picks.push({ k, f, mut: mk, n }); coins += n * mutPrice(f, mk); need -= n;
        }
        if (need) { const n = Math.min(need, flowerInventory[f] || 0); if (n) { picks.push({ k: null, f, mut: null, n }); coins += n * mutPrice(f, null); } need -= n; }
        if (need) ok = false;
    }
    return { ok, coins, picks };
}

function renderInventoryView() {
    const c = document.getElementById("inventory-container");
    if (!c) return;
    const flowers = Object.entries(flowerInventory).filter(([, n]) => n > 0);
    const muts = Object.entries(mutInventory).filter(([, n]) => n > 0);
    const seeds = Object.entries(seedStock).filter(([, n]) => n > 0);
    const totalF = flowers.reduce((s, [, n]) => s + n, 0) + muts.reduce((s, [, n]) => s + n, 0);
    const totalV = flowers.reduce((s, [f, n]) => s + n * FLOWER_CATALOG[f].price, 0) + muts.reduce((s, [k, n]) => { const [f, mk] = k.split("|"); return s + n * mutPrice(f, mk); }, 0);
    const totalS = seeds.reduce((s, [, n]) => s + n, 0);
    const stat = (ic, val, label, a, b, bd) => `<div class="inv-stat" style="--s1:${a};--s2:${b};--s3:${bd}"><span class="ic">${ic}</span><div><b>${val}</b><span class="l">${label}</span></div></div>`;

    const mutCards = muts.map(([k, n]) => {
        const [f, mk] = k.split("|"), d = FLOWER_CATALOG[f], m = MUTATIONS[mk], each = mutPrice(f, mk);
        return `<div class="inv-card tc-${d.rarity} mut mut-${mk}"><span class="mrib">${m.icon} ${m.name}</span><span class="qty">x${n}</span><div style="height:14px"></div>${flowerImg(f, 104)}<h4>${f}</h4>
            <span class="bonus">x${m.mult} · +${each - d.price}c each</span><div><span class="val">🪙 ${each * n} (${each} each)</span></div></div>`;
    }).join("");
    const plainCards = flowers.map(([f, n]) => {
        const d = FLOWER_CATALOG[f];
        return `<div class="inv-card tc-${d.rarity}"><span class="qty">x${n}</span>${flowerImg(f, 104)}<h4>${f}</h4>
            <span class="rar rar-${d.rarity}">${d.rarity}</span><div><span class="val">🪙 ${d.price * n} (${d.price} each)</span></div></div>`;
    }).join("");
    const basket = mutCards + plainCards || `<div class="inv-empty">${flowerImg("Rose", 110)}<br>Your basket is empty.<br>Plant, water and harvest flowers to fill it!</div>`;

    const packets = seeds.map(([f, n]) => {
        const d = FLOWER_CATALOG[f];
        return `<div class="inv-card tc-${d.rarity}" style="padding-top:12px"><span class="qty">x${n}</span>${flowerImg(f, 64)}<h4 style="font-size:17px">${f} seeds</h4></div>`;
    }).join("") || `<div class="inv-empty" style="padding:14px">No seeds left. Visit the Seed Shop on the right.</div>`;

    const water = toolsInventory["Water Charges"], fert = toolsInventory["Growth Fertilizer"], lvl = toolsInventory["Sprinkler Level"], plots = toolsInventory["Plots"];
    const tool = (ic, name, line, inner, c1, c2) => `<div class="tool-card" style="--c1:${c1};--c2:${c2}"><span class="ic">${ic}</span><div class="flex-1"><b class="title-font text-xl">${name}</b><div class="text-xs font-bold" style="color:var(--ink-soft)">${line}</div>${inner}</div></div>`;
    const meter = (pct, m1, m2) => `<div class="meter" style="--m1:${m1};--m2:${m2}"><i style="width:${Math.min(100, pct)}%"></i></div>`;
    const tools = tool("💧", "Water charges", `${water} / ${MAX_WATER} left · refills to ${DAILY_WATER} every dawn`, meter(water, "#b5d3f8", "#8fe0e8"), "#a9cdf2", "#e6f1fc")
        + tool("🧪", "Growth fertilizer", `${fert} bottles`, meter(fert * 10, "#fbe0a0", "#f8c47e"), "#f4d27c", "#fff5d6")
        + tool("⚡", "Sprinkler level", `Level ${lvl} of 5`, `<div class="pips">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= lvl ? "on" : ""}"></i>`).join("")}</div>`, "#e0acf0", "#f7e8fc")
        + tool("🌿", "Flower beds", `${plots} / 100 plots`, meter(plots, "#c0e8ac", "#8cd6aa"), "#a6dcb8", "#e5f7ea");

    c.innerHTML = `<div class="inv-stats">
            ${stat("🧺", totalF, "Flowers in basket", "#fff", "#ffe6ef", "#f4c6d6")}${stat("🪙", totalV, "Basket value (coins)", "#fff", "#fff3cc", "#f3d98a")}
            ${stat("🌱", totalS, "Seeds in bag", "#fff", "#e5f7ea", "#a6dcb8")}${stat("📖", `${discoveredCount()}/${Object.keys(FLOWER_CATALOG).length}`, "Almanac discovered", "#fff", "#f1e8fc", "#d3c1f0")}</div>
        <div class="inv-sec grow"><h3>Harvest Basket <small>${totalF} flowers ready to sell${muts.length ? " · mutated ones pay extra!" : ""}</small></h3><div class="inv-grid">${basket}</div></div>
        <div class="inv-sec"><h3>Seed Bag <small>${totalS} seeds</small></h3><div class="inv-grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">${packets}</div></div>
        <div class="inv-sec"><h3>Tool Shelf</h3><div class="inv-grid" style="grid-template-columns:repeat(auto-fit,minmax(230px,1fr))">${tools}</div></div>`;
}

// ---------------------------------------------------------------
// Orders
// ---------------------------------------------------------------
function canFulfill(o) { return consumePlan(o).ok; }

function deliverOrder(orderId) {
    const idx = activeCustomerOrders.findIndex(o => o.id === orderId);
    if (idx === -1) return;
    const order = activeCustomerOrders[idx], plan = consumePlan(order);
    if (!plan.ok) { showToast("Not enough flowers in your inventory for this order!"); return; }
    plan.picks.forEach(p => {
        if (p.k) { mutInventory[p.k] -= p.n; if (!mutInventory[p.k]) delete mutInventory[p.k]; }
        else { flowerInventory[p.f] -= p.n; if (!flowerInventory[p.f]) delete flowerInventory[p.f]; }
    });
    const coins = plan.coins, xp = orderXP(order), bonus = coins - orderCoins(order);
    playerCoins += coins; playerXP += xp;
    dailyStats.coinsEarned += coins; dailyStats.salesCount++;
    showToast(`Order fulfilled! +${coins} Coins${bonus > 0 ? ` (incl. +${bonus} mutation bonus ✨)` : ""} & +${xp} XP 🪙`);
    const fresh = generateNewOrder();
    activeCustomerOrders.splice(idx, 1, fresh);
    pushAction(`Delivered order to ${orderWho(order)[0]} (+${coins}c)`, () => undoDeliver(order, fresh.id, plan, coins, xp));
    document.getElementById("coins-text").classList.add("bump");
    setTimeout(() => document.getElementById("coins-text").classList.remove("bump"), 500);
    updatePlayerStats();
}

function renderCustomerOrders() {
    const c = document.getElementById("orders-list-container");
    if (!c) return;
    const plans = activeCustomerOrders.map(o => ({ o, plan: consumePlan(o) }));
    const ready = plans.filter(x => x.plan.ok).length;
    const potential = plans.reduce((s, x) => s + (x.plan.ok ? x.plan.coins : orderCoins(x.o)), 0);
    const cards = plans.map(({ o, plan }) => {
        const ok = plan.ok, [who, face] = orderWho(o), base = orderCoins(o);
        const items = Object.entries(o.items).map(([f, q]) => {
            const have = ownedTotal(f), d = FLOWER_CATALOG[f], usedMut = plan.picks.filter(p => p.f === f && p.mut);
            return `<div class="ord-item tc-${d.rarity}"><div class="ord-img">${flowerImg(f, 62)}</div>
                <div class="ord-info"><b>${f}</b> <span class="rar rar-${d.rarity}">${d.rarity}</span>
                <div class="meter" style="--m1:${have >= q ? "#a9dbb8" : "#ffc2d6"};--m2:${have >= q ? "#7fcf9c" : "#f6a6c1"}"><i style="width:${Math.min(100, (have / q) * 100)}%"></i></div>
                <div class="cnt" style="color:${have >= q ? "#2f8f62" : "#c4466b"}">${have >= q ? "✓ " : ""}${have} / ${q} in basket · ${d.price}c each</div>
                ${usedMut.length ? `<span class="bonus">${usedMut.map(p => `${MUTATIONS[p.mut].icon} ${p.n}x ${MUTATIONS[p.mut].name}`).join(", ")}</span>` : ""}</div></div>`;
        }).join("");
        const reward = ok ? plan.coins : base;
        return `<div class="ord-card ${ok ? "ready" : ""}"><span class="ord-pin"></span>
            <div class="ord-top"><div class="avatar">${face}</div><div><div class="who">${who}</div><div class="kind">${orderType(o) === "bouquet" ? "Wants a custom bouquet" : "Wants a single flower"}</div></div>
            <span class="ord-badge">${ok ? "Ready to deliver!" : "Gathering..."}</span></div>
            <div class="ord-items">${items}</div>
            <div class="ord-foot"><div class="ord-reward"><span>🪙 +${reward} coins</span>${ok && reward > base ? `<span class="bonus">✨ +${reward - base} mutation bonus</span>` : ""}<span>⭐ +${orderXP(o)} XP</span></div>
            <button onclick="deliverOrder(${o.id})" class="btn-pastel btn-mint px-6 py-2.5 text-sm ${ok ? "" : "btn-disabled"}">Deliver order</button></div></div>`;
    }).join("");
    c.innerHTML = `<div class="inv-stats" style="grid-template-columns:repeat(3,1fr)">
        <div class="inv-stat" style="--s2:#ffe6ef;--s3:#f4c6d6"><span class="ic">📋</span><div><b>${activeCustomerOrders.length}</b><span class="l">Open requests</span></div></div>
        <div class="inv-stat" style="--s2:#e5f7ea;--s3:#a6dcb8"><span class="ic">✅</span><div><b>${ready}</b><span class="l">Ready to deliver</span></div></div>
        <div class="inv-stat" style="--s2:#fff3cc;--s3:#f3d98a"><span class="ic">🪙</span><div><b>${potential}</b><span class="l">Coins waiting</span></div></div></div>
        <div class="ord-grid">${cards}</div>`;
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
    pushAction(`Unlocked ${tier} tier`, () => undoUnlockTier(tier));
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
    pushAction(`Bought ${qty} ${name} seed${qty > 1 ? "s" : ""} (-${total}c)`, () => undoBuySeed(name, qty, total));
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
    const cost = toolCost(k), waterBefore = toolsInventory["Water Charges"], repairPos = k === "repair" ? damaged[0] : null, repairSnap = repairPos != null ? { ...gardenGridState[repairPos] } : null;
    if (!spend(cost)) return;
    shopStock.tools[k]--;
    if (k === "water") toolsInventory["Water Charges"] = Math.min(MAX_WATER, toolsInventory["Water Charges"] + 20);
    if (k === "fert") toolsInventory["Growth Fertilizer"]++;
    if (k === "sprinkler") toolsInventory["Sprinkler Level"]++;
    if (k === "plots") { toolsInventory["Plots"] = Math.min(100, toolsInventory["Plots"] + 5); renderGarden(); }
    if (k === "repair") { delete gardenGridState[damaged[0]]; renderGarden(); }
    const added = toolsInventory["Water Charges"] - waterBefore;
    pushAction(`Bought ${TOOL_META[k].name} (-${cost}c)`, () => undoBuyTool(k, cost, added, repairPos, repairSnap));
    showToast(`${TOOL_META[k].icon} ${TOOL_META[k].name} purchased!`);
    updatePlayerStats();
}

function renderStalls() {
    const seedCount = Object.values(shopStock.seeds).reduce((a, b) => a + b, 0);
    const toolCount = Object.values(shopStock.tools).reduce((a, b) => a + b, 0);
    const s = document.getElementById("seed-badge"), t = document.getElementById("tool-badge");
    if (s) s.textContent = `${seedCount} in stock`;
    if (t) t.textContent = `${toolCount} in stock`;
    renderAlmanacBadge();
}

// ---------------------------------------------------------------
// Special events & flower mutations
//   Butterfly / Rainbow / Cotton Candy events are rolled at random for each player's month.
//   During an event, magic lands on random planted flowers and mutates them (they sell for more).
// ---------------------------------------------------------------
const EVENTS = {
    butterfly: { name: "Butterfly Event", icon: "🦋", color: "#ffd1ea", tint: "rgba(255,196,228,0.62)", text: "Butterflies flutter across the garden and land on random flowers, mutating them!" },
    rainbow:   { name: "Rainbow Event",   icon: "🌈", color: "#ffe6b8", tint: "rgba(255,226,170,0.62)", text: "A rainbow arches over the garden and sprinkles magic on random flowers!" },
    candy:     { name: "Cotton Candy Event", icon: "🍭", color: "#ffc9e1", tint: "rgba(255,186,220,0.62)", text: "Sweet cotton candy drifts down and sugar-coats random flowers!" }
};
const MUTATIONS = {
    pollinated:  { name: "Pollinated",        icon: "🦋", mult: 1.5 },
    winged:      { name: "Butterfly Blessed", icon: "🦋", mult: 2.5 },
    shimmer:     { name: "Shimmering",        icon: "✨", mult: 2 },
    prismatic:   { name: "Prismatic",         icon: "🌈", mult: 3.5 },
    sugarcoated: { name: "Sugarcoated",       icon: "🍬", mult: 2 },
    cottoncandy: { name: "Cotton Candy",      icon: "🍭", mult: 4 }
};
const EVENT_MUT = { butterfly: [["pollinated", 0.7], ["winged", 0.3]], rainbow: [["shimmer", 0.65], ["prismatic", 0.35]], candy: [["sugarcoated", 0.65], ["cottoncandy", 0.35]] };
let currentEvent = null, eventTimer = null;
let mutInventory = {}; // "Rose|prismatic": how many harvested
const mutPrice = (f, key) => Math.round(FLOWER_CATALOG[f].price * (key ? MUTATIONS[key].mult : 1));

// Roll this player's events for the month (never on day 1, never on earthquake days)
function pickEvents(sched) {
    const days = sched.filter(w => w.day > 1 && w.effect !== "soil_damage").map(w => w.day);
    for (let i = days.length - 1; i > 0; i--) { const j = rand(0, i);[days[i], days[j]] = [days[j], days[i]]; }
    const kinds = ["butterfly", "rainbow", "candy"].sort(() => Math.random() - 0.5);
    days.slice(0, rand(6, 8)).forEach((d, i) => { sched[d - 1].event = kinds[i % 3]; });
}

function applyDayEvent(announce) {
    currentEvent = (currentWeather && currentWeather.event) || null;
    clearTimeout(eventTimer);
    if (!currentEvent) return;
    if (announce) showToast(`${EVENTS[currentEvent].icon} ${EVENTS[currentEvent].name} begins today!`);
    scheduleEventTick(true);
}

function scheduleEventTick(first) {
    clearTimeout(eventTimer);
    if (!currentEvent) return;
    eventTimer = setTimeout(() => { eventTick(); scheduleEventTick(); }, first ? 2500 + Math.random() * 2000 : 4500 + Math.random() * 4500);
}

// Every few seconds the event picks ONE random flower (not every tile gets one)
function eventTick() {
    if (eodOpen || !currentEvent) return;
    const pool = Object.keys(gardenGridState).filter(k => { const p = gardenGridState[k]; return p && !p.damaged && !p.mutation && !p.incoming; });
    if (!pool.length || Math.random() < 0.25) return;
    const pos = pool[rand(0, pool.length - 1)], kind = currentEvent;
    gardenGridState[pos].incoming = true;
    playEventActor(kind, pos, () => applyMutation(pos, kind));
}

// Topic 5: flowers live in a garden BST (key = tile number). A mutation changes a node IN PLACE.
function gardenNodes() {
    return Object.entries(gardenGridState).filter(([, p]) => p && !p.damaged).sort((a, b) => (a[1].seq || 0) - (b[1].seq || 0))
        .map(([tile, p]) => ({ tile: Number(tile), name: p.name, price: FLOWER_CATALOG[p.name].price, mutation: p.mutation || null, multiplier: p.mutation ? MUTATIONS[p.mutation].mult : 1 }));
}

function treeMutate(pos, m, key) {
    const nodes = gardenNodes(), tile = Number(pos);
    try {
        const fn = pyodideInstance && pyodideInstance.globals.get("garden_mutate");
        if (fn) {
            const out = fn(JSON.stringify(nodes), tile, key, m.mult); fn.destroy();
            if (!out) return null;                         // your Python found no such node: cancelled
            const r = JSON.parse(out); r.src = "your Python BST 🐍"; return r;
        }
    } catch (e) { /* if the Python code has an error, use the JavaScript version below */ }
    // The same BST in JavaScript (used until Topic 5 has been run in the code lab)
    let root = null;
    nodes.forEach(n => {
        const node = { ...n, left: null, right: null };
        if (!root) { root = node; return; }
        let c = root;
        for (;;) { if (n.tile < c.tile) { if (!c.left) { c.left = node; break; } c = c.left; } else { if (!c.right) { c.right = node; break; } c = c.right; } }
    });
    const path = []; let c = root;
    while (c) {
        path.push(c.tile);
        if (c.tile === tile) { c.mutation = key; c.multiplier = m.mult; return { name: c.name, mutation: key, path, src: "JavaScript" }; } // the node is changed in place
        c = tile < c.tile ? c.left : c.right;
    }
    return null;
}

function applyMutation(pos, kind) {
    const plant = gardenGridState[pos];
    if (!plant) return;
    delete plant.incoming;
    if (plant.damaged || plant.mutation) return;
    let roll = Math.random(), acc = 0, key = EVENT_MUT[kind][0][0];
    for (const [k, c] of EVENT_MUT[kind]) { acc += c; if (roll < acc) { key = k; break; } }
    const m = MUTATIONS[key];
    const node = treeMutate(pos, m, key);        // the NODE MUTATION happens in the garden BST
    if (!node) return;                           // node not found: nothing mutates
    plant.mutation = key;
    showToast(`${m.icon} Your ${plant.name} mutated: ${m.name}! Sells for x${m.mult} · BST path ${node.path.join(" → ")} (${node.src})`);
    pushAction(`${plant.name} became ${m.name} (x${m.mult})`);
    renderTile(pos);
}

// ---- Flying event actors (butterfly lands on a flower, rainbow orb / candy puff drops down) ----
function tileCenter(pos) {
    const view = document.getElementById("view-greenhouse");
    if (!view || view.classList.contains("hidden")) return null;
    const tile = document.querySelector(`#garden-grid > [data-pos="${pos}"]`);
    if (!tile) return null;
    const r = tile.getBoundingClientRect();
    if (!r.width || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return null;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function playEventActor(kind, pos, done) {
    const tc = tileCenter(pos);
    if (!tc) { done(); return; } // the garden is off-screen: the mutation still happens
    let layer = document.getElementById("actor-layer");
    if (!layer) { layer = document.createElement("div"); layer.id = "actor-layer"; document.body.appendChild(layer); }
    const el = document.createElement("div");
    el.className = "actor";
    let x0, y0, flight, hold;
    if (kind === "butterfly") {
        x0 = Math.random() < 0.5 ? -80 : innerWidth + 80; y0 = 40 + Math.random() * innerHeight * 0.45; flight = 2700; hold = 2200;
        el.innerHTML = `<img class="ba" src="assets/butterfly-${rand(1, 8)}.png" alt="" onerror="this.outerHTML='<span style=\\'font-size:44px\\'>🦋</span>'">`;
    } else if (kind === "rainbow") {
        x0 = innerWidth * 0.5 + rand(-140, 140); y0 = -40; flight = 1900; hold = 250;
        el.innerHTML = '<div class="orb-rainbow"></div>';
    } else {
        x0 = tc.x + rand(-170, 170); y0 = -40; flight = 2300; hold = 250;
        el.innerHTML = '<div class="orb-candy"></div>';
    }
    el.style.setProperty("--dur", flight / 1000 + "s");
    el.style.transform = `translate(${x0}px,${y0}px)`;
    layer.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => { el.style.transform = `translate(${tc.x}px,${tc.y - 10}px)`; }));
    setTimeout(() => {
        el.classList.add("landed");
        setTimeout(() => {
            const c = tileCenter(pos) || tc;
            spawnBurst(c.x, c.y, kind);
            done();
            if (kind === "butterfly") { el.classList.remove("landed"); el.style.setProperty("--dur", "2.2s"); el.style.transform = `translate(${innerWidth + 90}px,-60px)`; setTimeout(() => el.remove(), 2300); }
            else { el.style.opacity = 0; setTimeout(() => el.remove(), 700); }
        }, hold);
    }, flight);
}

function spawnBurst(x, y, kind) {
    const glyphs = { rainbow: ["✨", "🌈", "⭐"], candy: ["🍬", "🍭", "💖"] }[kind];
    for (let i = 0; i < 9; i++) {
        const s = document.createElement("span");
        s.className = "burst";
        s.innerHTML = glyphs ? glyphs[i % glyphs.length] : flowerImg(Object.keys(FLOWER_CATALOG)[rand(0, 9)], 18);
        const a = Math.random() * 6.28, d = 36 + Math.random() * 46;
        s.style.cssText = `left:${x}px;top:${y}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 14}px`;
        document.body.appendChild(s);
        setTimeout(() => s.remove(), 1000);
    }
}

// Click animation: a ripple ring, a burst of stars and petals, and a little flower that blooms
let lastBloom = 0;
document.addEventListener("pointerdown", e => {
    if (e.target.closest && e.target.closest("input,select,textarea")) return;
    const x = e.clientX, y = e.clientY, put = (el, life) => { document.body.appendChild(el); setTimeout(() => el.remove(), life); };
    ["", "two"].forEach(c => { const r = document.createElement("span"); r.className = "click-ring " + c; r.style.cssText = `left:${x}px;top:${y}px`; put(r, 800); });
    for (let i = 0; i < 6; i++) {
        const st = document.createElement("span"), a = (i / 6) * 6.28 + Math.random() * 0.5, d = 30 + Math.random() * 30;
        st.className = "click-star"; st.style.cssText = `left:${x}px;top:${y}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;--sc:${["#ffd45e", "#ff9fc0", "#c9b2f5", "#9fe3c0"][i % 4]}`;
        put(st, 800);
    }
    for (let i = 0; i < 4; i++) {
        const s2 = document.createElement("span"), a = Math.random() * 6.28, d = 26 + Math.random() * 34;
        s2.className = "click-petal"; s2.innerHTML = flowerImg(Object.keys(FLOWER_CATALOG)[rand(0, 9)], 16);
        s2.style.cssText = `left:${x}px;top:${y}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 14}px`;
        put(s2, 800);
    }
    const now = Date.now();
    if (now - lastBloom > 160) {
        lastBloom = now;
        const b2 = document.createElement("span"); b2.className = "click-bloom"; b2.innerHTML = flowerImg(Object.keys(FLOWER_CATALOG)[rand(0, 9)], 34);
        b2.style.cssText = `left:${x}px;top:${y}px`; put(b2, 900);
    }
});

// A faint sparkle trail follows the mouse
if (!(typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches)) {
    let lastTrail = 0;
    document.addEventListener("pointermove", e => {
        if (e.pointerType && e.pointerType !== "mouse") return;
        const n = Date.now(); if (n - lastTrail < 55) return; lastTrail = n;
        const d = document.createElement("span");
        d.className = "trail-dot";
        d.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;--tx:${(Math.random() - 0.5) * 28}px;--ty:${8 + Math.random() * 20}px;--sc:${["#ffd45e", "#ff9fc0", "#c9b2f5", "#9fe3c0"][rand(0, 3)]}`;
        document.body.appendChild(d); setTimeout(() => d.remove(), 850);
    });
}

// ---- Calendar (tulip wall calendar, now with events) ----
let calSelected = null;
function getCalendarJSON() {
    return JSON.stringify(thirtyDayWeatherSchedule.map(w => ({ day: w.day, condition: w.name, icon: w.icon, event: w.event || null })));
}
function selectCalDay(d) { calSelected = d; refreshModal(); }
// Look a day up in the calendar BST: your Python code if Topic 5 was run, otherwise the same search in JavaScript
function lookupDay(day) {
    let path = null, src = "JavaScript";
    try {
        const fn = pyodideInstance && pyodideInstance.globals.get("calendar_search");
        if (fn) { const res = fn(day); path = Array.from(res.toJs ? res.toJs() : res); src = "your Python BST 🐍"; if (res.destroy) res.destroy(); fn.destroy(); }
    } catch (e) { path = null; }
    if (!path) {
        const days = thirtyDayWeatherSchedule.map(w => w.day); path = [];
        let lo = 0, hi = days.length - 1;
        while (lo <= hi) { const mid = lo + Math.floor((hi - lo + 1) / 2); path.push(days[mid]); if (days[mid] === day) break; if (day < days[mid]) hi = mid - 1; else lo = mid + 1; }
    }
    return { path, src };
}

function renderCalendarWidget() {
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    set("cal-day-num", currentDay);
    set("cal-icon", currentWeather.icon);
    set("cal-name", currentWeather.name);
    const next = thirtyDayWeatherSchedule[currentDay % 30];
    set("cal-sub", next ? `Tomorrow: ${next.icon} ${next.name}${next.event ? " " + EVENTS[next.event].icon : ""}` : "Tap to see the month");
    const ev = document.getElementById("cal-event");
    if (ev) { const e = currentWeather.event && EVENTS[currentWeather.event]; ev.style.display = e ? "" : "none"; ev.textContent = e ? `${e.icon} ${e.name} today!` : ""; }
}

function buildCalendarModal() {
    const cells = thirtyDayWeatherSchedule.map(w => {
        const cls = w.day < currentDay ? "past" : w.day === currentDay ? "today" : "";
        const e = w.event && EVENTS[w.event];
        return `<div onclick="selectCalDay(${w.day})" style="cursor:pointer" class="cal-cell w-${w.effect} ${e ? "ev ev-" + w.event : ""} ${calSelected === w.day ? "picked" : ""} ${cls}" title="${w.name}: ${WEATHER_INFO[w.effect].text}${e ? " | " + e.name : ""}">
            ${w.day === currentDay ? '<span class="tdy">Today</span>' : ""}${w.day < currentDay ? '<span class="chk">✓</span>' : ""}${e ? `<span class="evb">${e.icon}</span>` : ""}
            <span class="d">${w.day}</span><span class="i">${w.icon}</span><span class="n">${w.name}</span></div>`;
    }).join("") + '<div class="cal-cell empty"></div>'.repeat(5);
    const legend = [["☀️ Sunny", "normal"], ["🌧️ Rain", "auto_water"], ["💨 Windy", "speed_boost"], ["🔥 Heatwave", "dry_fast"], ["🌋 Earthquake", "soil_damage"]]
        .map(([n, e]) => `<div class="lg w-${e}"><b>${n}</b>${WEATHER_INFO[e].text}</div>`).join("");
    const evLegend = Object.entries(EVENTS).map(([k, e]) => `<div class="lg evl" style="--ec:${e.color}"><b>${e.icon} ${e.name}</b>${e.text}
        <small>${EVENT_MUT[k].map(([m]) => `${MUTATIONS[m].name} x${MUTATIONS[m].mult}`).join(" · ")}</small></div>`).join("");
    const count = thirtyDayWeatherSchedule.filter(w => w.event).length;
    let detail = `<div class="text-center text-xs font-bold mt-3" style="color:var(--ink-soft)">Tap any day to look it up in the calendar's binary search tree.</div>`;
    if (calSelected) {
        const w = thirtyDayWeatherSchedule[calSelected - 1], ev = w.event && EVENTS[w.event], { path, src } = lookupDay(calSelected);
        detail = `<div class="detail-card"><span class="em">${w.icon}</span><div class="flex-1"><b class="title-font text-xl">Day ${w.day}: ${w.name}${ev ? ` · ${ev.icon} ${ev.name}` : ""}</b>
            <div class="text-xs font-semibold" style="color:var(--ink-soft)">${WEATHER_INFO[w.effect].text}</div>
            <div class="text-xs font-bold mt-1" style="color:#6a45b8">BST search for day ${w.day}: ${path.join(" → ")} · found in ${path.length} step${path.length > 1 ? "s" : ""} (walked by ${src})</div></div></div>`;
    }
    return {
        title: "",
        sub: "",
        html: `<div class="cal-head"><div class="tl"></div>
            <div class="mid"><div class="kicker">BLOOM INTO A BRIGHTER TOMORROW</div><div class="big">Bloom Month</div>
            <div class="text-xs font-bold" style="color:var(--ink-soft)">Day ${currentDay} of 30 · weather and ${count} special events are rolled at random for you</div></div><div class="tl r"></div></div>
            <div class="cal-sheet"><div class="cal-art"><div class="tag">Good things<br>grow ♡</div></div>
            <div class="cal-main2"><div class="cal-title">THE BLOOM MONTH</div>
            <div class="cal-week"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div>
            <div class="cal-grid7">${cells}</div>${detail}</div></div>
            <div class="legend"><h5>Weather</h5>${legend}<h5>Special events &amp; mutations</h5>${evLegend}</div>`
    };
}

// ---- End the day early ----
function buildEndDayModal() {
    const next = thirtyDayWeatherSchedule[currentDay % 30], ev = next && next.event && EVENTS[next.event];
    return {
        title: "Call it a day?", small: true,
        sub: "Skip the rest of today and sleep until tomorrow.",
        html: `<div class="detail-card"><span class="em">🌙</span><div class="flex-1"><b class="title-font text-xl">Tomorrow: Day ${currentDay % 30 + 1}</b>
            <div class="text-xs font-semibold" style="color:var(--ink-soft)">${next ? next.icon + " " + next.name : ""}${ev ? " · " + ev.icon + " " + ev.name : ""}</div>
            <div class="text-xs font-bold mt-1" style="color:#6a45b8">The shops restock and your watering can refills to ${DAILY_WATER} 💧 at dawn.</div></div></div>
            <div class="endday-actions"><button class="btn-pastel btn-sky px-6 py-3 text-sm" onclick="closeModal()">Not yet</button>
            <button class="btn-pastel px-6 py-3 text-sm" onclick="endDayNow()">🌙 End the day</button></div>`
    };
}
function endDayNow() {
    closeModal();
    if (eodOpen) return;
    pushAction(`Ended Day ${currentDay} early`);
    timeMinutes = 360;
    triggerEndOfDayModal();
    updateClockDisplay();
}

// ---- Seed shop ----
function buildSeedModal() {
    const order = Object.keys(TIERS);
    const chips = order.map(t => unlockedTiers[t]
        ? `<span class="tier-chip open">${TIERS[t].icon} ${t[0] + t.slice(1).toLowerCase()} ✓</span>`
        : `<button onclick="unlockTier('${t}')" class="tier-chip ${playerCoins < TIERS[t].cost ? "btn-disabled" : ""}">🔓 Unlock ${t[0] + t.slice(1).toLowerCase()} · ${TIERS[t].cost}c</button>`).join("");
    const names = Object.keys(shopStock.seeds).sort((a, b) => order.indexOf(FLOWER_CATALOG[a].rarity) - order.indexOf(FLOWER_CATALOG[b].rarity));
    const cards = names.map(name => {
        const d = FLOWER_CATALOG[name], open = unlockedTiers[d.rarity], left = shopStock.seeds[name];
        const btns = !open ? "" : left <= 0 ? "" : `<button onclick="buySeed('${name}',1)" class="btn-pastel px-3 py-1.5 text-[11px]">Buy 1</button>
            <button onclick="buySeed('${name}',5)" class="btn-pastel btn-sky px-3 py-1.5 text-[11px]">Buy ${Math.min(5, left)}</button>`;
        return `<div class="item-card tc-${d.rarity} ${!open ? "locked" : left <= 0 ? "soldout" : ""}">
            <span class="rar rar-${d.rarity}">${d.rarity}</span><span class="stock">x${left}</span>
            <div class="bubble">${flowerImg(name, 62)}</div><h4>${name}</h4>
            <div class="meta">Grows into a bloom worth ${d.price}c<br>You own ${seedStock[name] || 0} seeds</div>
            <div class="price">🪙 ${seedCost(name)} each</div><div class="btns">${btns}</div></div>`;
    }).join("");
    return {
        title: "Seed Shop",
        sub: `Today's shelf is random and restocks every dawn (Day ${currentDay % 30 + 1}).`,
        html: `<div class="shop-hero" style="--aw:#f7a9c3"><div class="big">🌱🧺🌸</div>Fresh seeds from the meadow, picked just for you.</div>
            <div class="tier-strip">${chips}</div>
            <div class="shop-grid">${cards || "<p class='text-sm font-bold p-3'>The shelves are empty today.</p>"}</div>`
    };
}

// ---- Tool shop ----
const TOOL_TIER = { water: "RARE", fert: "UNCOMMON", sprinkler: "LEGENDARY", plots: "COMMON", repair: "MYTHICAL" };
function buildToolModal() {
    const cards = Object.keys(TOOL_META).map(k => {
        const m = TOOL_META[k], left = shopStock.tools[k];
        return `<div class="item-card tc-${TOOL_TIER[k]} ${left <= 0 ? "soldout" : ""}">
            <span class="stock">x${left}</span><div class="bubble">${m.icon}</div><h4>${m.name}</h4>
            <div class="meta">${toolDesc(k)}</div><div class="price">🪙 ${toolCost(k)}</div>
            <div class="btns">${left <= 0 ? "" : `<button onclick="buyTool('${k}')" class="btn-pastel btn-mint px-5 py-1.5 text-[11px]">Buy</button>`}</div></div>`;
    }).join("");
    return {
        title: "Tool Shop",
        sub: `Quantities are random and restock every dawn (Day ${currentDay % 30 + 1}).`,
        html: `<div class="shop-hero" style="--aw:#a9dbb8"><div class="big">🧰🪣✂️</div>Handy things for happy gardens.</div><div class="shop-grid">${cards}</div>`
    };
}

// ---------------------------------------------------------------
// Flower Almanac: a HIERARCHICAL TREE with tree TRAVERSALS
//   Garden Almanac (root) -> Tiers -> Flowers
// Preorder / Postorder / Level-order. If you ran Topic 4 in the code
// lab, YOUR Python traversal runs the walk. Otherwise JS does it.
// ---------------------------------------------------------------
let discovered = {}, claimedRewards = {};
const almanac = { selected: null, order: [], step: 0, mode: null, src: "", timer: null };
const ALM_REWARD = { COMMON: 50, UNCOMMON: 120, RARE: 250, LEGENDARY: 500, MYTHICAL: 1000, "Garden Almanac": 3000 };
const TRAV_TEXT = {
    pre: "Preorder (DFS): visit the node FIRST, then each child. Reads the catalog top-down.",
    in: "Inorder (DFS): visit the FIRST child's subtree, then the node itself, then the other children. On a binary tree this is left, node, right, which gives sorted order in a BST.",
    post: "Postorder (DFS): visit the children FIRST, then the node. This is how collections are checked: a tier is complete only after all its flowers are.",
    level: "Level-order (BFS): visit the tree row by row using a queue."
};

function buildCatalogTree() {
    return {
        id: "Garden Almanac", label: "Almanac", icon: "📖", kind: "root",
        children: Object.keys(TIERS).map(t => ({
            id: t, label: t[0] + t.slice(1).toLowerCase(), icon: TIERS[t].icon, kind: "tier",
            children: Object.entries(FLOWER_CATALOG).filter(([, d]) => d.rarity === t).map(([n, d]) => ({ id: n, label: n, icon: d.emoji, kind: "flower", children: [] }))
        }))
    };
}

function getCatalogJSON() {
    return JSON.stringify(Object.keys(TIERS).map(t => ({
        tier: t, icon: TIERS[t].icon,
        flowers: Object.entries(FLOWER_CATALOG).filter(([, d]) => d.rarity === t).map(([name, d]) => ({ name, emoji: d.emoji }))
    })));
}

const preorderJS = (n, out = []) => { out.push(n.id); n.children.forEach(c => preorderJS(c, out)); return out; };
const inorderJS = (n, out = []) => { if (!n.children.length) { out.push(n.id); return out; } inorderJS(n.children[0], out); out.push(n.id); n.children.slice(1).forEach(c => inorderJS(c, out)); return out; };
const postorderJS = (n, out = []) => { n.children.forEach(c => postorderJS(c, out)); out.push(n.id); return out; };
const levelOrderJS = r => { const out = [], q = [r]; while (q.length) { const n = q.shift(); out.push(n.id); q.push(...n.children); } return out; };

function runTraversal(mode) {
    const tree = buildCatalogTree();
    let order = null, src = "JavaScript";
    try {
        const fn = pyodideInstance && pyodideInstance.globals.get("catalog_traverse");
        if (fn) { const res = fn(mode); order = Array.from(res.toJs ? res.toJs() : res); src = "your Python code 🐍"; if (res.destroy) res.destroy(); fn.destroy(); }
    } catch (e) { order = null; }
    if (!order) order = { pre: preorderJS, in: inorderJS, post: postorderJS, level: levelOrderJS }[mode](tree);
    return { order, src };
}

// Postorder idea: a node is complete only when ALL of its children are complete
const isComplete = n => n.kind === "flower" ? !!discovered[n.id] : n.children.every(isComplete);
const findNode = (n, id) => n.id === id ? n : n.children.map(c => findNode(c, id)).find(Boolean);
const pathTo = (n, id, p = []) => { p = [...p, n]; if (n.id === id) return p; for (const c of n.children) { const r = pathTo(c, id, p); if (r) return r; } return null; };
const discoveredCount = () => Object.keys(discovered).length;

function renderAlmanacBadge() {
    const b = document.getElementById("almanac-badge");
    if (b) b.textContent = `${discoveredCount()} / ${Object.keys(FLOWER_CATALOG).length} discovered`;
}

function discoverFlower(name) {
    if (discovered[name]) return;
    discovered[name] = true;
    playerXP += 20;
    showToast(`📖 Almanac: you discovered ${name}! +20 XP`);
    pushAction(`Discovered ${name} in the Almanac`);
}

function selectNode(id) { almanac.selected = id; refreshModal(); }

function claimReward(id) {
    const tree = buildCatalogTree(), node = findNode(tree, id);
    if (!node || !isComplete(node) || claimedRewards[id]) return;
    claimedRewards[id] = true;
    playerCoins += ALM_REWARD[id];
    showToast(`📖 Collection complete! +${ALM_REWARD[id]} coins 🪙`);
    pushAction(`Completed the ${node.label} collection (+${ALM_REWARD[id]}c)`, () => undoClaim(id, ALM_REWARD[id]));
    updatePlayerStats();
}

function startTraversal(mode) {
    if (almanac.timer) return;
    const { order, src } = runTraversal(mode);
    Object.assign(almanac, { mode, order, src, step: 0 });
    pushAction(`Walked the almanac tree (${mode})`);
    refreshModal();
    almanac.timer = setInterval(() => {
        almanac.step++;
        if (almanac.step >= order.length) { clearInterval(almanac.timer); almanac.timer = null; }
        refreshModal();
    }, 480);
}

function buildAlmanacModal() {
    const tree = buildCatalogTree();
    const pos = {}, leaves = [];
    tree.children.forEach(t => t.children.forEach(f => leaves.push(f)));
    leaves.forEach((f, k) => { pos[f.id] = { x: 60 + (880 * k) / (leaves.length - 1), y: 305 }; });
    tree.children.forEach(t => { pos[t.id] = { x: t.children.reduce((s, c) => s + pos[c.id].x, 0) / t.children.length, y: 180 }; });
    pos[tree.id] = { x: tree.children.reduce((s, c) => s + pos[c.id].x, 0) / tree.children.length, y: 55 };

    const visited = almanac.order.slice(0, almanac.step), visiting = almanac.order[almanac.step - 1];
    const R = { root: 32, tier: 28, flower: 25 };
    const nodes = [], edges = [];
    const walk = (n, parent) => {
        const p = pos[n.id];
        if (parent) { const q = pos[parent.id], my = (q.y + p.y) / 2; edges.push(`<path class="tedge ${visited.includes(n.id) ? "on" : ""}" d="M${q.x} ${q.y + R[parent.kind]} C${q.x} ${my}, ${p.x} ${my}, ${p.x} ${p.y - R[n.kind]}"/>`); }
        const unknown = n.kind === "flower" && !discovered[n.id], done = isComplete(n) && n.kind !== "flower";
        const cls = ["tnode", unknown ? "unknown" : "", done ? "done" : "", visiting === n.id ? "visiting" : "", almanac.selected === n.id ? "selected" : ""].join(" ");
        const c = n.kind === "flower" ? ({ COMMON: "#b9cdbf", UNCOMMON: "#7fcf9c", RARE: "#7fb4ec", LEGENDARY: "#efbf4f", MYTHICAL: "#d58be8" })[FLOWER_CATALOG[n.id].rarity] : "#f08cb0";
        const idx = visited.indexOf(n.id);
        nodes.push(`<g class="${cls}" style="--c:${c}" onclick="selectNode('${n.id}')" transform-origin="${p.x} ${p.y}">
            <circle class="disc" cx="${p.x}" cy="${p.y}" r="${R[n.kind]}"/>${n.kind === "flower" && !unknown ? `<image href="${imgSrc(n.id)}" x="${p.x - 21}" y="${p.y - 21}" width="42" height="42" preserveAspectRatio="xMidYMid meet" style="pointer-events:none"/>` : `<text class="em" x="${p.x}" y="${p.y + 1}">${unknown ? "❔" : n.icon}</text>`}
            <text class="lb" x="${p.x}" y="${p.y + R[n.kind] + 16}">${unknown ? "???" : n.label}</text>
            ${idx >= 0 ? `<circle class="ord" cx="${p.x + R[n.kind] - 3}" cy="${p.y - R[n.kind] + 3}" r="11"/><text class="on" x="${p.x + R[n.kind] - 3}" y="${p.y - R[n.kind] + 4}">${idx + 1}</text>` : ""}</g>`);
        n.children.forEach(ch => walk(ch, n));
    };
    walk(tree, null);

    const running = !!almanac.timer;
    const bar = [["pre", "Preorder (DFS)"], ["in", "Inorder (DFS)"], ["post", "Postorder (DFS)"], ["level", "Level-order (BFS)"]]
        .map(([m, l]) => `<button onclick="startTraversal('${m}')" class="btn-pastel ${({ pre: "", in: "btn-sky", post: "btn-mint", level: "btn-sky" })[m]} px-4 py-2 text-xs ${running ? "btn-disabled" : ""}">${l}</button>`).join("");
    const label = id => { const n = findNode(tree, id); return n.kind === "flower" && !discovered[id] ? "???" : n.label; };
    const chips = visited.map(id => `<span>${label(id)}</span>`).join("");

    let detail = `<div class="detail-card"><span class="em">🌳</span><div class="text-xs font-bold" style="color:var(--ink-soft)">Tap any node to inspect it. Harvest a flower to discover it, and finish a whole tier to claim a reward.</div></div>`;
    const sel = almanac.selected && findNode(tree, almanac.selected);
    if (sel) {
        const path = pathTo(tree, sel.id).map(n => n.label).join(" → ");
        const known = sel.kind !== "flower" || discovered[sel.id], complete = isComplete(sel);
        let body, extra = "";
        if (sel.kind === "flower") {
            const d = FLOWER_CATALOG[sel.id];
            body = known ? `${d.rarity} · sells for ${d.price}c · blooms in about ${TIERS[d.rarity].sec * 4}s of growing` : "Not discovered yet. Harvest one to reveal it!";
        } else {
            const total = sel.kind === "root" ? leaves.length : sel.children.length;
            const have = sel.kind === "root" ? leaves.filter(f => discovered[f.id]).length : sel.children.filter(isComplete).length;
            body = `${have} / ${total} ${sel.kind === "root" ? "flowers" : "flowers"} discovered`;
            extra = claimedRewards[sel.id] ? `<span class="text-xs font-bold" style="color:#5da479">✓ Reward claimed</span>`
                : `<button onclick="claimReward('${sel.id}')" class="btn-pastel btn-mint px-4 py-2 text-xs ${complete ? "" : "btn-disabled"}">${complete ? `Claim +${ALM_REWARD[sel.id]} coins` : `Reward: ${ALM_REWARD[sel.id]} coins`}</button>`;
        }
        detail = `<div class="detail-card"><span class="em">${known ? (sel.kind === "flower" ? flowerImg(sel.id, 64) : sel.icon) : "❔"}</span><div class="flex-1"><div class="font-bold title-font text-xl">${known ? sel.label : "???"}</div>
            <div class="text-xs font-semibold" style="color:var(--ink-soft)">Path from the root: ${path}</div><div class="text-xs font-bold mt-1">${body}</div></div>${extra}</div>`;
    }

    return {
        title: "Flower Almanac",
        sub: "A hierarchical tree: Almanac → Tiers → Flowers. Walk it with a traversal.",
        html: `<div class="tree-box"><svg viewBox="0 0 1000 365" role="img" aria-label="Flower catalog tree">${edges.join("")}${nodes.join("")}</svg></div>
            <div class="trav-bar">${bar}</div>
            <p class="text-center text-xs font-semibold" style="color:var(--ink-soft)">${almanac.mode ? TRAV_TEXT[almanac.mode] + ` <b>(walked by ${almanac.src})</b>` : "Pick a traversal to watch the walk. Numbers show the visiting order."}</p>
            <div class="trav-chips mt-2">${chips}</div>${detail}`
    };
}

// ---- Pop-up window plumbing ----
function openModal(name) {
    if (name === "endday" && eodOpen) return;
    openModalName = name;
    document.getElementById("modal").classList.add("open");
    refreshModal(true);
}

function closeModal() {
    openModalName = null;
    if (almanac.timer) { clearInterval(almanac.timer); almanac.timer = null; }
    document.getElementById("modal").classList.remove("open");
}

function refreshModal(fresh) {
    if (!openModalName) return;
    const build = { endday: buildEndDayModal, calendar: buildCalendarModal, seeds: buildSeedModal, tools: buildToolModal, almanac: buildAlmanacModal }[openModalName];
    const body = document.getElementById("modal-body"), scroll = fresh ? 0 : body.scrollTop;
    const m = build();
    document.querySelector("#modal .modal-card").classList.toggle("small", !!m.small);
    document.getElementById("modal-title").textContent = m.title;
    document.getElementById("modal-title").style.display = m.title ? "" : "none";
    document.getElementById("modal-sub").style.display = m.sub ? "" : "none";
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
    applyDayEvent(false);

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

    showCutscene(closedDay);
}

function closeEndOfDayModal() {
    document.getElementById("eod-modal").classList.remove("open");
    eodOpen = false;
    dailyStats = { coinsEarned: 0, salesCount: 0, harvestCount: 0 };
    timeMinutes = 360;
    updateClockDisplay();
    restockShops(true);
    const refilled = toolsInventory["Water Charges"] < DAILY_WATER;
    toolsInventory["Water Charges"] = Math.max(toolsInventory["Water Charges"], DAILY_WATER);
    pushAction(`Day ${currentDay} dawns: ${currentWeather.icon} ${currentWeather.name}`);
    showToast(`Welcome to Day ${currentDay} (${currentWeather.name})! 🌱${refilled ? " Your watering can is back to " + DAILY_WATER + " 💧" : ""}`);
    if (currentEvent) { showToast(`${EVENTS[currentEvent].icon} ${EVENTS[currentEvent].name} begins today!`); pushAction(`${EVENTS[currentEvent].name} begins`); }
    updatePlayerStats();
}

// ---------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------
// ---------------------------------------------------------------
// Garden Journal: a flipping book. Undo crosses lines out in ink.
// ---------------------------------------------------------------
let journal = [], journalId = 0, journalSpread = 0, flipping = false, journalMute = 0;
const PER_PAGE = 5, PER_SPREAD = 10;
const escHTML = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const maxSpread = () => Math.max(0, Math.floor((journal.length - 1) / PER_SPREAD));

// pushAction(text, undoFn): a line in the diary. With an undoFn it is a real action the player can take back;
// without one it is just a note (day changes, mutations, discoveries).
function pushAction(action, undoFn) {
    if (journalMute > 0) return;
    displayActionHistory.push(action);
    if (displayActionHistory.length > 60) displayActionHistory.shift();
    journal.push({ id: ++journalId, text: action, day: currentDay, struck: false, fresh: false, undo: undoFn || null, sealed: false });
    if (journal.length > 300) journal.shift();
    if (journalSpread !== maxSpread()) flipTo(maxSpread()); else renderJournal();
}

function pageHTML(spread, side) {
    const start = spread * PER_SPREAD + (side === "right" ? PER_PAGE : 0);
    const items = journal.slice(start, start + PER_PAGE);
    const title = side === "left" ? "My Garden Diary" : `Day ${items.length ? items[0].day : currentDay}`;
    let lines = "";
    for (let i = 0; i < PER_PAGE; i++) {
        const e = items[i];
        lines += e
            ? `<div class="pg-line ${e.struck ? "struck" : ""} ${e.fresh ? "fresh" : ""} ${e.undo ? "" : "note"}" title="${escHTML(e.text)}"><span class="tag">${e.sealed ? "🔒" : e.undo ? "D" + e.day : "✦"}</span><span class="txt">${escHTML(e.text)}</span></div>`
            : `<div class="pg-line">${!journal.length && side === "left" && !i ? "Nothing written yet..." : ""}</div>`;
    }
    return `<div class="pg-title">${title}</div>${lines}<div class="pg-num">${spread * 2 + (side === "left" ? 1 : 2)}</div>`;
}

function renderJournal() {
    const L = document.getElementById("book-left"), Rt = document.getElementById("book-right");
    if (!L || !Rt || flipping) return;
    journalSpread = Math.min(journalSpread, maxSpread());
    L.innerHTML = pageHTML(journalSpread, "left");
    Rt.innerHTML = pageHTML(journalSpread, "right");
    document.getElementById("book-label").textContent = `Pages ${journalSpread * 2 + 1}-${journalSpread * 2 + 2} of ${(maxSpread() + 1) * 2}`;
    document.getElementById("book-prev").disabled = journalSpread <= 0;
    document.getElementById("book-next").disabled = journalSpread >= maxSpread();
}
const renderActionStack = renderJournal;

function flipJournal(dir) { flipTo(Math.max(0, Math.min(maxSpread(), journalSpread + dir))); }

function flipTo(target) {
    if (flipping || target === journalSpread) { if (!flipping) renderJournal(); return; }
    const dir = target > journalSpread ? 1 : -1;
    const L = document.getElementById("book-left"), Rt = document.getElementById("book-right");
    const leaf = document.getElementById("book-leaf"), front = document.getElementById("leaf-front"), back = document.getElementById("leaf-back");
    const newL = pageHTML(target, "left"), newR = pageHTML(target, "right");
    flipping = true;
    if (dir > 0) {
        front.innerHTML = Rt.innerHTML; back.innerHTML = newL; Rt.innerHTML = newR;
        front.className = "leaf-face front pg right"; back.className = "leaf-face back pg left"; leaf.className = "leaf next";
    } else {
        front.innerHTML = L.innerHTML; back.innerHTML = newR; L.innerHTML = newL;
        front.className = "leaf-face front pg left"; back.className = "leaf-face back pg right"; leaf.className = "leaf prev";
    }
    setTimeout(() => { journalSpread = target; leaf.className = "leaf"; flipping = false; renderJournal(); }, 830);
}

// Crossing out the last line REALLY undoes it (flower removed, seed/coins/water given back...)
function triggerUndo() {
    const entry = [...journal].reverse().find(e => !e.struck && !e.sealed && e.undo);
    if (!entry) { showToast("Nothing left in the journal to undo."); return; }
    const res = entry.undo();
    if (!(res === true || (res && res.ok === true))) { entry.sealed = true; renderJournal(); showToast(typeof res === "string" ? res : "That can't be undone anymore."); return; }
    entry.struck = true; entry.fresh = true;
    displayActionHistory.pop();
    setTimeout(() => { entry.fresh = false; }, 2000);
    const spread = Math.floor(journal.indexOf(entry) / PER_SPREAD);
    if (spread !== journalSpread) flipTo(spread); else renderJournal();
    showToast(res && res.msg ? `Undone: ${entry.text}. ${res.msg}` : `Undone: ${entry.text}`);
    updatePlayerStats();
}

function undoPlant(pos, plant, name) {
    if (gardenGridState[pos] !== plant) return "That flower is gone, so planting can't be undone.";
    clearInterval(plant.timer); delete gardenGridState[pos];
    seedStock[name] = (seedStock[name] || 0) + 1;
    renderTile(pos); return true;
}
function undoWater(pos, plant, stageAt, cost) {
    if (gardenGridState[pos] !== plant) return "That flower was harvested, so the watering can't be undone.";
    clearInterval(plant.timer);
    plant.growing = false; plant.watered = false; plant.growthProgress = 0;
    plant.stageIndex = stageAt;                      // back to the growth stage it had BEFORE it was watered
    toolsInventory["Water Charges"] = Math.min(MAX_WATER, toolsInventory["Water Charges"] + cost);
    renderTile(pos);
    return { ok: true, msg: `${plant.name} went back to the ${STAGE_NAMES[stageAt]} stage.` };
}
function undoFertilize(pos, plant, prev) {
    if (gardenGridState[pos] !== plant || plant.stageIndex < MATURE) return "That flower was already harvested.";
    toolsInventory["Growth Fertilizer"]++;
    plant.stageIndex = prev.stageIndex; plant.watered = prev.watered; plant.growing = false;
    if (prev.growing) { plant.watered = true; startPlantGrowthTimer(pos); }
    renderTile(pos); return { ok: true, msg: `${plant.name} is back to the ${STAGE_NAMES[prev.stageIndex]} stage.` };
}
function undoHarvest(pos, snap, wasNew) {
    const store = snap.mutation ? mutInventory : flowerInventory, key = snap.mutation ? `${snap.name}|${snap.mutation}` : snap.name;
    if (gardenGridState[pos]) return "Something is planted on that tile now.";
    if ((store[key] || 0) <= 0) return "You already used that flower.";
    store[key]--; if (!store[key]) delete store[key];
    dailyStats.harvestCount = Math.max(0, dailyStats.harvestCount - 1);
    if (wasNew) { delete discovered[snap.name]; playerXP = Math.max(0, playerXP - 20); }
    Object.assign(snap, { timer: null, growing: false, watered: true, stageIndex: MATURE, incoming: false });
    gardenGridState[pos] = snap;   // the very same flower object, so older undo lines still work
    renderTile(pos); return true;
}
function undoUnlockTier(tier) {
    const used = Object.keys(seedStock).some(n => FLOWER_CATALOG[n].rarity === tier) || Object.values(gardenGridState).some(p => p && FLOWER_CATALOG[p.name].rarity === tier);
    if (used) return "You already have seeds or flowers from that tier.";
    unlockedTiers[tier] = false; playerCoins += TIERS[tier].cost; return true;
}
function undoBuySeed(name, qty, total) {
    if ((seedStock[name] || 0) < qty) return "You already planted those seeds.";
    seedStock[name] -= qty; if (!seedStock[name]) delete seedStock[name];
    shopStock.seeds[name] = (shopStock.seeds[name] || 0) + qty; playerCoins += total; return true;
}
function undoBuyTool(k, cost, added, repairPos, repairSnap) {
    if (k === "fert" && toolsInventory["Growth Fertilizer"] < 1) return "You already used that fertilizer.";
    if (k === "plots") {
        const keep = toolsInventory["Plots"] - 5;
        if (keep < 25 || Object.keys(gardenGridState).some(i => Number(i) >= keep)) return "Flowers are growing on those new beds.";
    }
    if (k === "repair" && gardenGridState[repairPos]) return "That tile is in use now.";
    if (k === "water") toolsInventory["Water Charges"] = Math.max(0, toolsInventory["Water Charges"] - added);
    if (k === "fert") toolsInventory["Growth Fertilizer"]--;
    if (k === "sprinkler") toolsInventory["Sprinkler Level"] = Math.max(1, toolsInventory["Sprinkler Level"] - 1);
    if (k === "plots") { toolsInventory["Plots"] -= 5; renderGarden(); }
    if (k === "repair") { gardenGridState[repairPos] = repairSnap; renderTile(repairPos); }
    shopStock.tools[k]++; playerCoins += cost; return true;
}
function undoClaim(id, reward) {
    if (playerCoins < reward) return "You already spent that reward.";
    playerCoins -= reward; delete claimedRewards[id]; return true;
}
function undoDeliver(order, freshId, plan, coins, xp) {
    const idx = activeCustomerOrders.findIndex(o => o.id === freshId);
    if (idx === -1) return "That customer's replacement order was already completed.";
    if (playerCoins < coins) return "You already spent those coins.";
    plan.picks.forEach(p => { if (p.k) mutInventory[p.k] = (mutInventory[p.k] || 0) + p.n; else flowerInventory[p.f] = (flowerInventory[p.f] || 0) + p.n; });
    playerCoins -= coins; playerXP = Math.max(0, playerXP - xp);
    dailyStats.coinsEarned = Math.max(0, dailyStats.coinsEarned - coins); dailyStats.salesCount = Math.max(0, dailyStats.salesCount - 1);
    activeCustomerOrders.splice(idx, 1, order); return true;
}

// ---------------------------------------------------------------
// Day-end cutscene
// ---------------------------------------------------------------
function showCutscene(day) {
    const earned = dailyStats.coinsEarned;
    document.getElementById("eod-title").innerText = `Day ${day} closed`;
    document.getElementById("eod-line").innerText = earned === 0
        ? "A quiet, sleepy day. The blooms are dreaming of tomorrow."
        : earned < 150 ? "Petals, pennies and a little bell on the door."
        : "The shop glowed with happy customers all day long.";
    document.getElementById("eod-sales").innerText = dailyStats.salesCount;
    document.getElementById("eod-harvests").innerText = dailyStats.harvestCount;
    document.getElementById("eod-level").innerText = playerLevel;
    const info = WEATHER_INFO[currentWeather.effect];
    document.getElementById("eod-next").innerText = `Tomorrow: ${currentWeather.icon} ${currentWeather.name} · ${info.text} ${currentWeather.event ? EVENTS[currentWeather.event].icon + " " + EVENTS[currentWeather.event].name + "! " : ""}At dawn the shops restock 🧺 and your watering can refills to ${DAILY_WATER} 💧`;

    // coins count up
    const coinsEl = document.getElementById("eod-coins");
    let shown = 0;
    coinsEl.innerText = "+0";
    const step = Math.max(1, Math.ceil(earned / 40));
    const tick = setInterval(() => { shown = Math.min(earned, shown + step); coinsEl.innerText = `+${shown}`; if (shown >= earned) clearInterval(tick); }, 30);

    // falling petals
    const layer = document.getElementById("petal-layer");
    layer.innerHTML = "";
    const glyphs = ["🌸", "🌷", "🌼", "🌺", "✿", "🌹"];
    for (let i = 0; i < 22; i++) {
        const s = document.createElement("span");
        s.className = "petal-fall";
        s.innerHTML = flowerImg(Object.keys(FLOWER_CATALOG)[i % 10], 20 + (i % 4) * 7);
        s.style.cssText = `left:${Math.random() * 100}%;font-size:${14 + Math.random() * 18}px;animation-duration:${6 + Math.random() * 6}s;animation-delay:${-Math.random() * 8}s`;
        layer.appendChild(s);
    }
    eodOpen = true;
    document.getElementById("eod-modal").classList.add("open");
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
    p.innerHTML = text;
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
// Living background: a different animated scene for every weather & event
//   Sunny: rays + butterflies | Rain: storm, lightning, puddles | Windy: gusts, flying leaves
//   Heatwave: glare + wilting flowers | Earthquake: cracks, falling rocks
//   Butterfly event: sprite butterflies | Rainbow event: glowing rainbow | Cotton candy event: candy land
// ---------------------------------------------------------------
const env = { rain: 0, wind: 0, heat: 0, quake: 0, night: 0, cloud: 0.25, gold: 0, evButterfly: 0, evRainbow: 0, evCandy: 0 };
const bg = { cv: null, ctx: null, W: 0, H: 0, flowers: [], stones: [], trees: [], far: [], arches: [], bokeh: [], clouds: [], drops: [], splashes: [], petals: [], pollen: [], flies: [], bflies: [],
    dust: [], pads: [], ripples: [], pond: null, fall: [], bf: [], bfImgs: null, pops: [], puffs: [], sprinkles: [], glit: [], streaks: [], cracks: [], rocks: [], lt: { life: 0, x: 0, pts: [] } };
const PALETTE = ["#ff9fb2", "#ffd1dc", "#fff2a8", "#ffb36b", "#d9b8ff", "#ffffff", "#9fd8ff", "#ff8fab"];
const LAV = ["#b79be6", "#c9a8f0", "#a58ad8"], TUL = ["#ff8fb8", "#ffa3c4", "#ff7aa8", "#ffb6c9"], LEAF = ["#b9e0a8", "#cfe8a4", "#a6d49a", "#f3e2a0"];
const BLOSS = ["#ffc9d9", "#ffb3c9", "#ffd9e5", "#f7a8c4"];
const RAINBOW = ["#ff8fa3", "#ffb27a", "#ffe27a", "#9fe3a0", "#8fd0ff", "#a99cf5", "#dd9cf0"];
const SKY_KEYS = [
    [360, [214, 196, 240], [255, 224, 206]], [720, [176, 214, 245], [255, 244, 224]], [1050, [232, 190, 220], [255, 214, 170]],
    [1200, [176, 154, 220], [250, 178, 192]], [1320, [128, 120, 186], [204, 168, 214]], [1440, [128, 120, 186], [204, 168, 214]]
];
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = v => Math.max(0, Math.min(1, v));
const mixRGB = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgbStr = (c, al = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${al})`;
const hexRGB = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const rgbHex = c => "#" + c.map(v => Math.max(0, Math.min(255, v | 0)).toString(16).padStart(2, "0")).join("");
const hexMix = (a, b, t) => rgbHex(mixRGB(hexRGB(a), hexRGB(b), t));
const R = () => Math.random();

function skyAt(t) {
    for (let i = 0; i < SKY_KEYS.length - 1; i++) {
        const [t0, a0, b0] = SKY_KEYS[i], [t1, a1, b1] = SKY_KEYS[i + 1];
        if (t <= t1) { const k = clamp01((t - t0) / (t1 - t0)); return { top: mixRGB(a0, a1, k), bot: mixRGB(b0, b1, k) }; }
    }
    return { top: SKY_KEYS[5][1], bot: SKY_KEYS[5][2] };
}

function tint(hex) {
    const [r0, g0, b0] = hexRGB(hex);
    const k = 1 - 0.3 * env.night - 0.12 * env.rain - 0.05 * env.quake;
    const r = r0 * k + env.heat * 20 + env.gold * 16, g = g0 * k + env.heat * 6 + env.gold * 4, b = b0 * k - env.heat * 24 - env.gold * 14 + env.night * 25;
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
    if (!bg.bfImgs) bg.bfImgs = Array.from({ length: 8 }, (_, i) => { const im = new Image(); im.src = `assets/butterfly-${i + 1}.png`; return im; });
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
        blobs: Array.from({ length: 34 }, () => ({ dx: (R() - 0.5) * W * 0.2, dy: -(H * 0.36 + R() * H * 0.26), r: 32 + R() * 52, c: (side < 0 ? BLOSS : LEAF)[(R() * 4) | 0], p: R() * 6 }))
    }));
    // lollipop trees for the cotton candy event
    bg.pops = [];
    [-1, 1].forEach(side => { for (let i = 0; i < 5; i++) bg.pops.push({ x: side < 0 ? W * (0.01 + i * 0.045) : W * (0.99 - i * 0.045), base: H * (0.8 + R() * 0.05), r: 34 + R() * 46, stem: H * (0.14 + R() * 0.2), dir: R() < 0.5 ? 1 : -1, c1: ["#ff8fb8", "#ff9ec4", "#f78fc9"][i % 3], c2: ["#9fe3b5", "#b9a8f5", "#ffe08a"][(i + (side < 0 ? 0 : 1)) % 3], p: R() * 6 }); });
    bg.puffs = Array.from({ length: 9 }, () => ({ x: R() * W, y: H * (0.1 + R() * 0.5), r: 30 + R() * 46, v: 0.15 + R() * 0.3, p: R() * 6 }));
    bg.sprinkles = Array.from({ length: 90 }, () => ({ x: R() * W, y: R() * H, l: 6 + R() * 6, rot: R() * 3, v: 0.5 + R() * 1.4, c: ["#ff8fb8", "#9fe3b5", "#ffe08a", "#b9a8f5", "#ffffff", "#8fd0ff"][(R() * 6) | 0] }));
    bg.glit = Array.from({ length: 70 }, () => ({ x: R() * W, y: R() * H, s: 2 + R() * 4, v: 0.3 + R() * 0.9, p: R() * 6, c: RAINBOW[(R() * 7) | 0] }));
    bg.bf = Array.from({ length: 16 }, (_, i) => ({ i: i % 8, x: R() * W, y: H * (0.12 + R() * 0.7), a: R() * 6.28, spd: 0.7 + R() * 1.1, size: 52 + R() * 44, ph: R() * 6 }));
    bg.streaks = Array.from({ length: 44 }, () => ({ x: R() * W, y: R() * H * 0.85, l: 80 + R() * 160, v: 14 + R() * 18 }));
    bg.cracks = Array.from({ length: 7 }, () => {
        let x = R() * W, y = H * (0.8 + R() * 0.1); const pts = [[x, y]];
        while (y < H) { x += (R() - 0.5) * 56; y += H * 0.018 + R() * H * 0.03; pts.push([x, y]); }
        return pts;
    });
    bg.rocks = [];
    bg.far = Array.from({ length: 36 }, () => ({ x: R() * W, r: 14 + R() * 26, c: R() < 0.5 ? "#b9aedb" : "#aebfa0" }));
    bg.arches = [{ x: W * 0.27, y: H * 0.7, r: 36 }, { x: W * 0.73, y: H * 0.685, r: 30 }].map(a => ({ ...a, roses: Array.from({ length: 16 }, (_, i) => ({ a: Math.PI + (i / 15) * Math.PI, c: PALETTE[i % 2 ? 0 : 7] })) }));
    bg.bokeh = Array.from({ length: 30 }, () => ({ x: R() * W, y: R() * H, r: 8 + R() * 30, p: R() * 6, c: R() < 0.6 ? [255, 214, 140] : [255, 176, 200] }));
    bg.clouds = Array.from({ length: 7 }, (_, i) => ({ x: (i / 7) * W, y: 30 + R() * H * 0.24, s: 0.7 + R() * 0.9, v: 3 + R() * 7 }));
    bg.drops = Array.from({ length: 320 }, () => ({ x: R() * W, y: R() * H, v: 12 + R() * 9, l: 12 + R() * 14, gy: H * (0.8 + R() * 0.2) }));
    bg.petals = Array.from({ length: 80 }, (_, i) => ({ x: R() * W, y: R() * H, s: 3 + R() * 4, r: R() * 6, c: i % 3 === 0 ? "#9fd08a" : PALETTE[(R() * 5) | 0], leaf: i % 3 === 0, v: 0.5 + R() }));
    bg.pollen = Array.from({ length: 40 }, () => ({ x: R() * W, y: R() * H, p: R() * 6.28 }));
    bg.flies = Array.from({ length: 26 }, () => ({ x: R() * W, y: H * (0.6 + R() * 0.38), p: R() * 6.28 }));
    bg.bflies = Array.from({ length: 6 }, (_, i) => ({ x: R() * W, y: H * (0.5 + R() * 0.3), a: R() * 6.28, c: PALETTE[(i * 2) % 8] }));
    bg.pads = Array.from({ length: 10 }, (_, i) => { const a = R() * 6.28, d = Math.sqrt(R()) * 0.85; return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, r: 7 + R() * 7, lotus: i < 4 }; });
    bg.dust = []; bg.ripples = []; bg.splashes = [];
    bg.fall = Array.from({ length: 30 }, () => ({ x: R() < 0.5 ? R() * W * 0.24 : W * (0.76 + R() * 0.24), y: R() * H, s: 3 + R() * 3, v: 0.35 + R() * 0.6, r: R() * 6, c: PALETTE[(R() * 2) | 0] }));
}

function star4(ctx, x, y, s) {
    ctx.beginPath(); ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s); ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s); ctx.fill();
}

function drawRainbow(ctx, W, H, t, a) {
    const cx = W * 0.5, cy = H * 0.8, r0 = Math.min(W * 0.52, H * 1.05), bw = Math.max(11, H * 0.024);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(255,236,255,${0.13 * a})`; ctx.lineWidth = bw * 10; ctx.beginPath(); ctx.arc(cx, cy, r0 - bw * 3, Math.PI, 2 * Math.PI); ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
    RAINBOW.forEach((c, i) => { ctx.strokeStyle = c; ctx.globalAlpha = a * (0.52 + 0.1 * Math.sin(t * 1.2 + i)); ctx.lineWidth = bw; ctx.beginPath(); ctx.arc(cx, cy, r0 - i * bw, Math.PI, 2 * Math.PI); ctx.stroke(); });
    ctx.globalAlpha = 1; ctx.fillStyle = "#fff";
    for (let k = 0; k < 28; k++) {
        const ang = Math.PI + ((k / 28 + t * 0.03) % 1) * Math.PI, tw = Math.abs(Math.sin(t * 3 + k * 1.7)), rr = r0 - bw * (1 + (k % 6));
        ctx.globalAlpha = a * tw; star4(ctx, cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr, 4 + tw * 5);
    }
    ctx.restore();
}

function drawFlower(ctx, f, t, sway) {
    const ang = Math.sin(t * (1.1 + env.wind * 1.8) + f.phase + f.x * 0.01) * sway + env.wind * 0.18;
    const dr = env.heat * 0.32 + env.rain * 0.08, dir = f.phase > 3.14 ? 1 : -1; // wilt in the heat, droop in the rain
    const lean = ang + dr * dir, hx = f.x + lean * f.h, hy = f.y - f.h * (1 - dr * 0.35);
    ctx.strokeStyle = tint("#4fa96a"); ctx.lineWidth = 2 * f.scale + 0.5;
    ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.quadraticCurveTo(f.x + lean * f.h * 0.2, f.y - f.h * 0.55, hx, hy); ctx.stroke();
    ctx.fillStyle = tint("#6cc28a"); ctx.beginPath(); ctx.ellipse(f.x + lean * f.h * 0.15, f.y - f.h * 0.35, 6 * f.scale, 2.6 * f.scale, -0.6, 0, 7); ctx.fill();
    ctx.fillStyle = tint(f.color);
    if (f.type === "lav") {
        for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.ellipse(hx - lean * k * 2, hy + k * f.head * 1.3, f.head * 0.7, f.head * 1.1, lean, 0, 7); ctx.fill(); }
    } else if (f.type === "tulip") {
        ctx.beginPath(); ctx.ellipse(hx, hy, f.head * 0.85, f.head * 1.2, lean, 0, 7); ctx.fill();
        ctx.fillStyle = tint("#ffd6e4"); ctx.beginPath(); ctx.ellipse(hx - f.head * 0.25, hy - f.head * 0.2, f.head * 0.3, f.head * 0.7, lean, 0, 7); ctx.fill();
    } else {
        for (let p = 0; p < f.petals; p++) {
            const a = (p / f.petals) * 6.283 + lean * 2;
            ctx.beginPath(); ctx.ellipse(hx + Math.cos(a) * f.head * 0.8, hy + Math.sin(a) * f.head * 0.8, f.head * 0.7, f.head * 0.42, a, 0, 7); ctx.fill();
        }
        ctx.fillStyle = tint(f.type === "sun" ? "#6b4226" : "#ffd84d"); ctx.beginPath(); ctx.arc(hx, hy, f.head * (f.type === "sun" ? 0.62 : 0.42), 0, 7); ctx.fill();
    }
}

function bgFrame(ms) {
    const t = ms / 1000, ctx = bg.ctx, W = bg.W, H = bg.H;
    requestAnimationFrame(bgFrame);
    if (document.hidden) return;

    const fx = currentWeather.effect, ev = currentEvent;
    const target = {
        rain: fx === "auto_water" ? 1 : 0, wind: fx === "speed_boost" ? 1 : 0, heat: fx === "dry_fast" ? 1 : 0, quake: fx === "soil_damage" ? 1 : 0,
        night: clamp01((timeMinutes - 1140) / 150),
        cloud: fx === "auto_water" ? 1 : fx === "speed_boost" ? 0.55 : fx === "soil_damage" ? 0.4 : fx === "dry_fast" ? 0 : ev === "candy" ? 0.85 : ev === "rainbow" ? 0.5 : 0.25,
        evButterfly: ev === "butterfly" ? 1 : 0, evRainbow: ev === "rainbow" ? 1 : 0, evCandy: ev === "candy" ? 1 : 0
    };
    for (const k in target) env[k] += (target[k] - env[k]) * 0.02;
    env.gold = clamp01(1 - Math.abs(timeMinutes - 1020) / 220) * (1 - env.rain);
    const light = (1 - env.night) * (1 - env.rain * 0.7);

    // Sky: every weather and event paints it its own colour
    const sk = skyAt(timeMinutes);
    let top = sk.top, bot = sk.bot;
    const mixTo = (a, b, k) => { top = mixRGB(top, a, k); bot = mixRGB(bot, b, k); };
    mixTo([96, 112, 142], [160, 176, 200], env.rain * 0.92);
    mixTo([150, 205, 240], [225, 245, 255], env.wind * 0.45 * (1 - env.night));
    mixTo([255, 186, 104], [255, 236, 172], env.heat * 0.82);
    mixTo([176, 150, 140], [224, 200, 186], env.quake * 0.62);
    mixTo([255, 168, 204], [255, 214, 232], env.evCandy * 0.86);
    mixTo([170, 200, 255], [255, 232, 205], env.evRainbow * 0.45);
    mixTo([168, 214, 248], [255, 246, 220], env.evButterfly * 0.4);

    const shake = env.quake * (Math.sin(t * 2.3) > 0 ? 1 : 0.3) * 7;
    ctx.save();
    ctx.translate((R() - 0.5) * shake, (R() - 0.5) * shake);

    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.78);
    sky.addColorStop(0, rgbStr(top)); sky.addColorStop(1, rgbStr(bot));
    ctx.fillStyle = sky; ctx.fillRect(-12, -12, W + 24, H + 24);

    // Stars + moon
    if (env.night > 0.05) {
        ctx.fillStyle = "#fff";
        for (let i = 0; i < 60; i++) { ctx.globalAlpha = env.night * (0.4 + 0.6 * Math.abs(Math.sin(t + i))) * (1 - env.rain); ctx.fillRect((i * 197.3) % W, (i * 83.7) % (H * 0.5), 2, 2); }
        ctx.globalAlpha = 1;
        const mp = clamp01((timeMinutes - 1140) / 300), mx = W * (0.2 + 0.6 * mp), my = H * 0.3 - Math.sin(Math.PI * mp) * H * 0.18;
        const mg = ctx.createRadialGradient(mx, my, 4, mx, my, 80);
        mg.addColorStop(0, `rgba(255,248,220,${env.night})`); mg.addColorStop(1, "rgba(255,248,220,0)");
        ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, 80, 0, 7); ctx.fill();
        ctx.fillStyle = `rgba(255,250,228,${env.night})`; ctx.beginPath(); ctx.arc(mx, my, 20, 0, 7); ctx.fill();
    }

    // Sun, glow, light rays (bigger and whiter in a heatwave)
    const sp = clamp01((timeMinutes - 360) / 810), sx = W * (0.12 + 0.76 * sp), sy = H * 0.46 - Math.sin(Math.PI * sp) * H * 0.28;
    const sunA = (1 - env.rain * 0.92) * (1 - env.night);
    if (sunA > 0.02) {
        const rad = 120 + env.heat * 120 + env.gold * 60 + Math.sin(t * 1.5) * 4, warm = env.heat > 0.3 ? "255,170,80" : env.gold > 0.3 ? "255,196,120" : "255,236,170";
        const g = ctx.createRadialGradient(sx, sy, 6, sx, sy, rad);
        g.addColorStop(0, `rgba(${warm},${sunA})`); g.addColorStop(1, `rgba(${warm},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, rad, 0, 7); ctx.fill();
        ctx.fillStyle = `rgba(255,${env.heat > 0.3 ? 214 : 246},150,${sunA})`; ctx.beginPath(); ctx.arc(sx, sy, 28 + env.heat * 18, 0, 7); ctx.fill();
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

    // Rainbow event: a glowing rainbow over the garden
    if (env.evRainbow > 0.03) drawRainbow(ctx, W, H, t, env.evRainbow * (1 - env.night * 0.6));

    // Clouds: lit pink by the sun, grey in a storm, racing in the wind, cotton candy in candy land
    const cc = mixRGB(mixRGB(mixRGB([255, 255, 255], [255, 218, 205], 0.5 + env.gold * 0.5), [255, 196, 224], env.evCandy), [112, 122, 140], env.rain);
    const cAlpha = (0.4 + env.cloud * 0.5) * (1 - env.night * 0.6);
    bg.clouds.forEach(c => {
        c.x += (c.v + env.wind * 130) * 0.016; if (c.x > W + 200) c.x = -200;
        const s = c.s * (1 + env.evCandy * 0.45);
        ctx.fillStyle = rgbStr(mixRGB(cc, [70, 60, 110], env.night * 0.5), cAlpha);
        [[0, 0, 34], [32, -10, 40], [70, 0, 32], [35, 10, 36], [-12, 8, 26], [92, 8, 24]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(c.x + dx * s, c.y + dy * s, r * s, 0, 7); ctx.fill(); });
        if (env.evCandy > 0.1) { ctx.fillStyle = `rgba(190,226,255,${0.45 * env.evCandy})`; ctx.beginPath(); ctx.arc(c.x + 52 * s, c.y + 14 * s, 26 * s, 0, 7); ctx.fill(); }
    });
    if (env.rain > 0.2) { ctx.fillStyle = `rgba(80,92,118,${0.22 * env.rain})`; ctx.fillRect(-12, -12, W + 24, H * 0.5); }

    // Hills, far trees, mist
    const hl = k => tint(hexMix(k[0], k[1], env.evCandy));
    ctx.fillStyle = hl(["#cdbbe6", "#ffc4dc"]); ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 24) ctx.lineTo(x, H * 0.58 + Math.sin(x * 0.0035 + 1) * H * 0.045);
    ctx.lineTo(W, H); ctx.fill();
    bg.far.forEach(f => { ctx.fillStyle = hl([f.c, "#ffb3d2"]); ctx.beginPath(); ctx.arc(f.x, hillY(f.x) - f.r * 0.5 + 8, f.r, 0, 7); ctx.fill(); });
    ctx.fillStyle = hl(["#b9cba8", "#ffd0e4"]); ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 24) ctx.lineTo(x, hillY(x) + 14);
    ctx.lineTo(W, H); ctx.fill();
    const mist = ctx.createLinearGradient(0, H * 0.52, 0, H * 0.74);
    mist.addColorStop(0, "rgba(255,226,214,0)"); mist.addColorStop(0.55, `rgba(${env.rain > 0.4 ? "200,210,225" : "255,226,214"},${(0.38 + env.rain * 0.3) * (light + 0.15)})`); mist.addColorStop(1, "rgba(255,226,214,0)");
    ctx.fillStyle = mist; ctx.fillRect(-12, H * 0.52, W + 24, H * 0.22);

    // Blossom trees (fade out in candy land)
    const treeA = 1 - env.evCandy * 0.95;
    if (treeA > 0.02) {
        ctx.globalAlpha = treeA;
        bg.trees.forEach(tr => {
            ctx.fillStyle = tint("#b78f7e"); ctx.beginPath();
            ctx.moveTo(tr.x - 26, tr.base); ctx.quadraticCurveTo(tr.x - 12, tr.base - H * 0.2, tr.x + tr.side * 20, tr.base - H * 0.42);
            ctx.lineTo(tr.x + tr.side * 20 + 20, tr.base - H * 0.42); ctx.quadraticCurveTo(tr.x + 26, tr.base - H * 0.2, tr.x + 26, tr.base); ctx.fill();
            const swayAmt = 4 + env.wind * 12 + env.quake * 5;
            tr.blobs.forEach(b => {
                const ox = Math.sin(t * (0.5 + env.wind * 1.5) + b.p) * swayAmt;
                ctx.fillStyle = tint(b.c); ctx.beginPath(); ctx.arc(tr.x + b.dx + ox, tr.base + b.dy, b.r, 0, 7); ctx.fill();
            });
            ctx.globalCompositeOperation = "lighter";
            tr.blobs.forEach((b, i) => { if (i % 3) return; ctx.fillStyle = `rgba(255,214,140,${0.13 * light * (0.6 + 0.4 * Math.sin(t * 1.3 + b.p))})`; ctx.beginPath(); ctx.arc(tr.x + b.dx - b.r * 0.2, tr.base + b.dy - b.r * 0.25, b.r * 0.45, 0, 7); ctx.fill(); });
            ctx.globalCompositeOperation = "source-over";
        });
        ctx.globalAlpha = 1;
    }
    // Cotton candy event: swirly lollipop trees and floating cotton candy puffs
    if (env.evCandy > 0.03) {
        bg.pops.forEach(p => {
            ctx.globalAlpha = env.evCandy;
            const ox = Math.sin(t * 0.8 + p.p) * 3, hx = p.x + ox, hy = p.base - p.stem;
            ctx.lineCap = "round"; ctx.lineWidth = p.r * 0.17; ctx.strokeStyle = "#fff"; ctx.beginPath(); ctx.moveTo(p.x, p.base); ctx.lineTo(hx, hy); ctx.stroke();
            ctx.strokeStyle = "#ff7fae"; ctx.setLineDash([9, 13]); ctx.beginPath(); ctx.moveTo(p.x, p.base); ctx.lineTo(hx, hy); ctx.stroke(); ctx.setLineDash([]);
            const rot = t * 0.18 * p.dir;
            for (let i = 0; i < 12; i++) {
                ctx.fillStyle = [p.c1, "#fff7fb", p.c2][i % 3];
                ctx.beginPath(); ctx.moveTo(hx, hy); ctx.arc(hx, hy, p.r, rot + (i * Math.PI) / 6, rot + ((i + 1) * Math.PI) / 6); ctx.fill();
            }
            ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hx, hy, p.r, 0, 7); ctx.stroke();
            ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.beginPath(); ctx.ellipse(hx - p.r * 0.35, hy - p.r * 0.4, p.r * 0.3, p.r * 0.16, -0.7, 0, 7); ctx.fill();
        });
        bg.puffs.forEach(p => {
            p.y += Math.sin(t * 0.6 + p.p) * 0.25 - p.v * 0.2; p.x += p.v; if (p.x > W + 80) p.x = -80; if (p.y < H * 0.05) p.y = H * 0.55;
            ctx.globalAlpha = env.evCandy * 0.8;
            [["#ffc2dc", 0, 0, 1], ["#ffd9ea", 0.7, -0.2, 0.8], ["#bfe4ff", -0.7, 0.1, 0.75], ["#fff", 0.1, -0.5, 0.6]].forEach(([c, dx, dy, k]) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(p.x + dx * p.r, p.y + dy * p.r, p.r * 0.6 * k, 0, 7); ctx.fill(); });
        });
        ctx.globalAlpha = 1;
    }

    // Blossom petals drifting from the trees
    ctx.globalAlpha = 1 - env.evCandy;
    bg.fall.forEach(q => {
        q.y += q.v; q.x += Math.sin(t * 0.8 + q.r) * 0.6 + env.wind * 4; q.r += 0.03;
        if (q.y > H * 0.96) { q.y = H * 0.1; q.x = R() < 0.5 ? R() * W * 0.24 : W * (0.76 + R() * 0.24); }
        ctx.fillStyle = tint(q.c); ctx.beginPath(); ctx.ellipse(q.x, q.y, q.s, q.s * 0.55, q.r, 0, 7); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Meadow
    const gnd = ctx.createLinearGradient(0, H * 0.72, 0, H);
    gnd.addColorStop(0, tint(hexMix("#bbe8aa", "#ffd2e6", env.evCandy))); gnd.addColorStop(1, tint(hexMix("#92d79c", "#ffb3d6", env.evCandy)));
    ctx.fillStyle = gnd; ctx.fillRect(-12, H * 0.74, W + 24, H);
    bg.arches.forEach(a => {
        ctx.strokeStyle = tint("#8a6a58"); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(a.x, a.y, a.r, Math.PI, 0); ctx.moveTo(a.x - a.r, a.y); ctx.lineTo(a.x - a.r, a.y + 28); ctx.moveTo(a.x + a.r, a.y); ctx.lineTo(a.x + a.r, a.y + 28); ctx.stroke();
        a.roses.forEach(r => { ctx.fillStyle = tint(r.c); ctx.beginPath(); ctx.arc(a.x + Math.cos(r.a) * a.r, a.y + Math.sin(r.a) * a.r, 4.5, 0, 7); ctx.fill(); });
    });

    // Cobblestone path (marshmallow pink in candy land)
    ctx.fillStyle = tint(hexMix("#e6d3b4", "#fff0f6", env.evCandy)); ctx.beginPath();
    for (let y = H * 0.62; y <= H; y += 8) ctx.lineTo(pathCx(y) - pathHW(y), y);
    for (let y = H; y >= H * 0.62; y -= 8) ctx.lineTo(pathCx(y) + pathHW(y), y);
    ctx.fill();
    bg.stones.forEach(s => { ctx.fillStyle = tint(hexMix(rgbHex([s.shade, s.shade * 0.9, s.shade * 0.78]), "#ffd6e8", env.evCandy)); ctx.beginPath(); ctx.ellipse(s.x, s.y, s.w, s.w * 0.5, 0, 0, 7); ctx.fill(); });

    // Pond: lily pads, lotus, sparkles, a rainbow shimmer during the rainbow event
    const p = bg.pond;
    const wg = ctx.createLinearGradient(0, p.cy - p.ry, 0, p.cy + p.ry);
    wg.addColorStop(0, rgbStr(mixRGB(bot, [200, 190, 240], 0.5))); wg.addColorStop(1, rgbStr(mixRGB(top, [90, 170, 190], 0.6)));
    ctx.fillStyle = wg; ctx.beginPath(); ctx.ellipse(p.cx, p.cy, p.rx, p.ry, 0, 0, 7); ctx.fill();
    if (env.evRainbow > 0.05) {
        ctx.save(); ctx.beginPath(); ctx.ellipse(p.cx, p.cy, p.rx, p.ry, 0, 0, 7); ctx.clip();
        RAINBOW.forEach((c, i) => { ctx.fillStyle = c; ctx.globalAlpha = 0.4 * env.evRainbow; ctx.fillRect(p.cx - p.rx, p.cy - p.ry + (i * 2 * p.ry) / 7 + Math.sin(t * 1.5 + i) * 3, p.rx * 2, (2 * p.ry) / 7); });
        ctx.restore();
    }
    ctx.strokeStyle = tint("#e7dcc4"); ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(p.cx, p.cy, p.rx, p.ry, 0, 0, 7); ctx.stroke();
    if (R() < 0.02 + env.rain * 0.25) bg.ripples.push({ x: p.cx + (R() - 0.5) * p.rx * 1.4, y: p.cy + (R() - 0.5) * p.ry, r: 1 });
    for (let i = bg.ripples.length - 1; i >= 0; i--) { const r = bg.ripples[i]; r.r += 0.35; ctx.strokeStyle = `rgba(255,255,255,${Math.max(0, 0.5 - r.r / 40)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r * 1.8, r.r * 0.7, 0, 0, 7); ctx.stroke(); if (r.r > 22) bg.ripples.splice(i, 1); }
    bg.pads.forEach((d, i) => {
        const x = p.cx + d.dx * p.rx * 0.9, y = p.cy + d.dy * p.ry * 0.8 + Math.sin(t + i) * 1;
        ctx.fillStyle = tint("#79c08a"); ctx.beginPath(); ctx.ellipse(x, y, d.r * 1.5, d.r * 0.6, 0, 0, 7); ctx.fill();
        if (d.lotus) { ctx.fillStyle = tint("#ff9fc0"); for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(x + (k - 2) * 3.5, y - 4 - (2 - Math.abs(k - 2)) * 2, 3, 7, (k - 2) * 0.35, 0, 7); ctx.fill(); } }
    });
    ctx.fillStyle = `rgba(255,255,255,${0.7 * light})`;
    for (let i = 0; i < 14; i++) { const a = Math.sin(t * 2 + i * 1.7); if (a > 0.6) ctx.fillRect(p.cx + Math.cos(i * 2.4) * p.rx * 0.8, p.cy + Math.sin(i * 3.1) * p.ry * 0.7, 2.5, 2.5); }

    // Candy land: pink sugar glaze over the ground
    if (env.evCandy > 0.03) { ctx.fillStyle = `rgba(255,170,212,${0.28 * env.evCandy})`; ctx.fillRect(-12, H * 0.6, W + 24, H); }

    // Flower field (sway in wind, droop in rain, wilt in heat)
    const sway = 0.07 + env.wind * 0.34 + env.rain * 0.05;
    for (const f of bg.flowers) drawFlower(ctx, f, t, sway);

    // Little meadow butterflies (sunny days)
    const bA = (1 - env.rain) * (1 - env.night) * (1 - env.wind * 0.6) * (1 - env.evButterfly);
    if (bA > 0.05) bg.bflies.forEach(b => {
        b.a += (R() - 0.5) * 0.12; b.x += Math.cos(b.a) * 0.9; b.y += Math.sin(b.a) * 0.6 + Math.sin(t * 3 + b.x) * 0.3;
        if (b.x < -20) b.x = W + 20; if (b.x > W + 20) b.x = -20;
        b.y = Math.max(H * 0.35, Math.min(H * 0.9, b.y));
        const flap = Math.abs(Math.sin(t * 12 + b.x)) * 7 + 1.5;
        ctx.globalAlpha = bA; ctx.fillStyle = b.c;
        ctx.beginPath(); ctx.ellipse(b.x - 3, b.y, flap, 6, -0.4, 0, 7); ctx.ellipse(b.x + 3, b.y, flap, 6, 0.4, 0, 7); ctx.fill();
        ctx.fillStyle = "#6b5560"; ctx.fillRect(b.x - 0.8, b.y - 5, 1.6, 10); ctx.globalAlpha = 1;
    });

    // Butterfly event: big watercolour butterflies flutter across the whole screen
    if (env.evButterfly > 0.03) bg.bf.forEach(b => {
        b.a += (R() - 0.5) * 0.09 + Math.sin(t * 0.4 + b.ph) * 0.012; b.x += Math.cos(b.a) * b.spd; b.y += Math.sin(b.a) * b.spd * 0.7 + Math.sin(t * 2 + b.ph) * 0.35;
        if (b.x < -90) b.x = W + 90; if (b.x > W + 90) b.x = -90;
        if (b.y < H * 0.08) { b.y = H * 0.08; b.a = -b.a; } if (b.y > H * 0.9) { b.y = H * 0.9; b.a = -b.a; }
        const img = bg.bfImgs[b.i], flap = 0.38 + 0.62 * Math.abs(Math.sin(t * 9 + b.ph));
        ctx.save(); ctx.globalAlpha = env.evButterfly; ctx.translate(b.x, b.y); ctx.rotate(b.a + Math.PI / 2); ctx.scale(flap, 1);
        if (img && img.complete && img.naturalWidth) { const h = (b.size * img.naturalHeight) / img.naturalWidth; ctx.drawImage(img, -b.size / 2, -h / 2, b.size, h); }
        else { ctx.fillStyle = PALETTE[b.i]; ctx.beginPath(); ctx.ellipse(-b.size * 0.22, 0, b.size * 0.25, b.size * 0.36, -0.4, 0, 7); ctx.ellipse(b.size * 0.22, 0, b.size * 0.25, b.size * 0.36, 0.4, 0, 7); ctx.fill(); }
        ctx.restore();
    });

    // Bokeh + pollen
    ctx.globalCompositeOperation = "lighter";
    bg.bokeh.forEach(b => {
        b.y -= 0.12; b.x += Math.sin(t * 0.3 + b.p) * 0.2; if (b.y < -40) b.y = H + 40;
        const a = (0.1 + 0.08 * Math.sin(t * 0.8 + b.p)) * (0.35 + light * 0.65) * (1 - env.rain * 0.7);
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, rgbStr(b.c, a)); g.addColorStop(0.75, rgbStr(b.c, a * 0.7)); g.addColorStop(1, rgbStr(b.c, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
    });
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgba(255,248,200,${0.75 * (1 - env.rain) * (1 - env.night)})`;
    bg.pollen.forEach(q => { q.y -= 0.25; q.x += Math.sin(t + q.p) * 0.4 + env.wind * 3; if (q.y < 0) q.y = H; if (q.x > W) q.x = 0; ctx.beginPath(); ctx.arc(q.x, q.y, 1.8, 0, 7); ctx.fill(); });

    // Rainbow event: falling rainbow glitter
    if (env.evRainbow > 0.03) bg.glit.forEach(g => {
        g.y += g.v; g.x += Math.sin(t + g.p) * 0.5; if (g.y > H) { g.y = -10; g.x = R() * W; }
        ctx.fillStyle = g.c; ctx.globalAlpha = env.evRainbow * (0.4 + 0.6 * Math.abs(Math.sin(t * 3 + g.p))); star4(ctx, g.x, g.y, g.s + 1.5);
        ctx.globalAlpha = 1;
    });
    // Candy event: colourful sprinkles rain down
    if (env.evCandy > 0.03) bg.sprinkles.forEach(s => {
        s.y += s.v; s.rot += 0.02; if (s.y > H) { s.y = -10; s.x = R() * W; }
        ctx.save(); ctx.globalAlpha = env.evCandy; ctx.translate(s.x, s.y); ctx.rotate(s.rot); ctx.fillStyle = s.c; ctx.fillRect(-s.l / 2, -1.6, s.l, 3.2); ctx.restore();
    });

    // Fireflies
    if (env.night > 0.1) bg.flies.forEach(f => {
        f.x += Math.sin(t * 0.7 + f.p) * 0.5; f.y += Math.cos(t * 0.9 + f.p) * 0.4;
        const a = env.night * (0.4 + 0.6 * Math.abs(Math.sin(t * 2 + f.p))) * (1 - env.rain);
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 9);
        g.addColorStop(0, `rgba(255,255,160,${a})`); g.addColorStop(1, "rgba(255,255,160,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, 9, 0, 7); ctx.fill();
    });

    // WINDY: long gust streaks plus leaves and petals streaming past
    if (env.wind > 0.03) {
        ctx.strokeStyle = `rgba(255,255,255,${0.4 * env.wind})`; ctx.lineWidth = 2; ctx.lineCap = "round";
        bg.streaks.forEach(s => {
            s.x += s.v * env.wind; if (s.x > W + 40) { s.x = -s.l; s.y = R() * H * 0.85; }
            ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.quadraticCurveTo(s.x + s.l * 0.5, s.y - 10 + Math.sin(t * 3 + s.y) * 6, s.x + s.l, s.y); ctx.stroke();
        });
        const nP = Math.floor(env.wind * bg.petals.length);
        for (let i = 0; i < nP; i++) {
            const q = bg.petals[i];
            q.x += (7 + q.v * 8) * env.wind; q.y += Math.sin(t * 2.4 + i) * 1.8 + 0.3; q.r += 0.14;
            if (q.x > W + 20) { q.x = -20; q.y = R() * H * 0.9; }
            ctx.fillStyle = tint(q.c); ctx.beginPath(); ctx.ellipse(q.x, q.y, q.leaf ? q.s * 1.5 : q.s, q.s * 0.5, q.r, 0, 7); ctx.fill();
        }
    }

    // RAIN: heavy streaks, splashes, thunder flashes and lightning bolts
    if (env.rain > 0.03) {
        ctx.strokeStyle = `rgba(205,228,255,${0.8 * env.rain})`; ctx.lineWidth = 1.5; ctx.lineCap = "round";
        const n = Math.floor(env.rain * bg.drops.length);
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
            const d = bg.drops[i]; d.y += d.v; d.x -= 2.5;
            ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + 2.5, d.y - d.l);
            if (d.y > d.gy) { if (bg.splashes.length < 110) bg.splashes.push({ x: d.x, y: d.gy, r: 1 }); d.y = -10; d.x = R() * (W + 80); }
        }
        ctx.stroke();
        for (let i = bg.splashes.length - 1; i >= 0; i--) {
            const s = bg.splashes[i]; s.r += 0.5;
            ctx.strokeStyle = `rgba(215,235,255,${Math.max(0, 0.7 - s.r / 12)})`; ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r * 1.6, s.r * 0.6, 0, 0, 7); ctx.stroke();
            if (s.r > 9) bg.splashes.splice(i, 1);
        }
        ctx.fillStyle = `rgba(70,95,130,${env.rain * 0.16})`; ctx.fillRect(-12, -12, W + 24, H + 24);
        if (env.rain > 0.7 && bg.lt.life <= 0 && R() < 0.003) {
            const pts = []; let lx = W * (0.15 + R() * 0.7), ly = 0;
            while (ly < H * 0.7) { pts.push([lx, ly]); lx += (R() - 0.5) * 70; ly += H * 0.04 + R() * H * 0.05; }
            bg.lt = { life: 16, pts };
        }
        if (bg.lt.life > 0) {
            const f = bg.lt.life / 16;
            ctx.fillStyle = `rgba(255,255,255,${0.5 * f})`; ctx.fillRect(-12, -12, W + 24, H + 24);
            if (bg.lt.life > 7) { ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.lineWidth = 3; ctx.shadowColor = "#cfe0ff"; ctx.shadowBlur = 18; ctx.beginPath(); bg.lt.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.shadowBlur = 0; }
            bg.lt.life--;
        }
    }

    // HEATWAVE: blinding glare, haze and rising shimmer
    if (env.heat > 0.03) {
        const gl = ctx.createRadialGradient(sx, sy, 10, sx, sy, W * 0.55);
        gl.addColorStop(0, `rgba(255,250,210,${0.55 * env.heat})`); gl.addColorStop(1, "rgba(255,230,160,0)");
        ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = gl; ctx.fillRect(-12, -12, W + 24, H + 24); ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = `rgba(255,170,60,${env.heat * 0.16})`; ctx.fillRect(-12, -12, W + 24, H + 24);
        ctx.strokeStyle = `rgba(255,255,255,${env.heat * 0.26})`; ctx.lineWidth = 2;
        for (let k = 0; k < 9; k++) {
            const by = H * 0.5 + k * H * 0.055 - ((t * 22) % 30);
            ctx.beginPath();
            for (let x = 0; x <= W; x += 20) ctx.lineTo(x, by + Math.sin(x * 0.03 + t * 3 + k) * 6);
            ctx.stroke();
        }
    }

    // EARTHQUAKE: cracks in the ground, falling rocks and dust
    if (env.quake > 0.05) {
        ctx.fillStyle = `rgba(190,160,130,${env.quake * 0.14})`; ctx.fillRect(-12, -12, W + 24, H + 24);
        ctx.lineJoin = "round";
        bg.cracks.forEach(c => {
            ctx.strokeStyle = `rgba(70,42,36,${env.quake * 0.85})`; ctx.lineWidth = 2 + env.quake * 3; ctx.beginPath(); c.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
            ctx.strokeStyle = `rgba(255,210,170,${env.quake * 0.35})`; ctx.lineWidth = 1; ctx.stroke();
        });
        if (env.quake > 0.4 && bg.rocks.length < 28 && R() < 0.14) bg.rocks.push({ x: R() * W, y: -12, vy: 2 + R() * 3, r: 3 + R() * 6, rot: 0, a: 1, hit: false });
        for (let i = bg.rocks.length - 1; i >= 0; i--) {
            const k = bg.rocks[i]; k.vy += 0.28; k.y += k.vy; k.rot += 0.15;
            if (k.y > H * 0.92) { if (!k.hit) { k.hit = true; for (let d = 0; d < 3; d++) bg.dust.push({ x: k.x, y: k.y, r: 4, a: 0.5 }); } k.vy *= -0.3; k.y = H * 0.92; k.a -= 0.04; }
            ctx.save(); ctx.globalAlpha = Math.max(0, k.a); ctx.translate(k.x, k.y); ctx.rotate(k.rot); ctx.fillStyle = "#8a7469"; ctx.fillRect(-k.r, -k.r * 0.8, k.r * 2, k.r * 1.6); ctx.restore();
            if (k.a <= 0) bg.rocks.splice(i, 1);
        }
        if (env.quake > 0.2 && bg.dust.length < 70 && R() < 0.5) bg.dust.push({ x: R() * W, y: H * (0.8 + R() * 0.2), r: 3 + R() * 6, a: 0.5 });
    }
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
// NPC friends: Fluttera the Butterfly Fairy (left) and Mossy the Flower Dwarf (right)
// Click them to chat about the game, how to play it, and why it teaches data structures & algorithms.
// ---------------------------------------------------------------
const NPCS = {
    fairy: {
        name: "Fluttera", role: "Butterfly Fairy", side: "left",
        menu: "Hi hi, dear gardener! I'm Fluttera. What would you like to hear about?",
        topics: [
            { id: "intro", icon: "🌸", label: "Welcome to Blooming Days", pages: [
                "Hello, dear gardener! I'm Fluttera, the Butterfly Fairy. Welcome to Blooming Days, your very own cozy flower shop!",
                "Here you plant seeds, water them, harvest pretty blooms, and deliver bouquets to sweet customers. Every coin you earn helps your little shop grow.",
                "But this garden has a secret: it is also a classroom! Almost every feature quietly teaches a data structure or an algorithm.",
                "Mossy the Flower Dwarf, over on the right, can show you how to play. And I'll tell you why all of this matters!"] },
            { id: "why", icon: "✨", label: "Why it matters", pages: [
                "Think of a computer as a busy garden. There is SO much to keep organized! Data structures are the beds, shelves and baskets that hold information neatly.",
                "Algorithms are the recipes: step-by-step ways to search, sort, or walk through all that data.",
                "Choose the right structure and a program becomes faster, lighter and easier to understand. Choose the wrong one and even a small program can crawl.",
                "That is what Big O tells us: how the work grows when the garden grows. Looking up a day in the 30-day calendar tree takes about 5 steps instead of 30!",
                "Apps, maps, games and search engines all depend on these ideas. Learning them while having fun helps them stick."] },
            { id: "purpose", icon: "🎯", label: "Purpose of the game", pages: [
                "This game exists so you can SEE data structures and algorithms at work, not just read about them.",
                "Your actions are the data. Planting, watering, buying and delivering all go through structures that keep everything in order.",
                "Open the Student Code Editor and run a topic: your own Python code starts driving the game! Topics 1 to 5 are ready, and more chapters will bloom later.",
                "Make a mistake and the garden shows it. If a grid formula uses the wrong width, flowers pop up on the wrong tiles! Spot it, fix it, and you truly understand it."] },
            { id: "events", icon: "🦋", label: "Events & mutations", pages: [
                "On special days my friends visit: the Butterfly, Rainbow and Cotton Candy events! They are rolled at random for every player, and you can spot them on the Bloom Calendar.",
                "During an event, magic lands on random flowers and mutates them. Pollinated is x1.5, Prismatic is x3.5, and Cotton Candy is a sweet x4!",
                "Behind the scenes a mutation is a NODE MUTATION: your flowers live in a binary search tree keyed by tile number, and the game changes one node's data in place without touching its key.",
                "Mutated flowers keep their bonus when harvested, and they pay extra in customer orders. Lucky you!"] }
        ]
    },
    dwarf: {
        name: "Florian", role: "Flower Dwarf", side: "right",
        menu: "Well met, gardener! I'm Mossy. Ask away, I know every corner of this greenhouse.",
        topics: [
            { id: "play", icon: "🌱", label: "How to play", pages: [
                "You start with 500 coins, 30 water, and 3 Rose plus 3 Sakura seeds. Pick a seed in the Seed Bag, then hover an empty bed to preview the bloom.",
                "Click the empty bed to plant. Click the plant to water it (costs 1 water). Each flower grows through 4 stages, and it needs water at every stage.",
                "When it glows ✨ it is ready: click it to harvest. The flower goes into your Harvest Basket, ready for customers.",
                "In a hurry? Switch to the Fertilizer tool and click a growing flower to bloom it right away."] },
            { id: "money", icon: "🪙", label: "Coins, shops & orders", pages: [
                "Customer Orders pay the total price of the flowers they ask for. Mutated flowers are used first, so they bring bonus coins!",
                "The Seed Shop has a random shelf every dawn. Common seeds are open, but the Uncommon (300), Rare (800), Legendary (2000) and Mythical (5000) tiers must be unlocked first.",
                "The Tool Shop sells water refills, fertilizer, sprinkler upgrades, new flower beds and repair kits. Its stock is random too, so grab good deals!",
                "Deliveries also give XP and levels, and the Flower Almanac pays big rewards when you complete a whole tier."] },
            { id: "weather", icon: "🌦️", label: "Weather & the day", pages: [
                "Every day has its own weather. Rain waters everything for free. Wind makes flowers grow about 30% faster. A heatwave slows growth by 25% and watering costs 2.",
                "An earthquake damages one planted tile. Buy a Repair Kit in the Tool Shop to fix it. Sunny days are calm and gentle.",
                "A day runs from 6 AM to midnight. At dawn the shops restock and your watering can refills to 30. Done early? Press 🌙 End Day to sleep until tomorrow!",
                "The Bloom Calendar on the right shows the whole month, special events included. Tap any day to look it up."] },
            { id: "journal", icon: "📖", label: "Journal & undo", pages: [
                "Everything you do is written in the Garden Journal: planting, watering, harvesting, shopping and delivering. Flip its pages with the arrows.",
                "Press 'Cross out the last line' to undo it for real: the seed comes back, the water is refunded, or the flower returns to the growth stage it had before.",
                "Sometimes it is too late, like undoing a harvest after that flower was sold. Then the line gets a little lock 🔒."] },
            { id: "dsa", icon: "🗺️", label: "Where the data structures hide", pages: [
                "Topic 1, Stacks: the Garden Journal. Every new line is pushed on top, and 'Cross out' pops the last one (last in, first out). It also teaches OOP and Big O.",
                "Topic 2, Queues: the weather forecast waits in line like a FIFO queue. The day at the front becomes today.",
                "Topic 3, Arrays and 2D lists: the greenhouse is a grid. A tile's index is row × columns + column, and buying beds makes the array grow.",
                "Topic 4, Trees: the Flower Almanac is a tree of Almanac → tiers → flowers. Walk it with preorder, inorder, postorder and level-order traversals.",
                "Topic 5, BST and node mutation: tap a calendar day to watch a binary search find it, and watch events mutate a flower's node in place.",
                "Topics 6 to 11 (hash tables, graphs, sorting, searching, Dijkstra and dynamic programming) are waiting for future updates!"] }
        ]
    }
};
let npcOpen = null, npcTopic = null, npcPage = 0, npcTimer = null, npcFull = "";
const npcMet = {};

const npcArt = (id, cls = "") => id === "fairy"
    ? `<div class="npc-art ${cls}"><img class="wing" src="assets/butterfly-4.png" alt="" onerror="this.remove()"><img class="body" src="npc-fairy.png" alt="" draggable="false"></div>`
    : `<div class="npc-art ${cls}"><img class="body" src="npc-dwarf.png" alt="" draggable="false"><img class="hatflower" src="rose.png" alt="" onerror="this.remove()"></div>`;

function mountNPCs() {
    Object.entries(NPCS).forEach(([id, n]) => {
        const el = document.createElement("div");
        el.className = `npc ${n.side} ${id}`; el.id = "npc-" + id;
        el.setAttribute("role", "button"); el.setAttribute("tabindex", "0"); el.setAttribute("aria-label", `Talk to ${n.name}, the ${n.role}`);
        el.onclick = () => openNPC(id);
        el.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openNPC(id); } };
        el.innerHTML = `${npcArt(id)}<span class="npc-tag">${n.name} · ${n.role}</span><span class="npc-hint">💬 Talk to me!</span>`;
        document.body.appendChild(el);
    });
    const dlg = document.createElement("div");
    dlg.id = "npc-dialog"; dlg.className = "glass-panel"; dlg.setAttribute("role", "dialog");
    dlg.innerHTML = `<button class="dlg-close" onclick="closeNPC()" aria-label="Close">✕</button>
        <div class="dlg-inner"><div class="dlg-portrait" id="dlg-portrait"></div>
        <div class="dlg-main"><div class="dlg-name" id="dlg-name"></div><div class="dlg-role" id="dlg-role"></div>
        <div class="dlg-text" id="dlg-text" onclick="dlgTextClick()" title="Click to skip or continue"></div>
        <div class="dlg-choices" id="dlg-choices"></div><div class="dlg-foot" id="dlg-foot"></div></div></div>`;
    document.body.appendChild(dlg);
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeNPC(); });
}

function typeText(t) {
    clearInterval(npcTimer);
    npcFull = t;
    const el = document.getElementById("dlg-text"), por = document.getElementById("dlg-portrait");
    el.textContent = ""; por.classList.add("talking");
    let i = 0;
    npcTimer = setInterval(() => {
        i += 2; el.textContent = t.slice(0, i);
        if (i >= t.length) { clearInterval(npcTimer); npcTimer = null; por.classList.remove("talking"); }
    }, 22);
}

function skipTyping() {
    if (!npcTimer) return false;
    clearInterval(npcTimer); npcTimer = null;
    document.getElementById("dlg-text").textContent = npcFull;
    document.getElementById("dlg-portrait").classList.remove("talking");
    return true;
}

function openNPC(id) {
    if (eodOpen) return;
    const n = NPCS[id];
    npcOpen = id;
    const hint = document.querySelector(`#npc-${id} .npc-hint`); if (hint) hint.remove();
    if (!npcMet[id]) {
        npcMet[id] = true; playerXP += 15;
        showToast(`You met ${n.name}, the ${n.role}! +15 XP ✨`);
        pushAction(`Met ${n.name} the ${n.role}`);
        updatePlayerStats();
    }
    document.getElementById("dlg-portrait").innerHTML = npcArt(id, "mini");
    document.getElementById("dlg-name").textContent = n.name;
    document.getElementById("dlg-role").textContent = n.role;
    document.getElementById("npc-dialog").classList.add("open");
    showMenu();
}

function showMenu() {
    const n = NPCS[npcOpen], other = npcOpen === "fairy" ? "dwarf" : "fairy";
    npcTopic = null; npcPage = 0;
    typeText(n.menu);
    document.getElementById("dlg-choices").innerHTML = n.topics.map(t => `<button class="dlg-choice" onclick="showTopic('${t.id}')">${t.icon} ${t.label}</button>`).join("")
        + `<button class="dlg-choice alt" onclick="openNPC('${other}')">${other === "fairy" ? "🦋" : "🧙"} Talk to ${NPCS[other].name}</button><button class="dlg-choice bye" onclick="closeNPC()">Goodbye 👋</button>`;
    document.getElementById("dlg-foot").innerHTML = "";
}

function showTopic(tid) {
    npcTopic = NPCS[npcOpen].topics.find(t => t.id === tid);
    npcPage = 0;
    renderNPCPage();
}

function renderNPCPage() {
    const t = npcTopic, last = npcPage >= t.pages.length - 1;
    typeText(t.pages[npcPage]);
    document.getElementById("dlg-choices").innerHTML = "";
    document.getElementById("dlg-foot").innerHTML = `<button class="dlg-nav" ${npcPage ? "" : "disabled"} onclick="npcStep(-1)">◀ Back</button>
        <span class="dlg-count">${t.icon} ${t.label} · ${npcPage + 1}/${t.pages.length}</span>
        <button class="dlg-nav primary" onclick="npcStep(1)">${last ? "Back to menu" : "Next ▶"}</button>`;
}

function npcStep(d) {
    if (!npcTopic) return;
    const next = npcPage + d;
    if (next < 0) return;
    if (next >= npcTopic.pages.length) { showMenu(); return; }
    npcPage = next;
    renderNPCPage();
}

function dlgTextClick() { if (!skipTyping() && npcTopic) npcStep(1); }

function closeNPC() {
    clearInterval(npcTimer); npcTimer = null; npcOpen = null; npcTopic = null;
    const d = document.getElementById("npc-dialog");
    if (d) d.classList.remove("open");
}

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

    mountNPCs();
    switchTab("greenhouse");
    initPyodide().catch(() => {});
};