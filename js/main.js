// Manage admin security code session on page load
if (sessionStorage.getItem('navigating_internally') === 'true') {
  sessionStorage.removeItem('navigating_internally'); // Reset flag for next action
} else {
  // Fresh entry or external launch, enforce read-only startup
  if (localStorage.getItem('security_code') === '250925') {
    localStorage.removeItem('security_code');
  }
}

// Clear admin mode when exiting/leaving the app (visibility hidden, pagehide)
function clearAdminMode() {
  if (sessionStorage.getItem('navigating_internally') === 'true') {
    return; // Keep the code, navigating internally
  }
  if (localStorage.getItem('security_code') === '250925') {
    localStorage.removeItem('security_code');
    window.dispatchEvent(new Event("storage-updated"));
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    clearAdminMode();
  }
});

window.addEventListener('pagehide', clearAdminMode);

const APP_VERSION = 'v0.6.3';
const CHANGELOG = [
  "Fotos del Manto Públicas: Ahora las fotos de los vestidores son visibles en el manto para todos los usuarios sin necesidad de contraseña.",
  "Instalación PWA Mejorada: Iconos optimizados en PNG y configuración de manifest ajustada para facilitar la instalación nativa como aplicación en Android.",
  "Acceso de Instalación Directa: Nueva sección y botón 'Instalar Aplicación' añadidos en la página de Ajustes.",
  "Seguridad y Privacidad: Se mantiene el cifrado en cliente para datos personales sensibles (DNI, Teléfono, Email, Domicilio) dejando las fotos en plano para acceso público."
];

// PWA installation prompt logic (root listener to capture it early)
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.deferredPrompt = e;
  const installCard = document.getElementById('pwa-install-card');
  if (installCard) {
    installCard.style.display = 'block';
  }
});


function checkAppUpdate() {
  const currentVer = localStorage.getItem('app_version');
  if (currentVer !== APP_VERSION) {
    const versionText = document.getElementById('changelog-version-text');
    const detailsContainer = document.getElementById('changelog-details');
    const modal = document.getElementById('changelog-modal');
    if (versionText && detailsContainer && modal) {
      versionText.textContent = APP_VERSION;
      let html = '<ul style="padding-left: 1.2rem; margin: 0;">';
      CHANGELOG.forEach(item => {
        html += `<li style="margin-bottom: 0.5rem;">${item}</li>`;
      });
      html += '</ul>';
      detailsContainer.innerHTML = html;
      modal.style.display = 'grid';
    }
    localStorage.setItem('app_version', APP_VERSION);
  }
}

function closeChangelogModal() {
  const modal = document.getElementById('changelog-modal');
  if (modal) modal.style.display = 'none';
}

window.addEventListener('load', () => {
  checkAppUpdate();
});

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
  sessionStorage.setItem('navigating_internally', 'true');
  window.location.href = page;
}

function showSection(sectionId) {
  // Hide main menu
  document.getElementById("main-menu").style.display = "none";

  // Hide all sections just in case
  document.getElementById("ofrenda-section").style.display = "none";
  document.getElementById("vestidores-section").style.display = "none";
  document.getElementById("vestidores-list-view").style.display = "none";
  const posView = document.getElementById("vestidores-posiciones-view");
  if (posView) posView.style.display = "none";

  // Show requested section
  const section = document.getElementById(sectionId);
  if (section) {
    section.style.display = "block";
    
    // Auto-render photo folders on section open (v0.4.4)
    if (sectionId === 'ofrenda-section' && typeof renderOfrendaFolders !== 'undefined') {
      renderOfrendaFolders();
    }
  }
}

function showMainMenu() {
  // Hide all sections
  document.getElementById("ofrenda-section").style.display = "none";
  document.getElementById("vestidores-section").style.display = "none";
  document.getElementById("vestidores-list-view").style.display = "none";
  const posView = document.getElementById("vestidores-posiciones-view");
  if (posView) posView.style.display = "none";

  // Show main menu
  document.getElementById("main-menu").style.display = "grid"; // Restore grid display
}

