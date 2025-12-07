import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ==========================================
// 1. CONFIGURACIÓN FIREBASE
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyAxsX_LUZHCHz6hFcg3xFhr6sl1Ir8UHJk",
    authDomain: "nostalgycore-7a492.firebaseapp.com",
    projectId: "nostalgycore-7a492",
    storageBucket: "nostalgycore-7a492.firebasestorage.app",
    messagingSenderId: "180701270980",
    appId: "1:180701270980:web:ed680a9dca504c971dca91",
    measurementId: "G-DELN14XPSR"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Persistencia Offline
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn("Persistencia fallida: Múltiples pestañas abiertas.");
    } else if (err.code == 'unimplemented') {
        console.warn("El navegador no soporta persistencia offline.");
    }
});

// ==========================================
// 2. CONFIGURACIÓN DE ESTILOS (CARRUSEL PRINCIPAL)
// ==========================================
const ESTILOS_CONFIG = {
    y2k: { titulo: "Y2K", claseTitulo: "title-y2k", imgBtn: "recursos/y2k.webp", productos: [] },
    frutiger: { titulo: "Frutiger Aero", claseTitulo: "title-frutiger", imgBtn: "recursos/frutiger.webp", productos: [] },
    cybercore: { titulo: "Cyber Core", claseTitulo: "title-cibercore", imgBtn: "recursos/cybercore.webp", productos: [] },
    oldweb: { titulo: "Old Web", claseTitulo: "title-oldweb", imgBtn: "recursos/oldweb.webp", productos: [] }
};

// Variables Globales
let estiloActual = null;
let filtroActual = 'wallpaper';
let swiperInstancia = null;     // Carrusel Principal
let vrSwiperInstancia = null;   // Carrusel VR

// ==========================================
// 3. CARGA DE DATOS (FIREBASE + CACHÉ)
// ==========================================
const q = query(collection(db, 'productos'), orderBy('createdAt', 'desc'));

onSnapshot(q, (snap) => {
    const productosArray = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Guardar Backup Local
    localStorage.setItem('productosCache', JSON.stringify(productosArray));
    
    procesarDatosEnConfig(productosArray); // Carrusel Principal
    renderVRExperiences(filtrarVR(productosArray)); // Sección VR

}, (error) => {
    console.log("Modo Offline:", error);
    const cache = localStorage.getItem('productosCache');
    if(cache) {
        const prods = JSON.parse(cache);
        procesarDatosEnConfig(prods);
        renderVRExperiences(filtrarVR(prods));
        mostrarNotificacion("MODO OFFLINE ACTIVADO");
    }
});

function procesarDatosEnConfig(lista) {
    Object.keys(ESTILOS_CONFIG).forEach(key => ESTILOS_CONFIG[key].productos = []);
    lista.forEach(p => {
        const estilo = (p.estilo || '').toLowerCase().replace(/\s/g, ''); 
        const key = Object.keys(ESTILOS_CONFIG).find(k => estilo.includes(k));
        if (key) ESTILOS_CONFIG[key].productos.push(p);
    });
    if(estiloActual) filtrarProductos(filtroActual);
}

function filtrarVR(lista) {
    return lista.filter(p => {
        const fmt = (p.formato || '').toLowerCase();
        return fmt.includes('3d') || fmt.includes('vr');
    });
}

// ==========================================
// 4. LÓGICA UI - CARRUSEL PRINCIPAL (Estilos)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    renderSelectorEstilos();
    renderTVButtons();
    actualizarVistaCarrito();
    
    // Eventos de botones estáticos
    const btnPagar = document.getElementById('pagar');
    if(btnPagar) btnPagar.addEventListener('click', procesarPagoYGenerarLinks);

    // FIX: Botón Vaciar Carrito (Evitar duplicados)
    const btnVaciar = document.getElementById('limpiar-carrito');
    if (btnVaciar) {
        const newBtn = btnVaciar.cloneNode(true);
        btnVaciar.parentNode.replaceChild(newBtn, btnVaciar);
        newBtn.addEventListener('click', window.vaciarCarritoCompleto);
    }
});

