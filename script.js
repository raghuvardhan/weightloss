// --- Initial Data & State ---
const state = {
    date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    profile: { gender: 'male', age: 25, weight: 70, height: 175 },
    activities: [], // Today's logged activities
    foodLog: []     // Today's logged food
};

// Default Food Database (Per 100g)
let foodDB = [
    { id: '1', name: 'Chicken Breast (Raw)', cal: 110, p: 23, c: 0, f: 1.2 },
    { id: '2', name: 'White Rice (Cooked)', cal: 130, p: 2.7, c: 28, f: 0.3 },
    { id: '3', name: 'Broccoli', cal: 34, p: 2.8, c: 6.6, f: 0.4 },
    { id: '4', name: 'Whole Egg', cal: 143, p: 12.6, c: 0.7, f: 9.5 },
    { id: '5', name: 'Oats (Dry)', cal: 389, p: 16.9, c: 66.3, f: 6.9 }
];

// Activity Database (MET values) - Calories burned = MET * Weight(kg) * Time(hrs)
const activityDB = [
    { id: '1', name: 'Walking (Brisk)', met: 3.8 },
    { id: '2', name: 'Weight Lifting (Moderate)', met: 3.5 },
    { id: '3', name: 'Weight Lifting (Vigorous)', met: 6.0 },
    { id: '4', name: 'Running (General)', met: 8.0 },
    { id: '5', name: 'Cycling (Moderate)', met: 6.0 },
    { id: '6', name: 'Driving / Sitting', met: 1.5 }
];

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('currentDate').textContent = new Date().toDateString();
    loadData();
    populateDropdowns();
    attachEventListeners();
    updateAll();
});

function attachEventListeners() {
    // Profile inputs
    ['gender', 'age', 'weight', 'height'].forEach(id => {
        document.getElementById(id).addEventListener('change', (e) => {
            state.profile[id] = e.target.value;
            saveData();
            updateAll();
        });
    });

    // Add Activity
    document.getElementById('addActivityBtn').addEventListener('click', () => {
        const select = document.getElementById('activitySelect');
        const duration = parseInt(document.getElementById('activityDuration').value);
        if (!duration) return;

        const act = activityDB.find(a => a.id === select.value);
        state.activities.push({ id: Date.now(), name: act.name, met: act.met, duration });
        saveData();
        updateAll();
    });

    // Add Food
    document.getElementById('addFoodBtn').addEventListener('click', () => {
        const select = document.getElementById('foodSelect');
        const amount = parseInt(document.getElementById('foodAmount').value);
        if (!amount) return;

        const food = foodDB.find(f => f.id === select.value);
        // Calculate based on amount (DB is per 100g)
        const multiplier = amount / 100;
        state.foodLog.push({
            id: Date.now(),
            name: food.name,
            amount: amount,
            cal: food.cal * multiplier,
            p: food.p * multiplier,
            c: food.c * multiplier,
            f: food.f * multiplier
        });
        saveData();
        updateAll();
    });

    // Add Custom Food
    document.getElementById('saveCustomFoodBtn').addEventListener('click', () => {
        const name = document.getElementById('customFoodName').value;
        const cal = parseFloat(document.getElementById('customFoodCal').value);
        const p = parseFloat(document.getElementById('customFoodP').value || 0);
        const c = parseFloat(document.getElementById('customFoodC').value || 0);
        const f = parseFloat(document.getElementById('customFoodF').value || 0);

        if (!name || isNaN(cal)) return alert("Please provide at least a name and calories.");

        const newFood = { id: 'c_' + Date.now(), name, cal, p, c, f };
        foodDB.push(newFood);
        localStorage.setItem('foodDB', JSON.stringify(foodDB)); // Save DB permanently
        
        populateDropdowns();
        document.querySelectorAll('.custom-food-form input').forEach(inp => inp.value = '');
        alert("Custom food added!");
    });
}

// --- Core Logic & Calculations ---
function updateAll() {
    calculateTDEE();
    calculateIntake();
    calculateSummary();
    renderLists();
}

let currentTDEE = 0;
let currentIntake = 0;

