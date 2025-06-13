import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, collection, updateDoc, deleteDoc, serverTimestamp, query, orderBy, limit, addDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCwDMBpviL0MbuPEbFyjNgHQ3ldxpKw4hk",
    authDomain: "dragonslayers.firebaseapp.com",
    projectId: "dragonslayers",
    storageBucket: "dragonslayers.appspot.com",
    messagingSenderId: "379070321916",
    appId: "1:379070321916:web:048b29164a949b1a63f379",
    measurementId: "G-889DXBRY9M"
};
const appId = 'dnd-tracker-dragonslayers';

// --- DATA ---
const WEAPONS = {
    // Simple Melee
    club: { name: 'Club', damage: '1d4', type: 'bludgeoning' },
    dagger: { name: 'Dagger', damage: '1d4', type: 'piercing' },
    greatclub: { name: 'Greatclub', damage: '1d8', type: 'bludgeoning' },
    handaxe: { name: 'Handaxe', damage: '1d6', type: 'slashing' },
    javelin: { name: 'Javelin', damage: '1d6', type: 'piercing' },
    light_hammer: { name: 'Light Hammer', damage: '1d4', type: 'bludgeoning' },
    mace: { name: 'Mace', damage: '1d6', type: 'bludgeoning' },
    quarterstaff: { name: 'Quarterstaff', damage: '1d6', type: 'bludgeoning' },
    sickle: { name: 'Sickle', damage: '1d4', type: 'slashing' },
    spear: { name: 'Spear', damage: '1d6', type: 'piercing' },
    // Simple Ranged
    light_crossbow: { name: 'Light Crossbow', damage: '1d8', type: 'piercing' },
    dart: { name: 'Dart', damage: '1d4', type: 'piercing' },
    shortbow: { name: 'Shortbow', damage: '1d6', type: 'piercing' },
    sling: { name: 'Sling', damage: '1d4', type: 'bludgeoning' },
    // Martial Melee
    battleaxe: { name: 'Battleaxe', damage: '1d8', type: 'slashing' },
    flail: { name: 'Flail', damage: '1d8', type: 'bludgeoning' },
    glaive: { name: 'Glaive', damage: '1d10', type: 'slashing' },
    greataxe: { name: 'Greataxe', damage: '1d12', type: 'slashing' },
    greatsword: { name: 'Greatsword', damage: '2d6', type: 'slashing' },
    halberd: { name: 'Halberd', damage: '1d10', type: 'slashing' },
    lance: { name: 'Lance', damage: '1d12', type: 'piercing' },
    longsword: { name: 'Longsword', damage: '1d8', type: 'slashing' },
    maul: { name: 'Maul', damage: '2d6', type: 'bludgeoning' },
    morningstar: { name: 'Morningstar', damage: '1d8', type: 'piercing' },
    pike: { name: 'Pike', damage: '1d10', type: 'piercing' },
    rapier: { name: 'Rapier', damage: '1d8', type: 'piercing' },
    scimitar: { name: 'Scimitar', damage: '1d6', type: 'slashing' },
    shortsword: { name: 'Shortsword', damage: '1d6', type: 'piercing' },
    trident: { name: 'Trident', damage: '1d6', type: 'piercing' },
    war_pick: { name: 'War Pick', damage: '1d8', type: 'piercing' },
    warhammer: { name: 'Warhammer', damage: '1d8', type: 'bludgeoning' },
    whip: { name: 'Whip', damage: '1d4', type: 'slashing' },
    // Martial Ranged
    blowgun: { name: 'Blowgun', damage: '1', type: 'piercing' },
    hand_crossbow: { name: 'Hand Crossbow', damage: '1d6', type: 'piercing' },
    heavy_crossbow: { name: 'Heavy Crossbow', damage: '1d10', type: 'piercing' },
    longbow: { name: 'Longbow', damage: '1d8', type: 'piercing' },
    net: { name: 'Net', damage: '0', type: 'none' },
    // Cantrips
    fire_bolt: { name: 'Fire Bolt', damage: '1d10', type: 'fire' },
    ray_of_frost: { name: 'Ray of Frost', damage: '1d8', type: 'cold' },
    sacred_flame: { name: 'Sacred Flame', damage: '1d8', type: 'radiant' },
    eldritch_blast: { name: 'Eldritch Blast', damage: '1d10', type: 'force' },
    acid_splash: { name: 'Acid Splash', damage: '1d6', type: 'acid' },
};

