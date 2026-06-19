async function checkAutoSync() {
  const indicator = document.getElementById("sync-indicator");

  if (typeof SyncService === "undefined") {
    if (indicator) {
      indicator.innerHTML =
        '<span style="color: #9CA3AF;">●</span> Desconectado';
    }
    return;
  }

  if (indicator) {
    indicator.innerHTML =
      '<span style="color: #F59E0B;">●</span> Conectando...';
  }

  // Update repository path display in settings if elements exist
  const repoDisplay = document.getElementById("repo-display");
  if (repoDisplay) repoDisplay.textContent = "Tanire/APP-VESTIDORES";
  
  const fileDisplay = document.getElementById("file-display");
  if (fileDisplay) fileDisplay.textContent = "data/vestidores_data.json";

  // Smart Sync on Load
  try {
    const result = await SyncService.syncWithCloud();
    const success = typeof result === "boolean" ? result : result.success;
    const errorMsg = result.error || "Error desconocido";

    if (indicator) {
      if (success) {
        indicator.innerHTML = '<span style="color: #10B981;">●</span> En línea';
        setTimeout(() => {
          indicator.style.opacity = "0.7";
        }, 2000);

        const statusDisplay = document.getElementById("sync-status-display");
        if (statusDisplay) {
          statusDisplay.innerHTML = `
                <div style="font-weight: 600; font-size: 1.1rem; color: var(--success);">¡Sincronizado!</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">Última vez: ${new Date().toLocaleTimeString()}</div>
             `;
        }
      } else {
        indicator.innerHTML =
          '<span style="color: #EF4444;">●</span> Error Sync';
        const statusDisplay = document.getElementById("sync-status-display");
        if (statusDisplay) {
          statusDisplay.innerHTML = `<div style="color: var(--danger);">Error: ${errorMsg}</div>`;
        }
      }
    }

    if (success) {
      window.dispatchEvent(new Event("storage-updated"));
    }
  } catch (e) {
    console.error("AutoSync Error:", e);
    if (indicator)
      indicator.innerHTML =
        '<span style="color: #EF4444;">●</span> Error FATAL';
  }
}

// Navigation Logic
function navigateTo(page) {
  window.location.href = page;
}

function showSection(sectionId) {
  // Hide main menu
  document.getElementById("main-menu").style.display = "none";

  // Hide all sections just in case
  document.getElementById("ofrenda-section").style.display = "none";
  document.getElementById("vestidores-section").style.display = "none";
  document.getElementById("vestidores-list-view").style.display = "none";

  // Show requested section
  const section = document.getElementById(sectionId);
  if (section) {
    section.style.display = "block";
  }
}

function showMainMenu() {
  // Hide all sections
  document.getElementById("ofrenda-section").style.display = "none";
  document.getElementById("vestidores-section").style.display = "none";
  document.getElementById("vestidores-list-view").style.display = "none";

  // Show main menu
  document.getElementById("main-menu").style.display = "grid"; // Restore grid display
}

document.addEventListener('DOMContentLoaded', () => {

  // Initialize App directly
  checkAutoSync();

  // Check User Profile
  const user = localStorage.getItem('user_profile');
  if (!user) {
    setTimeout(() => {
      const name = prompt("¡Bienvenido! ¿Cómo te llamas? (Para saber quién apunta las cosas)");
      if (name && name.trim()) {
        localStorage.setItem('user_profile', name.trim());
        location.reload();
      }
    }, 500);
  }

  // Inject PROMINENT Indicator if not exists
  if (!document.getElementById('sync-indicator')) {
    const div = document.createElement('div');
    div.id = 'sync-indicator';
    div.className = 'sync-indicator';
    div.innerHTML = '<span style="color: #9CA3AF;">●</span> Iniciando...';

    // Add click listener to go to settings
    div.addEventListener('click', () => {
      navigateTo('settings.html');
    });

    document.body.appendChild(div);
  }

  // ---- Settings Page Logic (v1.20 Clean) ----
  const manualSyncBtn = document.getElementById('manual-sync-btn');
  const syncFeedback = document.getElementById('sync-feedback');

  if (manualSyncBtn) {
    manualSyncBtn.addEventListener('click', async () => {
      manualSyncBtn.disabled = true;
      manualSyncBtn.textContent = 'Sincronizando...';
      if (syncFeedback) syncFeedback.textContent = '';

      await checkAutoSync();

      manualSyncBtn.disabled = false;
      manualSyncBtn.textContent = '🔄 Sincronizar Ahora';
      if (syncFeedback) {
        syncFeedback.textContent = 'Proceso finalizado.';
        syncFeedback.style.color = 'var(--text-muted)';
      }
    });
  }

  // Wait a bit to ensure SyncService is loaded
  setTimeout(checkAutoSync, 1000);

  // --- Global Event Listeners ---
  window.addEventListener('storage-updated', () => {
      console.log('Storage updated, refreshing views...');
      if (document.getElementById('vestidores-list-view').style.display !== 'none') {
          renderVestidoresList();
      }
  });
});
