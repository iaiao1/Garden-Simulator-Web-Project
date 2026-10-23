const APP_VERSION = "2.16.0";

let pyodideInstance = null;
let gardenGridState = {};
let displayActionHistory = [];
let currentTreeData = null;
let currentActiveIds = [];
let traversalAnimationTimer = null;

let currentBSTData = null;
let highlightedBSTSearchPath = [];

// Economy & Player Statistics
let playerCoins = 100;
let playerLevel = 1;
let playerXP = 0;

// Time & 30-Day Weather Calendar Mechanics
let currentDay = 1;
let timeMinutes = 360; // 06:00 AM
let gameClockInterval = null;
let thirtyDayWeatherSchedule = []; // Randomized 30-day weather set per session
let currentWeather = { name: "Sunny", icon: "☀️", effect: "normal" };

// Daily Summary Statistics
let dailyStats = {
    coinsEarned: 0,
    salesCount: 0,
    harvestCount: 0
};

// Flower Catalog & Rarity Tiers
const FLOWER_CATALOG = {
    "Rose": { emoji: "🌹", rarity: "COMMON", price: 25, xp: 15, file: "rose.png" },
    "Hyacinth": { emoji: "🪻", rarity: "COMMON", price: 30, xp: 18, file: "morning-glory.png" },
    "Lotus": { emoji: "🪷", rarity: "UNCOMMON", price: 50, xp: 30, file: "lotus.png" },
    "Hibiscus": { emoji: "🌺", rarity: "UNCOMMON", price: 65, xp: 40, file: "hibiscus.png" },
    "Cherry Blossom": { emoji: "🌸", rarity: "RARE", price: 90, xp: 60, file: "sakura.png" },
    "Sunflower": { emoji: "🌻", rarity: "RARE", price: 110, xp: 75, file: "sunflower.png" },
    "Daisy": { emoji: "🌼", rarity: "LEGENDARY", price: 150, xp: 110, file: "daisy.png" },
    "Morning Glory": { emoji: "🪻", rarity: "LEGENDARY", price: 180, xp: 135, file: "morning-glory.png" },
    "Pink Cosmos": { emoji: "🌸", rarity: "MYTHICAL", price: 240, xp: 180, file: "pink-cosmos.png" },
    "Mexican Aster": { emoji: "💮", rarity: "MYTHICAL", price: 300, xp: 230, file: "mexican-aster.png" }
};

let flowerInventory = {
    "Rose": 4,
    "Cherry Blossom": 3,
    "Daisy": 2
};

let seedStock = {
    "Rose": 15,
    "Cherry Blossom": 10,
    "Daisy": 5
};

let toolsInventory = {
    "Watering Can": 1,
    "Faster Sprinkler": 1,
    "Growth Fertilizer": 3,
    "Plots": 25 // Starts at 25 (5x5), expandable up to 100 (10x10)
};

// Active Customer Orders List (Expanded to display multiple choices at once)
let activeCustomerOrders = [
    {
        id: 1,
        type: "single",
        flowerName: "Rose",
        quantity: 2,
        get rewardCoins() { return (FLOWER_CATALOG["Rose"].price * this.quantity) + 15; },
        get rewardXP() { return FLOWER_CATALOG["Rose"].xp * this.quantity; }
    },
    {
        id: 2,
        type: "bouquet",
        items: { "Rose": 2, "Cherry Blossom": 1 },
        get rewardCoins() {
            let total = 50; // Wrapper fee
            for (let f in this.items) total += FLOWER_CATALOG[f].price * this.items[f];
            return total;
        },
        get rewardXP() {
            let totalXP = 30;
            for (let f in this.items) totalXP += FLOWER_CATALOG[f].xp * this.items[f];
            return totalXP;
        }
    },
    {
        id: 3,
        type: "single",
        flowerName: "Daisy",
        quantity: 1,
        get rewardCoins() { return FLOWER_CATALOG["Daisy"].price + 25; },
        get rewardXP() { return FLOWER_CATALOG["Daisy"].xp; }
    },
    {
        id: 4,
        type: "bouquet",
        items: { "Lotus": 1, "Hibiscus": 2 },
        get rewardCoins() {
            let total = 60;
            for (let f in this.items) total += FLOWER_CATALOG[f].price * this.items[f];
            return total;
        },
        get rewardXP() {
            let totalXP = 40;
            for (let f in this.items) totalXP += FLOWER_CATALOG[f].xp * this.items[f];
            return totalXP;
        }
    }
];