// This mapping is an assumption based on common app export formats.
// You may need to adjust this to match the IDs from your character builder app.
const WEAPON_ID_MAP = {
    '15': 'light_crossbow',
    '32': 'longsword'
};


let app, auth, db, userId, localPlayer;
let playersUnsubscribe, diceRollsUnsubscribe, npcsUnsubscribe;
const players = new Map();
const npcs = new Map();
let importedCharacterData = null; // To hold parsed XML data

// UI ELEMENTS
const characterModal = document.getElementById('character-modal');
const npcModal = document.getElementById('npc-modal');
const inventoryModal = document.getElementById('inventory-modal');
const joinButton = document.getElementById('join-button');
const nameInput = document.getElementById('name');
const weaponSelect = document.getElementById('weapon');
const descriptionInput = document.getElementById('description');
const isDmCheckbox = document.getElementById('is-dm');
const playersList = document.getElementById('players-list');
const enemiesList = document.getElementById('enemies-list');
const authInfo = document.getElementById('auth-info');
const diceRollerSection = document.getElementById('dice-roller');
const diceButtons = document.querySelectorAll('.dice-btn');
const diceResultEl = document.getElementById('dice-result');
const diceLogEl = document.getElementById('dice-log');
const leaveGameButton = document.getElementById('leave-game-button');
const addNpcButton = document.getElementById('add-npc-button');
const createNpcButton = document.getElementById('create-npc-button');
const cancelNpcButton = document.getElementById('cancel-npc-button');
const npcNameInput = document.getElementById('npc-name');
const npcHpInput = document.getElementById('npc-hp');
const closeInventoryButton = document.getElementById('close-inventory-button');
const inventoryList = document.getElementById('inventory-list');
const addInventoryItemButton = document.getElementById('add-inventory-item-button');
const inventoryItemInput = document.getElementById('inventory-item-input');
const xmlUploadInput = document.getElementById('xml-upload');
const xmlStatus = document.getElementById('xml-status');


function initializeFirebase() {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    onAuthStateChanged(auth, user => {
        if (user) {
            userId = user.uid;
            authInfo.innerHTML = `<p class="break-all">Your ID: <span class="font-mono text-amber-300">${userId}</span></p>`;
            setupPlayerListener();
            setupDiceRollListener();
            setupNpcListener();
        } else {
            userId = null; localPlayer = null;
            if (playersUnsubscribe) playersUnsubscribe();
            if (diceRollsUnsubscribe) diceRollsUnsubscribe();
            if (npcsUnsubscribe) npcsUnsubscribe();
            characterModal.classList.remove('hidden');
            leaveGameButton.classList.add('hidden');
            addNpcButton.classList.add('hidden');
            inventoryModal.classList.add('hidden');
        }
    });

    signInAnonymously(auth).catch(error => console.error("Anonymous sign-in failed:", error));
}

async function initializeGameStateAsDM() {
    const dummyRef = doc(db, `artifacts/${appId}/public/data/npcs`, 'training-dummy');
    const dummySnap = await getDoc(dummyRef);
    if (!dummySnap.exists()) {
        await setDoc(dummyRef, { name: "Training Dummy", hp: 100, maxHp: 100, id: "training-dummy", isRemovable: false });
    }
}

