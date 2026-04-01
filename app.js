const STORAGE_KEY = 'familyBudgetApp_v1';
const defaultData = {
  currentMonth: new Date().toISOString().slice(0, 7),
  incomes: {
    Jess: 0,
    Matt: 0,
    'Side hustle': 0,
  },
  budgets: [
    { id: uid(), name: 'Groceries', amount: 700 },
    { id: uid(), name: 'Dining out', amount: 250 },
    { id: uid(), name: 'Gas', amount: 250 },
    { id: uid(), name: 'Household', amount: 150 },
    { id: uid(), name: 'Baby or kid items', amount: 150 },
    { id: uid(), name: 'Shopping and fun', amount: 200 },
    { id: uid(), name: 'Medical', amount: 100 },
  ],
  recurring: [
    { id: uid(), name: 'Mortgage or rent', amount: 0, dueDay: 1, category: 'Housing' },
    { id: uid(), name: 'Utilities', amount: 0, dueDay: 10, category: 'Utilities' },
    { id: uid(), name: 'Phone or internet', amount: 0, dueDay: 15, category: 'Utilities' },
    { id: uid(), name: 'Insurance', amount: 0, dueDay: 20, category: 'Insurance' },
  ],
  goals: [
    { id: uid(), name: 'Emergency fund', target: 10000, current: 0, monthly: 250 },
    { id: uid(), name: 'Vacation', target: 3000, current: 0, monthly: 100 },
  ],
  transactions: [],
};

let data = loadData();