// Topic Templates with integrated Python DSA code for Climate Queue (Topic 2) and Calendar BST (Topic 5)
const topicTemplates = {
    1: {
        title: "Python OOP + Big O + Stacks",
        code: `# Topic 1: Python OOP + Big O + Stacks
class Plant:
    def __init__(self, name, water_need):
        self.name = name
        self.water_need = water_need
        self.health = 100

print("You successfully created a plant!")
updateResources(water=200, seeds=90, energy=110, hope=80, coins=350)
`
    },
    2: {
        title: "Queues & Deques (Climate Weather Queue)",
        code: `# Topic 2: Climate Weather Queue (FIFO)
from collections import deque

class WeatherQueue:
    def __init__(self):
        self.queue = deque(["Sunny", "Rain", "Heatwave", "Earthquake", "Windy", "Normal"])

    def get_upcoming_weather(self):
        return list(self.queue)

wq = WeatherQueue()
updateClimateQueue(wq.get_upcoming_weather())
print("Climate Weather Queue (Topic 2) synchronized successfully!")
`
    },
    3: {
        title: "Static/Dynamic Arrays, 2D Lists, & Memory Structures",
        code: `# Topic 3: Garden Grid Dynamic Array
from js import addPlantToGrid, pushAction

GRID_SIZE = 10
def plant_crop(row, col, crop_name):
    pos = (row * GRID_SIZE) + col
    addPlantToGrid(pos, crop_name)
    pushAction(f"Planted {crop_name} at Grid ({row}, {col})")
    return True

print("Topic 3 Garden Grid ready!")
`
    },
    4: {
        title: "Hierarchical Trees & Plant Growth Evolution",
        code: `# Topic 4: Hierarchical Trees & Traversals
import json
from js import window
print("Topic 4 Tree Evaluated successfully!")
`
    },
    5: {
        title: "Binary Search Trees (BST) & 30-Day Weather Calendar",
        code: `# Topic 5: 30-Day Weather Calendar BST Manager
import json
from js import window, pushAction

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

print("Topic 5 30-Day Weather Calendar BST initialized!")
`
    },
    6: { title: "Hash Tables, Collisions, & Rehashing", code: `# Topic 6: Hash Tables\n# ==== WRITE YOUR CODE HERE ====` },
    7: { title: "Graph Foundations & DFS/BFS", code: `# Topic 7: Graphs\n# ==== WRITE YOUR CODE HERE ====` },
    8: { title: "Sorting Algorithms", code: `# Topic 8: Sorting\n# ==== WRITE YOUR CODE HERE ====` },
    9: { title: "Searching Algorithms", code: `# Topic 9: Searching\n# ==== WRITE YOUR CODE HERE ====` },
    10: { title: "Advanced Strategic Paradigms", code: `# Topic 10: Dijkstra\n# ==== WRITE YOUR CODE HERE ====` },
    11: { title: "Dynamic Programming", code: `# Topic 11: DP\n# ==== WRITE YOUR CODE HERE ====` }
};

// Safe Stubs for Removed Visualizers (Prevents Runtime Errors)
window.renderPlantTree = function(treeDataJson, activePathJson) {
    console.log("renderPlantTree called (Visualizer UI removed).");
};

window.renderBSTInventory = function(bstJson) {
    console.log("renderBSTInventory called (Visualizer UI removed).");
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
        let randW = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
        thirtyDayWeatherSchedule.push({ day: d, ...randW });
    }
    currentWeather = thirtyDayWeatherSchedule[0];
    updateClimateQueueUI();
}

