document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('bookingForm');
    const btnReserva = document.querySelector('.btn_reserva');

    // --- LÓGICA PARA CERRAR EL MENÚ MÓVIL ---
    const checkbox = document.getElementById('open-menu');
    const navLinks = document.querySelectorAll('.nav__link');

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (checkbox) {
                checkbox.checked = false; // Cierra el menú al hacer clic en un enlace
            }
        });
    });

    // 1. Lógica del botón de navegación (Scroll suave)
    if (btnReserva) {
        btnReserva.addEventListener('click', () => {
            setTimeout(() => {
                const nombreInput = document.getElementById('nombre');
                if (nombreInput) nombreInput.focus();
            }, 500); 
        });
    }

    // 2. Lógica del envío del formulario
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault(); 

            // --- VALIDACIÓN DE PRIVACIDAD (RGPD) ---
            const checkboxPrivacidad = document.getElementById('privacidad');
            if (checkboxPrivacidad && !checkboxPrivacidad.checked) {
                alert("Debes aceptar la política de privacidad para poder confirmar la cita.");
                return;
            }

            // Obtención de valores
            const nombre = document.getElementById('nombre').value;
            const telefono = document.getElementById('telefono').value;
            const fecha = document.getElementById('fecha').value;
            const hora = document.getElementById('hora').value;

            // Validación estricta de horario adaptada a bloques (09:30 a 16:15 última cita)
            const [horas, minutos] = hora.split(':').map(Number);
            const minutosTotales = horas * 60 + minutos;
            const inicio = 9 * 60 + 30;
            const finLimite = 16 * 60 + 15;

            if (minutosTotales < inicio || minutosTotales > finLimite) {
                alert("Por favor, selecciona una hora válida entre las 09:30 y las 16:15.");
                return;
            }

            const datosReserva = {
                nombre: nombre,
                telefono: telefono,
                fecha_hora: `${fecha}T${hora}:00`
            };

            try {
                const response = await fetch('/reservas/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datosReserva)
                });

                // Leemos la respuesta como texto primero para evitar que pete si no es un JSON válido
                const textoRespuesta = await response.text();
                let resultado = {};
                try {
                    resultado = JSON.parse(textoRespuesta);
                } catch (e) {
                    resultado = { detail: textoRespuesta || 'Error desconocido del servidor' };
                }

                const divExito = document.getElementById('mensaje-exito');
                const divError = document.getElementById('mensaje-error');

                if (divExito) divExito.classList.remove('mostrar-mensaje');
                if (divError) divError.classList.remove('mostrar-mensaje');

                if (response.ok) {
                    if (divExito) {
                        divExito.textContent = `✅ ¡Cita confirmada con éxito para ${nombre} el día ${fecha} a las ${hora}! Te esperamos.`;
                        divExito.classList.add('mostrar-mensaje');
                        
                        // Ocultar automáticamente el mensaje verde de éxito a los 7 segundos
                        setTimeout(() => {
                            divExito.classList.remove('mostrar-mensaje');
                        }, 7000);
                    }
                    form.reset();

                    // --- NOTIFICACIÓN AUTOMÁTICA POR WHATSAPP AL MÓVIL DE LA BARBERÍA ---
                    const esDispositivoMovil = window.innerWidth <= 768;

                    if (esDispositivoMovil) {
                        const telefonoNegocio = '34613789785'; 
                        const mensajeWhatsApp = `¡Hola! Tienes una cita nueva:%0A%0A*Cliente:* ${nombre}%0A*Teléfono:* ${telefono}%0A*Fecha:* ${fecha}%0A*Hora:* ${hora}`;
                        const urlWhatsApp = `https://wa.me/${telefonoNegocio}?text=${mensajeWhatsApp}`;

                        setTimeout(() => {
                            window.location.href = urlWhatsApp;
                        }, 1500);
                    }
                    
                } else {
                    // Mostramos el mensaje exacto que devuelva el servidor
                    const mensajeMotivo = resultado.detail || resultado.message || 'Disculpa, ocurrió un error al procesar la reserva.';
                    
                    alert(`❌ ${mensajeMotivo}`);

                    if (divError) {
                        divError.textContent = '❌ ' + mensajeMotivo;
                        divError.classList.add('mostrar-mensaje');
                        setTimeout(() => divError.classList.remove('mostrar-mensaje'), 5000);
                    }
                }
            } catch (error) {
                console.error('Error:', error);
                const divError = document.getElementById('mensaje-error');
                if (divError) {
                    divError.textContent = '❌ Error de conexión con el servidor.';
                    divError.classList.add('mostrar-mensaje');
                    setTimeout(() => divError.classList.remove('mostrar-mensaje'), 4000);
                }
            }
        }); 
    }

    // ==========================================
    // ---- 3. LÓGICA DEL CARRUSEL Y LIGHTBOX  ----
    // ==========================================

    const galleryContainer = document.querySelector('.gallery-container');
    const btnPrev = document.querySelector('.gallery-btn-prev');
    const btnNext = document.querySelector('.gallery-btn-next');

    if (galleryContainer) {
        const items = galleryContainer.querySelectorAll('.gallery-item');

        // Botones de flechas para PC
        if (btnPrev && btnNext) {
            const getScrollAmount = () => {
                const item = galleryContainer.querySelector('.gallery-item');
                if (!item) return 350;
                return item.offsetWidth + 20; 
            };

            btnNext.addEventListener('click', () => {
                galleryContainer.scrollBy({ left: getScrollAmount(), behavior: 'smooth' });
            });

            btnPrev.addEventListener('click', () => {
                galleryContainer.scrollBy({ left: -getScrollAmount(), behavior: 'smooth' });
            });
        }

        // --- LÓGICA DEL VISOR CENTRAL FIJO EN MÓVIL ---
        if (window.innerWidth <= 768 && items.length > 0) {
            const actualizarTarjetaCentral = () => {
                const containerRect = galleryContainer.getBoundingClientRect();
                const containerCenter = containerRect.left + containerRect.width / 2;

                let tarjetaCercana = null;
                let menorDistancia = Infinity;

                items.forEach(item => {
                    const itemRect = item.getBoundingClientRect();
                    const itemCenter = itemRect.left + itemRect.width / 2;
                    const distancia = Math.abs(containerCenter - itemCenter);

                    if (distancia < menorDistancia) {
                        menorDistancia = distancia;
                        tarjetaCercana = item;
                    }
                });

                items.forEach(item => item.classList.remove('is-centered'));
                if (tarjetaCercana) {
                    tarjetaCercana.classList.add('is-centered');
                }
            };

            let ticking = false;
            galleryContainer.addEventListener('scroll', () => {
                if (!ticking) {
                    window.requestAnimationFrame(() => {
                        actualizarTarjetaCentral();
                        ticking = false;
                    });
                    ticking = true;
                }
            }, { passive: true });

            setTimeout(() => {
                if (items.length >= 3) {
                    const terceraTarjeta = items[2];
                    const targetScroll = terceraTarjeta.offsetLeft - galleryContainer.offsetLeft - (galleryContainer.clientWidth / 2) + (terceraTarjeta.clientWidth / 2);
                    galleryContainer.scrollLeft = targetScroll;
                    actualizarTarjetaCentral();
                }
            }, 60);
        }
    }

    // --- Lógica del Lightbox ---
    const galleryItems = document.querySelectorAll('.gallery-item');
    const lightboxModal = document.querySelector('.lightbox-modal');
    const lightboxContainer = document.querySelector('.lightbox-content-container');
    const lightboxClose = document.querySelector('.lightbox-close');

    if (lightboxModal && galleryItems.length > 0) {
        galleryItems.forEach(item => {
            item.addEventListener('selectstart', (e) => e.preventDefault());
            item.addEventListener('dragstart', (e) => e.preventDefault());

            item.addEventListener('click', () => {
                const mediaElement = item.querySelector('img, video');
                if (!mediaElement) return;

                if (lightboxContainer) {
                    lightboxContainer.innerHTML = '';
                    const clone = mediaElement.cloneNode(true);
                    clone.removeAttribute('style');
                    if (clone.tagName === 'VIDEO') {
                        clone.controls = true;
                        clone.autoplay = true;
                    }
                    lightboxContainer.appendChild(clone);
                }

                lightboxModal.classList.add('active');
            });
        });

        const closeLightbox = () => {
            lightboxModal.classList.remove('active');
            if (lightboxContainer) {
                const video = lightboxContainer.querySelector('video');
                if (video) video.pause();
            }
        };

        if (lightboxClose) {
            lightboxClose.addEventListener('click', closeLightbox);
        }

        lightboxModal.addEventListener('click', (e) => {
            if (e.target === lightboxModal) {
                closeLightbox();
            }
        });
    }

    // ==========================================
    // ---- 4. LÓGICA DEL MODAL DE PRIVACIDAD ----
    // ==========================================
    const modalPrivacidad = document.getElementById('modal-privacidad');
    const linkAbrirPrivacidad = document.getElementById('openPrivacy');
    const spanCerrarPrivacidad = document.getElementById('closePrivacy');

    if (linkAbrirPrivacidad && modalPrivacidad) {
        linkAbrirPrivacidad.addEventListener('click', (e) => {
            e.preventDefault();
            modalPrivacidad.style.display = 'flex';
        });

        if (spanCerrarPrivacidad) {
            spanCerrarPrivacidad.addEventListener('click', () => {
                modalPrivacidad.style.display = 'none';
            });
        }

        window.addEventListener('click', (e) => {
            if (e.target === modalPrivacidad) {
                modalPrivacidad.style.display = 'none';
            }
        });
    }
});