function renderSelectorEstilos() {
    const container = document.querySelector('#style-selector-ui .d-flex');
    if(!container) return;
    container.innerHTML = '';
    Object.keys(ESTILOS_CONFIG).forEach(key => {
        const conf = ESTILOS_CONFIG[key];
        container.innerHTML += `
            <div class="style-item text-center">
                <div class="style-circle-btn" onclick="window.seleccionarEstilo('${key}')">
                    <img src="${conf.imgBtn}" alt="${conf.titulo}">
                    <div class="style-label">${conf.titulo}</div>
                </div>
            </div>`;
    });
}

function renderTVButtons() {
    const wrapper = document.getElementById('tv-buttons-wrapper');
    if(!wrapper) return;
    wrapper.innerHTML = '';
    Object.keys(ESTILOS_CONFIG).forEach((key, idx) => {
        const btn = document.createElement('div');
        btn.className = 'tv-btn';
        btn.innerText = idx + 1; 
        btn.setAttribute('data-style', key);
        btn.onclick = () => window.seleccionarEstilo(key);
        wrapper.appendChild(btn);
    });
    const off = document.createElement('div');
    off.className = 'tv-btn power-off';
    off.innerText = "OFF";
    off.onclick = () => window.volverAEstilos();
    wrapper.appendChild(off);
}

window.seleccionarEstilo = function(key) {
    estiloActual = key;
    filtroActual = 'wallpaper';
    
    // UI Toggle
    document.getElementById('style-selector-ui').classList.add('d-none');
    document.getElementById('selector-bg')?.classList.add('d-none');
    document.getElementById('products-ui').classList.remove('d-none');
    document.getElementById('floating-cart-btn')?.classList.remove('d-none');
    document.getElementById('tv-controls-container')?.classList.remove('d-none');

    // Título
    const titulo = document.getElementById('style-title');
    if(titulo) {
        titulo.innerText = ESTILOS_CONFIG[key].titulo;
        titulo.className = 'display-5 fw-bold mb-3 ' + ESTILOS_CONFIG[key].claseTitulo;
    }

    // Botones activos
    document.querySelectorAll('.tv-btn').forEach(b => b.classList.toggle('channel-active', b.dataset.style === key));
    filtrarProductos('wallpaper');
};

window.volverAEstilos = function() {
    document.getElementById('style-selector-ui').classList.remove('d-none');
    document.getElementById('selector-bg')?.classList.remove('d-none');
    document.getElementById('products-ui').classList.add('d-none');
    document.getElementById('immersive-bg').style.backgroundImage = 'none';
    document.getElementById('floating-cart-btn')?.classList.add('d-none');
    document.getElementById('tv-controls-container')?.classList.add('d-none');
    estiloActual = null;
};

window.cambiarFondoManual = function(url) {
    const bg = document.getElementById('immersive-bg');
    if(bg && url) bg.style.backgroundImage = `url('${url}')`;
};