async function createOrUpdatePlayer() {
    if (!userId) return;
    
    let playerData;

    if (importedCharacterData) {
        // Use data from the imported XML file
        playerData = {
            ...importedCharacterData,
            description: descriptionInput.value, // Allow overwriting description
            weapon: weaponSelect.value, // Use selected weapon
            isDM: isDmCheckbox.checked,
            isOnline: true,
            id: userId,
        };
        importedCharacterData = null; // Clear imported data after use
        xmlStatus.textContent = '';
    } else {
        // Create player from form inputs
        if (!nameInput.value) { console.error("Player name is required."); return; }
        playerData = {
            name: nameInput.value, 
            description: descriptionInput.value,
            weapon: weaponSelect.value,
            hp: 20, // Default HP for manual creation
            level: 1, // Default level
            stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, // Default stats
            currency: { gp: 0, sp: 0, cp: 0 }, // Default currency
            initiative: 0, 
            isOnline: true, 
            isDM: isDmCheckbox.checked, 
            id: userId,
            inventory: [],
            availableAttacks: Object.keys(WEAPONS) // Manually created players have all weapons
        };
    }

    const playerRef = doc(db, `artifacts/${appId}/public/data/players`, userId);
    try {
        await setDoc(playerRef, playerData, { merge: true });
        localPlayer = playerData;
        characterModal.classList.add('hidden');
        leaveGameButton.classList.remove('hidden');
        diceRollerSection.classList.remove('hidden');
        if (playerData.isDM) { 
            addNpcButton.classList.remove('hidden');
            await initializeGameStateAsDM(); 
        }
        setupBeforeUnloadListener();
    } catch (error) { console.error("Error writing document: ", error); }
}

function setupPlayerListener() {
    const playersCollectionRef = collection(db, `artifacts/${appId}/public/data/players`);
    playersUnsubscribe = onSnapshot(playersCollectionRef, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            const playerData = change.doc.data();
            if(playerData.id === userId) {
                localPlayer = playerData;
                if (!inventoryModal.classList.contains('hidden')) {
                    renderInventory();
                }
            }
            
            if (change.type === "added" || change.type === "modified") {
                if (playerData.isOnline) players.set(playerData.id, playerData);
                else players.delete(playerData.id);
            }
            if (change.type === "removed") players.delete(playerData.id);
        });
        if(localPlayer?.isDM) addNpcButton.classList.remove('hidden');
        renderPlayers();
    });
}

function setupNpcListener() {
    const npcsCollectionRef = collection(db, `artifacts/${appId}/public/data/npcs`);
    npcsUnsubscribe = onSnapshot(npcsCollectionRef, (snapshot) => {
         snapshot.docChanges().forEach((change) => {
            const npcData = change.doc.data();
            if (change.type === "added" || change.type === "modified") npcs.set(npcData.id, npcData);
            if (change.type === "removed") npcs.delete(npcData.id);
        });
        renderNpcs();
    });
}

async function createNpc() {
    const name = npcNameInput.value.trim();
    const hp = parseInt(npcHpInput.value, 10);
    if (!name || isNaN(hp) || hp <= 0) { return; }
    const npcId = crypto.randomUUID();
    const npcRef = doc(db, `artifacts/${appId}/public/data/npcs`, npcId);
    const npcData = { name: name, hp: hp, maxHp: hp, id: npcId, isRemovable: true };
    await setDoc(npcRef, npcData);
    npcModal.classList.add('hidden');
    npcNameInput.value = '';
    npcHpInput.value = '10';
}

async function attackNpc(npcId) {
    if (!localPlayer || !localPlayer.weapon) return;
    const weapon = WEAPONS[localPlayer.weapon];
    const targetNpc = npcs.get(npcId);
    if (!weapon || !targetNpc) return;

    const damage = rollDamage(weapon.damage);
    const newHp = Math.max(0, targetNpc.hp - damage);
    
    await updateNpcStat(npcId, 'hp', newHp);
    playAnimation(npcId, weapon.type);
}

