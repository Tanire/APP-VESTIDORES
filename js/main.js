async function checkAutoSync() {
  const token = localStorage.getItem("gh_token");
  const gistId = localStorage.getItem("gh_gist_id");

  const indicator = document.getElementById("sync-indicator");

  if (!token || !gistId || typeof SyncService === "undefined") {
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

  // Update Gist ID display in settings if present
  const gistDisplay = document.getElementById("gist-id-display");
  if (gistDisplay) gistDisplay.textContent = gistId.substring(0, 8) + "...";

  // Smart Sync on Load
  try {
    const result = await SyncService.syncWithCloud(token, gistId);
    // Support both old boolean return and new object return
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
        if (statusDisplay)
          statusDisplay.innerHTML = `<div style="color: var(--danger);">Error: ${errorMsg}</div>`;
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

  // Show main menu
  document.getElementById("main-menu").style.display = "grid"; // Restore grid display
}

document.addEventListener('DOMContentLoaded', () => {

  // --- AUTHENTICATION LOGIC ---
  const loginSection = document.getElementById('login-section');
  const protectedContent = document.getElementById('protected-content');
  const loginBtn = document.getElementById('login-btn');
  const tokenInput = document.getElementById('access-token-input');
  const gistIdInput = document.getElementById('gist-id-input');
  const loginError = document.getElementById('login-error');

  // Check if we have credentials
  const savedToken = localStorage.getItem('gh_token');
  const savedGistId = localStorage.getItem('gh_gist_id');

  if (savedToken && savedGistId) {
      // Auto-login
      showProtectedContent();
  } else {
      // Show login
      loginSection.style.display = 'flex';
      protectedContent.style.display = 'none';
  }

  function showProtectedContent() {
      loginSection.style.display = 'none';
      protectedContent.style.display = 'block';
      // Initialize App
      checkAutoSync();
  }

  if(loginBtn) {
      loginBtn.addEventListener('click', async () => {
          const token = tokenInput.value.trim();
          let gistId = gistIdInput.value.trim();

          if(token) {
              loginBtn.disabled = true;
              loginBtn.textContent = "Verificando...";
              
              if (!gistId) {
                  // Try to create Gist automatically
                  try {
                      if (typeof SyncService !== 'undefined') {
                          loginBtn.textContent = "Creando Nube...";
                          const newId = await SyncService.createGist(token);
                          if (newId) {
                              gistId = newId;
                              alert('¡Nube creada con éxito! Guardando credenciales...');
                          } else {
                               throw new Error("No se pudo crear el Gist.");
                          }
                      }
                  } catch (e) {
                      console.error(e);
                      alert("Error creando la base de datos automáticamente. Verifica que el token tenga permisos de 'gist'.");
                      loginBtn.disabled = false;
                      loginBtn.textContent = "Entrar";
                      return;
                  }
              }

              if (gistId) {
                  localStorage.setItem('gh_token', token);
                  localStorage.setItem('gh_gist_id', gistId);
                  showProtectedContent();
                  location.reload(); 
              } else {
                  loginError.style.display = 'block';
                  loginBtn.disabled = false;
                  loginBtn.textContent = "Entrar";
              }
          } else {
              loginError.style.display = 'block';
          }
      });
  }
  // --- END AUTH LOGIC ---

  // Check User Profile (Only if auth passed, but we handle that by visibility)
  const user = localStorage.getItem('user_profile');
  if (!user && localStorage.getItem('gh_token')) {
    // Only ask name if logged in
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

    // Add click listener to go to settings if disconnected
    div.addEventListener('click', () => {
       // Only navigate if visible
       if(protectedContent.style.display !== 'none') {
          navigateTo('settings.html');
       }
    });

    document.body.appendChild(div);
  }

  // ---- Settings Page Logic (v1.20 Clean) ----
  const tokenInputSettings = document.getElementById('gh-token');
  const gistIdInputSettings = document.getElementById('gh-gist-id');
  const saveConfigBtn = document.getElementById('save-config-btn');
  const manualSyncBtn = document.getElementById('manual-sync-btn');
  const syncFeedback = document.getElementById('sync-feedback');

  if (tokenInputSettings && gistIdInputSettings) {
    // Load saved
    tokenInputSettings.value = localStorage.getItem('gh_token') || '';
    gistIdInputSettings.value = localStorage.getItem('gh_gist_id') || '';

    saveConfigBtn.addEventListener('click', () => {
      const token = tokenInputSettings.value.trim();
      const gistId = gistIdInputSettings.value.trim();
      if (token) localStorage.setItem('gh_token', token);
      if (gistId) localStorage.setItem('gh_gist_id', gistId);
      alert('Credenciales guardadas. Recargando...');
      window.location.reload();
    });
  }

  if (manualSyncBtn) {
    manualSyncBtn.addEventListener('click', async () => {
      manualSyncBtn.disabled = true;
      manualSyncBtn.textContent = 'Sincronizando...';
      syncFeedback.textContent = '';

      await checkAutoSync();

      manualSyncBtn.disabled = false;
      manualSyncBtn.textContent = '🔄 Sincronizar Ahora';
      syncFeedback.textContent = 'Proceso finalizado.';
      syncFeedback.style.color = 'var(--text-muted)';
    });
  }

  // Wait a bit to ensure SyncService is loaded
  // Only sync if we are already logged in logic handled by checkAutoSync internal check but good to delay
  setTimeout(checkAutoSync, 1000);
});