window.filtrarProductos = function(tipo) {
    filtroActual = tipo;
    if(!estiloActual) return;
    
    // UI Filtros
    document.querySelectorAll('.filter-pill').forEach(b => {
        b.classList.toggle('active', b.getAttribute('onclick').includes(tipo));
    });

    const items = ESTILOS_CONFIG[estiloActual].productos.filter(p => 
        (p.formato || '').toLowerCase().includes(tipo)
    );

    const wrapper = document.getElementById('swiper-wrapper-products');
    wrapper.innerHTML = '';

    if(items.length === 0) {
        wrapper.innerHTML = `<div class="text-white p-3 pixel-font">NO DATA: ${tipo.toUpperCase()}</div>`;
        document.getElementById('immersive-bg').style.backgroundImage = 'none';
    } else {
        items.forEach(p => {
            const img = p.imagenUrl || 'recursos/logoNC.webp'; 
            wrapper.innerHTML += `
                <div class="swiper-slide">
                    <div class="cyber-card h-100 d-flex flex-column" onclick="window.cambiarFondoManual('${img}')">
                        <div class="cyber-img-box" onclick="window.verImagenGrande('${img}'); event.stopPropagation();">
                            <img src="${img}" alt="${p.nombre}">
                        </div>
                        <div class="cyber-body p-3 flex-grow-1">
                            <h5 class="text-white mb-2 pixel-font" style="font-size:0.7rem;">${p.nombre}</h5>
                            <div class="d-flex justify-content-between mb-2">
                                <span class="cyber-tag">${p.estilo}</span>
                                <span class="small text-info">&lt;${p.formato}&gt;</span>
                            </div>
                            <div class="mt-auto pt-3 border-top border-primary d-flex justify-content-between align-items-center">
                                <div class="cyber-price">$${p.precio}</div>
                                <button class="btn-cyber-add" onclick="window.agregarAlCarrito('${p.id}'); event.stopPropagation();">COMPRAR</button>
                            </div>
                        </div>
                    </div>
                </div>`;
        });
    }

    if(swiperInstancia) swiperInstancia.destroy();
    swiperInstancia = new Swiper(".myProductSwiper", {
        grabCursor: true,
        slidesPerView: 1.1, spaceBetween: 20,
        breakpoints: { 640: { slidesPerView: 2.1 }, 1024: { slidesPerView: 3.2 } },
        navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" },
        on: { slideChange: function() { cambiarFondoDinamico(this.activeIndex, items); } }
    });
    if(items.length > 0) cambiarFondoDinamico(0, items);
};

function cambiarFondoDinamico(idx, items) {
    if(items[idx]) window.cambiarFondoManual(items[idx].imagenUrl);
}

// ==========================================
// 5. RENDERIZADO SECCIÓN VR (NUEVO DISEÑO)
// ==========================================
function renderVRExperiences(productos) {
    const wrapper = document.getElementById('vr-swiper-wrapper');
    if(!wrapper) return;
    wrapper.innerHTML = '';
    
    if(productos.length === 0) {
        wrapper.innerHTML = `<div class="text-center text-white pixel-font">NO DATA</div>`; 
        return;
    }

    // 1. Crear Tarjetas Compactas
    productos.forEach(p => {
        wrapper.innerHTML += `
            <div class="swiper-slide">
                <div class="y2k-card-compact">
                    <div class="y2k-header-bar">
                        <span class="y2k-pill">VR</span>
                    </div>
                    
                    <h3 class="y2k-title">${p.nombre}</h3>
                    <p class="y2k-desc">${p.descripcion || 'Experiencia inmersiva.'}</p>
                    
                    <div class="y2k-price-row">
                        <span class="fw-bold fs-5 text-dark" style="font-family: 'Sora'">$${p.precio}</span>
                        <button class="btn-y2k-go" onclick="window.agregarAlCarrito('${p.id}')">
                            COMPRAR >
                        </button>
                    </div>
                </div>
            </div>`;
    });

    // 2. Iniciar Swiper VR + Cambio de Fondo
    if(vrSwiperInstancia) vrSwiperInstancia.destroy();
    
    vrSwiperInstancia = new Swiper(".vrSwiper", {
        effect: "slide",
        speed: 600,
        slidesPerView: 1,
        spaceBetween: 20,
        loop: true,
        navigation: { nextEl: ".next-btn", prevEl: ".prev-btn" },
        pagination: { el: ".vr-pagination", clickable: true },
        on: {
            init: function() { actualizarFondoVR(this.realIndex, productos); },
            slideChange: function () { actualizarFondoVR(this.realIndex, productos); }
        }
    });
}

function actualizarFondoVR(index, productos) {
    const bgElement = document.getElementById('vr-dynamic-bg');
    if (bgElement && productos[index]) {
        const imgUrl = productos[index].imagenUrl || 'recursos/fondo2.webp';
        bgElement.style.backgroundImage = `url('${imgUrl}')`;
    }
}

