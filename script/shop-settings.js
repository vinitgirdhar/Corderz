// Shop Settings Modal Functionality
(function() {
  document.addEventListener('DOMContentLoaded', () => {
    initShopSettings();
  });

  function initShopSettings() {
    const settingsLink = document.getElementById('openShopSettings');
    const settingsModal = document.getElementById('shopSettingsModal');
    const settingsForm = document.getElementById('shopSettingsForm');
    const settingsStatus = document.getElementById('settingsStatus');

    if (!settingsLink || !settingsModal || !settingsForm) return;

    // Open settings modal
    settingsLink.addEventListener('click', (e) => {
      e.preventDefault();
      loadShopSettings();
      settingsModal.style.display = 'flex';
      settingsModal.setAttribute('aria-hidden', 'false');
    });

    // Close modal
    const closeBtn = settingsModal.querySelector('[data-modal-close]');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        settingsModal.style.display = 'none';
        settingsModal.setAttribute('aria-hidden', 'true');
      });
    }

    // Close on outside click
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        settingsModal.style.display = 'none';
        settingsModal.setAttribute('aria-hidden', 'true');
      }
    });

    // Handle form submission
    settingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveShopSettings();
    });
  }

  async function loadShopSettings() {
    try {
      const response = await fetch('/api/profile', { credentials: 'same-origin' });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        console.error('Failed to load shop settings');
        return;
      }

      const profile = data.profile || {};

      // Populate form fields
      document.getElementById('shopName').value = profile.business_name || '';
      document.getElementById('gstin').value = profile.gstin || '';
      document.getElementById('businessType').value = profile.business_type || '';
      document.getElementById('phoneNumber').value = profile.phone || '';
      document.getElementById('email').value = profile.email || '';
      document.getElementById('address').value = profile.address || '';

      // Hide status message
      const statusEl = document.getElementById('settingsStatus');
      if (statusEl) statusEl.style.display = 'none';
    } catch (error) {
      console.error('Error loading shop settings:', error);
      showSettingsStatus('Error loading settings', 'error');
    }
  }

  async function saveShopSettings() {
    const settingsForm = document.getElementById('shopSettingsForm');
    if (!settingsForm) return;

    const shopName = document.getElementById('shopName').value.trim();
    const gstin = document.getElementById('gstin').value.trim();
    const businessType = document.getElementById('businessType').value.trim();
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    const email = document.getElementById('email').value.trim();
    const address = document.getElementById('address').value.trim();

    // Validation
    if (!shopName) {
      showSettingsStatus('Shop name is required', 'error');
      return;
    }

    showSettingsStatus('Saving settings...', 'info');

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          business_name: shopName,
          gstin: gstin || null,
          business_type: businessType || null,
          phone: phoneNumber || null,
          address: address || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.message || data.error || 'Failed to save settings';
        showSettingsStatus(errorMsg, 'error');
        return;
      }

      showSettingsStatus('✓ Settings saved successfully!', 'success');
      
      // Close modal after 1.5 seconds
      setTimeout(() => {
        const modal = document.getElementById('shopSettingsModal');
        if (modal) {
          modal.style.display = 'none';
          modal.setAttribute('aria-hidden', 'true');
        }
      }, 1500);

      // Show toast if available
      if (window.ToastManager) {
        window.ToastManager.show('Shop settings updated successfully!', 'success');
      }
    } catch (error) {
      console.error('Error saving shop settings:', error);
      showSettingsStatus('Error saving settings. Please try again.', 'error');
    }
  }

  function showSettingsStatus(message, type) {
    const statusEl = document.getElementById('settingsStatus');
    if (!statusEl) return;

    statusEl.textContent = message;
    statusEl.style.display = 'block';
    statusEl.className = type === 'error' ? 'form-status error' : 
                         type === 'success' ? 'form-status success' : 
                         'form-status';

    // Color coding
    if (type === 'error') {
      statusEl.style.background = '#fee2e2';
      statusEl.style.color = '#dc2626';
    } else if (type === 'success') {
      statusEl.style.background = '#dcfce7';
      statusEl.style.color = '#16a34a';
    } else {
      statusEl.style.background = '#dbeafe';
      statusEl.style.color = '#1e40af';
    }
  }
})();
