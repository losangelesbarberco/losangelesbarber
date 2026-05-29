// =========================================================================
// LÓGICA DE ADMINISTRACIÓN Y ROLES (ADMIN & BARBEROS)
// =========================================================================

document.addEventListener("DOMContentLoaded", () => {
  // --- Estado de la sesión ---
  let currentUserSession = null;
  let userProfile = null;
  let barberProfile = null; // Si el usuario es un barbero

  // --- Elementos del DOM ---
  const viewLogin = document.getElementById("admin-login-view");
  const viewDashboard = document.getElementById("admin-dashboard-view");
  const formLogin = document.getElementById("admin-login-form");
  const btnLogout = document.getElementById("btn-logout");

  // Encabezados
  const userGreeting = document.getElementById("user-greeting");
  const userRoleTag = document.getElementById("user-role-tag");

  // Vistas específicas de Roles
  const panelSuperAdmin = document.getElementById("panel-superadmin");
  const panelBarber = document.getElementById("panel-barber");
  const adminTabContainer = document.getElementById("admin-tab-container");

  // Contenedores de Listados e Información
  const listAppointments = document.getElementById("list-appointments");
  const statAppointmentsCount = document.getElementById("stat-appointments-count");
  const statEarnings = document.getElementById("stat-earnings");
  const dateFilterInput = document.getElementById("date-filter");

  // Formulario Perfil Barbero
  const formBarberProfile = document.getElementById("form-barber-profile");
  const editBioInput = document.getElementById("edit-bio");
  const editPhotoInput = document.getElementById("edit-photo");
  const editSpecialtiesInput = document.getElementById("edit-specialties");

  // Formulario Gestionar Servicios (Super Admin)
  const formManageService = document.getElementById("form-manage-service");
  const listAdminServices = document.getElementById("list-admin-services");

  // --- Sub-pestañas de Admin (Solo Super Admin) ---
  const tabBtns = document.querySelectorAll(".admin-tab-btn");
  const subPanes = document.querySelectorAll(".admin-subpane");

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      subPanes.forEach(p => p.classList.remove("active"));
      
      btn.classList.add("active");
      const targetId = btn.dataset.tab;
      document.getElementById(targetId).classList.add("active");

      if (targetId === "tab-appointments") {
        loadAppointments();
      } else if (targetId === "tab-services") {
        loadAdminServices();
      }
    });
  });

  // --- 1. Verificación Inicial de Autenticación ---
  checkAuth();

  async function checkAuth() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (session) {
        currentUserSession = session;
        await loadUserDataAndRedirect();
      } else {
        showLoginView();
      }
    } catch (err) {
      console.error("Error comprobando sesión:", err.message);
      showLoginView();
    }
  }

  function showLoginView() {
    viewLogin.style.display = "block";
    viewDashboard.style.display = "none";
  }

  function showDashboardView() {
    viewLogin.style.display = "none";
    viewDashboard.style.display = "block";
  }

  // --- 2. Carga Perfil de Usuario y Detecta Rol ---
  async function loadUserDataAndRedirect() {
    const userId = currentUserSession.user.id;

    try {
      // a. Buscar en la tabla de perfiles para ver si es Super Admin
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileErr) throw profileErr;
      userProfile = profile;

      // b. Buscar en la tabla de barberos para ver si está asignado como barbero
      const { data: barber, error: barberErr } = await supabase
        .from("barbers")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      barberProfile = barber;

      // c. Configurar UI según Rol
      showDashboardView();

      // Inicializar filtro de fecha con el día de hoy
      if (!dateFilterInput.value) {
        dateFilterInput.value = new Date().toISOString().split("T")[0];
      }

      if (userProfile.is_admin) {
        // --- Modo Super Admin ---
        userGreeting.innerText = `Hola, ${currentUserSession.user.email.split("@")[0]}`;
        userRoleTag.innerText = "Super Administrador";
        userRoleTag.className = "appointment-status-tag status-scheduled";
        
        panelSuperAdmin.style.display = "block";
        panelBarber.style.display = "none";
        adminTabContainer.style.display = "flex";

        loadAppointments();
      } else if (barberProfile) {
        // --- Modo Barbero ---
        userGreeting.innerText = `Hola, ${barberProfile.name}`;
        userRoleTag.innerText = "Barbero Staff";
        userRoleTag.className = "appointment-status-tag status-completed";

        panelSuperAdmin.style.display = "none";
        panelBarber.style.display = "block";
        adminTabContainer.style.display = "none"; // Ocultar pestañas de admin global

        // Rellenar formulario de perfil de barbero
        editBioInput.value = barberProfile.bio || "";
        editPhotoInput.value = barberProfile.photo_url || "";
        editSpecialtiesInput.value = barberProfile.specialties ? barberProfile.specialties.join(", ") : "";

        loadAppointments();
      } else {
        // Usuario autenticado pero sin rol de admin ni barbero
        userGreeting.innerText = "Usuario no autorizado";
        userRoleTag.innerText = "Sin Rol Asignado";
        userRoleTag.className = "appointment-status-tag status-cancelled";
        listAppointments.innerHTML = "<p class='text-danger'>Tu cuenta no está vinculada a ningún barbero o administración. Contacta al soporte.</p>";
        panelSuperAdmin.style.display = "none";
        panelBarber.style.display = "none";
      }

    } catch (err) {
      console.error("Error cargando perfil del usuario:", err.message);
      alert("Error al cargar perfil de usuario: " + err.message);
      handleLogout();
    }
  }

  // --- 3. Inicio de Sesión ---
  if (formLogin) {
    formLogin.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const email = document.getElementById("admin-email").value.trim();
      const password = document.getElementById("admin-password").value.trim();
      const btnSubmit = formLogin.querySelector("button[type='submit']");

      btnSubmit.setAttribute("disabled", "true");
      btnSubmit.innerText = "Iniciando sesión...";

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        currentUserSession = data.session;
        await loadUserDataAndRedirect();
      } catch (err) {
        console.error("Error Login:", err.message);
        alert("Credenciales inválidas o error de red: " + err.message);
      } finally {
        btnSubmit.removeAttribute("disabled");
        btnSubmit.innerText = "Ingresar";
      }
    });
  }

  // --- 4. Carga y Gestión de Citas ---
  async function loadAppointments() {
    listAppointments.innerHTML = "<p class='text-muted'>Cargando citas...</p>";
    const selectedDate = dateFilterInput.value;

    try {
      let query = supabase
        .from("appointments")
        .select(`
          *,
          barbers ( name ),
          services ( name, price )
        `)
        .eq("appointment_date", selectedDate)
        .order("appointment_time", { ascending: true });

      // Si es barbero, filtrar únicamente sus citas
      if (!userProfile.is_admin && barberProfile) {
        query = query.eq("barber_id", barberProfile.id);
      }

      const { data: appointments, error } = await query;
      if (error) throw error;

      listAppointments.innerHTML = "";
      
      // Calcular Estadísticas
      let totalCitas = appointments.length;
      let totalGanancias = 0;

      statAppointmentsCount.innerText = totalCitas;

      if (totalCitas === 0) {
        listAppointments.innerHTML = "<p class='text-muted' style='text-align:center; padding: 20px 0;'>No hay citas agendadas para este día.</p>";
        statEarnings.innerText = "$0.00";
        return;
      }

      appointments.forEach(app => {
        const item = document.createElement("div");
        item.className = `appointment-list-item ${app.status}`;
        
        const price = app.services ? parseFloat(app.services.price) : 0;
        if (app.status === "completed") {
          totalGanancias += price;
        }

        const formattedTime = app.appointment_time.slice(0, 5);
        const serviceName = app.services ? app.services.name : "Servicio Desconocido";
        const barberName = app.barbers ? app.barbers.name : "Sin Asignar";

        // Traducir etiquetas de estado
        let statusText = "Agendado";
        let statusClass = "status-scheduled";
        if (app.status === "completed") {
          statusText = "Completado";
          statusClass = "status-completed";
        } else if (app.status === "cancelled") {
          statusText = "Cancelado";
          statusClass = "status-cancelled";
        }

        item.innerHTML = `
          <div class="appointment-header">
            <span class="appointment-time-tag">${formattedTime} hs</span>
            <span class="appointment-status-tag ${statusClass}">${statusText}</span>
          </div>
          <div class="appointment-details">
            <p><strong>Cliente:</strong> ${app.client_name} (${app.client_phone})</p>
            ${app.client_email ? `<p><strong>Email:</strong> ${app.client_email}</p>` : ''}
            <p><strong>Servicio:</strong> ${serviceName} ($${price.toFixed(2)})</p>
            ${userProfile.is_admin ? `<p><strong>Barbero:</strong> ${barberName}</p>` : ''}
          </div>
          ${app.status === 'scheduled' ? `
            <div class="appointment-actions">
              <button class="btn btn-primary btn-small btn-complete" data-id="${app.id}">Completar</button>
              <button class="btn btn-danger btn-small btn-cancel" data-id="${app.id}">Cancelar</button>
            </div>
          ` : ''}
        `;

        // Listeners para acciones
        const btnComplete = item.querySelector(".btn-complete");
        if (btnComplete) {
          btnComplete.addEventListener("click", () => updateAppointmentStatus(app.id, "completed"));
        }

        const btnCancel = item.querySelector(".btn-cancel");
        if (btnCancel) {
          btnCancel.addEventListener("click", () => updateAppointmentStatus(app.id, "cancelled"));
        }

        listAppointments.appendChild(item);
      });

      statEarnings.innerText = `$${totalGanancias.toFixed(2)}`;

    } catch (err) {
      console.error("Error al cargar citas:", err.message);
      listAppointments.innerHTML = "<p class='text-danger'>Error al cargar las citas de la base de datos.</p>";
    }
  }

  // Escuchar cambios en la fecha del filtro
  if (dateFilterInput) {
    dateFilterInput.addEventListener("change", loadAppointments);
  }

  async function updateAppointmentStatus(appointmentId, newStatus) {
    if (!confirm(`¿Estás seguro de marcar esta cita como ${newStatus === 'completed' ? 'completada' : 'cancelada'}?`)) return;

    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: newStatus })
        .eq("id", appointmentId);

      if (error) throw error;

      // Recargar citas
      loadAppointments();
    } catch (err) {
      console.error("Error actualizando cita:", err.message);
      alert("No se pudo actualizar el estado de la cita: " + err.message);
    }
  }

  // --- 5. Edición de Perfil de Barbero ---
  if (formBarberProfile) {
    formBarberProfile.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const btnSubmit = formBarberProfile.querySelector("button[type='submit']");
      btnSubmit.setAttribute("disabled", "true");
      btnSubmit.innerText = "Guardando...";

      const bio = editBioInput.value.trim();
      const photoUrl = editPhotoInput.value.trim();
      // Separar especialidades por coma y limpiar espacios
      const specialties = editSpecialtiesInput.value
        .split(",")
        .map(s => s.trim())
        .filter(s => s.length > 0);

      try {
        const { error } = await supabase
          .from("barbers")
          .update({
            bio,
            photo_url: photoUrl,
            specialties
          })
          .eq("user_id", currentUserSession.user.id);

        if (error) throw error;
        alert("¡Perfil actualizado con éxito!");
        
        // Recargar datos locales
        await loadUserDataAndRedirect();
      } catch (err) {
        console.error("Error actualizando perfil barbero:", err.message);
        alert("Ocurrió un error al guardar: " + err.message);
      } finally {
        btnSubmit.removeAttribute("disabled");
        btnSubmit.innerText = "Guardar Cambios";
      }
    });
  }

  // --- 6. Administración de Servicios (Solo Super Admin) ---
  async function loadAdminServices() {
    listAdminServices.innerHTML = "<p class='text-muted'>Cargando servicios...</p>";

    try {
      const { data: services, error } = await supabase
        .from("services")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      listAdminServices.innerHTML = "";
      if (services.length === 0) {
        listAdminServices.innerHTML = "<p class='text-muted'>No hay servicios registrados.</p>";
        return;
      }

      services.forEach(service => {
        const item = document.createElement("div");
        item.className = "service-item";
        item.style.cursor = "default";
        
        item.innerHTML = `
          <div class="service-info">
            <span class="service-name">${service.name} ${!service.active ? '<span class="text-danger">(Inactivo)</span>' : ''}</span>
            <span class="service-meta">${service.duration_minutes} min • ${service.description || 'Sin descripción'}</span>
          </div>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
            <span class="service-price">$${parseFloat(service.price).toFixed(2)}</span>
            <button class="btn btn-danger btn-small toggle-service-btn" style="padding:4px 8px; font-size:0.75rem;" data-id="${service.id}" data-active="${service.active}">
              ${service.active ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        `;

        const btnToggle = item.querySelector(".toggle-service-btn");
        btnToggle.addEventListener("click", () => toggleServiceActive(service.id, service.active));

        listAdminServices.appendChild(item);
      });

    } catch (err) {
      console.error("Error cargando administración de servicios:", err.message);
      listAdminServices.innerHTML = "<p class='text-danger'>Error al conectar con la base de datos.</p>";
    }
  }

  async function toggleServiceActive(serviceId, currentActive) {
    try {
      const { error } = await supabase
        .from("services")
        .update({ active: !currentActive })
        .eq("id", serviceId);

      if (error) throw error;
      loadAdminServices();
    } catch (err) {
      console.error("Error cambiando estado de servicio:", err.message);
      alert("Error al modificar servicio: " + err.message);
    }
  }

  if (formManageService) {
    formManageService.addEventListener("submit", async (e) => {
      e.preventDefault();

      const btnSubmit = formManageService.querySelector("button[type='submit']");
      btnSubmit.setAttribute("disabled", "true");

      const name = document.getElementById("service-name").value.trim();
      const price = parseFloat(document.getElementById("service-price").value);
      const duration = parseInt(document.getElementById("service-duration").value);
      const description = document.getElementById("service-desc").value.trim();

      try {
        const { error } = await supabase
          .from("services")
          .insert([{
            name,
            price,
            duration_minutes: duration,
            description: description || null,
            active: true
          }]);

        if (error) throw error;

        alert("Servicio creado exitosamente");
        formManageService.reset();
        loadAdminServices();
      } catch (err) {
        console.error("Error creando servicio:", err.message);
        alert("Error al guardar el nuevo servicio: " + err.message);
      } finally {
        btnSubmit.removeAttribute("disabled");
      }
    });
  }

  // --- 7. Cierre de Sesión ---
  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Error al cerrar sesión:", err.message);
    } finally {
      currentUserSession = null;
      userProfile = null;
      barberProfile = null;
      showLoginView();
      if (formLogin) formLogin.reset();
    }
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", (e) => {
      e.preventDefault();
      handleLogout();
    });
  }

});