// ==========================================
// 6. CARRITO Y NOTIFICACIONES
// ==========================================
window.agregarAlCarrito = function(id) {
    // 1. Obtener base de datos de productos (Cache)
    const cache = localStorage.getItem('productosCache');
    if(!cache) return;
    const todos = JSON.parse(cache);
    
    // 2. Encontrar el producto que el usuario quiere
    const prod = todos.find(p => p.id === id);
    if (!prod) return;

    // 3. Obtener estado actual del carrito
    let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    
    // 4. VERIFICACIÓN DE DUPLICADOS
    const existe = carrito.find(item => item.id === id);
    
    if (existe) {
        mostrarNotificacion("El producto ya está en tu lista.", "error");
        return; // <--- AQUÍ SE DETIENE EL PROCESO
    }

    // 5. Si no existe, lo agregamos (Cantidad siempre será 1)
    carrito.push({ ...prod, cantidad: 1 });

    // 6. Guardar y actualizar UI
    localStorage.setItem("carrito", JSON.stringify(carrito));
    mostrarNotificacion(`AGREGADO: ${prod.nombre}`);
    actualizarVistaCarrito();
};

window.vaciarCarritoCompleto = function() {
    let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    if (carrito.length === 0) {
        mostrarNotificacion("El carrito ya está vacío");
        return;
    }
    if(confirm("> ¿CONFIRMAR BORRADO DE DATOS?")) {
        localStorage.removeItem("carrito");
        actualizarVistaCarrito();
        mostrarNotificacion("DATOS ELIMINADOS");
    }
};

window.eliminarItemCarrito = function(index) {
    let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    carrito.splice(index, 1);
    localStorage.setItem("carrito", JSON.stringify(carrito));
    actualizarVistaCarrito();
};

function actualizarVistaCarrito() {
    // 1. Obtener carrito (y asegurar que sea un array)
    let carrito = [];
    try {
        carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    } catch (e) {
        // Si hay error en los datos viejos, reseteamos
        localStorage.removeItem("carrito"); 
        carrito = [];
    }
    
    // 2. Actualizar Contadores (Badges)
    const count = carrito.length;
    const badge = document.getElementById("fab-cart-badge"); // El badge del botón flotante
    const cartBtn = document.getElementById("fab-cart-top"); // El botón flotante

    // Lógica del botoncito rojo flotante
    if (badge) {
        badge.innerText = count;
        if (count > 0) {
            badge.classList.remove('d-none');
        } else {
            badge.classList.add('d-none');
        }
    }
    
    // 3. Renderizar la Lista
    const ul = document.getElementById("lista-carrito");
    const totalSpan = document.getElementById("total");
    
    if(ul) {
        ul.innerHTML = '';
        let total = 0;

        // --- CASO A: CARRITO VACÍO ---
        if (carrito.length === 0) {
            // Diseño Cybercore para "Vacío" (Visible y estético)
            ul.innerHTML = `
                <div class="d-flex flex-column align-items-center justify-content-center h-100 mt-5 opacity-75">
                    <i class="bi bi-cart-x" style="font-size: 3rem; color: #4a76fd;"></i>
                    <p class="mt-3 pixel-font" style="font-size: 0.7rem; color: #fff;">
                        CARRITO VACÍO <span class="blink">_</span>
                    </p>
                </div>
            `;
            if(totalSpan) totalSpan.innerText = '0.00';
            return;
        }

        // --- CASO B: HAY PRODUCTOS ---
        carrito.forEach((item, index) => {
            // Aseguramos que precio sea número
            const precio = parseFloat(item.precio) || 0;
            total += precio;
            
            ul.innerHTML += `
                <li class="cyber-list-item d-flex justify-content-between align-items-center mb-2 p-2" 
                    style="border: 1px solid rgba(74, 118, 253, 0.3); background: rgba(0,0,0,0.2); border-radius: 8px;">
                    
                    <div class="d-flex align-items-center">
                        <img src="${item.imagenUrl || 'recursos/logoNC.webp'}" 
                             style="width:45px; height:45px; object-fit: cover; border: 1px solid #4a76fd; border-radius: 4px; margin-right: 10px;">
                        
                        <div>
                            <div class="pixel-font text-white" style="font-size: 0.7rem; max-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${item.nombre}
                            </div>
                            <div style="font-size: 0.6rem; color: #a6c1ff;">
                                &lt;${item.formato || 'DIGITAL'}&gt;
                            </div>
                        </div>
                    </div>

                    <div class="text-end">
                        <div style="color: #00ffaa; font-family: 'Sora'; font-weight: bold; font-size: 0.9rem;">
                            $${precio.toFixed(2)}
                        </div>
                        <button onclick="window.eliminarItemCarrito(${index})" 
                                class="btn btn-sm text-danger p-0 mt-1" 
                                style="font-size: 0.7rem; font-family: 'Press Start 2P'; border: none; background: transparent;">
                            [X]
                        </button>
                    </div>
                </li>`;
        });

        // Actualizar el texto del Total
        if(totalSpan) totalSpan.innerText = total.toFixed(2);
    }
}