function updateClimateQueueUI() {
    const container = document.getElementById("climate-queue");
    if (!container) return;
    container.innerHTML = "";

    let upcoming = thirtyDayWeatherSchedule.slice(currentDay - 1, currentDay + 5);
    upcoming.forEach((w, idx) => {
        let div = document.createElement("div");
        div.className = `p-2.5 rounded-xl text-xs flex items-center justify-between border ${idx === 0 ? 'bg-amber-100 border-amber-300 font-extrabold shadow-sm' : 'bg-white/70 border-rose-100 text-rose-800'}`;
        div.innerHTML = `<span>Day ${w.day}: ${w.icon} ${w.name}</span> <span class="text-[10px] text-amber-700">${idx === 0 ? 'Active' : 'Queued'}</span>`;
        container.appendChild(div);
    });

    document.getElementById("weather-calendar-progress").innerText = `Day ${currentDay} / 30`;
    document.getElementById("weather-icon-badge").innerText = currentWeather.icon;
    document.getElementById("day-label").innerText = `Day ${currentDay} (${currentWeather.name})`;
}

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

function updateClimateQueue(events) {
    renderShopUpgrades();
}

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
    renderInventoryView();
    renderCustomerOrders();
    renderShopUpgrades();
}

function addPlantToGrid(pos, name) {
    const flowerData = FLOWER_CATALOG[name] || FLOWER_CATALOG["Rose"];
    gardenGridState[pos] = {
        name: name,
        stageIndex: 0,
        watered: currentWeather.effect === "auto_water",
        damaged: false,
        icons: ["🌰", "🌱", "🌿", "🪴", flowerData.file]
    };
    renderGarden();
}

function renderGarden() {
    const grid = document.getElementById("garden-grid");
    if (!grid) return;
    grid.innerHTML = "";

    const totalPlots = toolsInventory["Plots"] || 25;
    let gridCols = totalPlots > 50 ? 10 : (totalPlots > 36 ? 8 : 5);
    grid.style.gridTemplateColumns = `repeat(${gridCols}, minmax(0, 1fr))`;

    for (let i = 0; i < totalPlots; i++) {
        const cell = document.createElement("div");

        if (gardenGridState[i]) {
            const plant = gardenGridState[i];
            if (plant.damaged) {
                cell.className = "aspect-square garden-tile border-2 border-red-400 bg-red-50 rounded-2xl flex flex-col items-center justify-center relative shadow-sm cursor-pointer";
                cell.innerHTML = `<span class="text-2xl">🌋</span><span class="absolute bottom-1 text-[8px] font-bold text-red-700">Damaged</span>`;
                cell.onclick = () => { showToast("Tile damaged by earthquake! Repair in Shop tab."); };
                grid.appendChild(cell);
                continue;
            }

            const currentIcon = plant.icons[plant.stageIndex];
            const isImage = currentIcon.endsWith(".png") || currentIcon.endsWith(".jpg");

            cell.className = `aspect-square garden-tile border-2 ${plant.watered ? 'border-emerald-400 bg-emerald-50/40' : 'border-sky-300 bg-sky-50/30'} rounded-2xl flex flex-col items-center justify-center relative shadow-sm cursor-pointer`;
           
            const iconHTML = isImage 
                ? `<img src="${currentIcon}" class="w-10 h-10 object-contain transform transition-transform hover:scale-125 select-none" alt="${plant.name}" />`
                : `<span class="transform transition-transform hover:scale-125 select-none text-2xl">${currentIcon}</span>`;

            cell.innerHTML = `
                ${iconHTML}
                <span class="absolute bottom-1 right-2 text-[8px] font-bold text-sky-700">${plant.watered ? '💧' : 'Dry 💧'}</span>
            `;

            cell.onclick = () => {
                if (!plant.watered) {
                    plant.watered = true;
                    showToast(`Watered ${plant.name}! Tap again to evolve.`);
                    renderGarden();
                } else if (plant.stageIndex < plant.icons.length - 1) {
                    plant.stageIndex++;
                    plant.watered = currentWeather.effect === "auto_water";
                    showToast(`${plant.name} grew to stage ${plant.stageIndex + 1}!`);
                    renderGarden();
                } else {
                    if (!flowerInventory[plant.name]) flowerInventory[plant.name] = 0;
                    flowerInventory[plant.name]++;
                    dailyStats.harvestCount++;
                    
                    showToast(`Harvested 1x ${plant.name} (${FLOWER_CATALOG[plant.name].rarity})! 🧺`);
                    delete gardenGridState[i];
                    renderGarden();
                    renderInventoryView();
                }
            };
        } else {
            cell.className = "aspect-square garden-tile rounded-2xl flex flex-col items-center justify-center text-rose-300/60 text-xl cursor-pointer";
            cell.innerHTML = `<span class="select-none">🌸</span>`;
            cell.onclick = async () => {
                if (!pyodideInstance) { showToast("Python engine loading..."); return; }
                const cropName = document.getElementById("crop-selector")?.value;
                if (!cropName) { showToast("Select a seed first!"); return; }

                if ((seedStock[cropName] || 0) <= 0) {
                    showToast(`No seeds left for ${cropName}!`);
                    return;
                }
                seedStock[cropName]--;

                let colSize = totalPlots > 50 ? 10 : (totalPlots > 36 ? 8 : 5);
                const row = Math.floor(i / colSize), col = i % colSize;
                try {
                    await pyodideInstance.runPythonAsync(`plant_crop(${row}, ${col}, '${cropName.replace(/'/g, "\\'")}')`);
                } catch (err) { showToast(`Error: ${err.message}`); }
            };
        }
        grid.appendChild(cell);
    }
}

