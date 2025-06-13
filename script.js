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

let app, auth, db, userId, localPlayer;
let playersUnsubscribe, diceRollsUnsubscribe, npcsUnsubscribe;
const players = new Map();
const npcs = new Map();

// UI ELEMENTS
const characterModal = document.getElementById('character-modal');
const npcModal = document.getElementById('npc-modal');
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
    if (!userId || !nameInput.value) { console.error("Player name is required."); return; }
    const isDM = isDmCheckbox.checked;
    const playerRef = doc(db, `artifacts/${appId}/public/data/players`, userId);
    const playerData = {
        name: nameInput.value, 
        description: descriptionInput.value,
        weapon: weaponSelect.value,
        hp: 20, 
        initiative: 0, 
        isOnline: true, 
        isDM: isDM, 
        id: userId
    };

    try {
        await setDoc(playerRef, playerData, { merge: true });
        localPlayer = playerData;
        characterModal.classList.add('hidden');
        leaveGameButton.classList.remove('hidden');
        diceRollerSection.classList.remove('hidden');
        if (isDM) { 
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
            if(playerData.id === userId) localPlayer = playerData;
            
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

    const overlay = card.querySelector('.animation-overlay');
    if (!overlay) return;
    
    // Clear previous animations and clone to reset
    const newOverlay = overlay.cloneNode(true);
    overlay.parentNode.replaceChild(newOverlay, overlay);

    const effectDiv = document.createElement('div');
    
    switch(animationType) {
        case 'slashing': effectDiv.className = 'slash'; break;
        case 'piercing': effectDiv.className = 'pierce'; break;
        case 'bludgeoning': effectDiv.className = 'crack'; break;
        case 'fire': effectDiv.className = 'fire-burst'; break;
        case 'cold': effectDiv.className = 'frost'; break;
        case 'lightning': effectDiv.className = 'bolt'; break;
        default: effectDiv.className = 'effect'; break; // for others
    }

    newOverlay.classList.add(`animate-${animationType}`);
    newOverlay.appendChild(effectDiv);

    effectDiv.addEventListener('animationend', () => {
        newOverlay.remove();
    }, { once: true });
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
    playersList.innerHTML = players.size === 0 
        ? `<p class="text-slate-400 italic text-center">No adventurers have joined...</p>`
        : '';
    if (players.size > 0) players.forEach(playerData => playersList.appendChild(createPlayerCard(playerData)));
}

function renderNpcs() {
    enemiesList.innerHTML = npcs.size === 0 
        ? `<p class="text-slate-400 italic text-center">No enemies present.</p>`
        : '';
    if(npcs.size > 0) npcs.forEach(npcData => enemiesList.appendChild(createNpcCard(npcData)));
}

function createPlayerCard(playerData) {
    const isCurrentUser = playerData.id === userId;
    const isDMView = localPlayer?.isDM;
    const card = document.createElement('div');
    card.className = `card rounded-lg p-4 flex flex-col space-y-3 shadow-lg ${isCurrentUser ? 'border-amber-400' : ''}`;
    const showRemoveButton = isDMView && !isCurrentUser;
    const weaponName = WEAPONS[playerData.weapon]?.name || 'Unarmed';
    
    card.innerHTML = `
        <div class="flex justify-between items-start">
            <h3 class="text-2xl font-fantasy text-amber-200">${playerData.name}</h3>
            <div class="flex items-center gap-2 flex-shrink-0">
                ${playerData.isDM ? '<span class="text-xs font-bold text-cyan-300 bg-cyan-800 px-2 py-1 rounded-full">DM</span>' : ''}
                ${isCurrentUser ? '<span class="text-xs font-bold text-amber-300 bg-amber-800 px-2 py-1 rounded-full">YOU</span>' : ''}
            </div>
        </div>
        <p class="text-slate-300 italic text-sm flex-grow">${playerData.description || '...'}</p>
        <div class="text-sm"><span class="font-bold">Weapon:</span> ${weaponName}</div>
        <div class="flex items-center justify-between"><label class="font-bold">HP:</label><div class="flex items-center gap-2"><button data-action="hp-down" class="bg-red-700 h-8 w-8 rounded-full">-</button><span class="text-xl w-12 text-center">${playerData.hp}</span><button data-action="hp-up" class="bg-green-700 h-8 w-8 rounded-full">+</button></div></div>
        <div class="flex items-center justify-between"><label class="font-bold">Initiative:</label><input type="number" value="${playerData.initiative}" class="w-20 bg-slate-800 border border-slate-600 rounded-md py-1 px-2 text-center"></div>
        ${showRemoveButton ? `<button data-remove-id="${playerData.id}" class="remove-player-btn mt-2 w-full bg-red-800 hover:bg-red-900 text-xs py-1 rounded-md">Remove</button>` : ''}`;

    if (isCurrentUser) {
        card.querySelector('[data-action="hp-down"]').addEventListener('click', () => updatePlayerStat(playerData.id, 'hp', playerData.hp - 1));
        card.querySelector('[data-action="hp-up"]').addEventListener('click', () => updatePlayerStat(playerData.id, 'hp', playerData.hp + 1));
        card.querySelector('input[type="number"]').addEventListener('change', (e) => updatePlayerStat(playerData.id, 'initiative', parseInt(e.target.value, 10) || 0));
    } else {
        card.querySelectorAll('button:not(.remove-player-btn), input').forEach(el => el.disabled = true);
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
        <div class="animation-overlay"></div>
        <div class="flex justify-between items-start">
            <h3 class="text-2xl font-fantasy text-red-300">${npcData.name}</h3>
            ${showRemoveButton ? `<button data-remove-id="${npcData.id}" class="remove-npc-btn bg-red-900 hover:bg-red-800 text-white font-bold h-6 w-6 rounded-full flex items-center justify-center text-sm p-1">X</button>` : ''}
        </div>
        <div class="flex items-center justify-between"><label class="font-bold">HP:</label><div class="flex items-center gap-2"><button data-action="hp-down" class="bg-red-800 h-8 w-8 rounded-full">-</button><span class="text-xl w-12 text-center">${npcData.hp}</span><button data-action="hp-up" class="bg-green-800 h-8 w-8 rounded-full">+</button></div></div>
        <button data-attack-id="${npcData.id}" class="attack-btn mt-2 w-full bg-slate-600 hover:bg-red-700 text-white font-bold py-1 rounded-md transition">Attack</button>
    `;
    
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

// EVENT LISTENERS
joinButton.addEventListener('click', createOrUpdatePlayer);
leaveGameButton.addEventListener('click', leaveGame);
diceButtons.forEach(button => button.addEventListener('click', () => rollDice(parseInt(button.dataset.dice, 10))));

addNpcButton.addEventListener('click', () => npcModal.classList.remove('hidden'));
cancelNpcButton.addEventListener('click', () => npcModal.classList.add('hidden'));
createNpcButton.addEventListener('click', createNpc);

document.body.addEventListener('click', (event) => {
    if (event.target.matches('.remove-player-btn')) { removePlayer(event.target.dataset.removeId); }
    if (event.target.matches('.remove-npc-btn')) { removeNpc(event.target.dataset.removeId); }
    if (event.target.matches('.attack-btn')) { attackNpc(event.target.dataset.attackId); }
});

initializeFirebase();
populateWeapons();