function uid() {
  return Math.random().toString(36).slice(2, 10);
}
function money(v) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(v || 0));
}
function moneyPrecise(v) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(v || 0));
}
function monthLabel(yyyyMm) {
  const [y, m] = yyyyMm.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(defaultData);
  try {
    return { ...structuredClone(defaultData), ...JSON.parse(raw) };
  } catch {
    return structuredClone(defaultData);
  }
}
function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
function getMonthTransactions() {
  return data.transactions.filter(t => t.date.startsWith(data.currentMonth));
}
function totalIncome() {
  return Object.values(data.incomes).reduce((a, b) => a + Number(b || 0), 0);
}
function totalBills() {
  return data.recurring.reduce((a, b) => a + Number(b.amount || 0), 0);
}
function totalSpent() {
  return getMonthTransactions().reduce((a, b) => a + Number(b.amount || 0), 0);
}
function spentByCategory(name) {
  return getMonthTransactions()
    .filter(t => t.category === name)
    .reduce((a, b) => a + Number(b.amount || 0), 0);
}
function render() {
  document.getElementById('monthBtn').textContent = monthLabel(data.currentMonth);
  document.getElementById('incomeTotal').textContent = money(totalIncome());
  document.getElementById('billsTotal').textContent = money(totalBills());
  document.getElementById('spentTotal').textContent = money(totalSpent());
  document.getElementById('leftoverTotal').textContent = money(totalIncome() - totalBills() - totalSpent());

  renderIncome();
  renderGoals();
  renderBudgets();
  renderUpcomingBills();
  renderTransactions();
  renderRecurring();
  renderGoalManager();
  renderBudgetManager();
  populateCategoryDropdowns();
  setFormValues();
  saveData();
}
function renderIncome() {
  const el = document.getElementById('incomeList');
  el.innerHTML = Object.entries(data.incomes).map(([name, amount]) => `
    <div class="income-pill"><span>${name}</span><strong>${money(amount)}</strong></div>
  `).join('');
}
function renderGoals() {
  const el = document.getElementById('goalList');
  if (!data.goals.length) {
    el.innerHTML = '<p class="muted">No goals yet.</p>';
    return;
  }
  el.innerHTML = data.goals.map(goal => {
    const pct = goal.target ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
    return `
      <div class="stack-item">
        <div class="stack-item-head"><strong>${goal.name}</strong><span class="muted">${pct}%</span></div>
        <p>${money(goal.current)} of ${money(goal.target)}</p>
        <p class="small muted">Monthly: ${money(goal.monthly)}</p>
        <div class="progress-wrap"><div class="progress-bar" style="width:${pct}%"></div></div>
      </div>`;
  }).join('');
}
function renderBudgets() {
  const el = document.getElementById('budgetList');
  if (!data.budgets.length) {
    el.innerHTML = '<p class="muted">No category budgets yet.</p>';
    return;
  }
  el.innerHTML = data.budgets.map(item => {
    const spent = spentByCategory(item.name);
    const pct = item.amount ? Math.min(100, Math.round((spent / item.amount) * 100)) : 0;
    const left = item.amount - spent;
    return `
      <div class="stack-item">
        <div class="row-between"><strong>${item.name}</strong><span>${money(item.amount)}</span></div>
        <p class="small muted">Spent ${money(spent)} • Left ${money(left)}</p>
        <div class="progress-wrap"><div class="progress-bar" style="width:${pct}%"></div></div>
      </div>`;
  }).join('');
}
function renderUpcomingBills() {
  const el = document.getElementById('upcomingBills');
  if (!data.recurring.length) {
    el.innerHTML = '<p class="muted">No recurring bills yet.</p>';
    return;
  }
  const sorted = [...data.recurring].sort((a,b) => a.dueDay - b.dueDay).slice(0,5);
  el.innerHTML = sorted.map(item => `
    <div class="stack-item">
      <div class="row-between"><strong>${item.name}</strong><span>${money(item.amount)}</span></div>
      <p class="small muted">Due on day ${item.dueDay} • ${item.category}</p>
    </div>
  `).join('');
}
function renderTransactions() {
  const el = document.getElementById('transactionList');
  const txns = [...getMonthTransactions()].sort((a,b) => b.date.localeCompare(a.date));
  if (!txns.length) {
    el.innerHTML = '<p class="muted">No spending logged for this month yet.</p>';
    return;
  }
  el.innerHTML = txns.map(t => `
    <div class="stack-item">
      <div class="row-between"><strong>${t.description}</strong><span>${moneyPrecise(t.amount)}</span></div>
      <p class="small muted">${t.date} • ${t.category} • ${t.person}</p>
      <button class="delete-btn top-space" onclick="removeTransaction('${t.id}')">Delete</button>
    </div>
  `).join('');
}
function renderRecurring() {
  const el = document.getElementById('recurringList');
  if (!data.recurring.length) {
    el.innerHTML = '<p class="muted">No recurring bills added yet.</p>';
    return;
  }
  el.innerHTML = [...data.recurring].sort((a,b) => a.dueDay - b.dueDay).map(item => `
    <div class="stack-item">
      <div class="row-between"><strong>${item.name}</strong><span>${moneyPrecise(item.amount)}</span></div>
      <p class="small muted">Due day ${item.dueDay} • ${item.category}</p>
      <button class="delete-btn top-space" onclick="removeRecurring('${item.id}')">Delete</button>
    </div>
  `).join('');
}
function renderGoalManager() {
  const el = document.getElementById('goalManagerList');
  if (!data.goals.length) {
    el.innerHTML = '<p class="muted">No goals added yet.</p>';
    return;
  }
  el.innerHTML = data.goals.map(item => `
    <div class="stack-item">
      <div class="row-between"><strong>${item.name}</strong><span>${money(item.target)}</span></div>
      <p class="small muted">Current ${money(item.current)} • Monthly ${money(item.monthly)}</p>
      <button class="delete-btn top-space" onclick="removeGoal('${item.id}')">Delete</button>
    </div>
  `).join('');
}
function renderBudgetManager() {
  const el = document.getElementById('budgetManagerList');
  if (!data.budgets.length) {
    el.innerHTML = '<p class="muted">No categories added yet.</p>';
    return;
  }
  el.innerHTML = data.budgets.map(item => `
    <div class="stack-item">
      <div class="row-between"><strong>${item.name}</strong><span>${money(item.amount)}</span></div>
      <button class="delete-btn top-space" onclick="removeBudget('${item.id}')">Delete</button>
    </div>
  `).join('');
}
function populateCategoryDropdowns() {
  const options = data.budgets.map(b => `<option>${b.name}</option>`).join('');
  document.getElementById('txnCategory').innerHTML = options || '<option>General</option>';
  document.getElementById('recurringCategory').innerHTML = [
    'Housing','Utilities','Insurance','Childcare','Debt','Subscriptions','Transportation','Other'
  ].map(c => `<option>${c}</option>`).join('');
}
function setFormValues() {
  document.getElementById('incomeJess').value = data.incomes.Jess || '';
  document.getElementById('incomeMatt').value = data.incomes.Matt || '';
  document.getElementById('incomeSide').value = data.incomes['Side hustle'] || '';
  document.getElementById('txnDate').value = new Date().toISOString().slice(0, 10);
}