function playAnimation(targetId, animationType) {
    const card = document.getElementById(`npc-${targetId}`);
    if (!card) return;

    let overlay = card.querySelector('.animation-overlay');
    if (overlay) overlay.remove();
    
    overlay = document.createElement('div');
    overlay.className = 'animation-overlay';

    const effectDiv = document.createElement('div');
    
    switch(animationType) {
        case 'slashing': effectDiv.className = 'slash'; break;
        case 'piercing': effectDiv.className = 'pierce'; break;
        case 'bludgeoning': effectDiv.className = 'crack'; break;
        case 'fire': effectDiv.className = 'fire-burst'; break;
        case 'cold': effectDiv.className = 'frost'; break;
        case 'lightning': effectDiv.className = 'bolt'; break;
        default: effectDiv.className = 'effect'; break;
    }

    overlay.classList.add(`animate-${animationType}`);
    overlay.appendChild(effectDiv);
    card.appendChild(overlay);

    effectDiv.addEventListener('animationend', () => overlay.remove(), { once: true });
}

function rollDamage(damageString) {
    if (!/^\d+d\d+$/.test(damageString) && !/^\d+$/.test(damageString)) return 0;
    if (/^\d+$/.test(damageString)) return parseInt(damageString, 10);

    const [numDice, numSides] = damageString.split('d').map(Number);
    let total = 0;
    for (let i = 0; i < numDice; i++) {
        total += Math.floor(Math.random() * numSides) + 1;
    }
    return total;
}

async function updatePlayerStat(playerId, stat, value) {
    const playerRef = doc(db, `artifacts/${appId}/public/data/players`, playerId);
    await updateDoc(playerRef, { [stat]: value });
}

async function updateNpcStat(npcId, stat, value) {
    const npcRef = doc(db, `artifacts/${appId}/public/data/npcs`, npcId);
    const npc = npcs.get(npcId);
    if (!npc) return;

    await updateDoc(npcRef, { [stat]: value });
    
    if (npc.id === 'training-dummy' && stat === 'hp' && value <= 0) {
        setTimeout(() => updateDoc(npcRef, { hp: npc.maxHp }), 5000);
    }
}

async function removePlayer(playerIdToRemove) {
    if (!localPlayer?.isDM || playerIdToRemove === userId) return;
    const playerRef = doc(db, `artifacts/${appId}/public/data/players`, playerIdToRemove);
    await deleteDoc(playerRef);
}

async function removeNpc(npcIdToRemove) {
    if (!localPlayer?.isDM) return;
    const npcRef = doc(db, `artifacts/${appId}/public/data/npcs`, npcIdToRemove);
    await deleteDoc(npcRef);
}

async function leaveGame() {
    if (!userId) return;
    await updatePlayerStat(userId, 'isOnline', false);
    auth.signOut(); 
}

function setupBeforeUnloadListener() {
    window.addEventListener('beforeunload', () => {
        if (userId && localPlayer?.isOnline) {
            updatePlayerStat(userId, 'isOnline', false);
        }
    });
}

async function rollDice(sides) {
    if (!localPlayer) return;
    const result = Math.floor(Math.random() * sides) + 1;
    animateDiceRoll(result);
    const rollsCollectionRef = collection(db, `artifacts/${appId}/public/data/dice-rolls`);
    await addDoc(rollsCollectionRef, {
        playerName: localPlayer.name, sides: sides, result: result, timestamp: serverTimestamp()
    });
}

function setupDiceRollListener() {
    const rollsCollectionRef = collection(db, `artifacts/${appId}/public/data/dice-rolls`);
    const q = query(rollsCollectionRef, orderBy("timestamp", "desc"), limit(15));
    diceRollsUnsubscribe = onSnapshot(q, (snapshot) => {
        const rolls = snapshot.docs.map(doc => doc.data());
        updateDiceLog(rolls);
    });
}