function renderInventoryView() {
    const container = document.getElementById("inventory-container");
    if (!container) return;
    container.innerHTML = "";

    let flowerHtml = `<div class="bg-white/90 p-4 rounded-2xl border border-rose-200 shadow-sm flex flex-col justify-between"><h3 class="font-extrabold text-rose-900 text-xs mb-2 flex items-center gap-1.5"><i data-lucide="flower" class="w-3.5 h-3.5 text-rose-500"></i> Harvested Stock</h3><ul class="space-y-1.5 text-xs text-rose-700 overflow-auto max-h-44">`;
    for (let f in flowerInventory) {
        let meta = FLOWER_CATALOG[f] || { rarity: "COMMON" };
        flowerHtml += `<li class="flex justify-between items-center bg-rose-50/50 px-2.5 py-1.5 rounded-xl"><span><b>${f}</b> <span class="text-[8px] bg-rose-100 text-rose-600 px-1 py-0.5 rounded font-bold">${meta.rarity}</span></span> <span class="font-bold">${flowerInventory[f]} pcs</span></li>`;
    }
    flowerHtml += `</ul></div>`;

    let seedHtml = `<div class="bg-white/90 p-4 rounded-2xl border border-rose-200 shadow-sm flex flex-col justify-between"><h3 class="font-extrabold text-rose-900 text-xs mb-2 flex items-center gap-1.5"><i data-lucide="sprout" class="w-3.5 h-3.5 text-emerald-500"></i> Seed Inventory</h3><ul class="space-y-1.5 text-xs text-rose-700 overflow-auto max-h-44">`;
    for (let s in seedStock) {
        seedHtml += `<li class="flex justify-between items-center bg-emerald-50/50 px-2.5 py-1.5 rounded-xl"><span><b>${s}</b></span> <span class="font-bold">${seedStock[s]} seeds</span></li>`;
    }
    seedHtml += `</ul></div>`;

    let toolsHtml = `<div class="bg-white/90 p-4 rounded-2xl border border-rose-200 shadow-sm flex flex-col justify-between"><h3 class="font-extrabold text-rose-900 text-xs mb-2 flex items-center gap-1.5"><i data-lucide="wrench" class="w-3.5 h-3.5 text-amber-500"></i> Tools & Stats</h3><ul class="space-y-1.5 text-xs text-rose-700 overflow-auto max-h-44">`;
    for (let t in toolsInventory) {
        toolsHtml += `<li class="flex justify-between items-center bg-amber-50/50 px-2.5 py-1.5 rounded-xl"><span><b>${t}</b></span> <span class="font-bold">${toolsInventory[t]}</span></li>`;
    }
    toolsHtml += `</ul></div>`;

    container.innerHTML = flowerHtml + seedHtml + toolsHtml;
    lucide.createIcons();
}

