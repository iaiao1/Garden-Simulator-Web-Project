const APP_VERSION = "0.4.0";

let pyodideInstance = null;
let gardenGridState = {};
let displayActionHistory = [];
let currentTreeData = null;
let currentActiveIds = [];
let traversalAnimationTimer = null;

let currentBSTData = null;
let highlightedBSTSearchPath = [];

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

updateResources(
    water = 200,
    seeds = 90,
    energy = 110,
    hope = 80,
    coins = 999
)

addPlantsToDropdown([
    ("Rose", "🌹", 10),
    ("Hyacinth", "🪻", 20),
    ("Lotus", "🪷", 50),
    ("Hibiscus", "🌺", 75),
    ("Cherry Blossom", "🌸", 100),
    ("Sunflower", "🌻", 125),
    ("Daisy", "🌼", 150),
    ("Morning Glory", "🪻", 175),
    ("Pink Cosmos", "🌸", 200),
    ("Mexican Aster", "💮", 250)
])

print("Resource Storage and Plant dropdown unlocked!")

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

    def peek(self):
        if not self.is_empty():
            return self.stack[-1]
        return None

    def is_empty(self):
        return len(self.stack) == 0

stack = ActionHistoryStack()
stack.push_action("Planted Seeds")
stack.push_action("Watered Plants")

print("Action History Stack ready!")
`
    },
    2: {
        title: "Queues & Deques (FIFO Elements)",
        code: `# Topic 2: Queues & Deques (FIFO Elements)
from collections import deque

class ClimateQueue:
    def __init__(self):
        self.queue = deque()

    def add_challenge(self, event_name):
        self.queue.append(event_name)

q = ClimateQueue()
q.add_challenge("Heatwaves")
q.add_challenge("Wildfires")
q.add_challenge("Floods")
q.add_challenge("Tropical Storms")
q.add_challenge("Hurricanes")

updateClimateQueue(list(q.queue))
print("Climate Queue (FIFO) ready!")
`
    },
    3: {
        title: "Static/Dynamic Arrays, 2D Lists, & Memory Structures",
        code: `# Topic 3: Static/Dynamic Arrays, 2D Lists, & Memory Structures
from js import addPlantToGrid, addPlantsToDropdown, pushAction

GRID_SIZE = 5
PLANTS = [
    ("Rose", "🌹", 10),
    ("Hyacinth", "🪻", 20),
    ("Lotus", "🪷", 50),
    ("Hibiscus", "🌺", 75),
    ("Cherry Blossom", "🌸", 100),
    ("Sunflower", "🌻", 125),
    ("Daisy", "🌼", 150),
    ("Morning Glory", "🪻", 175),
    ("Pink Cosmos", "🌸", 200),
    ("Mexican Aster", "💮", 250)
]

class GardenGrid:
    def __init__(self, size=GRID_SIZE):
        self.size = size
        self.grid = [[None for _ in range(size)] for _ in range(size)]
        self.catalog = {name: (emoji, price) for name, emoji, price in PLANTS}

    def is_valid_position(self, row, col):
        return 0 <= row < self.size and 0 <= col < self.size

    def to_1d_index(self, row, col):
        return (row * self.size) + col

    def plant_at(self, row, col, crop_name):
        if not self.is_valid_position(row, col) or crop_name not in self.catalog:
            return False
        if self.grid[row][col] is not None:
            return False

        self.grid[row][col] = crop_name
        pos = self.to_1d_index(row, col)
        addPlantToGrid(pos, crop_name)
        pushAction(f"Planted {crop_name} at Grid ({row}, {col})")
        return True

garden = GardenGrid()
addPlantsToDropdown(PLANTS)

def plant_crop(row, col, crop_name):
    return garden.plant_at(row, col, crop_name)

print("Topic 3 Garden Grid ready!")
`
    },
    4: {
        title: "Hierarchical Trees & Plant Growth Evolution",
        code: `# Topic 4: Hierarchical Trees & Traversals
import json
from collections import deque
from js import window