/* ==========================================
   SISTEMA DE NOTIFICACIONES (MULTICOLOR)
   ========================================== */
function mostrarNotificacion(mensaje, tipo = 'success') {
    const toastEl = document.getElementById('liveToast');
    const toastBody = document.getElementById('toast-msg-body');
    const toastHeader = toastEl.querySelector('.toast-header');
    
    if(toastEl && toastBody && window.bootstrap) {
        
        // 1. CONFIGURACIÓN (SOLO COLORES E ICONOS)
        let color, icono, titulo;

        if (tipo === 'error') {
            color = '#ff3b3b'; // Rojo
            icono = 'bi-exclamation-triangle-fill';
            titulo = 'SYSTEM_ERROR';
        } else {
            color = '#00ffaa'; // Verde
            icono = 'bi-check-circle-fill';
            titulo = 'SYSTEM_MSG';
        }

        // 2. APLICAR COLORES (Borde y Sombra)
        toastEl.style.borderColor = color;
        toastEl.style.boxShadow = `0 0 20px ${color}40`;
        
        // Header
        if(toastHeader) {
            toastHeader.style.color = color;
            toastHeader.style.borderBottomColor = color;
            // Solo cambiamos el texto, la fuente la maneja el CSS
            const strongTag = toastHeader.querySelector('strong');
            if(strongTag) strongTag.innerText = `> ${titulo}`;
        }

        // 3. INYECTAR CONTENIDO (SIN ESTILOS DE FUENTE EN LÍNEA)
        // El CSS se encarga de que se vea bien
        toastBody.innerHTML = `
            <i class="bi ${icono}" style="color: ${color}; filter: drop-shadow(0 0 5px ${color});"></i>
            <div>${mensaje}</div>
        `;

        // 4. MOSTRAR
        const toast = new bootstrap.Toast(toastEl, { delay: 2000 }); // 2 segundos
        toastEl.onclick = () => toast.hide();
        toast.show();

    } else {
        alert(mensaje);
    }
}

// ==========================================
// 7. LÓGICA DE PAGO Y DESCARGA (NUEVO)
// ==========================================

// FUNCIÓN A: Abre el Modal de Datos (Paso intermedio)
window.procesarPagoYGenerarLinks = function() {
    let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    
    // Si está vacío, error
    if(carrito.length === 0) return mostrarNotificacion("Carrito vacío", "error");

    // 1. Calcular el total para mostrarlo en el modal azul
    const total = carrito.reduce((acc, item) => acc + parseFloat(item.precio), 0);
    const display = document.getElementById('checkout-total-display');
    if(display) display.innerText = `$${total.toFixed(2)}`;

    // 2. Cerrar la barra lateral del carrito (Offcanvas)
    const cartOffcanvas = document.getElementById('cartOffcanvas');
    if(cartOffcanvas) {
        const bsOffcanvas = bootstrap.Offcanvas.getInstance(cartOffcanvas);
        if(bsOffcanvas) bsOffcanvas.hide();
    }

    // 3. Abrir el Modal de la Pasarela de Pago
    const modalPago = new bootstrap.Modal(document.getElementById('modalPasarelaPago'));
    modalPago.show();
};