function renderPlayers() {
    playersList.innerHTML = '';
    if (players.size === 0) {
         playersList.innerHTML = `<p class="text-slate-400 italic text-center">No adventurers have joined...</p>`;
    } else {
         players.forEach(playerData => playersList.appendChild(createPlayerCard(playerData)));
    }
}

function renderNpcs() {
    enemiesList.innerHTML = '';
    if (npcs.size === 0) {
        enemiesList.innerHTML = `<p class="text-slate-400 italic text-center">No enemies present.</p>`;
    } else {
        npcs.forEach(npcData => enemiesList.appendChild(createNpcCard(npcData)));
    }
}

function createPlayerCard(playerData) {
    const isCurrentUser = playerData.id === userId;
    const isDMView = localPlayer?.isDM;
    const card = document.createElement('div');
    card.className = `card rounded-lg p-4 flex flex-col space-y-3 shadow-lg ${isCurrentUser ? 'border-amber-400' : ''}`;
    const showRemoveButton = isDMView && !isCurrentUser;
    const weaponName = WEAPONS[playerData.weapon]?.name || 'Unarmed';
    
    let weaponControlHtml;
    if (isCurrentUser) {
        let optionsHtml = '';
        const attackOptions = playerData.availableAttacks || Object.keys(WEAPONS);
        attackOptions.forEach(attackKey => {
            const weapon = WEAPONS[attackKey];
            if (weapon) {
                 optionsHtml += `<option value="${attackKey}" ${playerData.weapon === attackKey ? 'selected' : ''}>${weapon.name}</option>`;
            }
        });

        weaponControlHtml = `
            <div class="flex items-center justify-between text-sm">
                <label class="font-bold">Weapon:</label>
                <select data-weapon-select class="w-40 bg-slate-800 border border-slate-600 rounded-md py-1 px-2 text-sm">
                    ${optionsHtml}
                </select>
            </div>`;
    } else {
        weaponControlHtml = `<div class="text-sm"><span class="font-bold">Weapon:</span> ${weaponName}</div>`;
    }

    const statsHtml = playerData.stats ? `
        <div class="grid grid-cols-3 gap-x-2 gap-y-1 text-xs text-center p-2 bg-slate-900/50 rounded-md">
            <span><b>STR:</b> ${playerData.stats.str}</span>
            <span><b>DEX:</b> ${playerData.stats.dex}</span>
            <span><b>CON:</b> ${playerData.stats.con}</span>
            <span><b>INT:</b> ${playerData.stats.int}</span>
            <span><b>WIS:</b> ${playerData.stats.wis}</span>
            <span><b>CHA:</b> ${playerData.stats.cha}</span>
        </div>
    ` : '';

    let currencyHtml;
    const currency = playerData.currency || { gp: 0, sp: 0, cp: 0 };
    if (isCurrentUser) {
        currencyHtml = `
            <div class="grid grid-cols-3 gap-x-2 text-xs text-center">
                <div><label class="font-bold text-amber-400">GP</label><input type="number" class="w-full text-center bg-slate-800 rounded-md" data-currency="gp" value="${currency.gp}"></div>
                <div><label class="font-bold text-slate-400">SP</label><input type="number" class="w-full text-center bg-slate-800 rounded-md" data-currency="sp" value="${currency.sp}"></div>
                <div><label class="font-bold text-yellow-600">CP</label><input type="number" class="w-full text-center bg-slate-800 rounded-md" data-currency="cp" value="${currency.cp}"></div>
            </div>`;
    } else {
        currencyHtml = `
            <div class="grid grid-cols-3 gap-x-2 text-xs text-center p-2 bg-slate-900/50 rounded-md">
                <span><b>GP:</b> ${currency.gp}</span>
                <span><b>SP:</b> ${currency.sp}</span>
                <span><b>CP:</b> ${currency.cp}</span>
            </div>`;
    }
    
    card.innerHTML = `
        <div class="flex justify-between items-start">
            <h3 class="text-2xl font-fantasy text-amber-200">${playerData.name}</h3>
            <div class="flex items-center gap-2 flex-shrink-0">
                ${playerData.isDM ? '<span class="text-xs font-bold text-cyan-300 bg-cyan-800 px-2 py-1 rounded-full">DM</span>' : ''}
                ${isCurrentUser ? '<span class="text-xs font-bold text-amber-300 bg-amber-800 px-2 py-1 rounded-full">YOU</span>' : ''}
            </div>
        </div>
        <p class="text-slate-300 italic text-sm flex-grow">${playerData.description || '...'}</p>
        ${statsHtml}
        ${weaponControlHtml}
        <div class="flex items-center justify-between"><label class="font-bold">HP:</label><div class="flex items-center gap-2"><button data-action="hp-down" class="bg-red-700 h-8 w-8 rounded-full">-</button><span class="text-xl w-12 text-center">${playerData.hp}</span><button data-action="hp-up" class="bg-green-700 h-8 w-8 rounded-full">+</button></div></div>
        <div class="flex items-center justify-between"><label class="font-bold">Initiative:</label><input type="number" value="${playerData.initiative}" class="w-20 bg-slate-800 border border-slate-600 rounded-md py-1 px-2 text-center"></div>
        ${currencyHtml}
        <div class="flex gap-2 mt-2">
            ${isCurrentUser ? `<button class="inventory-btn w-full bg-slate-600 hover:bg-amber-700 text-white font-bold py-1 rounded-md text-sm">Inventory</button>` : ''}
            ${showRemoveButton ? `<button data-remove-id="${playerData.id}" class="remove-player-btn w-full bg-red-800 hover:bg-red-900 text-xs py-1 rounded-md">Remove</button>` : ''}
        </div>
        `;

    if (isCurrentUser) {
        card.querySelector('[data-action="hp-down"]').addEventListener('click', () => updatePlayerStat(playerData.id, 'hp', playerData.hp - 1));
        card.querySelector('[data-action="hp-up"]').addEventListener('click', () => updatePlayerStat(playerData.id, 'hp', playerData.hp + 1));
        card.querySelector('input[type="number"][value="' + playerData.initiative + '"]').addEventListener('change', (e) => updatePlayerStat(playerData.id, 'initiative', parseInt(e.target.value, 10) || 0));
        card.querySelector('[data-weapon-select]').addEventListener('change', (e) => updatePlayerStat(playerData.id, 'weapon', e.target.value));
        card.querySelector('.inventory-btn').addEventListener('click', openInventory);
        card.querySelectorAll('[data-currency]').forEach(input => {
            input.addEventListener('change', (e) => {
                const currencyType = e.target.dataset.currency;
                const value = parseInt(e.target.value, 10) || 0;
                updatePlayerStat(playerData.id, `currency.${currencyType}`, value);
            });
        });
    } else {
        card.querySelectorAll('button:not(.remove-player-btn), input, select').forEach(el => el.disabled = true);
    }
    return card;
}