class PlantNode:
    def __init__(self, node_id, stage_name, icon, min_health=0, min_water=0, days_required=0):
        self.node_id = node_id
        self.stage_name = stage_name
        self.icon = icon
        self.min_health = min_health
        self.min_water = min_water
        self.days_required = days_required
        self.condition_met = False
        self.status = "inactive"
        self.children = []

    def add_child(self, child_node):
        self.children.append(child_node)
        return child_node

    def to_dict(self):
        return {
            "id": self.node_id,
            "stage_name": self.stage_name,
            "icon": self.icon,
            "min_health": self.min_health,
            "min_water": self.min_water,
            "status": self.status,
            "condition_met": self.condition_met,
            "children": [c.to_dict() for c in self.children]
        }

class PlantGrowthTree:
    def __init__(self):
        self.root = PlantNode("node_seed", "Seed", "🌰", 0, 0, 0)
        seedling = self.root.add_child(PlantNode("node_seedling", "Seedling", "🌱", 20, 20, 1))
       
        thriving = seedling.add_child(PlantNode("node_thriving", "Thriving Sprout", "🌿", 60, 50, 2))
        bud = thriving.add_child(PlantNode("node_bud", "Flowering Bud", "🌼", 80, 70, 3))
        bud.add_child(PlantNode("node_matured", "Matured Plant", "💐", 90, 85, 4))
       
        struggling = seedling.add_child(PlantNode("node_struggling", "Struggling Sprout", "🥀", 30, 20, 2))
        struggling.add_child(PlantNode("node_stunted", "Wilted/Stunted", "🍂", 10, 10, 3))

    def evaluate_growth(self, health, water, days):
        active_ids = []
        def check_nodes(node):
            node.condition_met = (health >= node.min_health and water >= node.min_water and days >= node.days_required)
            node.status = "inactive"
            for child in node.children:
                check_nodes(child)

        check_nodes(self.root)

        curr = self.root
        while curr and curr.condition_met:
            curr.status = "active"
            active_ids.append(curr.node_id)
            next_node = None
            for c in curr.children:
                if c.condition_met:
                    if not next_node or c.min_health > next_node.min_health:
                        next_node = c
            curr = next_node

        return self.root.to_dict(), active_ids

tree = PlantGrowthTree()
tree_data, active_ids = tree.evaluate_growth(health=85, water=80, days=4)

if hasattr(window, 'renderPlantTree'):
    window.renderPlantTree(
        json.dumps(tree_data),
        json.dumps(active_ids)
    )

print("Topic 4 Tree Evaluated successfully!")
`
    },
    5: {
        title: "Binary Search Trees (BST) & Node Mutation",
        code: `# Topic 5: Binary Search Trees (BST) & Node Mutation
import json
from js import window, pushAction, updateResources

class BSTNode:
    def __init__(self, key, name, icon, health=100, stage="Seed"):
        self.key = key
        self.name = name
        self.icon = icon
        self.health = health
        self.stage = stage
        self.left = None
        self.right = None

    def to_dict(self):
        return {
            "key": self.key,
            "name": self.name,
            "icon": self.icon,
            "health": self.health,
            "stage": self.stage,
            "left": self.left.to_dict() if self.left else None,
            "right": self.right.to_dict() if self.right else None
        }

class PlantInventoryBST:
    def __init__(self):
        self.root = None

    def insert(self, key, name, icon, health=100, stage="Seed"):
        new_node = BSTNode(key, name, icon, health, stage)
        if not self.root:
            self.root = new_node
            pushAction(f"BST: Inserted root seed [{key}] {name}")
            return self.root

        curr = self.root
        while True:
            if key < curr.key:
                if not curr.left:
                    curr.left = new_node
                    break
                curr = curr.left
            elif key > curr.key:
                if not curr.right:
                    curr.right = new_node
                    break
                curr = curr.right
            else:
                curr.name = name
                curr.icon = icon
                curr.health = health
                curr.stage = stage
                break
        pushAction(f"BST: Inserted rare seed [{key}] {name}")
        return self.root

    def search(self, key):
        curr = self.root
        path = []
        while curr:
            path.append(curr.key)
            if key == curr.key:
                pushAction(f"BST Search: Found [{key}] {curr.name} via path {path}")
                return curr, path
            elif key < curr.key:
                curr = curr.left
            else:
                curr = curr.right
        pushAction(f"BST Search: Key [{key}] not found")
        return None, path

    def node_mutation(self, key, new_health, new_stage):
        curr = self.root
        while curr:
            if key == curr.key:
                curr.health = new_health
                curr.stage = new_stage
                pushAction(f"Mutation: Updated Seed ID {key} ({curr.name}) -> Health: {new_health}%, Stage: {new_stage}")
                return True
            elif key < curr.key:
                curr = curr.left
            else:
                curr = curr.right
        return False

    def to_dict(self):
        return self.root.to_dict() if self.root else None