function deliverOrder(orderId) {
    const orderIndex = activeCustomerOrders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return;
    const order = activeCustomerOrders[orderIndex];

    let canFulfill = true;
    if (order.type === "single") {
        if ((flowerInventory[order.flowerName] || 0) < order.quantity) canFulfill = false;
    } else if (order.type === "bouquet") {
        for (let f in order.items) {
            if ((flowerInventory[f] || 0) < order.items[f]) canFulfill = false;
        }
    }

    if (!canFulfill) {
        showToast("Not enough catalog flowers in inventory to fulfill order!");
        return;
    }

    if (order.type === "single") {
        flowerInventory[order.flowerName] -= order.quantity;
    } else {
        for (let f in order.items) flowerInventory[f] -= order.items[f];
    }

    playerCoins += order.rewardCoins;
    playerXP += order.rewardXP;
    dailyStats.coinsEarned += order.rewardCoins;
    dailyStats.salesCount++;

    showToast(`Order fulfilled! Earned +${order.rewardCoins} Coins & +${order.rewardXP} XP 🪙`);
    
    activeCustomerOrders.splice(orderIndex, 1);
    activeCustomerOrders.push(generateNewOrder());
    
    updatePlayerStats();
}

function generateNewOrder() {
    const flowerNames = Object.keys(FLOWER_CATALOG);
    const randomFlower = flowerNames[Math.floor(Math.random() * flowerNames.length)];
    const isBouquet = Math.random() > 0.4;

    if (!isBouquet) {
        const qty = Math.floor(Math.random() * 2) + 1;
        return {
            id: Date.now() + Math.random(),
            type: "single",
            flowerName: randomFlower,
            quantity: qty,
            get rewardCoins() { return (FLOWER_CATALOG[randomFlower].price * this.quantity) + 15; },
            get rewardXP() { return FLOWER_CATALOG[randomFlower].xp * this.quantity; }
        };
    } else {
        let f1 = flowerNames[Math.floor(Math.random() * flowerNames.length)];
        let f2 = flowerNames[Math.floor(Math.random() * flowerNames.length)];
        while (f2 === f1) f2 = flowerNames[Math.floor(Math.random() * flowerNames.length)];
        
        let items = {};
        items[f1] = 1;
        items[f2] = 2;

        return {
            id: Date.now() + Math.random(),
            type: "bouquet",
            items: items,
            get rewardCoins() {
                let total = 60;
                for (let f in this.items) total += FLOWER_CATALOG[f].price * this.items[f];
                return total;
            },
            get rewardXP() {
                let totalXP = 45;
                for (let f in this.items) totalXP += FLOWER_CATALOG[f].xp * this.items[f];
                return totalXP;
            }
        };
    }
}

function renderCustomerOrders() {
    const container = document.getElementById("orders-list-container");
    if (!container) return;
    container.innerHTML = "";

    activeCustomerOrders.forEach(order => {
        let reqText = order.type === "single" 
            ? `${order.quantity}x ${order.flowerName} (${FLOWER_CATALOG[order.flowerName].rarity})` 
            : Object.entries(order.items).map(([k, v]) => `${v}x ${k}`).join(", ");
       
        const card = document.createElement("div");
        card.className = "bg-white/90 p-4 rounded-2xl border border-rose-200 flex flex-col justify-between gap-3 shadow-sm";
        card.innerHTML = `
            <div class="flex items-start gap-3">
                <span class="text-2xl">${order.type === 'bouquet' ? '💐' : '🌷'}</span>
                <div>
                    <h4 class="font-extrabold text-rose-900 text-xs">${order.type === 'bouquet' ? 'Boutique Custom Bouquet' : 'Single Flower Request'}</h4>
                    <p class="text-[11px] text-rose-600 mt-0.5">Requires: ${reqText}</p>
                    <p class="text-[10px] text-amber-700 font-bold mt-1">Reward: +${order.rewardCoins} Coins | +${order.rewardXP} XP</p>
                </div>
            </div>
            <button onclick="deliverOrder(${order.id})" class="w-full btn-pastel btn-mint py-2 rounded-xl text-xs font-bold cursor-pointer">Deliver Order</button>
        `;
        container.appendChild(card);
    });
}