function createNpcCard(npcData) {
    const isDMView = localPlayer?.isDM;
    const card = document.createElement('div');
    card.id = `npc-${npcData.id}`;
    card.className = 'card enemy-card rounded-lg p-4 flex flex-col space-y-3 shadow-lg';
    const showRemoveButton = isDMView && npcData.isRemovable;

    card.innerHTML = `
        <div class="flex justify-between items-start">
            <h3 class="text-2xl font-fantasy text-red-300">${npcData.name}</h3>
            ${showRemoveButton ? `<button data-remove-id="${npcData.id}" class="remove-npc-btn bg-red-900 hover:bg-red-800 text-white font-bold h-6 w-6 rounded-full flex items-center justify-center text-sm p-1">X</button>` : ''}
        </div>
        <div class="flex items-center justify-between"><label class="font-bold">HP:</label><div class="flex items-center gap-2"><button data-action="hp-down" class="bg-red-800 h-8 w-8 rounded-full">-</button><span class="text-xl w-12 text-center">${npcData.hp}</span><button data-action="hp-up" class="bg-green-800 h-8 w-8 rounded-full">+</button></div></div>
    `;
    
    card.addEventListener('click', (event) => {
        if (event.target.closest('button')) return;
        attackNpc(npcData.id);
    });

    card.querySelectorAll('[data-action="hp-down"], [data-action="hp-up"]').forEach(btn => {
        if (!isDMView) btn.disabled = true;
        else {
            const action = btn.dataset.action === 'hp-down' ? -1 : 1;
            btn.addEventListener('click', () => updateNpcStat(npcData.id, 'hp', npcData.hp + action));
        }
    });
    return card;
}

