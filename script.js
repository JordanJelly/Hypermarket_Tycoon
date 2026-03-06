import { departments } from './data.js';


const areaNames = [
    // Tier 1: Barely Legit Commerce
    "Local Corner Store",
    "Neighborhood Market",
    "Block Plaza",
    // Tier 3: Serious Shopping Begins
    "Regional Supercenter",
    "Multi-City Outlet Complex",
    "Logistics-Optimized Retail Zone",
    // Tier 4: Corporate Domination
    "National Megastore",
    "Nationwide Retail Fortress",
    "Too-Big-To-Fail Shopping Hub",
    // Tier 5: Planetary Scale
    "Global Supermarket",
    "Planetary Trade Nexus",
    "International Supply Colossus",
    // Tier 6: Sci-Fi Absurdity
    "Orbital Shopping Station",
    "Solar System Bazaar",
    "Intergalactic Trade Hub",
    // Tier 7: Reality Starts Breaking
    "Multiversal Marketplace",
    "Chrono-Stable Mall (All Timelines)",
    "The Hypermarket"
];


let lastAffordableCount = 0;

let gameState = {
    balance: 0,
    totalIncome: 0,
    buyAmount: 1,
    area: 1,
    prestigeMultiplier: 1
};


function init() {
    loadGame(); // This now sets the area and multiplier correctly
    
    // Ensure labels are correct
    updatePrestigeUI(); 
    updateGlobalIncome();
    
    // Button setup
    document.getElementById('buy-multiplier').innerText = gameState.buyAmount + "x";
    
    renderDepartments();
    gameLoop();
}

function getMilestoneData(dept) {
    let current = dept.milestones[0];
    let nextLvl = current.lvl + 10;

    for (let i = 0; i < dept.milestones.length; i++) {
        if (dept.level >= dept.milestones[i].lvl) {
            current = dept.milestones[i];
            nextLvl = dept.milestones[i + 1] ? dept.milestones[i + 1].lvl : current.lvl + 50;
        } else {
            break; // Stop searching once we pass current level
        }
    }
    return { current, nextLvl };
}


function toggleMultiplier() {
    gameState.buyAmount = (gameState.buyAmount === 1) ? 10 : 1;
    document.getElementById('buy-multiplier').innerText = gameState.buyAmount + "x";
    renderDepartments(); // Refresh buttons to show new costs
}

function calculateMultipleCost(dept, amount) {
    let totalCost = 0;
    for (let i = 0; i < amount; i++) {
        let lvl = dept.level + i;
        let dynamicMultiplier = Math.max(1.005, 1.07 - (lvl * 0.00015));
        totalCost += Math.floor(dept.baseCost * Math.pow(dynamicMultiplier, lvl));
    }
    return totalCost;
}
function renderDepartments() {
    const grid = document.getElementById('departments-grid');
    let html = ''; // String building is faster than multiple appendChild calls

    departments.forEach(dept => {
        // NEW LOGIC: Check if the department is from a future area
        if (gameState.area < dept.requiredArea) {
            html += `
                <div class="dept-card future-locked">
                    <div class="dept-icon">❓</div>
                    <div class="dept-info">
                        <h3>Unknown Department</h3>
                        <p class="unlock-msg">Reach Area ${dept.requiredArea} to discover!</p>
                    </div>
                </div>`;
            return; // Skip the rest of the loop for this department
        }

        if (!dept.isUnlocked) {
            const canAfford = gameState.balance >= dept.minUnlockBalance;
            html += `
                <div class="dept-card locked ${canAfford ? 'can-unlock' : ''}">
                    <div class="dept-icon">${canAfford ? '🔓' : '🔒'}</div>
                    <div class="dept-info">
                        <h3>${dept.name}</h3>
                        <p class="unlock-msg">${canAfford ? 'Ready!' : 'Unlock at $' + dept.minUnlockBalance}</p>
                    </div>
                    <button class="buy-btn" onclick="event.stopPropagation(); unlockDept(${dept.id})">
                        Unlock<br><span>$${dept.minUnlockBalance}</span>
                    </button>
                </div>`;
        } else {
            const { current, nextLvl } = getMilestoneData(dept);
            const progress = Math.min(((dept.level - current.lvl) / (nextLvl - current.lvl)) * 100, 100);
            const cost = calculateMultipleCost(dept, gameState.buyAmount);
            
            // Dynamic Font Size logic
            const fontSize = current.title.length > 20 ? "0.5rem" : (current.title.length > 15 ? "0.6rem" : "0.7rem");

            html += `
                <div class="dept-card" onclick="openModal(${dept.id})">
                    <div class="dept-icon">${dept.icon}</div>
                    <div class="dept-info">
                        <h3>${dept.name}</h3>
                        <p class="card-item-title" style="font-size: ${fontSize}">${current.title}</p>
                        <p>Lvl ${dept.level} • +$${(dept.level * dept.baseIncome).toLocaleString()}/s</p>
                        <div class="progress-container">
                            <div class="progress-bar" style="width: ${progress}%"></div>
                        </div>
                    </div>
                    <button class="buy-btn" onclick="event.stopPropagation(); buyUpgrade(${dept.id})">
                        Buy ${gameState.buyAmount}<br><span>$${cost.toLocaleString()}</span>
                    </button>
                </div>`;
        }
    });
    grid.innerHTML = html;
}