function renderShopUpgrades() {
    const grid = document.getElementById("shop-upgrades-grid");
    if (!grid) return;

    let currentPlots = toolsInventory["Plots"] || 25;
    let plotUpgradeCost = 250 + ((currentPlots - 25) * 45);
    let isMaxPlots = currentPlots >= 100;

    grid.innerHTML = `
        <div class="bg-white/80 p-4 rounded-2xl border border-rose-200 shadow-sm flex flex-col justify-between gap-3">
            <div>
                <h3 class="font-extrabold text-rose-900 text-sm">✨ Faster Watering Can</h3>
                <p class="text-[11px] text-rose-600 mt-1">Waters plots instantly with double growth efficiency.</p>
            </div>
            <button onclick="upgradeTool('Watering Can')" class="btn-pastel py-2 rounded-xl text-xs font-bold cursor-pointer">Upgrade (150 Coins)</button>
        </div>
        <div class="bg-white/80 p-4 rounded-2xl border border-rose-200 shadow-sm flex flex-col justify-between gap-3">
            <div>
                <h3 class="font-extrabold text-rose-900 text-sm">🌿 Expanded Flower Beds (${currentPlots}/100 Plots)</h3>
                <p class="text-[11px] text-rose-600 mt-1">Unlock soil plots progressively up to the 10x10 limit.</p>
            </div>
            <button onclick="upgradeTool('Plots')" class="btn-pastel btn-mint py-2 rounded-xl text-xs font-bold cursor-pointer" ${isMaxPlots ? 'disabled' : ''}>${isMaxPlots ? 'Max Expansion (10x10)' : `Unlock Plot (${plotUpgradeCost} Coins)`}</button>
        </div>
        <div class="bg-white/80 p-4 rounded-2xl border border-rose-200 shadow-sm flex flex-col justify-between gap-3">
            <div>
                <h3 class="font-extrabold text-rose-900 text-sm">🧪 Growth Fertilizer (x5)</h3>
                <p class="text-[11px] text-rose-600 mt-1">Instantly matures any growing flower in your greenhouse.</p>
            </div>
            <button onclick="upgradeTool('Fertilizer')" class="btn-pastel py-2 rounded-xl text-xs font-bold cursor-pointer">Buy Fertilizer (100 Coins)</button>
        </div>
        <div class="bg-white/80 p-4 rounded-2xl border border-rose-200 shadow-sm flex flex-col justify-between gap-3">
            <div>
                <h3 class="font-extrabold text-rose-900 text-sm">🌋 Earthquake Soil Repair</h3>
                <p class="text-[11px] text-rose-600 mt-1">Repair earthquake-damaged plots (50c per tile or 200c bulk fix).</p>
            </div>
            <div class="flex gap-2">
                <button onclick="repairTile(false)" class="flex-1 btn-pastel bg-amber-100 py-2 rounded-xl text-[11px] font-bold cursor-pointer">Fix Tile (50c)</button>
                <button onclick="repairTile(true)" class="flex-1 btn-pastel btn-mint py-2 rounded-xl text-[11px] font-bold cursor-pointer">Fix All (200c)</button>
            </div>
        </div>
    `;
}