function animateDiceRoll(result) {
    diceResultEl.textContent = result;
    diceResultEl.classList.add('rolling');
    diceResultEl.addEventListener('animationend', () => diceResultEl.classList.remove('rolling'), { once: true });
}

function updateDiceLog(rolls) {
    diceLogEl.innerHTML = rolls.map(roll => `<div class="text-sm text-slate-300"><span class="font-bold text-amber-300">${roll.playerName}</span> rolled a <span class="font-bold text-white">${roll.result}</span> on a <span class="font-mono text-xs">d${roll.sides}</span></div>`).join('');
}

function populateWeapons() {
    for (const [key, weapon] of Object.entries(WEAPONS)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = weapon.name;
        weaponSelect.appendChild(option);
    }
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const xmlText = e.target.result;
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "application/xml");
            
            const errorNode = xmlDoc.querySelector("parsererror");
            if (errorNode) {
                console.error("Error parsing XML:", errorNode);
                xmlStatus.textContent = "Error: Invalid XML file.";
                return;
            }

            parseAndStoreCharacter(xmlDoc);
        } catch (error) {
            console.error("Could not process file.", error);
            xmlStatus.textContent = "Error processing file.";
        }
    };
    reader.readAsText(file);
}

function parseAndStoreCharacter(xmlDoc) {
    const getVal = (tag) => xmlDoc.querySelector(tag)?.textContent || '';
    const getInt = (tag) => parseInt(getVal(tag), 10) || 0;

    const charName = getVal('name');
    if (!charName) {
        xmlStatus.textContent = "Error: Character name not found.";
        return;
    }

    const con = getInt('con');
    const conMod = Math.floor((con - 10) / 2);
    const level = getInt('level');
    let totalHp = 0;

    // Sum HP from all levels
    for (let i = 1; i <= level; i++) {
        const lvlNode = xmlDoc.querySelector(`lvl[lvl="${i}"]`);
        if (lvlNode) {
            const hpBrut = parseInt(lvlNode.querySelector('hp_brut')?.textContent || 0, 10);
            totalHp += hpBrut + conMod;
        }
    }

    const availableAttacks = [];
    // Parse equipped weapons from XML
    const weaponIds = getVal('weapon').split(',');
    weaponIds.forEach(id => {
        if (WEAPON_ID_MAP[id]) {
            availableAttacks.push(WEAPON_ID_MAP[id]);
        }
    });

    // Parse known spells from XML
    const spellNodes = xmlDoc.querySelectorAll('knownSpell');
    spellNodes.forEach(node => {
        const spellName = node.textContent.toLowerCase();
        for (const [key, weapon] of Object.entries(WEAPONS)) {
            if (weapon.name.toLowerCase() === spellName) {
                availableAttacks.push(key);
                break;
            }
        }
    });

    importedCharacterData = {
        name: charName,
        hp: totalHp,
        level: level,
        stats: {
            str: getInt('str'), dex: getInt('dex'), con: con,
            int: getInt('int'), wis: getInt('wis'), cha: getInt('cha'),
        },
        currency: {
            gp: getInt('gp'),
            sp: getInt('sp'),
            cp: getInt('cp'),
        },
        inventory: getVal('itemX')?.split(',').filter(item => item) || [],
        availableAttacks: availableAttacks.length > 0 ? [...new Set(availableAttacks)] : ['club'], // Use a Set to remove duplicates, ensure at least one attack
    };
    
    // Populate form for user convenience
    nameInput.value = charName;
    descriptionInput.value = `Level ${level} ${getVal('race')} ${getVal('class')}`;
    // Update weapon dropdown with only available attacks
    weaponSelect.innerHTML = '';
    importedCharacterData.availableAttacks.forEach(attackKey => {
        const weapon = WEAPONS[attackKey];
        if (weapon) {
            const option = document.createElement('option');
            option.value = attackKey;
            option.textContent = weapon.name;
            weaponSelect.appendChild(option);
        }
    });

    xmlStatus.textContent = `Loaded ${charName}!`;
}


