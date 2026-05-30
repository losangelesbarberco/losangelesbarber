// =========================================================================
// LÓGICA DE RESERVAS Y NAVEGACIÓN CLIENTE
// =========================================================================

document.addEventListener("DOMContentLoaded", () => {
  // --- Inicialización y Estado de la Cita ---
  const bookingState = {
    serviceId: null,
    serviceName: "",
    servicePrice: 0,
    barberId: null,
    barberName: "",
    selectedDate: "",
    selectedTime: ""
  };

  // --- Elementos del DOM ---
  const viewHome = document.getElementById("home-view");
  const viewBooking = document.getElementById("booking-view");
  const viewGallery = document.getElementById("gallery-view");
  const viewInfo = document.getElementById("info-view");

  const navHome = document.getElementById("nav-home");
  const navBooking = document.getElementById("nav-booking");
  const navGallery = document.getElementById("nav-gallery");
  const navInfo = document.getElementById("nav-info");

  const servicesContainer = document.getElementById("services-container");
  const barbersContainer = document.getElementById("barbers-container");
  const dateScrollContainer = document.getElementById("date-scroll-container");
  const timeGridContainer = document.getElementById("time-grid-container");
  
  const formClient = document.getElementById("booking-client-form");
  const summaryDetails = document.getElementById("summary-details");
  const confirmationDetails = document.getElementById("confirmation-details");

  // Pasos del Wizard de Reservas
  const steps = [
    { indicator: "step-1", pane: "pane-service" },
    { indicator: "step-2", pane: "pane-barber" },
    { indicator: "step-3", pane: "pane-time" },
    { indicator: "step-4", pane: "pane-details" },
    { indicator: "step-5", pane: "pane-confirm" }
  ];
  let currentStepIndex = 0;

  // --- 1. Lógica de Pestañas (Bottom Navigation) ---
  function switchView(viewName) {
    const views = {
      home: viewHome,
      booking: viewBooking,
      gallery: viewGallery,
      info: viewInfo
    };
    
    const navs = {
      home: navHome,
      booking: navBooking,
      gallery: navGallery,
      info: navInfo
    };

    // Ocultar todos
    Object.values(views).forEach(v => { if(v) v.classList.remove("active"); });
    Object.values(navs).forEach(n => { if(n) n.classList.remove("active"); });

    // Mostrar el solicitado
    if (views[viewName]) views[viewName].classList.add("active");
    if (navs[viewName]) navs[viewName].classList.add("active");
    
    window.location.hash = "#" + viewName;
  }

  if (navHome) navHome.addEventListener("click", (e) => { e.preventDefault(); switchView("home"); });
  if (navBooking) navBooking.addEventListener("click", (e) => { e.preventDefault(); switchView("booking"); resetBookingWizard(); });
  if (navGallery) navGallery.addEventListener("click", (e) => { e.preventDefault(); switchView("gallery"); });
  if (navInfo) navInfo.addEventListener("click", (e) => { e.preventDefault(); switchView("info"); });

  // Manejar hash inicial al cargar
  const hash = window.location.hash;
  if (hash === "#booking") {
    switchView("booking");
    resetBookingWizard();
  } else if (hash === "#gallery") {
    switchView("gallery");
  } else if (hash === "#info") {
    switchView("info");
  } else {
    switchView("home");
  }

  // --- Comprobar Sesión para Menú Admin ---
  async function checkAdminMenu() {
    try {
      const { data } = await supabase.auth.getSession();
      if (data && data.session) {
        const navAdmin = document.getElementById("nav-admin");
        if (navAdmin) navAdmin.style.display = "flex";
      }
    } catch (e) {}
  }
  checkAdminMenu();

  // --- Cargar configuraciones del Home dinámicamente ---
  async function loadHomeSettings() {
    try {
      const { data: settings, error } = await supabase.from("settings").select("*");
      if (error) throw error;
      if (settings && settings.length > 0) {
        let hasSocialLinks = false;
        settings.forEach(setting => {
          if (setting.id.startsWith("social_")) {
            const network = setting.id.replace("social_", "");
            const linkEl = document.getElementById(`link-${network}`);
            if (linkEl && setting.value.trim() !== '') {
              let url = setting.value.trim();
              if (!url.startsWith('http')) url = 'https://' + url;
              linkEl.href = url;
              linkEl.style.display = "flex";
              hasSocialLinks = true;
            }
          } else if (setting.id === 'logo_url') {
            const logoContainer = document.getElementById('dyn-logo-container');
            if (logoContainer && setting.value.trim() !== '') {
              // Aumentamos el tamaño máximo para que el logo se vea bien en celular y desktop
              logoContainer.innerHTML = `<img src="${setting.value}" alt="Logo" style="max-height: 45px; width: auto; object-fit: contain;">`;
            }
          } else {
            const el = document.getElementById(`dyn-${setting.id}`);
            if (el) {
              el.innerHTML = setting.value;
            }
          }
        });

        if (hasSocialLinks) {
          const socialCard = document.getElementById("social-media-card");
          if (socialCard) socialCard.style.display = "block";
        }
      }
    } catch (err) {
      console.error("Error cargando configuraciones del Home:", err.message);
    }
  }
  
  loadHomeSettings();

  // --- Cargar Equipo (Barberos) ---
  async function loadTeam() {
    const teamContainer = document.getElementById("team-container");
    if (!teamContainer) return;
    try {
      const { data: barbers, error } = await supabase.from("barbers").select("*").eq("active", true);
      if (error) throw error;
      
      if (barbers.length === 0) {
        teamContainer.innerHTML = "<p class='text-muted'>No hay barberos registrados.</p>";
        return;
      }
      
      teamContainer.innerHTML = "";
      barbers.forEach(barber => {
        const specText = barber.specialties ? barber.specialties.join(" • ") : "Estilista";
        const avatarHtml = barber.photo_url 
          ? `<img src="${barber.photo_url}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">` 
          : `<i data-lucide="user" style="stroke:var(--primary); width:20px; height:20px;"></i>`;
          
        teamContainer.innerHTML += `
          <div style="display:flex; align-items:center; gap:12px; background:var(--bg-surface); padding:12px; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
            <div style="width:40px; height:40px; border-radius:50%; background:var(--bg-surface-elevated); display:flex; align-items:center; justify-content:center; overflow:hidden;">
              ${avatarHtml}
            </div>
            <div>
              <div style="font-weight:600; color:var(--text-primary);">${barber.name}</div>
              <div style="font-size:0.8rem; color:var(--primary);">${specText}</div>
            </div>
          </div>
        `;
      });
      // Re-inicializar iconos
      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      console.error("Error cargando equipo:", err.message);
    }
  }
  loadTeam();

  // --- 2. Carga de Datos desde Supabase (Reservas) ---
  async function loadServices() {
    try {
      const { data: services, error } = await supabase
        .from("services")
        .select("*")
        .eq("active", true);

      if (error) throw error;

      servicesContainer.innerHTML = "";
      if (services.length === 0) {
        servicesContainer.innerHTML = "<p class='text-muted'>No hay servicios disponibles.</p>";
        return;
      }

      services.forEach(service => {
        const item = document.createElement("div");
        item.className = "service-item";
        item.dataset.id = service.id;
        item.dataset.name = service.name;
        item.dataset.price = service.price;
        
        item.innerHTML = `
          <div class="service-info">
            <span class="service-name">${service.name}</span>
            <span class="service-meta">${service.duration_minutes} min • ${service.description || ''}</span>
          </div>
          <span class="service-price">$${Number(service.price)}</span>
        `;
        
        item.addEventListener("click", () => {
          document.querySelectorAll(".service-item").forEach(i => i.classList.remove("selected"));
          item.classList.add("selected");
          bookingState.serviceId = service.id;
          bookingState.serviceName = service.name;
          bookingState.servicePrice = service.price;
          
          // Habilitar avance
          document.getElementById("btn-to-step2").removeAttribute("disabled");
        });

        servicesContainer.appendChild(item);
      });
    } catch (err) {
      console.error("Error cargando servicios:", err.message);
      servicesContainer.innerHTML = "<p class='text-danger'>Error al conectar con la base de datos.</p>";
    }
  }

  async function loadBarbers() {
    try {
      const { data: barbers, error } = await supabase
        .from("barbers")
        .select("*")
        .eq("active", true);

      if (error) throw error;

      barbersContainer.innerHTML = "";
      if (barbers.length === 0) {
        barbersContainer.innerHTML = "<p class='text-muted'>No hay barberos disponibles.</p>";
        return;
      }

      barbers.forEach(barber => {
        const item = document.createElement("div");
        item.className = "barber-item";
        item.dataset.id = barber.id;
        item.dataset.name = barber.name;

        const defaultAvatar = "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=150&auto=format&fit=crop&q=80";
        const specialtiesList = barber.specialties ? barber.specialties.join(", ") : "Cortes en general";

        item.innerHTML = `
          <div class="barber-profile-row">
            <img class="barber-avatar" src="${barber.photo_url || defaultAvatar}" alt="${barber.name}">
            <div class="barber-info">
              <span class="barber-name">${barber.name}</span>
              <span class="service-meta">${specialtiesList}</span>
            </div>
          </div>
        `;

        item.addEventListener("click", () => {
          document.querySelectorAll(".barber-item").forEach(i => i.classList.remove("selected"));
          item.classList.add("selected");
          bookingState.barberId = barber.id;
          bookingState.barberName = barber.name;
          
          document.getElementById("btn-to-step3").removeAttribute("disabled");
        });

        barbersContainer.appendChild(item);
      });
    } catch (err) {
      console.error("Error cargando barberos:", err.message);
      barbersContainer.innerHTML = "<p class='text-danger'>Error al conectar con la base de datos.</p>";
    }
  }

  // --- 3. Lógica del Calendario Táctil y Horarios ---
  function buildDateSelector() {
    dateScrollContainer.innerHTML = "";
    const daysName = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
    
    // Generar próximos 7 días
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);

      // Opcional: Saltar domingos
      if (date.getDay() === 0) continue;

      const dayName = daysName[date.getDay()];
      const dayNum = date.getDate();
      const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD

      const bubble = document.createElement("div");
      bubble.className = "date-bubble";
      bubble.dataset.date = dateStr;
      bubble.innerHTML = `
        <span class="date-bubble-dayname">${dayName}</span>
        <span class="date-bubble-day">${dayNum}</span>
      `;

      bubble.addEventListener("click", () => {
        document.querySelectorAll(".date-bubble").forEach(b => b.classList.remove("selected"));
        bubble.classList.add("selected");
        bookingState.selectedDate = dateStr;
        bookingState.selectedTime = ""; // Resetear hora anterior
        document.getElementById("btn-to-step4").setAttribute("disabled", "true");
        loadAvailableTimes();
      });

      dateScrollContainer.appendChild(bubble);
    }
  }

  async function loadAvailableTimes() {
    if (!bookingState.barberId || !bookingState.selectedDate) return;
    
    timeGridContainer.innerHTML = "<p class='text-muted'>Cargando horarios...</p>";

    try {
      // 1. Obtener citas ocupadas para el barbero y fecha seleccionados
      const { data: appointments, error } = await supabase
        .from("appointments")
        .select("appointment_time")
        .eq("barber_id", bookingState.barberId)
        .eq("appointment_date", bookingState.selectedDate)
        .neq("status", "cancelled");

      if (error) throw error;

      // Crear lista de horas ocupadas (formato HH:MM)
      const busyTimes = appointments.map(app => {
        // El formato de time en PG suele ser HH:MM:SS
        return app.appointment_time.slice(0, 5); 
      });

      // 2. Definir horarios disponibles (de 9:00 AM a 6:00 PM cada 30 minutos)
      const slots = [
        "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", 
        "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", 
        "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"
      ];

      timeGridContainer.innerHTML = "";

      slots.forEach(slot => {
        const isBusy = busyTimes.includes(slot);
        const bubble = document.createElement("div");
        bubble.className = `time-bubble ${isBusy ? 'disabled' : ''}`;
        bubble.innerText = slot;

        if (!isBusy) {
          bubble.addEventListener("click", () => {
            document.querySelectorAll(".time-bubble").forEach(tb => tb.classList.remove("selected"));
            bubble.classList.add("selected");
            bookingState.selectedTime = slot;
            
            document.getElementById("btn-to-step4").removeAttribute("disabled");
          });
        }

        timeGridContainer.appendChild(bubble);
      });
    } catch (err) {
      console.error("Error cargando horarios:", err.message);
      timeGridContainer.innerHTML = "<p class='text-danger'>Error al cargar horarios.</p>";
    }
  }

  // --- 4. Control de Pasos (Wizard Navigation) ---
  function goToStep(stepIndex) {
    if (stepIndex < 0 || stepIndex >= steps.length) return;

    // Desactivar pane e indicator anterior
    const prevStep = steps[currentStepIndex];
    document.getElementById(prevStep.pane).classList.remove("active");
    document.getElementById(prevStep.indicator).classList.remove("active");
    if (stepIndex > currentStepIndex) {
      document.getElementById(prevStep.indicator).classList.add("completed");
    } else {
      document.getElementById(steps[stepIndex].indicator).classList.remove("completed");
    }

    // Activar nuevo paso
    currentStepIndex = stepIndex;
    const newStep = steps[currentStepIndex];
    document.getElementById(newStep.pane).classList.add("active");
    document.getElementById(newStep.indicator).classList.add("active");

    // Lógicas específicas de pasos
    if (newStep.pane === "pane-service") {
      loadServices();
    } else if (newStep.pane === "pane-barber") {
      loadBarbers();
    } else if (newStep.pane === "pane-time") {
      buildDateSelector();
      timeGridContainer.innerHTML = "<p class='text-muted'>Por favor selecciona una fecha arriba.</p>";
    } else if (newStep.pane === "pane-details") {
      // Mostrar resumen en el formulario
      const rawDate = new Date(bookingState.selectedDate + "T00:00:00");
      const formattedDate = rawDate.toLocaleDateString("es-ES", { weekday: 'long', day: 'numeric', month: 'long' });
      
      summaryDetails.innerHTML = `
        <div class="card" style="margin-bottom:0px;">
          <h4 style="color:var(--primary); margin-bottom:8px;">${bookingState.serviceName}</h4>
          <p class="service-meta" style="margin-bottom:6px;"><strong style="color:#fff">Barbero:</strong> ${bookingState.barberName}</p>
          <p class="service-meta" style="margin-bottom:6px;"><strong style="color:#fff">Fecha:</strong> ${formattedDate}</p>
          <p class="service-meta"><strong style="color:#fff">Hora:</strong> ${bookingState.selectedTime} hs</p>
          <div style="border-top:1px solid rgba(255,255,255,0.05); margin-top:12px; padding-top:12px; display:flex; justify-content:space-between;">
            <strong>Total a Pagar:</strong>
            <strong style="color:var(--primary); font-size:1.1rem;">$${parseFloat(bookingState.servicePrice).toFixed(2)}</strong>
          </div>
        </div>
      `;
    }
  }

  function resetBookingWizard() {
    bookingState.serviceId = null;
    bookingState.serviceName = "";
    bookingState.servicePrice = 0;
    bookingState.barberId = null;
    bookingState.barberName = "";
    bookingState.selectedDate = "";
    bookingState.selectedTime = "";

    // Limpiar clases de pasos
    steps.forEach(step => {
      document.getElementById(step.pane).classList.remove("active");
      document.getElementById(step.indicator).classList.remove("active", "completed");
    });

    currentStepIndex = 0;
    document.getElementById("btn-to-step2").setAttribute("disabled", "true");
    document.getElementById("btn-to-step3").setAttribute("disabled", "true");
    document.getElementById("btn-to-step4").setAttribute("disabled", "true");
    
    if (formClient) formClient.reset();

    goToStep(0);
  }

  // Asignar listeners a botones de siguiente/atrás
  document.getElementById("btn-to-step2").addEventListener("click", () => goToStep(1));
  document.getElementById("btn-back-to-step1").addEventListener("click", () => goToStep(0));

  document.getElementById("btn-to-step3").addEventListener("click", () => goToStep(2));
  document.getElementById("btn-back-to-step2").addEventListener("click", () => goToStep(1));

  document.getElementById("btn-to-step4").addEventListener("click", () => goToStep(3));
  document.getElementById("btn-back-to-step3").addEventListener("click", () => goToStep(2));

  // Botón "Reservar de Nuevo" en la pantalla final de éxito
  document.getElementById("btn-reset-booking").addEventListener("click", () => {
    resetBookingWizard();
  });

  // Permitir volver a pasos anteriores haciendo clic en el indicador superior
  steps.forEach((step, index) => {
    const indicator = document.getElementById(step.indicator);
    if (indicator) {
      indicator.addEventListener("click", () => {
        // Solo permitir ir a pasos anteriores o al paso actual
        if (index < currentStepIndex || indicator.classList.contains("completed")) {
          goToStep(index);
        }
      });
      // Añadir estilo pointer para indicar que es clicable
      indicator.style.cursor = "pointer";
    }
  });

  // --- 5. Envío de Cita a Supabase ---
  if (formClient) {
    formClient.addEventListener("submit", async (e) => {
      e.preventDefault();

      const btnSubmit = formClient.querySelector("button[type='submit']");
      const originalText = btnSubmit.innerText;
      btnSubmit.setAttribute("disabled", "true");
      btnSubmit.innerText = "Registrando turno...";

      const name = document.getElementById("client-name").value.trim();
      const phone = document.getElementById("client-phone").value.trim();
      const email = document.getElementById("client-email").value.trim() || null;

      try {
        const { data, error } = await supabase
          .from("appointments")
          .insert([
            {
              client_name: name,
              client_phone: phone,
              client_email: email,
              barber_id: bookingState.barberId,
              service_id: bookingState.serviceId,
              appointment_date: bookingState.selectedDate,
              appointment_time: bookingState.selectedTime + ":00", // Añadir segundos para formato TIME
              status: "scheduled"
            }
          ])
          .select();

        if (error) throw error;

        // Renderizar pantalla de confirmación final exitosa (Paso 5)
        const rawDate = new Date(bookingState.selectedDate + "T00:00:00");
        const formattedDate = rawDate.toLocaleDateString("es-ES", { weekday: 'long', day: 'numeric', month: 'long' });

        confirmationDetails.innerHTML = `
          <div class="card-glass" style="border-color:var(--success); text-align:center;">
            <div style="width:50px; height:50px; border-radius:50%; background:rgba(16,185,129,0.15); display:inline-flex; align-items:center; justify-content:center; margin-bottom:16px;">
              <i data-lucide="check" style="stroke:var(--success); width:30px; height:30px;"></i>
            </div>
            <h3 style="color:var(--success); margin-bottom:8px;">¡Turno Agendado!</h3>
            <p class="service-meta" style="margin-bottom:16px;">Tu cita se ha registrado exitosamente. Te esperamos.</p>
            <div style="text-align:left; border-top:1px solid rgba(255,255,255,0.05); padding-top:16px; display:flex; flex-direction:column; gap:8px;">
              <p class="service-meta"><strong style="color:#fff">Cliente:</strong> ${name}</p>
              <p class="service-meta"><strong style="color:#fff">Servicio:</strong> ${bookingState.serviceName}</p>
              <p class="service-meta"><strong style="color:#fff">Barbero:</strong> ${bookingState.barberName}</p>
              <p class="service-meta"><strong style="color:#fff">Fecha:</strong> ${formattedDate}</p>
              <p class="service-meta"><strong style="color:#fff">Hora:</strong> ${bookingState.selectedTime} hs</p>
            </div>
          </div>
        `;
        
        // Re-iniciar iconos en el contenido inyectado
        lucide.createIcons();
        
        goToStep(4); // Ir al paso 5 (índice 4)
      } catch (err) {
        console.error("Error insertando reserva:", err.message);
        alert("Ocurrió un error al agendar tu cita: " + err.message);
      } finally {
        btnSubmit.removeAttribute("disabled");
        btnSubmit.innerText = originalText;
      }
    });
  }

});