function removeTransaction(id) {
  data.transactions = data.transactions.filter(x => x.id !== id);
  render();
}
function removeRecurring(id) {
  data.recurring = data.recurring.filter(x => x.id !== id);
  render();
}
function removeGoal(id) {
  data.goals = data.goals.filter(x => x.id !== id);
  render();
}
function removeBudget(id) {
  const budget = data.budgets.find(x => x.id === id);
  data.budgets = data.budgets.filter(x => x.id !== id);
  if (budget) {
    data.transactions = data.transactions.map(t => t.category === budget.name ? { ...t, category: 'General' } : t);
  }
  render();
}
window.removeTransaction = removeTransaction;
window.removeRecurring = removeRecurring;
window.removeGoal = removeGoal;
window.removeBudget = removeBudget;

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.view).classList.add('active');
  });
});

document.getElementById('monthBtn').addEventListener('click', () => {
  const next = prompt('Enter month as YYYY-MM', data.currentMonth);
  if (next && /^\d{4}-\d{2}$/.test(next)) {
    data.currentMonth = next;
    render();
  }
});

document.getElementById('transactionForm').addEventListener('submit', e => {
  e.preventDefault();
  data.transactions.push({
    id: uid(),
    date: document.getElementById('txnDate').value,
    description: document.getElementById('txnDescription').value.trim(),
    category: document.getElementById('txnCategory').value,
    person: document.getElementById('txnPerson').value,
    amount: Number(document.getElementById('txnAmount').value),
  });
  e.target.reset();
  document.getElementById('txnDate').value = new Date().toISOString().slice(0, 10);
  render();
});

document.getElementById('recurringForm').addEventListener('submit', e => {
  e.preventDefault();
  data.recurring.push({
    id: uid(),
    name: document.getElementById('recurringName').value.trim(),
    amount: Number(document.getElementById('recurringAmount').value),
    dueDay: Number(document.getElementById('recurringDue').value),
    category: document.getElementById('recurringCategory').value,
  });
  e.target.reset();
  render();
});

document.getElementById('goalForm').addEventListener('submit', e => {
  e.preventDefault();
  data.goals.push({
    id: uid(),
    name: document.getElementById('goalName').value.trim(),
    target: Number(document.getElementById('goalTarget').value),
    current: Number(document.getElementById('goalCurrent').value),
    monthly: Number(document.getElementById('goalMonthly').value),
  });
  e.target.reset();
  render();
});

document.getElementById('incomeForm').addEventListener('submit', e => {
  e.preventDefault();
  data.incomes.Jess = Number(document.getElementById('incomeJess').value || 0);
  data.incomes.Matt = Number(document.getElementById('incomeMatt').value || 0);
  data.incomes['Side hustle'] = Number(document.getElementById('incomeSide').value || 0);
  render();
});

document.getElementById('budgetForm').addEventListener('submit', e => {
  e.preventDefault();
  data.budgets.push({
    id: uid(),
    name: document.getElementById('budgetCategoryName').value.trim(),
    amount: Number(document.getElementById('budgetCategoryAmount').value),
  });
  e.target.reset();
  render();
});

document.getElementById('clearMonthTransactions').addEventListener('click', () => {
  if (confirm(`Delete all transactions for ${monthLabel(data.currentMonth)}?`)) {
    data.transactions = data.transactions.filter(t => !t.date.startsWith(data.currentMonth));
    render();
  }
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `family-budget-backup-${data.currentMonth}.json`;
  a.click();
});

document.getElementById('importFile').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  try {
    data = JSON.parse(text);
    render();
    alert('Budget data imported.');
  } catch {
    alert('That file could not be imported.');
  }
});

document.querySelectorAll('[data-open]').forEach(btn => {
  btn.addEventListener('click', () => document.getElementById(btn.dataset.open).showModal());
});
document.querySelectorAll('.close-modal').forEach(btn => {
  btn.addEventListener('click', () => btn.closest('dialog').close());
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}

render();
