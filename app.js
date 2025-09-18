const API_URL = "/api/transactions";

let categoryChart, monthlyChart, reportCategoryChart;

// Load transactions from backend
async function loadTransactions() {
  const res = await fetch(API_URL);
  const data = await res.json();

  const table = document.getElementById("transactionsTable");
  const totalIncome = document.getElementById("totalIncome");
  const totalExpense = document.getElementById("totalExpense");
  const balance = document.getElementById("balance");

  table.innerHTML = "";
  let income = 0, expense = 0;
  const categoryTotals = {};

  data.forEach(tx => {
    // table row
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${tx.date}</td>
      <td>${tx.category}</td>
      <td>${tx.type}</td>
      <td class="${tx.type}">
        ${tx.type === "expense" ? "-" : "+"}${parseFloat(tx.amount).toFixed(2)}
      </td>
      <td>${tx.note || ""}</td>
      <td><button class="delete-btn" data-id="${tx.id}">🗑</button></td>
    `;
    table.appendChild(row);

    // totals
    if (tx.type === "income") income += tx.amount;
    else expense += tx.amount;

    // category sums
    if (tx.type === "expense") {
      categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
    }
  });

  totalIncome.textContent = income.toFixed(2);
  totalExpense.textContent = expense.toFixed(2);
  balance.textContent = (income - expense).toFixed(2);

  // delete event
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.target.dataset.id;
      await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      loadTransactions();
    });
  });

  // update dashboard chart
  renderDashboardChart(categoryTotals);

  // update reports if visible
  if (document.getElementById("reports").style.display !== "none") {
    updateReports(data);
  }
}

// Add transaction
document.getElementById("transactionForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const tx = {
    amount: parseFloat(document.getElementById("amount").value),
    category: document.getElementById("category").value,
    type: document.getElementById("type").value,
    date: document.getElementById("date").value,
    note: document.getElementById("note").value
  };
  await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tx)
  });
  e.target.reset();
  loadTransactions();
});

// Search filter
document.getElementById("searchBox").addEventListener("input", () => {
  const filter = document.getElementById("searchBox").value.toLowerCase();
  document.querySelectorAll("#transactionsTable tr").forEach(row => {
    row.style.display = row.innerText.toLowerCase().includes(filter) ? "" : "none";
  });
});

// Dashboard category chart
function renderDashboardChart(categoryTotals) {
  const ctx = document.getElementById("categoryChart").getContext("2d");
  if (categoryChart) categoryChart.destroy();

  categoryChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: Object.keys(categoryTotals),
      datasets: [{
        data: Object.values(categoryTotals),
        backgroundColor: [
          "#e74c3c", "#f1c40f", "#3498db", "#9b59b6", "#2ecc71", "#e67e22"
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

// Reports charts
function updateReports(data) {
  // Monthly Income vs Expense
  const monthlyData = {};
  data.forEach(t => {
    const month = new Date(t.date).toLocaleString("default", { month: "short", year: "numeric" });
    if (!monthlyData[month]) monthlyData[month] = { income: 0, expense: 0 };
    monthlyData[month][t.type] += t.amount;
  });

  const ctx1 = document.getElementById("monthlyChart").getContext("2d");
  if (monthlyChart) monthlyChart.destroy();
  monthlyChart = new Chart(ctx1, {
    type: "bar",
    data: {
      labels: Object.keys(monthlyData),
      datasets: [
        { label: "Income", data: Object.values(monthlyData).map(m => m.income), backgroundColor: "#27ae60" },
        { label: "Expense", data: Object.values(monthlyData).map(m => m.expense), backgroundColor: "#e74c3c" }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });

  // Category Breakdown (all transactions)
  const categoryTotals = {};
  data.forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });

  const ctx2 = document.getElementById("reportCategoryChart").getContext("2d");
  if (reportCategoryChart) reportCategoryChart.destroy();
  reportCategoryChart = new Chart(ctx2, {
    type: "doughnut",
    data: {
      labels: Object.keys(categoryTotals),
      datasets: [{
        data: Object.values(categoryTotals),
        backgroundColor: ["#3498db","#e74c3c","#f39c12","#27ae60","#9b59b6","#1abc9c","#34495e"]
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

// Navigation switching
document.querySelectorAll(".sidebar nav a").forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    document.querySelectorAll(".sidebar nav a").forEach(l => l.classList.remove("active"));
    link.classList.add("active");

    document.querySelectorAll("main .section").forEach(sec => sec.style.display = "none");
    const sectionId = link.dataset.section;
    document.getElementById(sectionId).style.display = "block";

    if (sectionId === "reports") {
      loadTransactions(); // refresh reports
    }
  });
});

// Initial load
loadTransactions();