// FUNCIÓN B: Procesa el Pago, Simula Banco y Muestra Links (Paso Final)
window.confirmarPagoFinal = function() {
    // 1. Validar que el usuario escribió algo
    const emailInput = document.getElementById('input-email-checkout');
    const form = document.getElementById('payment-form');
    
    if(!form.checkValidity()) {
        form.reportValidity(); // Muestra los mensajes de error del navegador
        return;
    }

    // 2. Efecto visual de "Cargando..." en el botón
    const btnPay = document.querySelector('#modalPasarelaPago .btn-cyber-chrome');
    const btnText = document.getElementById('btn-pay-text');
    const originalText = btnText.innerText;
    
    btnText.innerText = "PROCESANDO...";
    btnPay.style.opacity = "0.7";
    btnPay.style.pointerEvents = "none"; // Evitar doble clic

    // 3. SIMULACIÓN DE ESPERA (2 Segundos)
    setTimeout(() => {
        // --- AQUI OCURRE EL "ÉXITO" ---

        // A. Ocultar modal de pago
        const modalPagoEl = document.getElementById('modalPasarelaPago');
        const modalPago = bootstrap.Modal.getInstance(modalPagoEl);
        modalPago.hide();

        // B. Preparar la lista de links para el modal de éxito
        const containerLinks = document.getElementById('lista-links-compra');
        let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
        containerLinks.innerHTML = '';

        carrito.forEach(prod => {
            const link = prod.linkDescarga || '#'; 
            // Si el link es #, mostramos alerta, si no, abre nueva pestaña
            const linkValido = link !== '#' ? 'target="_blank"' : 'onclick="alert(\'Link no disponible\')"';
            
            const htmlItem = `
                <div class="download-item">
                    <div class="d-flex align-items-center">
                        <img src="${prod.imagenUrl || 'recursos/logoNC.webp'}" 
                             style="width:45px; height:45px; object-fit:cover; border:1px solid #4a76fd; margin-right:12px; border-radius: 4px;">
                        <div class="text-white small" style="font-family: 'Sora'; line-height: 1.2;">
                            <div style="color: #fff; font-weight: 600; font-size: 0.85rem;">${prod.nombre}</div>
                            <div style="color: #a6c1ff; font-size: 0.65rem; margin-top: 2px;">&lt;${prod.formato || 'DIGITAL'}&gt;</div>
                        </div>
                    </div>
                    <a href="${link}" ${linkValido} class="btn-download-link ms-3">
                        DESCARGAR <i class="bi bi-download"></i>
                    </a>
                </div>
            `;
            containerLinks.innerHTML += htmlItem;
        });

        // C. Mostrar notificación de correo
        mostrarNotificacion(`LINKS ENVIADOS A: ${emailInput.value}`);
        
        // D. Mostrar el Modal Final (Éxito)
        const modalExito = new bootstrap.Modal(document.getElementById('modalCompraExitosa'));
        modalExito.show();

        // E. Limpieza final (Borrar carrito y resetear formulario)
        localStorage.removeItem("carrito");
        actualizarVistaCarrito();
        
        // Restaurar botón para la próxima
        btnText.innerText = originalText;
        btnPay.style.opacity = "1";
        btnPay.style.pointerEvents = "all";
        form.reset();

    }, 2500); // Tiempo de espera: 2.5 segundos
};
// IMPORTANTE: Asegúrate de volver a asignar el evento click al botón de pagar
// Esto va dentro del DOMContentLoaded o donde asignas tus eventos
// EVENTOS: Asegurar que el botón del carrito llame a la nueva función
document.addEventListener('DOMContentLoaded', () => {
    // Botón "PROCESAR PAGO" del carrito lateral
    const btnPagar = document.getElementById('pagar');
    if(btnPagar) {
        // Clonamos para limpiar eventos viejos y evitar errores
        const newBtn = btnPagar.cloneNode(true);
        btnPagar.parentNode.replaceChild(newBtn, btnPagar);
        
        // Asignamos la función que abre el formulario
        newBtn.addEventListener('click', window.procesarPagoYGenerarLinks);
    }
});

window.verImagenGrande = function(url) {
    const el = document.getElementById('img-visor-src');
    if(el) {
        el.src = url;
        new bootstrap.Modal(document.getElementById('imageViewerModal')).show();
    }

};
