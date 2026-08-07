// ========================================== */
/* ---- CONTROL DE ACCESO (ADMIN LOGIN) ----- */
/* ========================================== */

document.addEventListener("DOMContentLoaded", () => {
    const passwordCorrecta = "2444"; 
    const loginContainer = document.getElementById('login-container');
    const adminPanel = document.getElementById('admin-panel');
    const formLogin = document.getElementById('form-login');
    const inputPassword = document.getElementById('password-admin');
    const errorMsg = document.getElementById('login-error');

    // Comprobar si ya inició sesión antes en esta pestaña
    if (sessionStorage.getItem("adminLogueado") === "true") {
        if (loginContainer) loginContainer.style.display = 'none';
        if (adminPanel) adminPanel.style.display = 'block';
        iniciarFuncionesAdmin();
    }

    if (formLogin) {
        formLogin.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // .trim() limpia cualquier espacio o caracter oculto accidental
            if (inputPassword.value.trim() === passwordCorrecta) {
                sessionStorage.setItem("adminLogueado", "true");
                if (loginContainer) loginContainer.style.display = 'none';
                if (adminPanel) adminPanel.style.display = 'block';
                iniciarFuncionesAdmin();
            } else {
                if (errorMsg) errorMsg.style.display = 'block';
                inputPassword.value = '';
            }
        });
    }
});

// Función para arrancar la carga de datos solo al iniciar sesión correctamente
function iniciarFuncionesAdmin() {
    cargarCitas();
    setInterval(cargarCitas, 15000);

    cargarBloqueos();
    setInterval(cargarBloqueos, 15000);
}


// ========================================== */
// GESTIÓN DE CITAS                            */
// ========================================== */

async function cargarCitas() {
    try {
        const response = await fetch('/reservas/');
        const reservas = await response.json();
        
        const tbody = document.getElementById('tabla-citas');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (reservas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="no-citas">No hay citas registradas todavía.</td></tr>`;
            return;
        }

        // Ordenar las citas por fecha y hora de la más cercana a la más lejana
        reservas.sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora));

        reservas.forEach(cita => {
            const fechaObj = new Date(cita.fecha_hora);
            const fechaFormateada = fechaObj.toLocaleString('es-ES', {
                dateStyle: 'short',
                timeStyle: 'short'
            });

            const fila = `
                <tr>
                    <td><strong>${cita.nombre}</strong></td>
                    <td>${cita.telefono}</td>
                    <td>${fechaFormateada}</td>
                    <td><button onclick="borrarCita(${cita.id})" style="background: #e74c3c; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Eliminar</button></td>
                </tr>
            `;
            tbody.innerHTML += fila;
        });
    } catch (error) {
        console.error("Error al cargar las citas:", error);
    }
}

async function borrarCita(id) {
    if (confirm("¿Seguro que quieres eliminar esta cita?")) {
        try {
            const response = await fetch(`/reservas/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                cargarCitas();
            } else {
                alert("Hubo un error al eliminar la cita.");
            }
        } catch (error) {
            console.error("Error:", error);
        }
    }
}


// ========================================== */
// GESTIÓN DE BLOQUEOS Y VACACIONES (SOLO DÍAS) */
// ========================================== */

async function cargarBloqueos() {
    try {
        const response = await fetch('/bloqueos/');
        const bloqueos = await response.json();
        
        const lista = document.getElementById('lista-bloqueos');
        if (!lista) return;
        lista.innerHTML = '';

        if (bloqueos.length === 0) {
            lista.innerHTML = `<li style="color: #888; text-align: center; padding: 10px;">No hay periodos bloqueados actualmente.</li>`;
            return;
        }

        bloqueos.forEach(bloqueo => {
            const fechaPartes = bloqueo.fecha ? bloqueo.fecha.split('-') : bloqueo.fecha_hora.split('T')[0].split('-');
            const anio = fechaPartes[0];
            const mes = fechaPartes[1];
            const dia = fechaPartes[2];
            const fechaFormateada = `${dia}/${mes}/${anio}`;

            const li = document.createElement('li');
            li.innerHTML = `
                <span><strong>${fechaFormateada}</strong> - <em>${bloqueo.motivo}</em></span>
                <button onclick="eliminarBloqueo(${bloqueo.id})">Desbloquear</button>
            `;
            lista.appendChild(li);
        });
    } catch (error) {
        console.error("Error al cargar los bloqueos:", error);
    }
}

async function eliminarBloqueo(id) {
    if (confirm("¿Seguro que quieres desbloquear este día?")) {
        try {
            const response = await fetch(`/bloqueos/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                cargarBloqueos();
            } else {
                alert("Hubo un error al desbloquear el día.");
            }
        } catch (error) {
            console.error("Error:", error);
        }
    }
}

const formBloqueo = document.getElementById('form-bloqueo');
if (formBloqueo) {
    formBloqueo.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fechaInicioStr = document.getElementById('fecha-inicio').value;
        const fechaFinStr = document.getElementById('fecha-fin').value;
        const motivoInput = document.getElementById('motivo-bloqueo').value;

        if (!fechaInicioStr || !fechaFinStr) {
            alert("Por favor, selecciona fecha de inicio y de fin.");
            return;
        }

        const [anhoInicio, mesInicio, diaInicio] = fechaInicioStr.split('-').map(Number);
        const [anhoFin, mesFin, diaFin] = fechaFinStr.split('-').map(Number);

        let fechaActual = new Date(anhoInicio, mesInicio - 1, diaInicio);
        const fechaFinObj = new Date(anhoFin, mesFin - 1, diaFin);

        if (fechaActual > fechaFinObj) {
            alert("La fecha de inicio no puede ser posterior a la fecha de fin.");
            return;
        }

        let exito = true;

        while (fechaActual <= fechaFinObj) {
            const anho = fechaActual.getFullYear();
            const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
            const dia = String(fechaActual.getDate()).padStart(2, '0');
            
            const fechaHoraIso = `${anho}-${mes}-${dia}T00:00:00`;

            try {
                const response = await fetch('/bloqueos/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fecha_hora: fechaHoraIso,
                        motivo: motivoInput
                    })
                });

                if (!response.ok && response.status !== 400) {
                    exito = false;
                }
            } catch (error) {
                console.error("Error al bloquear el día: " + fechaHoraIso, error);
            }

            fechaActual.setDate(fechaActual.getDate() + 1);
        }

        document.getElementById('fecha-inicio').value = '';
        document.getElementById('fecha-fin').value = '';
        cargarBloqueos();

        if (exito) {
            alert("¡Periodo de vacaciones bloqueado correctamente!");
        } else {
            alert("El periodo se ha procesado (algunos días ya estaban bloqueados previamente).");
        }
    });
}