// Modal Management for Dashboard
(function() {
  let touchStartY = 0;
  let modalTouchTarget = null;

  document.addEventListener('DOMContentLoaded', () => {
    initModalHandlers();
  });

  function initModalHandlers() {
    // Event delegation for opening modals
    document.addEventListener('click', (e) => {
      const openBtn = e.target.closest('[data-modal-open], [data-modal-target]');
      if (openBtn) {
        e.preventDefault();
        const modalId = openBtn.dataset.modalOpen || openBtn.dataset.modalTarget;
        openModal(modalId);
      }

      // Handle navigation links that should open modals
      if (e.target.closest('a[href="#ledger"]')) {
        e.preventDefault();
        openModal('ledgerModal');
      }

      // Close modals on outside click
      if (e.target.classList.contains('modal') && e.target === e.currentTarget) {
        closeModal(e.target);
      }

      // Close button handler
      const closeBtn = e.target.closest('[data-modal-close]');
      if (closeBtn) {
        const modal = closeBtn.closest('.modal');
        if (modal) closeModal(modal);
      }
    }, false);

    // Touch handlers for mobile swipe-to-close
    document.addEventListener('touchstart', (e) => {
      const modal = e.target.closest('.modal');
      if (modal) {
        touchStartY = e.touches[0].clientY;
        modalTouchTarget = modal;
      }
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      if (modalTouchTarget && e.changedTouches.length > 0) {
        const touchEndY = e.changedTouches[0].clientY;
        const delta = touchEndY - touchStartY;
        // Close on swipe down (more than 60px)
        if (delta > 60) {
          closeModal(modalTouchTarget);
        }
      }
      modalTouchTarget = null;
      touchStartY = 0;
    }, { passive: true });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const openModals = document.querySelectorAll('.modal[aria-hidden="false"]');
        if (openModals.length > 0) {
          closeModal(openModals[openModals.length - 1]);
        }
      }
    }, false);
  }

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'flex';
      modal.setAttribute('aria-hidden', 'false');
      // Prevent body scroll on mobile/tablet
      document.body.style.overflow = 'hidden';

      // Reload ledger data when opening ledger modal
      if (modalId === 'ledgerModal') {
        const event = new CustomEvent('reload-ledger');
        window.dispatchEvent(event);
      }
    }
  }

  function closeModal(modal) {
    if (modal) {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
      // Restore body scroll
      document.body.style.overflow = '';
    }
  }
})();
