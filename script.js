const state = {
    date: new Date().toISOString().split('T')[0],
    profile: { gender: 'male', age: 25, weight: 70, height: 175 },
    activities: [],
    foodLog: []
};

// 1. Updated Food DB (Approx macros per 100g or 100ml)
let foodDB = [
    { id: '1', name: 'Sambar', cal: 50, p: 2, c: 8, f: 1 },
    { id: '2', name: 'Vegetable Curry', cal: 80, p: 2, c: 10, f: 4 },
    { id: '3', name: 'Rice (Cooked)', cal: 130, p: 2.7, c: 28, f: 0.3 },
    { id: '4', name: 'Whey Protein (100g)', cal: 400, p: 80, c: 10, f: 5 }, 
    { id: '5', name: 'Dal (Cooked)', cal: 116, p: 9, c: 20, f: 0.4 },
    { id: '6', name: 'Ghee', cal: 900, p: 0, c: 0, f: 100 },
    { id: '7', name: 'Paneer', cal: 265, p: 18, c: 1.2, f: 20 },
    { id: '8', name: 'Peanuts', cal: 567, p: 26, c: 16, f: 49 },
    { id: '9', name: 'Banana', cal: 89, p: 1.1, c: 23, f: 0.3 },
    { id: '10', name: 'Apple', cal: 52, p: 0.3, c: 14, f: 0.2 },
    { id: '11', name: 'Curd', cal: 98, p: 6, c: 4, f: 4 },
    { id: '12', name: 'Coconut Water', cal: 19, p: 0.7, c: 3.7, f: 0.2 },
    { id: '13', name: 'Soya Chunks (Raw)', cal: 345, p: 52, c: 33, f: 0.5 },
    { id: '14', name: 'Maggie (Raw)', cal: 400, p: 8, c: 55, f: 15 },
    { id: '15', name: 'Dosa', cal: 168, p: 4, c: 29, f: 4 },
    { id: '16', name: 'Poha (Cooked)', cal: 130, p: 2.5, c: 28, f: 1.5 },
    { id: '17', name: 'Idly', cal: 106, p: 3, c: 23, f: 0.4 }
];

// 2. Updated Activity DB with Dynamic Units
// unitToHours converts the inputted unit into hours for the MET calculation formula
const activityDB = [
    { id: '1', name: 'Walking', met: 3.5, unit: 'Steps', unitToHours: (steps) => steps / 6000 }, 
    { id: '2', name: 'Weight Lifting', met: 5.0, unit: 'Minutes', unitToHours: (mins) => mins / 60 },
    { id: '3', name: 'Driving / Sitting', met: 1.5, unit: 'Kms', unitToHours: (kms) => kms / 30 }
];

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('currentDate').textContent = new Date().toDateString();
    loadData();
    populateDropdowns();
    attachEventListeners();
    updateAll();
});