document.addEventListener('DOMContentLoaded', async () => {

  // If PWA installation prompt arrived before DOMContentLoaded
  if (window.deferredPrompt) {
    const installCard = document.getElementById('pwa-install-card');
    if (installCard) {
      installCard.style.display = 'block';
    }
  }

  // Bind installation button click
  const installBtn = document.getElementById('pwa-install-btn');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      const promptEvent = window.deferredPrompt;
      if (!promptEvent) return;
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      console.log(`PWA install prompt outcome: ${outcome}`);
      window.deferredPrompt = null;
      const installCard = document.getElementById('pwa-install-card');
      if (installCard) {
        installCard.style.display = 'none';
      }
    });
  }

  // Initialize Storage Service (IndexedDB load) first
  if (typeof StorageService !== "undefined" && StorageService.init) {
    await StorageService.init();
  }

  // Initialize App directly
  checkAutoSync();

  // Update footer version dynamically
  const footerVer = document.getElementById('app-version-footer');
  if (footerVer) {
    footerVer.textContent = `Versión ${APP_VERSION.replace('v', '')}`;
  }

  // Update settings page version dynamically
  const settingsVer = document.getElementById('settings-app-version');
  if (settingsVer) {
    settingsVer.textContent = APP_VERSION;
  }

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

  // ---- Security Code Logic (v0.4.3) ----
  const verifyCodeBtn = document.getElementById('verify-code-btn');
  const verificationInput = document.getElementById('verification-code-input');
  const codeFeedback = document.getElementById('code-feedback');

  function updateSecurityUI() {
    const savedCode = localStorage.getItem('security_code') || '';
    const isAdmin = savedCode === '250925';
    const exportBtn = document.getElementById('export-json-btn');
    const importBtn = document.getElementById('import-json-btn');

    if (verificationInput) {
      verificationInput.value = savedCode;
    }

    if (codeFeedback) {
      if (isAdmin) {
        codeFeedback.textContent = '¡Código verificado! Datos completos desbloqueados.';
        codeFeedback.style.color = '#10B981'; // Green
      } else if (savedCode) {
        codeFeedback.textContent = 'Código incorrecto. Los datos permanecen protegidos.';
        codeFeedback.style.color = '#EF4444'; // Red
      } else {
        codeFeedback.textContent = 'Datos protegidos (Solo lectura de nombres).';
        codeFeedback.style.color = '#F59E0B'; // Amber
      }
    }

    if (exportBtn) {
      exportBtn.disabled = !isAdmin;
      exportBtn.title = isAdmin ? '' : 'Solo el usuario administrador puede exportar la copia de seguridad.';
      if (!isAdmin) {
        exportBtn.classList.add('btn-disabled');
      } else {
        exportBtn.classList.remove('btn-disabled');
      }
    }

    if (importBtn) {
      importBtn.disabled = !isAdmin;
      importBtn.title = isAdmin ? '' : 'Solo el usuario administrador puede importar la copia de seguridad.';
      if (!isAdmin) {
        importBtn.classList.add('btn-disabled');
      } else {
        importBtn.classList.remove('btn-disabled');
      }
    }
  }

  // Initial Security UI Update
  updateSecurityUI();

  if (verifyCodeBtn && verificationInput && codeFeedback) {
    verifyCodeBtn.addEventListener('click', () => {
      const enteredCode = verificationInput.value.trim();
      localStorage.setItem('security_code', enteredCode);
      window.dispatchEvent(new Event("storage-updated"));
      
      if (enteredCode === '250925') {
        if (typeof Toast !== 'undefined') Toast.success('Acceso desbloqueado');
      } else if (enteredCode === '') {
        if (typeof Toast !== 'undefined') Toast.info('Código eliminado. Datos bloqueados.');
      } else {
        if (typeof Toast !== 'undefined') Toast.error('Código incorrecto');
      }
    });
  }

  // Wait a bit to ensure SyncService is loaded
  setTimeout(checkAutoSync, 1000);

  // --- Global Event Listeners ---
  window.addEventListener('storage-updated', () => {
      console.log('Storage updated, refreshing views...');
      updateSecurityUI();
      const listView = document.getElementById('vestidores-list-view');
      if (listView && listView.style.display !== 'none') {
          renderVestidoresList();
      }
      const posView = document.getElementById('vestidores-posiciones-view');
      if (posView && posView.style.display !== 'none') {
          renderPosiciones();
      }
  });
});