function upgradeTool(type) {
    if (type === "Watering Can") {
        if (playerCoins >= 150) {
            playerCoins -= 150;
            toolsInventory["Faster Sprinkler"] = (toolsInventory["Faster Sprinkler"] || 1) + 1;
            showToast("Upgraded Watering Can efficiency! ⚡");
            updatePlayerStats();
        } else { showToast("Not enough coins! (Need 150 Coins)"); }
    } else if (type === "Plots") {
        let currentPlots = toolsInventory["Plots"] || 25;
        let cost = 250 + ((currentPlots - 25) * 45);
        if (currentPlots >= 100) { showToast("Greenhouse is at maximum 10x10 capacity!"); return; }
        if (playerCoins >= cost) {
            playerCoins -= cost;
            toolsInventory["Plots"] = Math.min(100, currentPlots + 5);
            showToast("Expanded Greenhouse Flower Beds! 🌿");
            updatePlayerStats();
            renderGarden();
        } else { showToast(`Not enough coins! (Need ${cost} Coins)`); }
    } else if (type === "Fertilizer") {
        if (playerCoins >= 100) {
            playerCoins -= 100;
            toolsInventory["Growth Fertilizer"] = (toolsInventory["Growth Fertilizer"] || 0) + 5;
            showToast("Purchased 5x Growth Fertilizer! 🧪");
            updatePlayerStats();
        } else { showToast("Not enough coins! (Need 100 Coins)"); }
    }
}

function repairTile(bulk) {
    let damagedIndices = Object.keys(gardenGridState).filter(k => gardenGridState[k].damaged);
    if (damagedIndices.length === 0) {
        showToast("No earthquake-damaged tiles to repair!");
        return;
    }

    if (bulk) {
        if (playerCoins >= 200) {
            playerCoins -= 200;
            damagedIndices.forEach(idx => delete gardenGridState[idx]);
            showToast("Successfully repaired all damaged soil plots! 🛡️");
            updatePlayerStats();
            renderGarden();
        } else { showToast("Not enough coins for bulk repair! (Need 200 Coins)"); }
    } else {
        if (playerCoins >= 50) {
            playerCoins -= 50;
            delete gardenGridState[damagedIndices[0]];
            showToast("Successfully repaired 1 damaged tile! 🛡️");
            updatePlayerStats();
            renderGarden();
        } else { showToast("Not enough coins! (Need 50 Coins)"); }
    }
}

function startGameClock() {
    initializeWeatherCalendar();
    if (gameClockInterval) clearInterval(gameClockInterval);

    gameClockInterval = setInterval(() => {
        timeMinutes += 15;
        if (timeMinutes >= 1440) {
            timeMinutes = 360;
            triggerEndOfDayModal();
        }
        updateClockDisplay();
    }, 2000);
}

function updateClockDisplay() {
    let hours = Math.floor(timeMinutes / 60);
    let minutes = timeMinutes % 60;
    let ampm = hours >= 12 ? "PM" : "AM";
    let displayHour = hours % 12;
    displayHour = displayHour ? displayHour : 12;
    let displayMin = minutes < 10 ? "0" + minutes : minutes;

    const clockEl = document.getElementById("clock-text");
    if (clockEl) clockEl.innerText = `${displayHour}:${displayMin} ${ampm}`;
}

function triggerEndOfDayModal() {
    currentDay++;
    if (currentDay > 30) currentDay = 1;
    currentWeather = thirtyDayWeatherSchedule[currentDay - 1];

    if (currentWeather.effect === "auto_water") {
        Object.keys(gardenGridState).forEach(k => {
            if (gardenGridState[k]) gardenGridState[k].watered = true;
        });
        showToast("🌧️ Rain showered your greenhouse, automatically watering all plants!");
    } else if (currentWeather.effect === "soil_damage") {
        let keys = Object.keys(gardenGridState);
        if (keys.length > 0) {
            let targetKey = keys[Math.floor(Math.random() * keys.length)];
            if (gardenGridState[targetKey]) gardenGridState[targetKey].damaged = true;
            showToast("🌋 Earthquake struck! A greenhouse plot was damaged.");
        }
    }

    updateClimateQueueUI();

    document.getElementById("eod-title").innerText = `DAY ${currentDay - 1} CLOSED`;
    document.getElementById("eod-coins").innerText = `+${dailyStats.coinsEarned}`;
    document.getElementById("eod-sales").innerText = dailyStats.salesCount;
    document.getElementById("eod-harvests").innerText = dailyStats.harvestCount;
    
    document.getElementById("eod-modal").classList.remove("hidden");
}