// Logic for unlocking
function unlockDept(id) {
    const dept = departments[id];
    if (gameState.balance >= dept.minUnlockBalance) {
        gameState.balance -= dept.minUnlockBalance;
        dept.isUnlocked = true;
        dept.level = 1; 
        updateGlobalIncome();
        renderDepartments();
    }
}

// Logic for upgrading
function buyUpgrade(id) {
    const dept = departments[id];
    const cost = calculateMultipleCost(dept, gameState.buyAmount);

    if (gameState.balance >= cost) {
        gameState.balance -= cost;
        dept.level += gameState.buyAmount;
        updateGlobalIncome();
        renderDepartments();
        saveGame();
    }
}


function updateGlobalIncome() {
    const baseTotal = departments.reduce((sum, d) => sum + (d.isUnlocked ? (d.level * d.baseIncome) : 0), 0);
    
    gameState.totalIncome = baseTotal * gameState.prestigeMultiplier;
    
    document.getElementById('total-income').innerText = gameState.totalIncome.toLocaleString();
}

function gameLoop() {
    setInterval(() => {
        gameState.balance += (gameState.totalIncome / 10);
        document.getElementById('balance').innerText = Math.floor(gameState.balance).toLocaleString();
        
        checkUnlockAvailability();
    }, 100);

    // AUTO-SAVE every 1 seconds
    setInterval(() => {
        saveGame();
    }, 1000);
}

// This checks if we need to refresh the UI because a locked dept is now affordable
function checkUnlockAvailability() {
    const currentAffordable = departments.filter(d => !d.isUnlocked && gameState.balance >= d.minUnlockBalance).length;
    if (currentAffordable !== lastAffordableCount) {
        lastAffordableCount = currentAffordable;
        renderDepartments();
    }
}

