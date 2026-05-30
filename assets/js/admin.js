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

  const formBarberProfile = document.getElementById("form-barber-profile");
  const editBioInput = document.getElementById("edit-bio");
  const editPhotoFile = document.getElementById("edit-photo_file");
  const barberPreviewImg = document.getElementById("barber-preview-img");
  const barberPreviewText = document.getElementById("barber-preview-text");
  const editSpecialtiesInput = document.getElementById("edit-specialties");

  // Formulario Gestionar Servicios (Super Admin)
  const formManageService = document.getElementById("form-manage-service");
  const listAdminServices = document.getElementById("list-admin-services");

  // Formularios Super Admin adicionales
  const formManageBarber = document.getElementById("form-manage-barber");
  const listAdminBarbers = document.getElementById("list-admin-barbers");
  const formManageHome = document.getElementById("form-manage-home");

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
      } else if (targetId === "tab-barbers") {
        loadAdminBarbers();
      } else if (targetId === "tab-homeconfig") {
        loadAdminHomeConfig();
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
        
        // Bloqueo estricto de subpaneles de Super Admin
        document.getElementById("tab-services").style.display = "none";
        document.getElementById("tab-barbers").style.display = "none";
        document.getElementById("tab-homeconfig").style.display = "none";

        // Rellenar formulario de perfil de barbero
        editBioInput.value = barberProfile.bio || "";
        editSpecialtiesInput.value = barberProfile.specialties ? barberProfile.specialties.join(", ") : "";
        if (barberProfile.photo_url) {
          barberPreviewImg.src = barberProfile.photo_url;
          barberPreviewImg.style.display = "block";
          barberPreviewText.style.display = "none";
        }
        
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
      // Separar especialidades por coma y limpiar espacios
      const specialties = editSpecialtiesInput.value
        .split(",")
        .map(s => s.trim())
        .filter(s => s.length > 0);

      try {
        let finalPhotoUrl = barberProfile.photo_url;

        // Si el usuario seleccionó una imagen nueva, subirla a 'logos' bucket
        if (editPhotoFile && editPhotoFile.files.length > 0) {
          btnSubmit.innerText = "Subiendo foto...";
          const file = editPhotoFile.files[0];
          const fileExt = file.name.split('.').pop();
          const fileName = `barber_${currentUserSession.user.id}_${Date.now()}.${fileExt}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('logos')
            .upload(fileName, file, { cacheControl: '3600', upsert: true });

          if (uploadError) throw new Error("Error al subir foto: " + uploadError.message);

          const { data: { publicUrl } } = supabase.storage
            .from('logos')
            .getPublicUrl(fileName);

          finalPhotoUrl = publicUrl;
          
          barberPreviewImg.src = finalPhotoUrl;
          barberPreviewImg.style.display = "block";
          barberPreviewText.style.display = "none";
        }

        const { error } = await supabase
          .from("barbers")
          .update({
            bio,
            photo_url: finalPhotoUrl,
            specialties
          })
          .eq("user_id", currentUserSession.user.id);

        if (error) throw error;
        alert("¡Perfil actualizado con éxito!");
        
        // Limpiar input file
        if(editPhotoFile) editPhotoFile.value = "";
        
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
            <div style="display:flex; gap:6px;">
              <button class="btn btn-primary btn-small edit-service-btn" style="padding:4px 8px; font-size:0.75rem;" data-id="${service.id}">Editar</button>
              <button class="btn btn-danger btn-small toggle-service-btn" style="padding:4px 8px; font-size:0.75rem;" data-id="${service.id}" data-active="${service.active}">
                ${service.active ? 'Desactivar' : 'Activar'}
              </button>
              <button class="btn btn-small delete-service-btn" style="padding:4px 8px; font-size:0.75rem; background:transparent; border:1px solid #ff4d4d; color:#ff4d4d;" data-id="${service.id}">
                Eliminar
              </button>
            </div>
          </div>
        `;

        const btnToggle = item.querySelector(".toggle-service-btn");
        btnToggle.addEventListener("click", () => toggleServiceActive(service.id, service.active));

        const btnEdit = item.querySelector(".edit-service-btn");
        btnEdit.addEventListener("click", () => editService(service));

        const btnDelete = item.querySelector(".delete-service-btn");
        btnDelete.addEventListener("click", () => deleteService(service.id));

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

  function editService(service) {
    document.getElementById("service-id").value = service.id;
    document.getElementById("service-name").value = service.name;
    document.getElementById("service-price").value = service.price;
    document.getElementById("service-duration").value = service.duration_minutes;
    document.getElementById("service-desc").value = service.description || '';
    
    document.getElementById("btn-submit-service").innerText = "Actualizar Servicio";
    document.getElementById("btn-cancel-service").style.display = "block";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteService(serviceId) {
    if (!confirm("¿Estás seguro de eliminar permanentemente este servicio? (Las citas existentes mantendrán el registro, pero el servicio no volverá a aparecer)")) return;
    try {
      const { error } = await supabase.from("services").delete().eq("id", serviceId);
      if (error) throw error;
      loadAdminServices();
    } catch (err) {
      alert("Error al eliminar servicio: " + err.message);
    }
  }

  const btnCancelService = document.getElementById("btn-cancel-service");
  if (btnCancelService) {
    btnCancelService.addEventListener("click", () => {
      document.getElementById("service-id").value = "";
      formManageService.reset();
      document.getElementById("btn-submit-service").innerText = "Crear Servicio";
      btnCancelService.style.display = "none";
    });
  }

  if (formManageService) {
    formManageService.addEventListener("submit", async (e) => {
      e.preventDefault();

      const btnSubmit = formManageService.querySelector("button[type='submit']");
      btnSubmit.setAttribute("disabled", "true");
      btnSubmit.innerText = "Guardando...";

      const serviceId = document.getElementById("service-id").value;
      const name = document.getElementById("service-name").value.trim();
      const price = parseFloat(document.getElementById("service-price").value);
      const duration_minutes = parseInt(document.getElementById("service-duration").value);
      const description = document.getElementById("service-desc").value.trim();

      try {
        if (serviceId) {
          const { error } = await supabase
            .from("services")
            .update({ name, price, duration_minutes, description })
            .eq("id", serviceId);
          if (error) throw error;
          alert("Servicio actualizado exitosamente.");
        } else {
          const { error } = await supabase
            .from("services")
            .insert([{ name, price, duration_minutes, description, active: true }]);
          if (error) throw error;
          alert("Servicio creado exitosamente.");
        }

        formManageService.reset();
        document.getElementById("service-id").value = "";
        document.getElementById("btn-submit-service").innerText = "Crear Servicio";
        if (btnCancelService) btnCancelService.style.display = "none";
        loadAdminServices();
      } catch (err) {
        console.error("Error creando/actualizando servicio:", err.message);
        alert("Error al guardar el servicio: " + err.message);
      } finally {
        btnSubmit.removeAttribute("disabled");
        btnSubmit.innerText = serviceId ? "Actualizar Servicio" : "Crear Servicio";
      }
    });
  }

  // --- 8. Administración de Barberos (Solo Super Admin) ---
  async function loadAdminBarbers() {
    listAdminBarbers.innerHTML = "<p class='text-muted'>Cargando barberos...</p>";
    try {
      const { data: barbers, error } = await supabase.from("barbers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      listAdminBarbers.innerHTML = "";
      if (barbers.length === 0) {
        listAdminBarbers.innerHTML = "<p class='text-muted'>No hay barberos registrados.</p>";
        return;
      }
      barbers.forEach(barber => {
        const item = document.createElement("div");
        item.className = "service-item"; // Usamos el mismo estilo de card
        item.style.cursor = "default";
        const specText = barber.specialties ? barber.specialties.join(", ") : "Sin especialidades";
        const emailText = barber.login_email ? barber.login_email : "Sin correo vinculado";
        
        item.innerHTML = `
          <div class="service-info">
            <span class="service-name">${barber.name} ${!barber.active ? '<span class="text-danger">(Inactivo)</span>' : ''}</span>
            <span class="service-meta" style="color:var(--primary); font-size:0.85rem; margin-bottom:4px;">${emailText}</span>
            <span class="service-meta">${specText}</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; gap:6px;">
              <button class="btn btn-primary btn-small edit-barber-btn" style="padding:4px 8px; font-size:0.75rem;" data-id="${barber.id}">Editar</button>
              <button class="btn btn-danger btn-small toggle-barber-btn" style="padding:4px 8px; font-size:0.75rem;" data-id="${barber.id}" data-active="${barber.active}">
                ${barber.active ? 'Desactivar' : 'Activar'}
              </button>
              <button class="btn btn-small delete-barber-btn" style="padding:4px 8px; font-size:0.75rem; background:transparent; border:1px solid #ff4d4d; color:#ff4d4d;" data-id="${barber.id}">
                Eliminar
              </button>
            </div>
          </div>
        `;
        const btnToggle = item.querySelector(".toggle-barber-btn");
        btnToggle.addEventListener("click", () => toggleBarberActive(barber.id, barber.active));
        
        const btnEdit = item.querySelector(".edit-barber-btn");
        btnEdit.addEventListener("click", () => editBarber(barber));

        const btnDelete = item.querySelector(".delete-barber-btn");
        btnDelete.addEventListener("click", () => deleteBarber(barber.id));

        listAdminBarbers.appendChild(item);
      });
    } catch (err) {
      console.error("Error cargando barberos:", err.message);
      listAdminBarbers.innerHTML = "<p class='text-danger'>Error al conectar con la base de datos.</p>";
    }
  }

  async function toggleBarberActive(barberId, currentActive) {
    try {
      const { error } = await supabase.from("barbers").update({ active: !currentActive }).eq("id", barberId);
      if (error) throw error;
      loadAdminBarbers();
    } catch (err) {
      alert("Error al modificar barbero: " + err.message);
    }
  }

  async function deleteBarber(barberId) {
    if (!confirm("¿Estás seguro de que deseas eliminar permanentemente a este barbero? (Sus citas pasadas quedarán en el historial como 'Sin Asignar').")) return;
    try {
      const { error } = await supabase.from("barbers").delete().eq("id", barberId);
      if (error) throw error;
      loadAdminBarbers();
    } catch (err) {
      alert("Error al eliminar barbero: " + err.message);
    }
  }

  function editBarber(barber) {
    document.getElementById("barber-id").value = barber.id;
    document.getElementById("barber-name").value = barber.name;
    document.getElementById("barber-email").value = barber.login_email || '';
    document.getElementById("barber-specialties").value = barber.specialties ? barber.specialties.join(", ") : "";
    
    // Deshabilitar credenciales para edición
    document.getElementById("barber-email").setAttribute("disabled", "true");
    document.getElementById("barber-password").setAttribute("disabled", "true");
    document.getElementById("barber-password").removeAttribute("required");

    document.getElementById("btn-submit-barber").innerText = "Actualizar Barbero";
    document.getElementById("btn-cancel-barber").style.display = "block";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const btnCancelBarber = document.getElementById("btn-cancel-barber");
  if (btnCancelBarber) {
    btnCancelBarber.addEventListener("click", () => {
      document.getElementById("barber-id").value = "";
      formManageBarber.reset();
      
      document.getElementById("barber-email").removeAttribute("disabled");
      document.getElementById("barber-password").removeAttribute("disabled");
      document.getElementById("barber-password").setAttribute("required", "true");
      
      document.getElementById("btn-submit-barber").innerText = "Crear Barbero";
      btnCancelBarber.style.display = "none";
    });
  }

  if (formManageBarber) {
    formManageBarber.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btnSubmit = formManageBarber.querySelector("button[type='submit']");
      btnSubmit.setAttribute("disabled", "true");
      btnSubmit.innerText = "Guardando...";

      const barberId = document.getElementById("barber-id").value;
      const name = document.getElementById("barber-name").value.trim();
      const email = document.getElementById("barber-email").value.trim();
      const password = document.getElementById("barber-password").value;
      const specString = document.getElementById("barber-specialties").value.trim();
      const specialties = specString ? specString.split(",").map(s => s.trim()) : [];

      try {
        if (barberId) {
          // Modo Edición
          const { error } = await supabase.from("barbers").update({ name, specialties }).eq("id", barberId);
          if (error) throw new Error("Error al actualizar: " + error.message);
          alert("Barbero actualizado exitosamente.");
        } else {
          // Modo Creación
          const tempClient = window.SupabaseLib.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
            auth: { persistSession: false }
          });
          const { data: authData, error: authError } = await tempClient.auth.signUp({
            email,
            password
          });
          if (authError) throw new Error("Error al crear cuenta: " + authError.message);
          
          const newUserId = authData.user ? authData.user.id : null;
          const { error } = await supabase.from("barbers").insert([{ 
            user_id: newUserId,
            login_email: email,
            name, 
            specialties, 
            active: true 
          }]);
          if (error) throw new Error("Error al enlazar barbero: " + error.message);
          alert("Barbero creado exitosamente con sus credenciales de acceso.");
        }

        formManageBarber.reset();
        document.getElementById("barber-id").value = "";
        
        // Restaurar estado de inputs
        document.getElementById("barber-email").removeAttribute("disabled");
        document.getElementById("barber-password").removeAttribute("disabled");
        document.getElementById("barber-password").setAttribute("required", "true");
        
        if (btnCancelBarber) btnCancelBarber.style.display = "none";
        
        loadAdminBarbers();
      } catch (err) {
        alert("Atención: " + err.message);
      } finally {
        btnSubmit.removeAttribute("disabled");
        btnSubmit.innerText = barberId ? "Actualizar Barbero" : "Crear Barbero";
      }
    });
  }

  // --- 9. Configuración del Inicio (Solo Super Admin) ---
  async function loadAdminHomeConfig() {
    try {
      const { data: settings, error } = await supabase.from("settings").select("*");
      if (error) throw error;
      if (settings) {
        settings.forEach(setting => {
          if (setting.id === 'logo_url' && setting.value.trim() !== '') {
            const previewImg = document.getElementById("logo-preview-img");
            const previewText = document.getElementById("logo-preview-text");
            if (previewImg && previewText) {
              previewImg.src = setting.value;
              previewImg.style.display = "block";
              previewText.style.display = "none";
            }
          } else {
            const el = document.getElementById(`set-${setting.id}`);
            if (el) el.value = setting.value;
          }
        });
      }
    } catch (err) {
      console.error("Error cargando config de inicio:", err.message);
    }
  }

  if (formManageHome) {
    formManageHome.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btnSubmit = formManageHome.querySelector("button[type='submit']");
      btnSubmit.setAttribute("disabled", "true");
      btnSubmit.innerText = "Guardando...";

      const fileInput = document.getElementById("set-logo_file");
      let logoUrl = null;

      try {
        // Si el usuario seleccionó una imagen nueva, la subimos primero
        if (fileInput && fileInput.files.length > 0) {
          btnSubmit.innerText = "Subiendo imagen...";
          const file = fileInput.files[0];
          const fileExt = file.name.split('.').pop();
          const fileName = `logo_${Date.now()}.${fileExt}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('logos')
            .upload(fileName, file, { cacheControl: '3600', upsert: true });
            
          if (uploadError) throw new Error("Error subiendo imagen a la nube: " + uploadError.message);
          
          // Obtener el enlace público de la imagen recién subida
          const { data: urlData } = supabase.storage.from('logos').getPublicUrl(fileName);
          logoUrl = urlData.publicUrl;
        }

        const ids = ['hero_subtitle', 'hero_title', 'hero_desc', 'info_address', 'info_hours_wk', 'info_hours_we', 'social_whatsapp', 'social_instagram', 'social_facebook'];
        const updates = ids.map(id => {
          return { id: id, value: document.getElementById(`set-${id}`).value.trim() };
        });
        
        // Añadir el logo_url solo si subimos uno nuevo
        if (logoUrl) {
          updates.push({ id: "logo_url", value: logoUrl });
        }

        btnSubmit.innerText = "Guardando configuración...";
        const { error } = await supabase.from("settings").upsert(updates);
        if (error) throw error;
        
        alert("Textos e imagen guardados correctamente.");
        
        // Actualizar la previsualización
        if (logoUrl) {
           const previewImg = document.getElementById("logo-preview-img");
           const previewText = document.getElementById("logo-preview-text");
           if (previewImg && previewText) {
             previewImg.src = logoUrl;
             previewImg.style.display = "block";
             previewText.style.display = "none";
           }
           fileInput.value = ""; // limpiar input
        }
      } catch (err) {
        alert("Error guardando configuración: " + err.message);
      } finally {
        btnSubmit.removeAttribute("disabled");
        btnSubmit.innerText = "Guardar Textos";
      }
    });
  }

  // --- 10. Cierre de Sesión ---
  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Error al cerrar sesión:", err.message);
    } finally {
      window.location.reload();
    }
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", (e) => {
      e.preventDefault();
      handleLogout();
    });
  }

});