function calculateTDEE() {
    const { gender, age, weight, height } = state.profile;
    const w = parseFloat(weight);
    
    // Mifflin-St Jeor Equation for BMR
    let bmr = (10 * w) + (6.25 * parseFloat(height)) - (5 * parseFloat(age));
    bmr += (gender === 'male') ? 5 : -161;
    
    // Add Activity Calories
    let activityCals = 0;
    state.activities.forEach(act => {
        const hours = act.duration / 60;
        activityCals += act.met * w * hours;
    });

    currentTDEE = Math.round(bmr + activityCals);
    
    document.getElementById('bmrDisplay').textContent = Math.round(bmr);
    document.getElementById('tdeeDisplay').textContent = currentTDEE;
}

function calculateIntake() {
    let totals = { cal: 0, p: 0, c: 0, f: 0 };
    
    state.foodLog.forEach(food => {
        totals.cal += food.cal;
        totals.p += food.p;
        totals.c += food.c;
        totals.f += food.f;
    });

    currentIntake = Math.round(totals.cal);
    
    document.getElementById('intakeDisplay').textContent = currentIntake;
    document.getElementById('proteinDisplay').textContent = Math.round(totals.p);
    document.getElementById('carbsDisplay').textContent = Math.round(totals.c);
    document.getElementById('fatDisplay').textContent = Math.round(totals.f);
}

function calculateSummary() {
    const diff = currentIntake - currentTDEE;
    const box = document.getElementById('summaryBox');
    const heading = document.getElementById('statusHeading');
    const est = document.getElementById('weightGoalEstimation');

    document.getElementById('calorieDifference').textContent = `Difference: ${Math.abs(diff)} kcal`;

    // 1kg of fat ≈ 7700 kcal
    if (diff < -50) { // Deficit
        box.className = 'summary-box deficit';
        heading.textContent = 'You are in a Caloric Deficit';
        const days = Math.round(7700 / Math.abs(diff));
        est.textContent = `At this daily rate, it will take ~${days} days to lose 1kg of fat.`;
    } else if (diff > 50) { // Surplus
        box.className = 'summary-box surplus';
        heading.textContent = 'You are in a Caloric Surplus';
        const days = Math.round(7700 / diff);
        est.textContent = `At this daily rate, it will take ~${days} days to gain 1kg of weight.`;
    } else { // Maintenance
        box.className = 'summary-box';
        heading.textContent = 'You are at Maintenance';
        est.textContent = 'Your weight will likely remain stable.';
    }
}

// --- DOM Rendering ---
function renderLists() {
    // Render Activities
    const actList = document.getElementById('activityList');
    actList.innerHTML = state.activities.map(a => 
        `<li>${a.name} (${a.duration}m) <button class="delete-btn" onclick="deleteItem('act', ${a.id})">X</button></li>`
    ).join('');

    // Render Food
    const foodList = document.getElementById('foodLogList');
    foodList.innerHTML = state.foodLog.map(f => 
        `<li>${f.amount}g ${f.name} - ${Math.round(f.cal)}kcal <button class="delete-btn" onclick="deleteItem('food', ${f.id})">X</button></li>`
    ).join('');
}

function populateDropdowns() {
    const actSelect = document.getElementById('activitySelect');
    actSelect.innerHTML = activityDB.map(a => `<option value="${a.id}">${a.name}</option>`).join('');

    const foodSelect = document.getElementById('foodSelect');
    foodSelect.innerHTML = foodDB.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
}

// Global scope delete function for inline onclick handlers
window.deleteItem = function(type, id) {
    if (type === 'act') {
        state.activities = state.activities.filter(a => a.id !== id);
    } else {
        state.foodLog = state.foodLog.filter(f => f.id !== id);
    }
    saveData();
    updateAll();
};

// --- Storage (Local Storage) ---
function saveData() {
    // Save state under today's date
    localStorage.setItem(`tracker_${state.date}`, JSON.stringify(state));
}

function loadData() {
    // Load custom foods if they exist
    const savedFood = localStorage.getItem('foodDB');
    if (savedFood) foodDB = JSON.parse(savedFood);

    // Load today's data if it exists
    const todayData = localStorage.getItem(`tracker_${state.date}`);
    if (todayData) {
        const parsed = JSON.parse(todayData);
        state.profile = parsed.profile;
        state.activities = parsed.activities || [];
        state.foodLog = parsed.foodLog || [];
        
        // Update profile form inputs
        document.getElementById('gender').value = state.profile.gender;
        document.getElementById('age').value = state.profile.age;
        document.getElementById('weight').value = state.profile.weight;
        document.getElementById('height').value = state.profile.height;
    }
}