// --- Modals ---
function openModal(id) {
    const dept = departments[id];
    const { current } = getMilestoneData(dept);
    
    document.getElementById('modal-title').innerText = dept.name;
    document.getElementById('modal-image').innerText = dept.icon;
    document.getElementById('modal-lvl').innerText = dept.level;
    document.getElementById('modal-item-title').innerText = current.title;
    document.getElementById('modal-desc').innerText = current.desc;
    
    document.getElementById('dept-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('dept-modal').style.display = 'none';
}


// 1. Your Playlist (Add your filenames here)
const playlist = [
    { title: "A Jazzy Time", file: "elevator_music.mp3" },
    { title: "Cafe Chill", file: "cafe_music.mp3" },
    { title: "Make It Rain", file: "money_music.mp3" }
];

let currentSongIndex = 0;
let isMusicPlaying = false;
const musicPlayer = document.getElementById('bg-music');

// 2. Initialize the first song
function loadSong(index) {
    const song = playlist[index];
    musicPlayer.src = song.file;
    musicPlayer.volume = 0.3;
    document.getElementById('now-playing').innerText = "Playing: " + song.title;
}

function toggleMusic() {
    const btn = document.getElementById('music-toggle');
    
    if (!isMusicPlaying) {
        // If the player has no source yet, load the first song
        if (!musicPlayer.src) loadSong(currentSongIndex);
        
        musicPlayer.play();
        btn.innerText = "ON";
        btn.classList.add('playing');
        isMusicPlaying = true;
    } else {
        musicPlayer.pause();
        btn.innerText = "OFF";
        btn.classList.remove('playing');
        isMusicPlaying = false;
    }
}

function nextSong() {
    currentSongIndex++;
    if (currentSongIndex >= playlist.length) {
        currentSongIndex = 0; // Loop back to start
    }
    
    loadSong(currentSongIndex);
    if (isMusicPlaying) musicPlayer.play();
}

// 3. AUTO-CYCLE: This event listener triggers when a song finishes
musicPlayer.addEventListener('ended', () => {
    nextSong();
});


// --- SAVING LOGIC ---

function saveGame() {
    const saveData = {
        balance: gameState.balance,
        area: gameState.area,
        prestigeMultiplier: gameState.prestigeMultiplier,
        // We only need to save the levels and unlock status of departments
        deptProgress: departments.map(d => ({
            id: d.id,
            level: d.level,
            isUnlocked: d.isUnlocked
        }))
    };
    localStorage.setItem('cloudTycoonSave', JSON.stringify(saveData));
    console.log("Game Saved!");
}

function loadGame() {
    const saved = localStorage.getItem('cloudTycoonSave');
    if (!saved) return;

    const data = JSON.parse(saved);
    
    // Load Prestige Data
    gameState.balance = data.balance || 0;
    gameState.area = data.area || 1;
    gameState.prestigeMultiplier = data.prestigeMultiplier || 1;

    // Load Department Data
    if (data.deptProgress) {
        data.deptProgress.forEach(savedDept => {
            const dept = departments.find(d => d.id === savedDept.id);
            if (dept) {
                dept.level = savedDept.level;
                dept.isUnlocked = savedDept.isUnlocked;
            }
        });
    }
    
    // IMPORTANT: Update the UI to reflect loaded prestige
    updatePrestigeUI(); 
}

function resetGame() {
    if (confirm("Are you sure? This will wipe EVERYTHING, including your Prestige Areas and Multipliers!")) {
        // 1. Clear the physical save file
        localStorage.removeItem('cloudTycoonSave');

        // 2. Reset the live game state back to absolute zero
        gameState.balance = 10000000000000000;
        gameState.area = 1;
        gameState.prestigeMultiplier = 1;
        gameState.totalIncome = 0;

        // 3. Reset all departments to their starting state
        departments.forEach(dept => {
            dept.level = (dept.id === 0) ? 1 : 0;
            dept.isUnlocked = (dept.id === 0);
        });

        // 4. Force a page reload to start completely fresh
        location.reload();
    }
}

// CRITICAL: Attach to window so the HTML button can find it
window.resetGame = resetGame;

// Attach reset to window so the button works



// --- NOTIFICATION SYSTEM ---
function showNotification(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    
    container.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- UPDATED PRESTIGE LOGIC ---
function prestige() {
    const currentAreaDepts = departments.filter(d => d.requiredArea <= gameState.area);
    const allCurrentUnlocked = currentAreaDepts.every(d => d.isUnlocked);
    
    // Set a requirement: e.g., $10,000,000 to move to the next area
    const moneyRequired = 10000000 * gameState.area; 

    if (!allCurrentUnlocked) {
        showNotification("Locked! You must unlock all departments in this area first.", "error");
        return;
    }

    if (gameState.balance < moneyRequired) {
        showNotification(`Not enough funds! You need $${moneyRequired.toLocaleString()} to expand.`, "error");
        return;
    }

    // Friendly UI Confirmation (replacing alert/confirm)
    // For now, we'll keep the browser confirm for safety, but trigger success toast after
    const nextName = areaNames[gameState.area] || "New Frontier";
    
    if (confirm(`Promote your tycoon to ${nextName}? All progress resets for a 2x bonus!`)) {
        gameState.area++;
        gameState.prestigeMultiplier *= 2;
        
        // Reset Logic
        gameState.balance = 0;
        departments.forEach(dept => {
            dept.level = (dept.id === 0) ? 1 : 0;
            dept.isUnlocked = (dept.id === 0);
        });

        saveGame();
        updateGlobalIncome();
        renderDepartments();
        updatePrestigeUI();
        
        showNotification(`Welcome to Area ${gameState.area}: ${nextName}!`, "success");
    }
}



function updatePrestigeUI() {
    const areaTitle = areaNames[gameState.area - 1] || `Area ${gameState.area}`;
    document.getElementById('area-display').innerText = `${gameState.area}: ${areaTitle}`;
    document.getElementById('income-multiplier').innerText = `${gameState.prestigeMultiplier}`;
}

window.showNotification = showNotification;
window.prestige = prestige;

window.toggleMultiplier = toggleMultiplier;
window.unlockDept = unlockDept;
window.buyUpgrade = buyUpgrade;
window.openModal = openModal;
window.closeModal = closeModal;
window.toggleMusic = toggleMusic;
window.nextSong = nextSong;

init();