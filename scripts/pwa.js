let deferredPrompt;

// 1. Registrar Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('SW: Sistema en línea', reg))
        .catch(err => console.error('SW: Error en sistema', err));
}

// 2. Lógica de instalación
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // YA NO CREAMOS EL ELEMENTO, SOLO LO BUSCAMOS
    const installBtn = document.getElementById('pwa-install-btn');
    
    if (installBtn) {
        // Mostramos el botón quitando la clase de ocultar de Bootstrap
        installBtn.classList.remove('d-none');
        // Aseguramos display flex para centrar el icono
        installBtn.style.display = 'flex'; 

        installBtn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`> USUARIO DECIDIÓ: ${outcome}`);
            deferredPrompt = null;
            // Ocultamos de nuevo
            installBtn.style.display = 'none';
        });
    }
});

window.addEventListener('appinstalled', () => {
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) installBtn.style.display = 'none';
    console.log('> SISTEMA INSTALADO CORRECTAMENTE');
});