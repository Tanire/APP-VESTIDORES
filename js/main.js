async function checkAutoSync() {
  const token = localStorage.getItem('gh_token');
  const gistId = localStorage.getItem('gh_gist_id');

  const indicator = document.getElementById('sync-indicator');

  if (!token || !gistId || typeof SyncService === 'undefined') {
    if (indicator) {
      indicator.innerHTML = '<span style="color: #9CA3AF;">●</span> Desconectado';
      // Optional: Make it clickable or just informative
    }
    return;
  }

  if (indicator) {
    indicator.innerHTML = '<span style="color: #F59E0B;">●</span> Sincronizando...';
  }

  // Smart Sync on Load
  try {
    const success = await SyncService.syncWithCloud(token, gistId);

    if (indicator) {
      if (success) {
        indicator.innerHTML = '<span style="color: #10B981;">●</span> En línea';
        setTimeout(() => { indicator.style.opacity = '0.7'; }, 2000);
      } else {
        indicator.innerHTML = '<span style="color: #EF4444;">●</span> Error Sync';
      }
    }

    if (success) {
      window.dispatchEvent(new Event('storage-updated'));
    }
  } catch (e) {
    console.error("AutoSync Error:", e);
    if (indicator) indicator.innerHTML = '<span style="color: #EF4444;">●</span> Error';
  }
}

function navigateTo(page) {
  window.location.href = page;
}



document.addEventListener('DOMContentLoaded', () => {


  // Check for Daily Bills
  if (typeof NotificationSystem !== 'undefined' && typeof StorageService !== 'undefined') {
    NotificationSystem.checkDailyBills(StorageService.getRecurringBills());
  }

  // Check User Profile
  const user = localStorage.getItem('user_profile');
  if (!user) {
    setTimeout(() => {
      const name = prompt("¡Bienvenido! ¿Cómo te llamas? (Para saber quién apunta las cosas)");
      if (name && name.trim()) {
        localStorage.setItem('user_profile', name.trim());
        location.reload(); // Reload to apply changes if any (or just proceed)
      }
    }, 500);
  }

  // Costum Photo Logic
  const customPhoto = localStorage.getItem('family_photo_custom');
  if (customPhoto) {
    const img = document.querySelector('.family-photo');
    if (img) img.src = customPhoto;
  }

  // Settings Page Logic
  const photoInput = document.getElementById('photo-upload');
  const resetPhotoBtn = document.getElementById('reset-photo-btn');

  if (photoInput) {
    photoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Resize to max 300x300
          const maxSize = 300;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          const base64 = canvas.toDataURL('image/jpeg', 0.8);
          localStorage.setItem('family_photo_custom', base64);
          alert('¡Foto actualizada!');
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  if (resetPhotoBtn) {
    resetPhotoBtn.addEventListener('click', () => {
      if (confirm('¿Volver a la foto original?')) {
        localStorage.removeItem('family_photo_custom');
        window.location.reload();
      }
    });
  }

  // Inject PROMINENT Indicator if not exists
  if (!document.getElementById('sync-indicator')) {
    const div = document.createElement('div');
    div.id = 'sync-indicator';
    // Bottom center pill styling
    div.className = 'sync-indicator';
    // Default text 
    div.innerHTML = '<span style="color: #9CA3AF;">●</span> Iniciando...';

    // Add click listener to go to settings if disconnected
    div.addEventListener('click', () => {
      const txt = div.innerText;
      if (txt.includes('Desconectado') || txt.includes('Error')) {
        navigateTo('settings.html');
      }
    });

    document.body.appendChild(div);
  }

  // Wait a bit to ensure SyncService is loaded
  setTimeout(checkAutoSync, 1000);
});