# Initialize Inventory BST
inventory_bst = PlantInventoryBST()
inventory_bst.insert(50, "Cherry Blossom", "🌸", 85, "Thriving")
inventory_bst.insert(30, "Rose", "🌹", 70, "Wilted")
inventory_bst.insert(70, "Hyacinth", "🪻", 90, "Matured")
inventory_bst.insert(20, "Lotus", "🪷", 60, "Bud")
inventory_bst.insert(85, "Hibiscus", "🌺", 95, "Matured")

if hasattr(window, 'renderBSTInventory'):
    window.renderBSTInventory(json.dumps(inventory_bst.to_dict()))

updateResources(water=190, seeds=95, energy=115, hope=90, coins=750)
print("Topic 5 BST Inventory & Node Mutation initialized successfully!")
`
    },
    6: { 
        title: "Hash Tables, Collisions, & Rehashing", 
        code: `# Topic 6: Hash Tables, Collisions, & Rehashing 
    ==== WRITE YOUR CODE HERE ====
    ` 
    },

    7: { 
        title: "Graph Foundations, Adjacency Matrices/Lists, & DFS/BFS", 
        code: `# Topic 7: Graph Foundations, Adjacency Matrices/Lists, & DFS/BFS
    ==== WRITE YOUR CODE HERE ====
    ` 
    },
    
    8: { 
        title: "Sorting Algorithms (Bubble, Insertion, Selection, Quick, & Merge Sort)", 
        code: `# Topic 8: Sorting Algorithms
        ==== WRITE YOUR CODE HERE ====
        ` 
    },
   
    9: { 
        title: "Searching Algorithms (Linear Search vs. Binary Search)", 
        code: `# Topic 9: Searching Algorithms
    ==== WRITE YOUR CODE HERE ====
    ` 
    },
    
    10: { 
        title: "Advanced Strategic Paradigms (Dijkstra's Algorithm & Greedy Patterns)", 
        code: `# Topic 10: Advanced Strategic Paradigms
        ==== WRITE YOUR CODE HERE ====
        ` 
    },
    
    11: { 
        title: "Dynamic Programming (DP), Memoization, & Divide-and-Conquer", 
        code: `# Topic 11: Dynamic Programming (DP)
        ==== WRITE YOUR CODE HERE ====
        ` 
    }
};

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
        throw err;
    }
}

function updateClimateQueue(events) {
    const container = document.getElementById("climate-queue");
    container.innerHTML = "";
    if (!events) return;
    events.forEach(event => {
        const div = document.createElement("div");
        div.className = "p-3 bg-amber-100/80 border border-amber-300 rounded-2xl text-xs shadow-sm flex items-center justify-between";
        div.innerHTML = `<div class="font-extrabold text-amber-900 flex items-center gap-1.5"><i data-lucide="cloud" class="w-3.5 h-3.5 text-amber-600"></i> ${event}</div>`;
        container.appendChild(div);
    });
    lucide.createIcons();
}

const PLANT_MATURE_ICONS = {
    "Rose": "🌹",
    "Hyacinth": "🪻",
    "Lotus": "🪷",
    "Hibiscus": "🌺",
    "Cherry Blossom": "🌸",
    "Sunflower": "🌻",
    "Daisy": "🌼",
    "Morning Glory": "🪻",
    "Pink Cosmos": "🌸",
    "Mexican Aster": "💮"
};

function addPlantToGrid(pos, name) {
    // Kukunin ang angkop na mature icon batay sa itinanim na pangalan
    const matureIcon = PLANT_MATURE_ICONS[name] || "💐";

    gardenGridState[pos] = {
        name: name,
        stageIndex: 0,
        health: 50,
        water: 50,
        days: 1,
        icons: ["🌰", "🌱", "🌿", "🪴", matureIcon]
    };
    renderGarden();
}

function renderGarden() {
    const grid = document.getElementById("garden-grid");
    grid.innerHTML = "";
    for (let i = 0; i < 25; i++) {
        const cell = document.createElement("div");
       
        if (gardenGridState[i]) {
            cell.className = "aspect-square garden-tile border-2 border-rose-300 bg-white/90 rounded-2xl flex flex-col items-center justify-center text-2xl relative shadow-sm";
            const plant = gardenGridState[i];
            const currentIcon = plant.icons[plant.stageIndex];
            cell.innerHTML = `
                <span class="transform transition-transform hover:scale-125">${currentIcon}</span>
                <span class="text-[9px] text-rose-700 font-bold code-font">Day ${plant.days}</span>
            `;
            cell.onclick = () => {
                if (plant.stageIndex < plant.icons.length - 1) {
                    plant.stageIndex++;
                    plant.health = Math.min(100, plant.health + 15);
                    plant.water = Math.min(100, plant.water + 20);
                    plant.days++;
                    renderGarden();
                    showToast(`Evolved to ${plant.icons[plant.stageIndex]}! ✨`);
                } else {
                    showToast("Plant is already fully matured! 💐");
                }
            };
        } else {
            cell.className = "aspect-square garden-tile rounded-2xl flex flex-col items-center justify-center text-rose-300/60 text-2xl select-none";
            cell.innerHTML = `<span class="select-none">🌸</span>`;
            cell.onclick = async () => {
                if (!pyodideInstance) { showToast("Python engine is loading..."); return; }
                const cropName = document.getElementById("crop-selector")?.value;
                if (!cropName) { showToast("Select a seed first!"); return; }

                if (!pyodideInstance.globals.has("plant_crop")) {
                    showToast("Run Topic 3 code in editor first!");
                    return;
                }
                const row = Math.floor(i / 5), col = i % 5;
                try {
                    await pyodideInstance.runPythonAsync(`plant_crop(${row}, ${col}, '${cropName.replace(/'/g, "\\'")}')`);
                } catch (err) { showToast(`Error: ${err.message}`); }
            };
        }
        grid.appendChild(cell);
    }
}