function closeEndOfDayModal() {
    document.getElementById("eod-modal").classList.add("hidden");
    dailyStats = { coinsEarned: 0, salesCount: 0, harvestCount: 0 };
    timeMinutes = 360;
    updateClockDisplay();
    showToast(`Welcome to Day ${currentDay} (${currentWeather.name})! 🌱`);
}

function updateResources(water, seeds, energy, hope, coins) {
    if (coins !== undefined) playerCoins = coins;
    document.getElementById("coins-text").innerText = `${playerCoins} Coins`;
}

function addPlantsToDropdown(plants) {
    const select = document.getElementById("crop-selector");
    if (!select) return;
    select.innerHTML = "";
    if (!plants) return;
    plants.forEach(([name, emoji, cost]) => {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = `${emoji} ${name} (${cost}c)`;
        select.appendChild(opt);
    });
}

function pushAction(action) {
    displayActionHistory.push(action);
    if (displayActionHistory.length > 8) displayActionHistory.shift();
    renderActionStack();
}

function renderActionStack() {
    const container = document.getElementById("action-stack");
    if (!container) return;
    container.innerHTML = "";
    [...displayActionHistory].reverse().forEach(act => {
        const div = document.createElement("div");
        div.className = "bg-white/90 border-l-4 border-rose-400 px-3 py-2 rounded-xl text-xs font-bold text-rose-900 shadow-sm flex items-center gap-1.5";
        div.textContent = `🌸 ${act}`;
        container.appendChild(div);
    });
}

async function triggerUndo() {
    if (displayActionHistory.length > 0) {
        const undone = displayActionHistory.pop();
        renderActionStack();
        showToast(`Undid: ${undone}`);
    } else {
        showToast("Action Stack is empty.");
    }
}

function showToast(msg) {
    const toast = document.createElement("div");
    toast.className = "fixed bottom-6 right-6 bg-white/95 border-2 border-rose-300 text-rose-900 px-5 py-3 rounded-2xl shadow-xl z-50 text-xs font-extrabold flex items-center gap-2 transform transition-all duration-300 animate-bounce";
    toast.innerHTML = `✨ ${msg}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

async function runPythonCode() {
    const consoleEl = document.getElementById("output-console");
    consoleEl.innerHTML = `<span class="text-rose-500 font-bold">🌸 Running python script...</span><br>`;
    try {
        await initPyodide();
        const code = document.getElementById("code-editor").value.trim();
        await pyodideInstance.runPythonAsync(code);
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
    const key = document.getElementById("topic-selector").value;
    document.getElementById("code-editor").value = topicTemplates[key].code;
}

function switchTab(tab) {
    const views = {
        greenhouse: document.getElementById("view-greenhouse"),
        inventory: document.getElementById("view-inventory"),
        shop: document.getElementById("view-shop"),
        orders: document.getElementById("view-orders"),
        code: document.getElementById("view-code")
    };
    const buttons = {
        greenhouse: document.getElementById("tab-greenhouse"),
        inventory: document.getElementById("tab-inventory"),
        shop: document.getElementById("tab-shop"),
        orders: document.getElementById("tab-orders"),
        code: document.getElementById("tab-code")
    };

    Object.keys(views).forEach(key => {
        if (views[key]) views[key].classList.toggle("hidden", key !== tab);
        if (buttons[key]) {
            buttons[key].className = key === tab
                ? "px-5 py-3 rounded-2xl text-xs font-extrabold btn-pastel transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                : "px-5 py-3 rounded-2xl text-xs font-extrabold text-rose-700 bg-white/60 hover:bg-white transition-all flex items-center gap-2 cursor-pointer border border-rose-200 shadow-sm";
        }
    });
}

window.onload = () => {
    document.getElementById("version-badge").textContent = "v" + APP_VERSION;
    lucide.createIcons();
    
    const defaultPlants = Object.entries(FLOWER_CATALOG).map(([name, data]) => [name, data.emoji, data.price]);
    addPlantsToDropdown(defaultPlants);

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