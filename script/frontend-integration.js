// 🔧 Frontend Integration Code for Ask Ledgerly v2.0

// ============================================
// API Configuration
// ============================================

const API_BASE_URL = 'http://localhost:8000';  // FastAPI endpoint

// ============================================
// Helper Functions
// ============================================

async function askLedgerly(question) {
  try {
    const response = await fetch(`${API_BASE_URL}/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question: question })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error:', error);
    showError(`Failed to process question: ${error.message}`);
    return null;
  }
}

async function getStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/stats`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching stats:', error);
    return null;
  }
}

async function getTransactions() {
  try {
    const response = await fetch(`${API_BASE_URL}/transactions`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return null;
  }
}

async function addTransaction(date, amount, gstAmount, paymentMode, description = '') {
  try {
    const response = await fetch(`${API_BASE_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date: date,
        amount: amount,
        gst_amount: gstAmount,
        payment_mode: paymentMode,
        description: description
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to add transaction: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error adding transaction:', error);
    showError(`Failed to add transaction: ${error.message}`);
    return null;
  }
}

async function deleteTransaction(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`Failed to delete transaction: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting transaction:', error);
    showError(`Failed to delete transaction: ${error.message}`);
    return null;
  }
}

// ============================================
// Dashboard Integration
// ============================================

async function updateDashboard() {
  // Get stats and display
  const stats = await getStats();
  if (stats) {
    document.getElementById('total-sales').textContent = `₹${stats.today_sales}`;
    document.getElementById('total-gst').textContent = `₹${stats.total_gst}`;
    document.getElementById('total-transactions').textContent = stats.total_transactions;

    // Show payment mode breakdown
    if (stats.payment_modes) {
      updatePaymentChart(stats.payment_modes);
    }
  }
}

function updatePaymentChart(paymentModes) {
  // Example: Update a chart with payment modes
  const chartData = paymentModes.map(mode => ({
    label: mode.mode.toUpperCase(),
    value: mode.amount
  }));
  
  console.log('Payment Mode Data:', chartData);
  // Update your chart library here (Chart.js, etc.)
}

// ============================================
// AI Query Integration
// ============================================

async function handleAIQuery(userQuestion) {
  showLoading(true);

  const result = await askLedgerly(userQuestion);
  
  showLoading(false);

  if (!result) return;

  // Display result
  displayQueryResult(result);
}

function displayQueryResult(result) {
  const { title, value, chart, data, sql } = result;

  // Create result display
  const resultHTML = `
    <div class="query-result">
      <h3>${title}</h3>
      <div class="result-value">₹${value.toLocaleString('en-IN')}</div>
      
      ${data ? `
        <div class="result-chart">
          ${renderChart(chart, data)}
        </div>
      ` : ''}

      <div class="result-debug">
        <small>Query: ${sql}</small>
      </div>
    </div>
  `;

  document.getElementById('query-results').innerHTML = resultHTML;
}

function renderChart(chartType, data) {
  if (chartType === 'none') return '';

  const labels = data.map(d => d.label);
  const values = data.map(d => d.value);

  if (chartType === 'bar') {
    return `<canvas id="chart-bar"></canvas>`;
  } else if (chartType === 'pie') {
    return `<canvas id="chart-pie"></canvas>`;
  }

  return '';
}

// ============================================
// Form Integration
// ============================================

async function handleTransactionSubmit(formData) {
  const transaction = await addTransaction(
    formData.date,
    parseFloat(formData.amount),
    parseFloat(formData.gstAmount),
    formData.paymentMode,
    formData.description
  );

  if (transaction) {
    showSuccess('Transaction added successfully!');
    refreshTransactionList();
    updateDashboard();
  }
}

async function refreshTransactionList() {
  const transactions = await getTransactions();
  
  if (transactions) {
    let html = '<table class="transactions-table"><tr>' +
               '<th>Date</th><th>Amount</th><th>GST</th><th>Mode</th><th>Action</th></tr>';
    
    transactions.forEach(t => {
      html += `<tr>
        <td>${t.date}</td>
        <td>₹${t.amount}</td>
        <td>₹${t.gst_amount}</td>
        <td>${t.payment_mode}</td>
        <td><button onclick="removeTransaction(${t.id})">Delete</button></td>
      </tr>`;
    });
    
    html += '</table>';
    document.getElementById('transactions-list').innerHTML = html;
  }
}

async function removeTransaction(id) {
  if (confirm('Are you sure?')) {
    await deleteTransaction(id);
    refreshTransactionList();
    updateDashboard();
  }
}

// ============================================
// UI Helpers
// ============================================

function showLoading(isLoading) {
  const loader = document.getElementById('loader');
  if (loader) {
    loader.style.display = isLoading ? 'block' : 'none';
  }
}

function showError(message) {
  console.error(message);
  // Show toast/notification
  if (window.showToast) {
    window.showToast(message, 'error');
  } else {
    alert(message);
  }
}

function showSuccess(message) {
  if (window.showToast) {
    window.showToast(message, 'success');
  } else {
    alert(message);
  }
}

// ============================================
// Event Listeners
// ============================================

document.addEventListener('DOMContentLoaded', function() {
  // Check API health on page load
  fetch(`${API_BASE_URL}/health`)
    .then(r => r.json())
    .then(data => console.log('API Status:', data))
    .catch(e => console.error('API Connection Failed:', e));

  // Initialize dashboard
  updateDashboard();

  // Query form handler
  const queryForm = document.getElementById('query-form');
  if (queryForm) {
    queryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const question = document.getElementById('query-input').value;
      if (question) {
        await handleAIQuery(question);
        document.getElementById('query-input').value = '';
      }
    });
  }

  // Transaction form handler
  const transactionForm = document.getElementById('transaction-form');
  if (transactionForm) {
    transactionForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(transactionForm);
      await handleTransactionSubmit({
        date: formData.get('date'),
        amount: formData.get('amount'),
        gstAmount: formData.get('gst_amount'),
        paymentMode: formData.get('payment_mode'),
        description: formData.get('description')
      });
    });
  }
});

// ============================================
// Export for use in other scripts
// ============================================

window.askLedgerly = askLedgerly;
window.getStats = getStats;
window.getTransactions = getTransactions;
window.addTransaction = addTransaction;
window.updateDashboard = updateDashboard;
window.handleAIQuery = handleAIQuery;