// --- INVENTORY LOGIC ---
function openInventory() {
    renderInventory();
    inventoryModal.classList.remove('hidden');
}

function closeInventory() {
    inventoryModal.classList.add('hidden');
}

function renderInventory() {
    if (!localPlayer || !localPlayer.inventory) {
        inventoryList.innerHTML = '<p class="text-slate-400 italic">Your inventory is empty.</p>';
        return;
    }
    inventoryList.innerHTML = '';
    if (localPlayer.inventory.length === 0) {
        inventoryList.innerHTML = '<p class="text-slate-400 italic">Your inventory is empty.</p>';
    } else {
        localPlayer.inventory.forEach((item, index) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'flex justify-between items-center bg-slate-700 p-2 rounded';
            itemEl.innerHTML = `
                <span>${item}</span>
                <button data-item-index="${index}" class="remove-item-btn text-red-400 hover:text-red-200 font-bold">X</button>
            `;
            inventoryList.appendChild(itemEl);
        });
    }
}

async function addInventoryItem() {
    const itemName = inventoryItemInput.value.trim();
    if (!itemName || !localPlayer) return;
    
    const currentInventory = localPlayer.inventory || [];
    const newInventory = [...currentInventory, itemName];
    await updatePlayerStat(userId, 'inventory', newInventory);
    inventoryItemInput.value = '';
}

async function removeInventoryItem(index) {
    if (!localPlayer || !localPlayer.inventory) return;
    
    const currentInventory = localPlayer.inventory;
    const newInventory = [...currentInventory];
    newInventory.splice(index, 1);
    await updatePlayerStat(userId, 'inventory', newInventory);
}

// EVENT LISTENERS
joinButton.addEventListener('click', createOrUpdatePlayer);
leaveGameButton.addEventListener('click', leaveGame);
diceButtons.forEach(button => button.addEventListener('click', () => rollDice(parseInt(button.dataset.dice, 10))));
xmlUploadInput.addEventListener('change', handleFileUpload);

addNpcButton.addEventListener('click', () => npcModal.classList.remove('hidden'));
cancelNpcButton.addEventListener('click', () => npcModal.classList.add('hidden'));
createNpcButton.addEventListener('click', createNpc);

closeInventoryButton.addEventListener('click', closeInventory);
addInventoryItemButton.addEventListener('click', addInventoryItem);
inventoryItemInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addInventoryItem();
});

inventoryList.addEventListener('click', (event) => {
    if (event.target.matches('.remove-item-btn')) {
        const index = parseInt(event.target.dataset.itemIndex, 10);
        removeInventoryItem(index);
    }
});

document.body.addEventListener('click', (event) => {
    if (event.target.matches('.remove-player-btn')) { removePlayer(event.target.dataset.removeId); }
    if (event.target.matches('.remove-npc-btn')) { removeNpc(event.target.dataset.removeId); }
});

initializeFirebase();
populateWeapons();