function updateResources(water, seeds, energy, hope, coins) {
    if (typeof water === "object" && water !== null) {
        const a = water;
        water = a.water || 0; seeds = a.seeds || 0; energy = a.energy || 0; hope = a.hope || 0; coins = a.coins || 0;
    }
    document.getElementById("water-text").innerText = `${water || 0} / 200 L`;
    document.getElementById("water-bar").style.width = `${Math.min(100, ((water || 0)/200)*100)}%`;
    document.getElementById("seeds-text").innerText = `${seeds || 0} / 100`;
    document.getElementById("seeds-bar").style.width = `${Math.min(100, ((seeds || 0)/100)*100)}%`;
    document.getElementById("energy-text").innerText = `${energy || 0} / 120 Wh`;
    document.getElementById("energy-bar").style.width = `${Math.min(100, ((energy || 0)/120)*100)}%`;
    document.getElementById("hope-text").innerText = `${hope || 0} / 100`;
    document.getElementById("hope-bar").style.width = `${Math.min(100, ((hope || 0)/100)*100)}%`;
    document.getElementById("coins-text").innerText = `${coins || 0} Coins`;
}

function addPlantsToDropdown(plants) {
    const select = document.getElementById("crop-selector");
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

        if (undone.includes("Planted")) {
            const keys = Object.keys(gardenGridState);
            if (keys.length > 0) {
                const lastKey = keys[keys.length - 1];
                delete gardenGridState[lastKey];
                renderGarden();
            }
        }
       
        if (pyodideInstance && pyodideInstance.globals.has("stack")) {
            try {
                await pyodideInstance.runPythonAsync("stack.pop_action()");
            } catch(e) {}
        }

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

function loadTopic() {
    const key = document.getElementById("topic-selector").value;
    document.getElementById("code-editor").value = topicTemplates[key].code;
}

function switchTab(tab) {
    const viewGame = document.getElementById("view-game");
    const viewCode = document.getElementById("view-code");
    const btnGame = document.getElementById("tab-game");
    const btnCode = document.getElementById("tab-code");

    if (!viewGame || !viewCode || !btnGame || !btnCode) return;

    if (tab === "game") {
        viewGame.classList.remove("hidden");
        viewCode.classList.add("hidden");

        btnGame.className = "px-5 py-2 rounded-xl text-xs font-extrabold btn-pastel transition-all cursor-pointer";
        btnCode.className = "px-5 py-2 rounded-xl text-xs font-extrabold text-rose-700 hover:text-rose-900 transition-all cursor-pointer";
    } else if (tab === "code") {
        viewGame.classList.add("hidden");
        viewCode.classList.remove("hidden");

        btnCode.className = "px-5 py-2 rounded-xl text-xs font-extrabold btn-pastel transition-all cursor-pointer";
        btnGame.className = "px-5 py-2 rounded-xl text-xs font-extrabold text-rose-700 hover:text-rose-900 transition-all cursor-pointer";
    }
}

// TOPIC 4: TREE VISUALIZER
window.renderPlantTree = function(treeDataJson, activePathJson) {
    currentTreeData = typeof treeDataJson === "string" ? JSON.parse(treeDataJson) : treeDataJson;
    currentActiveIds = typeof activePathJson === "string" ? JSON.parse(activePathJson) : activePathJson;
    drawTreeSVG(currentTreeData, currentActiveIds);
};

function drawTreeSVG(treeData, highlightedIds = [], stepOrderMap = {}) {
    const svg = document.getElementById("tree-svg");
    if (!svg || !treeData) return;
    svg.innerHTML = "";

    const width = svg.clientWidth || 450;
    const levels = [];

    function getLevels(node, depth = 0) {
        if (!levels[depth]) levels[depth] = [];
        levels[depth].push(node);
        if (node.children) node.children.forEach(c => getLevels(c, depth + 1));
    }
    getLevels(treeData);

    const nodeCoords = {};
    levels.forEach((nodesInLevel, depth) => {
        const y = 35 + depth * 52;
        const spacing = width / (nodesInLevel.length + 1);
        nodesInLevel.forEach((node, idx) => {
            nodeCoords[node.id] = { x: spacing * (idx + 1), y, node };
        });
    });

    function drawLines(node) {
        if (node.children) {
            node.children.forEach(child => {
                const parentCoord = nodeCoords[node.id];
                const childCoord = nodeCoords[child.id];
                const isActive = highlightedIds.includes(child.id) && highlightedIds.includes(node.id);

                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute("x1", parentCoord.x);
                line.setAttribute("y1", parentCoord.y);
                line.setAttribute("x2", childCoord.x);
                line.setAttribute("y2", childCoord.y);
                line.setAttribute("stroke", isActive ? "#ffb7b2" : "#e2d2c1");
                line.setAttribute("stroke-width", isActive ? "3" : "1.5");
                if (!isActive) line.setAttribute("stroke-dasharray", "4");
                svg.appendChild(line);

                drawLines(child);
            });
        }
    }
    drawLines(treeData);

    Object.values(nodeCoords).forEach(({ x, y, node }) => {
        const isActive = highlightedIds.includes(node.id);
        const stepNum = stepOrderMap[node.id];
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

        if (isActive) {
            const halo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            halo.setAttribute("cx", x);
            halo.setAttribute("cy", y);
            halo.setAttribute("r", "18");
            halo.setAttribute("fill", "none");
            halo.setAttribute("stroke", stepNum ? "#ff9aa2" : "#b5ead7");
            halo.setAttribute("stroke-width", "3");
            g.appendChild(halo);
        }

        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", x);
        circle.setAttribute("cy", y);
        circle.setAttribute("r", "15");
        circle.setAttribute("fill", isActive ? "#ffdac1" : "#ffffff");
        circle.setAttribute("stroke", isActive ? "#ffb7b2" : "#e2d2c1");
        circle.setAttribute("stroke-width", isActive ? "2.5" : "1.5");

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", x);
        text.setAttribute("y", y + 4);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("font-size", "11px");
        text.textContent = node.icon;

        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("x", x);
        label.setAttribute("y", y + 26);
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("fill", isActive ? "#8c5383" : "#8c827e");
        label.setAttribute("font-size", "8px");
        label.setAttribute("font-weight", isActive ? "bold" : "normal");
        label.textContent = node.stage_name;

        g.appendChild(circle);
        g.appendChild(text);
        g.appendChild(label);

        if (stepNum) {
            const badgeG = document.createElementNS("http://www.w3.org/2000/svg", "g");
            const badgeBg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            badgeBg.setAttribute("cx", x + 10);
            badgeBg.setAttribute("cy", y - 10);
            badgeBg.setAttribute("r", "7");
            badgeBg.setAttribute("fill", "#ff9aa2");

            const badgeTxt = document.createElementNS("http://www.w3.org/2000/svg", "text");
            badgeTxt.setAttribute("x", x + 10);
            badgeTxt.setAttribute("y", y - 7);
            badgeTxt.setAttribute("text-anchor", "middle");
            badgeTxt.setAttribute("fill", "#ffffff");
            badgeTxt.setAttribute("font-size", "8px");
            badgeTxt.setAttribute("font-weight", "bold");
            badgeTxt.textContent = stepNum;

            badgeG.appendChild(badgeBg);
            badgeG.appendChild(badgeTxt);
            g.appendChild(badgeG);
        }

        svg.appendChild(g);
    });
}

function getPreOrderSequence(node, list = []) {
    if (!node) return list;
    list.push(node);
    if (node.children) node.children.forEach(child => getPreOrderSequence(child, list));
    return list;
}

function getInOrderSequence(node, list = []) {
    if (!node) return list;
    if (node.children && node.children.length > 0) getInOrderSequence(node.children[0], list);
    list.push(node);
    if (node.children && node.children.length > 1) {
        for (let i = 1; i < node.children.length; i++) getInOrderSequence(node.children[i], list);
    }
    return list;
}

function getPostOrderSequence(node, list = []) {
    if (!node) return list;
    if (node.children) node.children.forEach(child => getPostOrderSequence(child, list));
    list.push(node);
    return list;
}

function getLevelOrderSequence(node) {
    const list = [];
    if (!node) return list;
    const queue = [node];
    while (queue.length > 0) {
        const curr = queue.shift();
        list.push(curr);
        if (curr.children) curr.children.forEach(c => queue.push(c));
    }
    return list;
}

function triggerTraversal(type) {
    if (!currentTreeData) {
        showToast("Please run Topic 4 in Student Code Editor first!");
        return;
    }
    if (traversalAnimationTimer) clearInterval(traversalAnimationTimer);

    let sequence = [];
    let labelText = "";

    if (type === 'pre') {
        sequence = getPreOrderSequence(currentTreeData);
        labelText = "Pre-Order:";
    } else if (type === 'in') {
        sequence = getInOrderSequence(currentTreeData);
        labelText = "In-Order:";
    } else if (type === 'post') {
        sequence = getPostOrderSequence(currentTreeData);
        labelText = "Post-Order:";
    } else if (type === 'level') {
        sequence = getLevelOrderSequence(currentTreeData);
        labelText = "BFS Level-Order:";
    }

    document.getElementById("traversal-type-label").textContent = labelText;
    const textEl = document.getElementById("traversal-sequence-text");
    textEl.textContent = "Starting traversal...";

    let index = 0;
    const activeVisitedIds = [];
    const stepMap = {};
    const sequenceTextList = [];

    traversalAnimationTimer = setInterval(() => {
        if (index >= sequence.length) {
            clearInterval(traversalAnimationTimer);
            return;
        }
        const currNode = sequence[index];
        activeVisitedIds.push(currNode.id);
        stepMap[currNode.id] = index + 1;
        sequenceTextList.push(`${index + 1}. ${currNode.icon} ${currNode.stage_name}`);

        textEl.textContent = sequenceTextList.join("  ➔  ");
        drawTreeSVG(currentTreeData, activeVisitedIds, stepMap);
        index++;
    }, 600);
}

function resetTreeVisuals() {
    if (traversalAnimationTimer) clearInterval(traversalAnimationTimer);
    document.getElementById("traversal-type-label").textContent = "Status:";
    document.getElementById("traversal-sequence-text").textContent = "Reset to evaluated growth path.";
    if (currentTreeData) drawTreeSVG(currentTreeData, currentActiveIds);
}

// TOPIC 5: BST RENDERER
window.renderBSTInventory = function(bstJson) {
    currentBSTData = typeof bstJson === "string" ? JSON.parse(bstJson) : bstJson;
    highlightedBSTSearchPath = [];
    drawBSTSVG(currentBSTData, []);
};

function drawBSTSVG(node, searchPath = []) {
    const svg = document.getElementById("bst-svg");
    if (!svg || !node) return;
    svg.innerHTML = "";

    const width = svg.clientWidth || 450;
    const levels = [];
    function collectLevels(n, depth = 0) {
        if (!n) return;
        if (!levels[depth]) levels[depth] = [];
        levels[depth].push(n);
        collectLevels(n.left, depth + 1);
        collectLevels(n.right, depth + 1);
    }
    collectLevels(node);

    const nodeCoords = {};
    levels.forEach((nodesInLevel, depth) => {
        const y = 30 + depth * 55;
        const spacing = width / (nodesInLevel.length + 1);
        nodesInLevel.forEach((n, idx) => {
            nodeCoords[n.key] = { x: spacing * (idx + 1), y, node: n };
        });
    });

    function drawEdges(curr) {
        if (!curr) return;
        const pCoord = nodeCoords[curr.key];
        if (curr.left) {
            const lCoord = nodeCoords[curr.left.key];
            const isPathEdge = searchPath.includes(curr.key) && searchPath.includes(curr.left.key);
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", pCoord.x);
            line.setAttribute("y1", pCoord.y);
            line.setAttribute("x2", lCoord.x);
            line.setAttribute("y2", lCoord.y);
            line.setAttribute("stroke", isPathEdge ? "#ff9aa2" : "#e2d2c1");
            line.setAttribute("stroke-width", isPathEdge ? "3" : "1.5");
            svg.appendChild(line);
            drawEdges(curr.left);
        }
        if (curr.right) {
            const rCoord = nodeCoords[curr.right.key];
            const isPathEdge = searchPath.includes(curr.key) && searchPath.includes(curr.right.key);
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", pCoord.x);
            line.setAttribute("y1", pCoord.y);
            line.setAttribute("x2", rCoord.x);
            line.setAttribute("y2", rCoord.y);
            line.setAttribute("stroke", isPathEdge ? "#ff9aa2" : "#e2d2c1");
            line.setAttribute("stroke-width", isPathEdge ? "3" : "1.5");
            svg.appendChild(line);
            drawEdges(curr.right);
        }
    }
    drawEdges(node);

    Object.values(nodeCoords).forEach(({ x, y, node: n }) => {
        const isVisited = searchPath.includes(n.key);
        const isTarget = searchPath.length > 0 && searchPath[searchPath.length - 1] === n.key;
       
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

        if (isVisited) {
            const halo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            halo.setAttribute("cx", x);
            halo.setAttribute("cy", y);
            halo.setAttribute("r", "19");
            halo.setAttribute("fill", "none");
            halo.setAttribute("stroke", isTarget ? "#ffb7b2" : "#b5ead7");
            halo.setAttribute("stroke-width", "3");
            g.appendChild(halo);
        }

        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", x);
        circle.setAttribute("cy", y);
        circle.setAttribute("r", "15");
        circle.setAttribute("fill", isVisited ? "#b5ead7" : "#ffffff");
        circle.setAttribute("stroke", isVisited ? "#77dd77" : "#e2d2c1");
        circle.setAttribute("stroke-width", "2");

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", x);
        text.setAttribute("y", y + 4);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("font-size", "11px");
        text.textContent = n.icon;

        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("x", x);
        label.setAttribute("y", y + 26);
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("fill", "#5c5552");
        label.setAttribute("font-size", "8px");
        label.setAttribute("font-weight", "bold");
        label.textContent = `${n.key}:${n.name.substring(0,6)}`;

        g.style.cursor = "pointer";
        g.onclick = () => {
            showToast(`Seed [${n.key}] ${n.name} - Health: ${n.health}%, Status: ${n.stage}`);
        };

        g.appendChild(circle);
        g.appendChild(text);
        g.appendChild(label);
        svg.appendChild(g);
    });
}

async function triggerBSTSearch() {
    if (!currentBSTData) {
        showToast("Please run Topic 5 in Student Code Editor first!");
        return;
    }
    const keyInput = document.getElementById("bst-search-key").value;
    const targetKey = parseInt(keyInput);
    if (isNaN(targetKey)) {
        showToast("Enter a valid numeric BST Key!");
        return;
    }

    if (!pyodideInstance || !pyodideInstance.globals.has("inventory_bst")) {
        showToast("Pyodide BST instance not initialized!");
        return;
    }

    try {
        const res = await pyodideInstance.runPythonAsync(`
import json
node, path = inventory_bst.search(${targetKey})
json.dumps({"found": node is not None, "path": path, "name": node.name if node else ""})
        `);
        const result = JSON.parse(res);
       
        if (result.found) {
            highlightedBSTSearchPath = result.path;
            drawBSTSVG(currentBSTData, highlightedBSTSearchPath);
            document.getElementById("bst-sequence-text").textContent = `Found '${result.name}' via path [${result.path.join(" ➔ ")}]`;
            showToast(`Found ${result.name} in ${result.path.length} steps! ✨`);
        } else {
            highlightedBSTSearchPath = result.path;
            drawBSTSVG(currentBSTData, highlightedBSTSearchPath);
            document.getElementById("bst-sequence-text").textContent = `Key ${targetKey} not found. Path: [${result.path.join(" ➔ ")}]`;
            showToast(`Key ${targetKey} not found!`);
        }
    } catch (err) {
        showToast(`Search Error: ${err.message}`);
    }
}

async function triggerNodeMutationUI() {
    if (!currentBSTData) {
        showToast("Please initialize Topic 5 first!");
        return;
    }
    const keyInput = document.getElementById("bst-search-key").value;
    const targetKey = parseInt(keyInput);
    if (isNaN(targetKey)) {
        showToast("Enter a valid seed Key to mutate!");
        return;
    }

    if (!pyodideInstance || !pyodideInstance.globals.has("inventory_bst")) {
        showToast("Pyodide BST instance missing!");
        return;
    }

    try {
        const mutated = await pyodideInstance.runPythonAsync(`
success = inventory_bst.node_mutation(${targetKey}, 100, "Thriving")
success
        `);
        if (mutated === true || mutated === "True") {
            const updatedJson = await pyodideInstance.runPythonAsync("json.dumps(inventory_bst.to_dict())");
            currentBSTData = JSON.parse(updatedJson);
            drawBSTSVG(currentBSTData, highlightedBSTSearchPath);
            showToast(`Successfully mutated Seed ID ${targetKey}! ✨`);
            document.getElementById("bst-sequence-text").textContent = `In-Place Mutation: Seed ID ${targetKey} health set to 100% (Thriving).`;
        } else {
            showToast(`Mutation failed: Seed ID ${targetKey} does not exist.`);
        }
    } catch (err) {
        showToast(`Mutation Error: ${err.message}`);
    }
}

window.onload = () => {
    document.getElementById("version-badge").textContent = "v" + APP_VERSION;
    lucide.createIcons();
    renderGarden();
    renderActionStack();
    updateResources(0, 0, 0, 0, 0);

    const select = document.getElementById("topic-selector");
    Object.keys(topicTemplates).forEach(k => {
        const opt = document.createElement("option");
        opt.value = k;
        opt.textContent = topicTemplates[k].title;
        select.appendChild(opt);
    });
    loadTopic();
    switchTab("game");
    initPyodide().catch(() => {});
};

async function runAllPythonCode() {
    const consoleEl = document.getElementById("output-console");
    consoleEl.innerHTML = `<span class="text-rose-500 font-bold">🌸 Running all topic codes...</span><br>`;
    try {
        await initPyodide();
        
        // Loop from Topic 1 to 5 (or whichever ones have code)
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