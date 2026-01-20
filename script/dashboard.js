(function () {
  document.addEventListener('DOMContentLoaded', () => {
    initGreetingAndUser();
    initOnboardingWizard();
    initEntriesTable();
    loadLedgerEntries();
    loadBillingSnapshot('week');
    loadScheduleData();
    initAddScheduleButton();
    initBillingRangeButtons();
    initLogoutButton();
    initLedgerModal();
    if (window.ToastManager) {
      ToastManager.attachTriggers(document);
    }
  });

  // -------------------------
  // Logout Function
  // -------------------------
  function initLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
          window.location.href = '/';
        } catch (error) {
          console.error('Logout failed:', error);
          window.location.href = '/';
        }
      });
    }
  }

  // -------------------------
  // Entries Table Functions
  // -------------------------
  function initEntriesTable() {
    loadEntries();
    initTableFilters();
  }

  async function loadEntries() {
    const tbody = document.getElementById('entriesTableBody');
    if (!tbody) return;

    try {
      const response = await fetch('/api/entries', { credentials: 'same-origin' });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #888;">Failed to load entries</td></tr>';
        return;
      }

      const entries = data.entries || [];
      
      if (entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #888;">No entries yet. Use voice entry or upload a bill to add your first entry!</td></tr>';
        return;
      }

      tbody.innerHTML = entries.map((entry, index) => {
        const status = entry.entry_type === 'income' ? 'paid' : 'due';
        const statusLabel = entry.entry_type === 'income' ? 'Income' : 'Expense';
        const statusClass = entry.entry_type === 'income' ? 'status-pill--paid' : 'status-pill--due';
        const amount = parseFloat(entry.amount).toLocaleString('en-IN');
        const date = formatDate(entry.created_at);
        const note = entry.note || 'No description';
        const truncatedNote = note.length > 40 ? note.substring(0, 40) + '...' : note;

        return `
          <tr data-status="${status}" data-entry-id="${entry.id}">
            <td>ENT-${entry.id}</td>
            <td title="${escapeHtml(note)}">${escapeHtml(truncatedNote)}</td>
            <td>₹${amount}</td>
            <td>${entry.entry_type === 'income' ? 'Voice/Manual' : 'Voice/Manual'}</td>
            <td><span class="status-pill ${statusClass}">${statusLabel}</span></td>
            <td>${date}</td>
          </tr>
        `;
      }).join('');

    } catch (error) {
      console.error('Error loading entries:', error);
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #888;">Error loading entries</td></tr>';
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr.replace(' ', 'T'));
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function initTableFilters() {
    const filterChips = document.querySelectorAll('.filter-chip[data-status]');
    filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        filterChips.forEach(c => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        
        const status = chip.dataset.status;
        const rows = document.querySelectorAll('#entriesTableBody tr[data-entry-id]');
        
        rows.forEach(row => {
          if (status === 'all') {
            row.style.display = '';
          } else if (status === 'paid') {
            row.style.display = row.dataset.status === 'paid' ? '' : 'none';
          } else if (status === 'due' || status === 'overdue') {
            row.style.display = row.dataset.status === 'due' ? '' : 'none';
          }
        });
      });
    });
  }

  // Expose refresh function globally for voice-entry.js to call
  window.refreshDashboardEntries = loadEntries;

  // -------------------------
  // Live Ledger Functions
  // -------------------------
  let allLedgerEntries = [];
  
  async function loadLedgerEntries() {
    const mainLedgerTable = document.getElementById('mainLedgerTable');
    if (!mainLedgerTable) return;

    try {
      const response = await fetch('/api/entries', { credentials: 'same-origin' });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        mainLedgerTable.innerHTML = '<div style="padding: 2rem; text-align: center; color: #888;">Failed to load ledger entries</div>';
        return;
      }

      const entries = data.entries || [];
      allLedgerEntries = entries;
      
      if (entries.length === 0) {
        mainLedgerTable.innerHTML = '<div class="ledger-empty-state" style="padding: 3rem 1rem; text-align: center; color: #9ca3af;"><p>No entries yet. Start by adding a voice entry or uploading a bill.</p></div>';
        return;
      }

      // Calculate running balance and totals
      let totalIncome = 0;
      let totalExpense = 0;
      let runningBalance = 0;

      const ledgerRows = entries.map((entry) => {
        const amount = parseFloat(entry.amount) || 0;
        const isIncome = entry.entry_type === 'income';
        
        if (isIncome) {
          totalIncome += amount;
          runningBalance += amount;
        } else {
          totalExpense += amount;
          runningBalance -= amount;
        }

        const date = formatLedgerDate(entry.created_at);
        const description = entry.note || 'No description';
        const type = isIncome ? 'Income' : 'Expense';
        const typeClass = isIncome ? 'ledger-type-income' : 'ledger-type-expense';
        const amountStr = amount.toLocaleString('en-IN');
        const balanceStr = runningBalance.toLocaleString('en-IN');
        const amountColor = isIncome ? '#22c55e' : '#ef4444';

        return `
          <div class="ledger-row" style="display: grid; grid-template-columns: 100px minmax(150px, 1fr) 100px 120px 120px; gap: 1rem; padding: 0.75rem 1rem; border-bottom: 1px solid #e5e7eb; align-items: center; min-width: 600px;">
            <span style="font-size: 0.875rem; color: #666;">${date}</span>
            <span style="color: #111; word-break: break-word;" title="${description}">${description.substring(0, 40)}${description.length > 40 ? '...' : ''}</span>
            <span><span class="status-pill ${typeClass}" style="padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.8rem; background: ${isIncome ? '#dcfce7' : '#fee2e2'}; color: ${isIncome ? '#16a34a' : '#dc2626'};">${type}</span></span>
            <span style="text-align: right; color: ${amountColor}; font-weight: 500;">₹${amountStr}</span>
            <span style="text-align: right; color: #3b82f6; font-weight: 600;">₹${balanceStr}</span>
          </div>
        `;
      }).join('');

      // Update summary displays
      document.getElementById('totalIncomeDisplay').textContent = '₹' + totalIncome.toLocaleString('en-IN');
      document.getElementById('totalExpenseDisplay').textContent = '₹' + totalExpense.toLocaleString('en-IN');
      document.getElementById('netBalanceDisplay').textContent = '₹' + runningBalance.toLocaleString('en-IN');
      
      // Update balance color based on positive/negative
      const balanceDisplay = document.getElementById('netBalanceDisplay');
      if (runningBalance >= 0) {
        balanceDisplay.style.color = '#22c55e';
      } else {
        balanceDisplay.style.color = '#ef4444';
      }

      // Build the final table HTML with header
      const headerRow = `
        <div class="ledger-row ledger-row--head" style="display: grid; grid-template-columns: 100px minmax(150px, 1fr) 100px 120px 120px; gap: 1rem; padding: 0.75rem 1rem; background: #f3f4f6; border-radius: 8px; font-weight: 600; font-size: 0.875rem; color: #374151; min-width: 600px;">
          <span>Date</span>
          <span>Description</span>
          <span>Type</span>
          <span style="text-align: right;">Amount</span>
          <span style="text-align: right;">Balance</span>
        </div>
      `;

      mainLedgerTable.innerHTML = headerRow + ledgerRows;

    } catch (error) {
      console.error('Error loading ledger entries:', error);
      mainLedgerTable.innerHTML = '<div style="padding: 2rem; text-align: center; color: #888;">Error loading ledger entries</div>';
    }

    // Also update the modal ledger table with the same entries
    updateModalLedgerTable(allLedgerEntries || []);
  }

  function updateModalLedgerTable(entries) {
    const modalLedgerTable = document.getElementById('modalLedgerTable');
    if (!modalLedgerTable) return;

    // Remove loading state and all data rows
    const emptyState = modalLedgerTable.querySelector('.ledger-empty-state');
    if (emptyState) emptyState.remove();
    
    const dataRows = modalLedgerTable.querySelectorAll('.ledger-row:not(.ledger-row--head)');
    dataRows.forEach(row => row.remove());

    if (!entries || entries.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'ledger-empty-state';
      emptyDiv.style.cssText = 'padding: 2rem; text-align: center; color: #9ca3af;';
      emptyDiv.innerHTML = '<p>No entries yet. Start by adding a voice entry or uploading a bill.</p>';
      modalLedgerTable.appendChild(emptyDiv);
      return;
    }

    // Calculate running balance
    let runningBalance = 0;
    const ledgerRowsHTML = entries.map((entry) => {
      const amount = parseFloat(entry.amount) || 0;
      const isIncome = entry.entry_type === 'income';
      
      if (isIncome) {
        runningBalance += amount;
      } else {
        runningBalance -= amount;
      }

      const date = formatLedgerDate(entry.created_at);
      const description = entry.note || 'No description';
      const amountStr = amount.toLocaleString('en-IN');
      const balanceStr = runningBalance.toLocaleString('en-IN');
      const amountColor = isIncome ? '#22c55e' : '#ef4444';
      const debitStr = !isIncome ? amountStr : '';
      const creditStr = isIncome ? amountStr : '';

      return `
        <div class="ledger-row" style="display: grid; grid-template-columns: 80px 1fr 80px 100px 100px; gap: 1rem; padding: 0.75rem 1rem; border-bottom: 1px solid #e5e7eb; align-items: center;">
          <span style="font-size: 0.875rem; color: #666;">${date}</span>
          <span style="color: #111; word-break: break-word; font-size: 0.875rem;" title="${description}">${description.substring(0, 35)}${description.length > 35 ? '...' : ''}</span>
          <span style="font-size: 0.75rem; color: #666; text-align: center;">${debitStr}</span>
          <span style="text-align: right; color: ${amountColor}; font-weight: 500; font-size: 0.875rem;">₹${creditStr}</span>
          <span style="text-align: right; color: #3b82f6; font-weight: 600; font-size: 0.875rem;">₹${balanceStr}</span>
        </div>
      `;
    }).join('');

    modalLedgerTable.innerHTML += ledgerRowsHTML;
  }

  // -------------------------
  // Ledger Modal Enhanced Features
  // -------------------------
  function initLedgerModal() {
    const ledgerModal = document.getElementById('ledgerModal');
    if (!ledgerModal) return;

    // Add smart filters
    const filterContainer = document.createElement('div');
    filterContainer.className = 'ledger-filters';
    filterContainer.style.cssText = 'display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap;';
    
    const filters = [
      { label: 'All', value: 'all', active: true },
      { label: 'Income', value: 'income', active: false },
      { label: 'Expenses', value: 'expense', active: false },
      { label: 'This Week', value: 'week', active: false },
      { label: 'This Month', value: 'month', active: false }
    ];

    filters.forEach(filter => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filter-chip' + (filter.active ? ' is-active' : '');
      btn.textContent = filter.label;
      btn.dataset.filter = filter.value;
      btn.style.cssText = 'padding: 0.4rem 0.8rem; border-radius: 999px; border: 1px solid #d1d5db; background: #fff; cursor: pointer; font-size: 0.875rem; transition: all 0.2s;';
      
      btn.addEventListener('click', () => {
        filterContainer.querySelectorAll('.filter-chip').forEach(b => {
          b.classList.remove('is-active');
          b.style.background = '#fff';
          b.style.color = '#111';
        });
        btn.classList.add('is-active');
        btn.style.background = '#1f1a36';
        btn.style.color = '#fff';
        applyLedgerFilter(filter.value);
      });
      
      filterContainer.appendChild(btn);
    });

    const modalPane = ledgerModal.querySelector('.modal-pane');
    if (modalPane) {
      modalPane.insertBefore(filterContainer, modalPane.firstChild);
    }

    // Export ledger functionality
    const exportBtn = ledgerModal.querySelector('[data-toast*="Ledger exported"]');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportLedgerToCSV);
    }
  }

  async function applyLedgerFilter(filterValue) {
    try {
      const response = await fetch('/api/entries', { credentials: 'same-origin' });
      const data = await response.json();
      
      if (!response.ok || !data.ok) return;
      
      let entries = data.entries || [];
      
      // Apply filter
      if (filterValue === 'income' || filterValue === 'expense') {
        entries = entries.filter(e => e.entry_type === filterValue);
      } else if (filterValue === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        entries = entries.filter(e => new Date(e.created_at) >= weekAgo);
      } else if (filterValue === 'month') {
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        entries = entries.filter(e => new Date(e.created_at) >= monthAgo);
      }
      
      updateModalLedgerTable(entries);
      
      if (window.ToastManager) {
        ToastManager.show(`Filter applied: ${filterValue}`, 'info');
      }
    } catch (error) {
      console.error('Filter error:', error);
    }
  }

  async function exportLedgerToCSV() {
    try {
      const response = await fetch('/api/entries', { credentials: 'same-origin' });
      const data = await response.json();
      
      if (!response.ok || !data.ok) {
        if (window.ToastManager) {
          ToastManager.show('Failed to export ledger', 'error');
        }
        return;
      }
      
      const entries = data.entries || [];
      
      if (entries.length === 0) {
        if (window.ToastManager) {
          ToastManager.show('No entries to export', 'info');
        }
        return;
      }
      
      // Build CSV content
      let csvContent = 'Date,Description,Type,Amount,Balance\n';
      let runningBalance = 0;
      
      entries.reverse().forEach(entry => {
        const amount = parseFloat(entry.amount) || 0;
        const isIncome = entry.entry_type === 'income';
        
        if (isIncome) {
          runningBalance += amount;
        } else {
          runningBalance -= amount;
        }
        
        const date = new Date(entry.created_at).toLocaleDateString('en-IN');
        const description = (entry.note || 'No description').replace(/,/g, ';');
        const type = entry.entry_type.charAt(0).toUpperCase() + entry.entry_type.slice(1);
        
        csvContent += `${date},"${description}",${type},${amount.toFixed(2)},${runningBalance.toFixed(2)}\n`;
      });
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `ledger_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      if (window.ToastManager) {
        ToastManager.show('Ledger exported successfully!', 'success');
      }
    } catch (error) {
      console.error('Export error:', error);
      if (window.ToastManager) {
        ToastManager.show('Export failed', 'error');
      }
    }
  }

  function formatLedgerDate(dateStr) {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr.replace(' ', 'T'));
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short',
      year: '2-digit'
    });
  }

  // -------------------------
  // Billing Snapshot Functions
  // -------------------------
  async function loadBillingSnapshot(range = 'week') {
    try {
      console.log('Loading billing snapshot for range:', range);
      const response = await fetch(`/api/billing/snapshot?range=${range}`, { credentials: 'same-origin' });
      const data = await response.json();

      console.log('Billing snapshot response:', data);

      if (!response.ok || !data.ok) {
        console.error('Failed to load billing snapshot');
        return;
      }

      // Update billing summary metrics
      if (data.snapshot) {
        const snapshot = data.snapshot;
        console.log('Snapshot data:', snapshot);
        
        // Update collections total
        const billingTotal = document.querySelector('.billing-total');
        if (billingTotal) {
          const collections = snapshot.total_collections || 0;
          billingTotal.textContent = '₹' + formatCurrency(collections);
          console.log('Updated billing total to:', collections);
        }

        // Update individual metrics - iterate through cards
        const billingCards = Array.from(document.querySelectorAll('.billing-card'));
        
        billingCards.forEach((card) => {
          const h3 = card.querySelector('h3');
          const amountEl = card.querySelector('.billing-amount');
          
          if (!h3 || !amountEl) return;
          
          const title = h3.textContent.trim().toLowerCase();
          
          if (title.includes('payments received')) {
            const amount = snapshot.payments_received || 0;
            amountEl.textContent = '₹' + formatCurrency(amount);
            console.log('Updated payments received:', amount);
          } else if (title.includes('payments requested')) {
            const amount = snapshot.total_payables || 0;
            amountEl.textContent = '₹' + formatCurrency(amount);
            console.log('Updated payments requested:', amount);
          } else if (title.includes('outstanding')) {
            const amount = snapshot.due_receivables || 0;
            amountEl.textContent = '₹' + formatCurrency(amount);
            console.log('Updated outstanding:', amount);
          }
        });
      }

    } catch (error) {
      console.error('Error loading billing snapshot:', error);
    }
  }

  function formatCurrency(amount) {
    if (!amount) return '0';
    if (amount >= 100000) {
      return (amount / 100000).toFixed(1) + 'L';
    }
    return amount.toLocaleString('en-IN');
  }

  async function loadScheduleData() {
    try {
      console.log('Loading schedule data...');
      const response = await fetch('/api/schedule', { credentials: 'same-origin' });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        console.error('Failed to load schedule');
        return;
      }

      if (data.schedule && Array.isArray(data.schedule)) {
        const scheduleGrid = document.querySelector('.schedule-grid');
        if (!scheduleGrid) return;

        // Clear existing columns
        scheduleGrid.innerHTML = '';

        // Build schedule columns from data
        data.schedule.forEach((dayData) => {
          const column = document.createElement('article');
          column.className = 'schedule-column';
          column.setAttribute('role', 'listitem');

          const header = document.createElement('header');
          header.innerHTML = `<span class="day">${dayData.day}</span><span class="date">${dayData.date}</span>`;
          column.appendChild(header);

          // Add schedule cards for this day
          if (dayData.items && Array.isArray(dayData.items)) {
            dayData.items.forEach((item) => {
              const card = document.createElement('div');
              card.className = `schedule-card${item.type === 'compliance' ? ' long' : ''}`;
              card.setAttribute('data-kind', item.type);
              card.setAttribute('data-schedule-id', item.id);

              const typeClass = item.type === 'compliance' ? 'badge-compliance' : 
                               item.type === 'meeting' ? 'badge-meeting' : '';

              card.innerHTML = `
                <p class="schedule-title">${item.title}</p>
                <p class="schedule-meta">${item.time} · ${item.location}</p>
                <span class="schedule-badge ${typeClass}">${item.type.charAt(0).toUpperCase() + item.type.slice(1)}</span>
                <button type="button" class="schedule-delete-btn" data-schedule-id="${item.id}" aria-label="Delete event" style="position: absolute; top: 8px; right: 8px; background: none; border: none; color: #999; cursor: pointer; font-size: 18px;">×</button>
              `;
              card.style.position = 'relative';
              column.appendChild(card);
            });
          }

          scheduleGrid.appendChild(column);
        });

        // Add delete event listeners
        document.querySelectorAll('.schedule-delete-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const scheduleId = btn.dataset.scheduleId;
            await deleteScheduleItem(scheduleId);
          });
        });

        console.log('Schedule data loaded successfully');
      }
    } catch (error) {
      console.error('Error loading schedule data:', error);
    }
  }

  async function deleteScheduleItem(scheduleId) {
    if (!confirm('Delete this event?')) return;

    try {
      const response = await fetch(`/api/schedule/${scheduleId}`, {
        method: 'DELETE',
        credentials: 'same-origin'
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Failed to delete schedule item');
        if (window.ToastManager) {
          ToastManager.show('Failed to delete event', 'error');
        }
        return;
      }

      // Reload schedule
      loadScheduleData();
      
      if (window.ToastManager) {
        ToastManager.show('Event deleted', 'success');
      }
    } catch (error) {
      console.error('Error deleting schedule item:', error);
      if (window.ToastManager) {
        ToastManager.show('Error deleting event', 'error');
      }
    }
  }

  function initAddScheduleButton() {
    const addBtn = document.getElementById('addScheduleBtn');
    const modal = document.getElementById('addScheduleModal');
    const form = document.getElementById('addScheduleForm');
    const closeBtn = modal?.querySelector('[data-modal-close]');
    const overlay = modal?.querySelector('.modal-overlay');

    if (!addBtn || !modal) return;

    // Open modal
    addBtn.addEventListener('click', () => {
      // Set date to today by default
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('eventDate').value = today;
      
      modal.style.display = 'flex';
      modal.setAttribute('aria-hidden', 'false');
    });

    // Close modal
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
      });
    }

    if (overlay) {
      overlay.addEventListener('click', () => {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
      });
    }

    // Handle form submission
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
          title: document.getElementById('eventTitle').value,
          schedule_date: document.getElementById('eventDate').value,
          schedule_time: document.getElementById('eventTime').value,
          schedule_type: document.getElementById('eventType').value,
          location: document.getElementById('eventLocation').value
        };

        try {
          const response = await fetch('/api/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(formData)
          });

          const data = await response.json();

          if (!response.ok) {
            console.error('Failed to add schedule item');
            if (window.ToastManager) {
              ToastManager.show('Failed to add event', 'error');
            }
            return;
          }

          // Close modal and reload
          modal.style.display = 'none';
          modal.setAttribute('aria-hidden', 'true');
          form.reset();
          loadScheduleData();

          if (window.ToastManager) {
            ToastManager.show('Event added successfully!', 'success');
          }
        } catch (error) {
          console.error('Error adding schedule item:', error);
          if (window.ToastManager) {
            ToastManager.show('Error adding event', 'error');
          }
        }
      });
    }
  }

  function initGreetingAndUser() {
    // Fetch current user
    fetch('/api/me', { credentials: 'same-origin' })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.user) {
          const headline = document.querySelector('.headline');
          if (headline) {
            headline.textContent = `Namaste, ${data.user.username}!`;
          }
        }
      })
      .catch(() => {
        // Fallback: keep default text
      });

    // Update greeting based on time
    function updateGreeting() {
      const hour = new Date().getHours();
      const eyebrow = document.querySelector('.eyebrow');
      if (!eyebrow) return;

      if (hour < 12) {
        eyebrow.textContent = 'Good morning';
      } else if (hour < 18) {
        eyebrow.textContent = 'Good afternoon';
      } else {
        eyebrow.textContent = 'Good evening';
      }
    }

    updateGreeting();
    // Update greeting every minute
    setInterval(updateGreeting, 60000);
  }

  function initOnboardingWizard() {
    const modal = document.getElementById('onboardingModal');
    if (!modal) return;

    const wizardSteps = Array.from(modal.querySelectorAll('.wizard-step'));
    const panels = Array.from(modal.querySelectorAll('.wizard-panel'));

    const progressLabels = {
      profile: document.querySelector('[data-progress-label="profile"]'),
      catalog: document.querySelector('[data-progress-label="catalog"]'),
      inventory: document.querySelector('[data-progress-label="inventory"]'),
      integrations: document.querySelector('[data-progress-label="integrations"]'),
    };

    const progressFills = {
      profile: document.querySelector('[data-progress-fill="profile"]'),
      catalog: document.querySelector('[data-progress-fill="catalog"]'),
      inventory: document.querySelector('[data-progress-fill="inventory"]'),
      integrations: document.querySelector('[data-progress-fill="integrations"]'),
    };

    const totalEl = document.querySelector('[data-progress-total]');

    const completion = {
      profile: 0,
      catalog: 0,
      inventory: 0,
      integrations: 0,
    };

    // Load progress from backend
    async function loadProgress() {
      try {
        const response = await fetch('/api/profile');
        if (response.ok) {
          const data = await response.json();
          if (data.ok && data.profile) {
            completion.profile = data.profile.profile_completion_pct || 0;
            completion.catalog = data.profile.catalog_completion_pct || 0;
            completion.inventory = data.profile.inventory_completion_pct || 0;
            completion.integrations = data.profile.integrations_completion_pct || 0;

            // Populate form fields if data exists
            const businessNameInput = document.getElementById('businessName');
            const gstinInput = document.getElementById('gstin');
            const businessTypeSelect = document.getElementById('businessType');

            if (businessNameInput && data.profile.business_name) {
              businessNameInput.value = data.profile.business_name;
            }
            if (gstinInput && data.profile.gstin) {
              gstinInput.value = data.profile.gstin;
            }
            if (businessTypeSelect && data.profile.business_type) {
              businessTypeSelect.value = data.profile.business_type;
            }

            updateProgressDisplay();
          }
        }
      } catch (error) {
        console.error('Failed to load progress:', error);
      }
    }

    const minStepPercent = {
      profile: 45,
      catalog: 25,
      inventory: 30,
      integrations: 20,
    };

    const updateProgressDisplay = () => {
      // Calculate overall completion based on profile, catalog, and inventory only
      // Integrations is optional and doesn't count toward main setup
      const mainSteps = ['profile', 'catalog', 'inventory'];
      const avg = Math.round(
        mainSteps.reduce((sum, key) => sum + (completion[key] || 0), 0) / mainSteps.length
      );
      if (totalEl) totalEl.textContent = `${avg}%`;

      Object.entries(progressFills).forEach(([key, el]) => {
        if (!el) return;
        const pct = Math.min(100, completion[key]);
        el.style.transform = `scaleX(${pct / 100})`;
        const bar = el.parentElement;
        if (bar) bar.setAttribute('aria-valuenow', String(pct));
      });

      Object.entries(progressLabels).forEach(([key, label]) => {
        if (!label) return;
        const pct = Math.min(100, completion[key]);
        label.textContent = pct >= 95 ? 'Done' : pct >= 40 ? 'In progress' : pct > 0 ? 'Started' : 'Missing';
      });
    };

    const showStep = (step) => {
      wizardSteps.forEach((button) => {
        const isActive = button.dataset.step === step;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-selected', String(isActive));
      });

      panels.forEach((panel) => {
        const match = panel.id === `step-${step}`;
        panel.classList.toggle('is-hidden', !match);
        panel.setAttribute('aria-hidden', match ? 'false' : 'true');
      });
    };

    wizardSteps.forEach((button) => {
      button.addEventListener('click', () => showStep(button.dataset.step));
    });

    modal.querySelectorAll('[data-nav-step]').forEach((btn) => {
      btn.addEventListener('click', () => showStep(btn.dataset.navStep));
    });

    modal.querySelectorAll('[data-complete-step]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const step = btn.dataset.completeStep;
        if (!step) return;

        // Handle profile step specially - save to backend
        if (step === 'profile') {
          const businessNameInput = document.getElementById('businessName');
          const gstinInput = document.getElementById('gstin');
          const businessTypeSelect = document.getElementById('businessType');

          if (!businessNameInput || !gstinInput || !businessTypeSelect) return;

          const profileData = {
            business_name: businessNameInput.value.trim(),
            gstin: gstinInput.value.trim(),
            business_type: businessTypeSelect.value,
          };

          try {
            const response = await fetch('/api/profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(profileData),
            });

            if (response.ok) {
              const data = await response.json();
              if (data.ok && data.profile) {
                completion.profile = data.profile.profile_completion_pct || 0;
                completion.catalog = data.profile.catalog_completion_pct || 0;
                completion.inventory = data.profile.inventory_completion_pct || 0;
                completion.integrations = data.profile.integrations_completion_pct || 0;
                updateProgressDisplay();
              }
            } else {
              const error = await response.json();
              console.error('Failed to save profile:', error);
              return;
            }
          } catch (error) {
            console.error('Failed to save profile:', error);
            return;
          }
        } else {
          // For other steps, just bump the local state
          const current = completion[step] || 0;
          const bump = Math.max(minStepPercent[step] || 20, current + 30);
          completion[step] = Math.min(100, bump);
          updateProgressDisplay();
        }

        const currentIndex = wizardSteps.findIndex((item) => item.dataset.step === step);
        const next = wizardSteps[currentIndex + 1];
        if (next) showStep(next.dataset.step);
      });
    });

    document.querySelectorAll('[data-step-target]').forEach((trigger) => {
      trigger.addEventListener('click', () => {
        const targetStep = trigger.dataset.stepTarget;
        if (targetStep) showStep(targetStep);
      });
    });

    // Load progress on initialization
    loadProgress();

    // Template download functionality
    const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
    if (downloadTemplateBtn) {
      downloadTemplateBtn.addEventListener('click', () => {
        // Create CSV template
        const csvContent = [
          ['Product Name', 'SKU/Code', 'Category', 'Unit Price', 'Tax Rate (%)', 'HSN Code'],
          ['Example Product 1', 'SKU001', 'Groceries', '100', '5', '1001'],
          ['Example Product 2', 'SKU002', 'Beverages', '50', '12', '2202'],
          ['Example Product 3', 'SKU003', 'Snacks', '25', '18', '1905']
        ].map(row => row.join(',')).join('\n');

        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'ledgerly_product_catalog_template.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Show success toast
        if (window.ToastManager) {
          ToastManager.show('Template downloaded successfully!', 'success');
        }
      });
    }
  }

  function initBillingRangeButtons() {
    const billingBtns = document.querySelectorAll('.billing-btn[data-range]');
    billingBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        // Update active state
        billingBtns.forEach(b => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        
        // Load snapshot for selected range
        const range = btn.dataset.range;
        loadBillingSnapshot(range);
      });
    });
  }

  // ================================
  // Bill Upload Functionality
  // ================================
  function initBillUpload() {
    const dropZone = document.getElementById('uploadDropZone');
    const fileInput = document.getElementById('billFileInput');
    const processingEl = document.getElementById('uploadProcessing');
    const resultEl = document.getElementById('uploadResult');
    const resultAmount = document.getElementById('resultAmount');
    const resultViewLink = document.getElementById('resultViewLink');
    const ocrPreview = document.getElementById('ocrPreview');
    const ocrTextBox = document.getElementById('ocrTextBox');
    const uploadAnotherBtn = document.getElementById('uploadAnotherBtn');

    if (!dropZone || !fileInput) return;

    // Click to open file picker
    dropZone.addEventListener('click', () => fileInput.click());

    // Drag and drop handlers
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileUpload(files[0]);
      }
    });

    // File input change
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        handleFileUpload(fileInput.files[0]);
      }
    });

    // Upload another button
    if (uploadAnotherBtn) {
      uploadAnotherBtn.addEventListener('click', resetUploadUI);
    }

    function resetUploadUI() {
      dropZone.style.display = 'flex';
      processingEl.style.display = 'none';
      resultEl.style.display = 'none';
      ocrPreview.style.display = 'none';
      fileInput.value = '';
    }

    async function handleFileUpload(file) {
      // Validate file type
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isImage && !isPdf) {
        alert('Please upload an image or PDF file (PNG, JPG, WebP, PDF).');
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }

      // Show processing state
      dropZone.style.display = 'none';
      processingEl.style.display = 'flex';
      resultEl.style.display = 'none';
      ocrPreview.style.display = 'none';

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/bills/upload', {
          method: 'POST',
          credentials: 'same-origin',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || data.error || 'Upload failed');
        }

        // Show success result
        processingEl.style.display = 'none';
        resultEl.style.display = 'flex';

        // Display detected amount
        if (data.bill && data.bill.detected_amount) {
          resultAmount.textContent = `₹${data.bill.detected_amount.toLocaleString('en-IN')}`;
        } else {
          resultAmount.textContent = 'Amount not detected';
        }

        // Display confidence score
        const confidenceEl = document.getElementById('resultConfidence');
        if (confidenceEl && data.bill && typeof data.bill.confidence === 'number') {
          const pct = Math.round(data.bill.confidence * 100);
          let badgeClass = 'confidence-high';
          if (pct < 60) badgeClass = 'confidence-low';
          else if (pct < 80) badgeClass = 'confidence-medium';
          
          confidenceEl.innerHTML = `<span class="confidence-badge ${badgeClass}">${pct}% confidence</span>`;
          confidenceEl.style.display = 'block';
        } else if (confidenceEl) {
          confidenceEl.style.display = 'none';
        }

        // Show link to uploaded file (local path)
        if (resultViewLink && data.bill && data.bill.s3_url) {
          resultViewLink.href = data.bill.s3_url;
          resultViewLink.style.display = 'inline-flex';
        }

        // Show OCR text preview
        if (data.bill && data.bill.ocr_text) {
          ocrTextBox.textContent = data.bill.ocr_text;
          ocrPreview.style.display = 'block';
        }

        // Show toast notification
        if (window.ToastManager) {
          ToastManager.show('Bill uploaded and processed successfully!', 'success');
        }

      } catch (error) {
        console.error('Upload error:', error);
        processingEl.style.display = 'none';
        dropZone.style.display = 'flex';
        
        if (window.ToastManager) {
          ToastManager.show(`Upload failed: ${error.message}`, 'error');
        } else {
          alert(`Upload failed: ${error.message}`);
        }
      }
    }
  }

  // Initialize bill upload when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    initBillUpload();
  });
})();