function attachEventListeners() {
    // Profile Updates
    ['gender', 'age', 'weight', 'height'].forEach(id => {
        document.getElementById(id).addEventListener('change', (e) => {
            state.profile[id] = e.target.value;
            saveData();
            updateAll();
        });
    });

    // Dynamic Activity Label Switcher
    const actSelect = document.getElementById('activitySelect');
    const actLabel = document.getElementById('activityInputLabel');
    actSelect.addEventListener('change', () => {
        const selectedAct = activityDB.find(a => a.id === actSelect.value);
        actLabel.textContent = selectedAct.unit;
    });

    // Add Activity
    document.getElementById('addActivityBtn').addEventListener('click', () => {
        const amount = parseInt(document.getElementById('activityInput').value);
        if (!amount) return;

        const act = activityDB.find(a => a.id === document.getElementById('activitySelect').value);
        state.activities.push({ id: Date.now(), name: act.name, met: act.met, amount: amount, unit: act.unit, unitToHours: act.unitToHours.toString() });
        saveData();
        updateAll();
    });

    // Add Food
    document.getElementById('addFoodBtn').addEventListener('click', () => {
        const amount = parseInt(document.getElementById('foodAmount').value);
        if (!amount) return;

        const food = foodDB.find(f => f.id === document.getElementById('foodSelect').value);
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

    // Custom Food
    document.getElementById('saveCustomFoodBtn').addEventListener('click', () => {
        const name = document.getElementById('customFoodName').value;
        const cal = parseFloat(document.getElementById('customFoodCal').value);
        const p = parseFloat(document.getElementById('customFoodP').value || 0);
        const c = parseFloat(document.getElementById('customFoodC').value || 0);
        const f = parseFloat(document.getElementById('customFoodF').value || 0);

        if (!name || isNaN(cal)) return alert("Provide a name and calories.");
        
        const newFood = { id: 'c_' + Date.now(), name, cal, p, c, f };
        foodDB.push(newFood);
        localStorage.setItem('foodDB', JSON.stringify(foodDB)); 
        populateDropdowns();
        document.querySelectorAll('.custom-food-form input').forEach(inp => inp.value = '');
    });
}

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
    
    let bmr = (10 * w) + (6.25 * parseFloat(height)) - (5 * parseFloat(age));
    bmr += (gender === 'male') ? 5 : -161;
    
    let activityCals = 0;
    state.activities.forEach(act => {
        // Re-hydrate the function from string if loaded from localStorage
        const toHoursFunc = typeof act.unitToHours === 'string' ? eval(act.unitToHours) : act.unitToHours;
        const hours = toHoursFunc(act.amount);
        activityCals += act.met * w * hours;
    });

    currentTDEE = Math.round(bmr + activityCals);
    document.getElementById('bmrDisplay').textContent = Math.round(bmr);
    document.getElementById('tdeeDisplay').textContent = currentTDEE;
}

function calculateIntake() {
    let totals = { cal: 0, p: 0, c: 0, f: 0 };
    state.foodLog.forEach(food => {
        totals.cal += food.cal; totals.p += food.p; totals.c += food.c; totals.f += food.f;
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

    if (diff < -50) {
        box.className = 'summary-box deficit';
        heading.textContent = 'Caloric Deficit 🔥';
        est.textContent = `~${Math.round(7700 / Math.abs(diff))} days to lose 1kg of fat.`;
    } else if (diff > 50) {
        box.className = 'summary-box surplus';
        heading.textContent = 'Caloric Surplus 📈';
        est.textContent = `~${Math.round(7700 / diff)} days to gain 1kg.`;
    } else {
        box.className = 'summary-box maintenance';
        heading.textContent = 'Maintenance ⚖️';
        est.textContent = 'Your weight will remain stable.';
    }
}

function renderLists() {
    document.getElementById('activityList').innerHTML = state.activities.map(a => 
        `<li>
            <div class="list-header">
                <span>${a.name}</span>
                <button class="delete-btn" onclick="deleteItem('act', ${a.id})">X</button>
            </div>
            <div class="list-macros">${a.amount} ${a.unit} logged</div>
        </li>`
    ).join('');

    document.getElementById('foodLogList').innerHTML = state.foodLog.map(f => 
        `<li>
            <div class="list-header">
                <span>${f.amount}g ${f.name}</span>
                <button class="delete-btn" onclick="deleteItem('food', ${f.id})">X</button>
            </div>
            <div class="list-macros">
                ${Math.round(f.cal)} kcal (Pro: ${f.p.toFixed(1)}g | Carb: ${f.c.toFixed(1)}g | Fat: ${f.f.toFixed(1)}g)
            </div>
        </li>`
    ).join('');
}

function populateDropdowns() {
    document.getElementById('activitySelect').innerHTML = activityDB.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    document.getElementById('foodSelect').innerHTML = foodDB.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
    
    // Trigger initial label set
    const selectedAct = activityDB.find(a => a.id === document.getElementById('activitySelect').value);
    document.getElementById('activityInputLabel').textContent = selectedAct.unit;
}

window.deleteItem = function(type, id) {
    if (type === 'act') state.activities = state.activities.filter(a => a.id !== id);
    else state.foodLog = state.foodLog.filter(f => f.id !== id);
    saveData(); updateAll();
};

function saveData() { localStorage.setItem(`tracker_${state.date}`, JSON.stringify(state)); }

function loadData() {
    const savedFood = localStorage.getItem('foodDB');
    if (savedFood) foodDB = JSON.parse(savedFood);

    const todayData = localStorage.getItem(`tracker_${state.date}`);
    if (todayData) {
        const parsed = JSON.parse(todayData);
        state.profile = parsed.profile;
        state.activities = parsed.activities || [];
        state.foodLog = parsed.foodLog || [];
        
        document.getElementById('gender').value = state.profile.gender;
        document.getElementById('age').value = state.profile.age;
        document.getElementById('weight').value = state.profile.weight;
        document.getElementById('height').value = state.profile.height;
    }
}
