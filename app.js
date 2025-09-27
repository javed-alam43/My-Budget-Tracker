const API_URL = "http://localhost:3000/api/transactions";

let categoryChart, monthlyChart, reportCategoryChart;

// Load transactions
async function loadTransactions() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("Failed to fetch transactions");
    const data = await res.json();

    const table = document.getElementById("transactionsTable");
    const totalIncome = document.getElementById("totalIncome");
    const totalExpense = document.getElementById("totalExpense");
    const balance = document.getElementById("balance");

    table.innerHTML = "";
    let income = 0, expense = 0;
    const categoryTotals = {};

    data.forEach(tx => {
      const id = tx.id || tx._id; // ✅ support both SQL & MongoDB
      const amount = parseFloat(tx.amount);

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${tx.date}</td>
        <td>${tx.category}</td>
        <td>${tx.type}</td>
        <td class="${tx.type}">${tx.type === "expense" ? "-" : "+"}${amount.toFixed(2)}</td>
        <td>${tx.note || ""}</td>
        <td><button class="delete-btn" data-id="${id}">🗑</button></td>
      `;
      table.appendChild(row);

      if (tx.type === "income") income += amount;
      else expense += amount;

      if (tx.type === "expense") {
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + amount;
      }
    });

    totalIncome.textContent = income.toFixed(2);
    totalExpense.textContent = expense.toFixed(2);
    balance.textContent = (income - expense).toFixed(2);

    // Delete transaction
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.target.dataset.id;
        await fetch(`${API_URL}/${id}`, { method: "DELETE" });
        loadTransactions();
      });
    });

    renderDashboardChart(categoryTotals);

    // Update reports if section is visible
    if (document.getElementById("reports").style.display !== "none") {
      updateReports(data);
    }

  } catch (err) {
    console.error("Failed to load transactions:", err);
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

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tx)
    });
    if (!res.ok) throw new Error("Failed to add transaction");
    e.target.reset();
    loadTransactions();
  } catch (err) {
    console.error("Failed to add transaction:", err);
  }
});

// Search filter
document.getElementById("searchBox").addEventListener("input", () => {
  const filter = document.getElementById("searchBox").value.toLowerCase();
  document.querySelectorAll("#transactionsTable tr").forEach(row => {
    row.style.display = row.innerText.toLowerCase().includes(filter) ? "" : "none";
  });
});

// Charts
function renderDashboardChart(categoryTotals) {
  const ctx = document.getElementById("categoryChart").getContext("2d");
  if (categoryChart) categoryChart.destroy();

  const dataValues = Object.values(categoryTotals);
  if (dataValues.length === 0) {
    // If no expense data, show dummy slice
    categoryChart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: ["No expenses"],
        datasets: [{ data: [1], backgroundColor: ["#ccc"] }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
    return;
  }

  categoryChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: Object.keys(categoryTotals),
      datasets: [{
        data: dataValues,
        backgroundColor: ["#e74c3c","#f1c40f","#3498db","#9b59b6","#2ecc71","#e67e22"]
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function updateReports(data) {
  const monthlyData = {};
  data.forEach(t => {
    const month = new Date(t.date).toLocaleString("default", { month: "short", year: "numeric" });
    if (!monthlyData[month]) monthlyData[month] = { income: 0, expense: 0 };
    monthlyData[month][t.type] += parseFloat(t.amount);
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

  const categoryTotals = {};
  data.forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + parseFloat(t.amount);
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

// Navigation
document.querySelectorAll(".sidebar nav a").forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    document.querySelectorAll(".sidebar nav a").forEach(l => l.classList.remove("active"));
    link.classList.add("active");

    document.querySelectorAll("main .section").forEach(sec => sec.style.display = "none");
    document.getElementById(link.dataset.section).style.display = "block";

    if (link.dataset.section === "reports") loadTransactions();
  });
});

// Initial load
loadTransactions();
