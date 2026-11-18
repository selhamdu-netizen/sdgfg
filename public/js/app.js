/**
 * شركة بصمة كلين للخدمات والنظافة العامة - موريتانيا
 * BASSMA CLEAN Mauritanie - Core Application Engine
 */

let allServices = [];
let allActivities = [];
const PRICE_PER_SQM = 100; // 100 MRU لكل متر مربع معتمد رسمياً

document.addEventListener("DOMContentLoaded", async () => {
  // Clear any old cached services with external photos
  try {
    localStorage.removeItem("bassma_services");
  } catch (e) {}

  // 0. Initialize theme (Light / Dark mode: Clair / Sombre)
  initTheme();

  // 1. Initialize language
  setLanguage(currentLang);

  // 2. Initialize Database Layer
  await DB.init();

  // 3. Render dynamic content
  await loadAndRenderServices();
  await loadAndRenderActivities();
  await loadAndRenderNews();
  await loadAndRenderTestimonials();

  // 4. Initialize Map
  setTimeout(() => {
    initWasteMap();
  }, 300);

  // 5. Update user interface depending on session
  checkAuthSession();

  // 6. Setup image preview listeners
  setupImagePreview("orderPhotoInput", "orderPhotoPreview");
  setupImagePreview("repPhotoInput", "repPhotoPreview");

  // 7. Initialize hero and order payment selectors
  setTimeout(() => {
    onHeroPayMethodChange();
    onOrderPayMethodChange();
  }, 150);

  // 8. Listen for language changes to re-render all dynamic content instantly
  window.addEventListener("languageChanged", async () => {
    updateThemeButtonUI(localStorage.getItem("bassma_theme") || "light");
    onHeroPayMethodChange();
    onOrderPayMethodChange();
    await loadAndRenderServices();
    await loadAndRenderActivities();
    await loadAndRenderNews();
    await loadAndRenderTestimonials();
  });
});

// ==================== وضع الإضاءة: الفاتح / الداكن (Clair / Sombre) ====================
function initTheme() {
  const savedTheme = localStorage.getItem("bassma_theme");
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = savedTheme ? savedTheme : (prefersDark ? 'dark' : 'light');
  applyTheme(theme, false);
}

function applyTheme(theme, showNotification = false) {
  const html = document.documentElement;
  const isDark = theme === "dark";
  if (isDark) {
    html.classList.add("dark");
  } else {
    html.classList.remove("dark");
  }
  localStorage.setItem("bassma_theme", theme);
  updateThemeButtonUI(theme);

  if (showNotification) {
    const isAr = currentLang === "ar";
    const msg = isAr 
      ? (isDark ? "تم تفعيل الوضع الداكن (Mode Sombre) 🌙" : "تم تفعيل الوضع الفاتح (Mode Clair) ☀️")
      : (isDark ? "Mode Sombre activé 🌙" : "Mode Clair activé ☀️");
    showToast(msg, "success");
  }
}

function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.classList.contains("dark");
  const newTheme = isDark ? "light" : "dark";
  applyTheme(newTheme, true);
}

function updateThemeButtonUI(theme) {
  const isDark = theme === "dark";
  const btns = document.querySelectorAll(".theme-toggle-btn");
  btns.forEach(btn => {
    const icon = btn.querySelector(".theme-icon");
    const label = btn.querySelector(".theme-label");
    if (icon) {
      icon.className = isDark 
        ? "fa-solid fa-sun text-amber-400 theme-icon text-sm md:text-base" 
        : "fa-solid fa-moon text-sky-400 theme-icon text-sm md:text-base";
    }
    if (label) {
      const isAr = currentLang === "ar";
      if (isAr) {
        label.textContent = isDark ? "فاتح (Clair)" : "داكن (Sombre)";
      } else {
        label.textContent = isDark ? "Clair" : "Sombre";
      }
    }
    btn.setAttribute("title", isDark ? "Basculer vers le mode Clair" : "Basculer vers le mode Sombre");
  });
}

// Toast notification helper
function showToast(message, type = "success") {
  const toast = document.getElementById("appToast");
  const msgEl = document.getElementById("toastMessage");
  const iconEl = document.getElementById("toastIcon");

  if (!toast || !msgEl) return;

  msgEl.textContent = message;
  toast.classList.remove("hidden", "translate-y-20", "opacity-0");

  if (iconEl) {
    iconEl.className = type === "error" 
      ? "fa-solid fa-circle-exclamation text-red-400 text-lg mr-2 ml-2" 
      : "fa-solid fa-circle-check text-sky-400 text-lg mr-2 ml-2";
  }

  setTimeout(() => {
    toast.classList.add("translate-y-20", "opacity-0");
    setTimeout(() => toast.classList.add("hidden"), 300);
  }, 4000);
}

// ==================== الخدمات التخصصية الـ 11 (Services) ====================
async function loadAndRenderServices(categoryFilter = "all") {
  allServices = await DB.getServices();
  const container = document.getElementById("servicesContainer");
  const selectOrder = document.getElementById("orderServiceSelect");

  if (!container) return;

  const isAr = currentLang === "ar";
  const filtered = categoryFilter === "all" ? allServices : allServices.filter(s => s.category === categoryFilter);

  let html = "";
  let selectOptionsHtml = "";

  allServices.forEach(s => {
    const title = isAr ? s.title_ar : s.title_fr;
    selectOptionsHtml += `<option value="${s.id}">${title}</option>`;
  });

  if (selectOrder) {
    selectOrder.innerHTML = selectOptionsHtml;
  }

  filtered.forEach(service => {
    const title = isAr ? service.title_ar : service.title_fr;
    const desc = isAr ? service.description_ar : service.description_fr;
    const features = (isAr ? service.features_ar : service.features_fr || "").split(";");

    const featuresList = features.slice(0, 3).map(f => `
      <li class="flex items-center text-xs text-slate-600 mb-1.5">
        <i class="fa-solid fa-circle-check text-sky-600 mr-2 ml-2 text-sm"></i>
        <span>${f.trim()}</span>
      </li>
    `).join("");

    html += `
      <div class="glass-card rounded-2xl overflow-hidden hover-lift flex flex-col justify-between border border-slate-200 shadow-sm transition duration-300">
        <div>
          <div class="relative p-6 bg-gradient-to-br from-[#0b1d51] via-[#162d6f] to-sky-700 text-white flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-sky-300 text-xl border border-white/20 shadow-inner">
                <i class="fa-solid fa-${service.icon || 'broom'}"></i>
              </div>
              <div>
                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/30 text-sky-200 border border-sky-400/30 backdrop-blur-sm block mb-1">
                  ${isAr ? 'خدمة احترافية' : 'Service Professionnel'}
                </span>
                <span class="text-xs text-sky-100 font-semibold">بصمة كلين 🇲🇷</span>
              </div>
            </div>
            <div class="text-right">
              <span class="text-[10px] text-sky-200 block">السعر الأساسي</span>
              <span class="text-sm font-black text-amber-300 bg-amber-400/20 px-2.5 py-1 rounded-lg border border-amber-400/30">100 MRU / م²</span>
            </div>
          </div>
          <div class="p-5">
            <h3 class="text-base font-bold text-slate-900 mb-2 leading-snug">${title}</h3>
            <p class="text-xs text-slate-500 mb-4 line-clamp-3 leading-relaxed">${desc}</p>
            <div class="border-t border-slate-100 pt-3 mb-4">
              <strong class="block text-xs text-slate-800 font-semibold mb-2">${isAr ? 'أبرز مميزات الخدمة:' : 'Points forts de la prestation :'}</strong>
              <ul>${featuresList}</ul>
            </div>
          </div>
        </div>
        <div class="p-5 pt-0 grid grid-cols-2 gap-2">
          <button onclick="openServiceDetailsModal(${service.id})" class="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center justify-center">
            <i class="fa-solid fa-circle-info mr-1 ml-1"></i> ${isAr ? 'التفاصيل' : 'Détails'}
          </button>
          <button onclick="quickOrderService(${service.id})" class="px-3 py-2 text-xs font-bold rounded-xl bg-[#0b1d51] hover:bg-[#162d6f] text-white transition flex items-center justify-center shadow-sm">
            <i class="fa-solid fa-calculator mr-1 ml-1 text-sky-400"></i> ${isAr ? 'احسب واطلب' : 'Calculer & Commander'}
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function filterServices(category) {
  document.querySelectorAll(".service-filter-btn").forEach(btn => {
    btn.classList.remove("bg-[#0b1d51]", "text-white", "font-bold");
    btn.classList.add("bg-white", "text-slate-600", "hover:bg-slate-50");
  });

  const activeBtn = document.getElementById(`serviceTab_${category}`);
  if (activeBtn) {
    activeBtn.classList.add("bg-[#0b1d51]", "text-white", "font-bold");
    activeBtn.classList.remove("bg-white", "text-slate-600");
  }

  loadAndRenderServices(category);
}

function openServiceDetailsModal(serviceId) {
  const service = allServices.find(s => s.id === serviceId);
  if (!service) return;

  const modal = document.getElementById("serviceDetailsModal");
  const content = document.getElementById("serviceModalContent");
  if (!modal || !content) return;

  const isAr = currentLang === "ar";
  const title = isAr ? service.title_ar : service.title_fr;
  const desc = isAr ? service.description_ar : service.description_fr;
  const features = (isAr ? service.features_ar : service.features_fr || "").split(";");
  const equipment = isAr ? service.equipment_ar : service.equipment_fr;

  content.innerHTML = `
    <div class="space-y-4 text-right" style="direction: ${isAr ? 'rtl' : 'ltr'}; text-align: ${isAr ? 'right' : 'left'};">
      <div class="p-6 rounded-2xl bg-gradient-to-br from-[#0b1d51] via-[#162d6f] to-sky-700 text-white shadow-md flex items-center justify-between">
        <div>
          <span class="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold mb-2 text-sky-200">${isAr ? 'شركة بصمة كلين - موريتانيا 🇲🇷' : 'Bassma Clean Mauritanie'}</span>
          <h2 class="text-xl md:text-2xl font-bold">${title}</h2>
          <p class="text-xs text-sky-200 mt-1">السعر: 100 MRU لكل متر مربع</p>
        </div>
        <div class="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center text-3xl text-sky-300 border border-white/20">
          <i class="fa-solid fa-${service.icon || 'broom'}"></i>
        </div>
      </div>

      <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
        <h4 class="text-sm font-bold text-slate-800 mb-2">${isAr ? 'نطاق الخدمة:' : 'Description générale :'}</h4>
        <p class="text-xs text-slate-600 leading-relaxed">${desc}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-white p-4 rounded-xl border border-slate-200">
          <h4 class="text-xs font-bold text-slate-900 mb-2 flex items-center">
            <i class="fa-solid fa-star text-sky-600 mr-2 ml-2"></i> ${isAr ? 'المميزات والضمانات:' : 'Points forts & Garanties :'}
          </h4>
          <ul class="space-y-1.5 text-xs text-slate-700">
            ${features.map(f => `<li><i class="fa-solid fa-check text-sky-600 mr-1.5 ml-1.5"></i> ${f.trim()}</li>`).join('')}
          </ul>
        </div>
        <div class="bg-white p-4 rounded-xl border border-slate-200">
          <h4 class="text-xs font-bold text-slate-900 mb-2 flex items-center">
            <i class="fa-solid fa-screwdriver-wrench text-sky-600 mr-2 ml-2"></i> ${isAr ? 'الآليات والمعدات المستخدمة:' : 'Matériel & Équipements :'}
          </h4>
          <p class="text-xs text-slate-600 leading-relaxed">${equipment || (isAr ? 'معدات احترافية مطابقة لمعايير السلامة' : 'Équipements conformes aux normes')}</p>
        </div>
      </div>

      <div class="border-t border-slate-200 pt-4 flex items-center justify-between">
        <span class="text-xs text-slate-500">${isAr ? 'عقود دورية متاحة للشركات والمؤسسات' : 'Contrats disponibles pour entreprises'}</span>
        <button onclick="quickOrderService(${service.id}); closeServiceDetailsModal();" class="px-5 py-2.5 bg-[#0b1d51] hover:bg-[#162d6f] text-white rounded-xl text-xs font-bold shadow-md transition">
          <i class="fa-solid fa-arrow-left mr-1.5 ml-1.5 text-sky-400"></i> ${isAr ? 'متابعة وطلب هذه الخدمة' : 'Commander cette prestation'}
        </button>
      </div>
    </div>
  `;

  modal.classList.remove("hidden");
}

function closeServiceDetailsModal() {
  document.getElementById("serviceDetailsModal")?.classList.add("hidden");
}

function quickOrderService(serviceId) {
  const selectOrder = document.getElementById("orderServiceSelect");
  if (selectOrder) {
    selectOrder.value = serviceId;
  }
  const orderSection = document.getElementById("section-order");
  if (orderSection) {
    orderSection.scrollIntoView({ behavior: "smooth" });
  }
}

// ==================== طلب الخدمات والعقود (Order Submission) ====================
async function handleServiceOrderSubmit(e) {
  e.preventDefault();

  const btn = document.getElementById("btnSubmitOrder");
  const originalHtml = btn ? btn.innerHTML : "";
  if (btn) btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2 ml-2"></i> ${currentLang === 'ar' ? 'جارٍ تسجيل الطلب...' : 'Envoi en cours...'}`;

  const clientType = document.querySelector('input[name="client_type"]:checked')?.value || "individual";
  const name = document.getElementById("orderName").value.trim();
  const phone = document.getElementById("orderPhone").value.trim();
  const email = document.getElementById("orderEmail").value.trim();
  const serviceId = parseInt(document.getElementById("orderServiceSelect").value) || 1;
  const contractType = document.getElementById("orderContractType").value;
  const city = document.getElementById("orderCity").value.trim() || "نواكشوط";
  const district = document.getElementById("orderDistrict").value.trim();
  const address = document.getElementById("orderAddress").value.trim();
  const description = document.getElementById("orderDesc").value.trim();
  const photoUrl = document.getElementById("orderPhotoPreviewImg")?.src || "";

  const selectedService = allServices.find(s => s.id === serviceId);
  const serviceTitle = selectedService 
    ? (currentLang === 'ar' ? selectedService.title_ar : selectedService.title_fr) 
    : "خدمة نظافة متكاملة";

  const user = DB.getCurrentUser();

  const area = parseFloat(document.getElementById("orderAreaInput")?.value) || 0;
  const totalCost = area * PRICE_PER_SQM;
  const payMethod = document.querySelector('input[name="order_payment_method"]:checked')?.value || "visit";

  const payload = {
    user_id: user ? user.id : null,
    client_name: name,
    client_type: clientType,
    phone,
    email,
    service_id: serviceId,
    service_title: serviceTitle,
    contract_type: contractType,
    city,
    district,
    address,
    description,
    area_sqm: area,
    total_cost: totalCost,
    payment_method: payMethod,
    photo_url: photoUrl.startsWith("data:") ? photoUrl : (photoUrl || "")
  };

  try {
    const res = await DB.createOrder(payload);
    if (res.success) {
      showOrderSuccessModal(res.ref_code, payload);
      e.target.reset();
      document.getElementById("orderPhotoPreview")?.classList.add("hidden");
      // Reset order cost card
      calcOrderFormCost();
    } else {
      alert(res.message || "حدث خطأ أثناء إرسال الطلب");
    }
  } catch (err) {
    console.error(err);
    alert("تعذر إرسال الطلب، يرجى المحاولة لاحقاً");
  } finally {
    if (btn) btn.innerHTML = originalHtml;
  }
}

function showOrderSuccessModal(refCode, orderData = null) {
  const modal = document.getElementById("orderSuccessModal");
  const refDisplay = document.getElementById("successOrderRefCode");
  if (refDisplay) refDisplay.textContent = refCode;

  const detailsBox = document.getElementById("successPaymentDetailsBox");
  if (detailsBox && orderData) {
    const areaEl = document.getElementById("successOrderArea");
    const costEl = document.getElementById("successOrderCost");
    const methodEl = document.getElementById("successOrderMethod");
    const instEl = document.getElementById("successOrderInstructions");

    const isAr = currentLang === "ar";
    const methodLabels = {
      visit: isAr ? "زيارة الشركة (مقرنا بنواكشوط)" : "Visite au siège (Nouakchott)",
      bankily: isAr ? "بنكيلي — Bankily (BPM: 45 25 00 00)" : "Bankily (BPM : 45 25 00 00)",
      masrafi: isAr ? "مصرفي — Masrifi (BIM: 36 00 00 00)" : "Masrifi (BIM : 36 00 00 00)",
      sadad: isAr ? "السداد — Seddad (BMCI: BASSMA)" : "Seddad (BMCI : Code BASSMA)"
    };

    const methodInstructions = {
      visit: isAr 
        ? "يرجى التوجه إلى مقرنا في تفرغ زينة لإتمام العقد والدفع نقداً أو بشيك. للتنسيق المباشر: 45 25 00 00."
        : "Veuillez vous présenter à notre siège à Tevragh-Zeina pour finaliser le contrat. Contact : 45 25 00 00.",
      bankily: isAr 
        ? "يرجى تحويل المبلغ عبر تطبيق بنكيلي إلى الرقم 45 25 00 00 وإرسال لقطة الشاشة مع رقم التتبع."
        : "Veuillez effectuer le virement via Bankily vers le 45 25 00 00 en précisant votre référence.",
      masrafi: isAr 
        ? "يرجى تحويل المبلغ عبر تطبيق مصرفي إلى الرقم 36 00 00 00 وإرسال إشعار العملية لتأكيد الطلب."
        : "Veuillez effectuer le transfert via Masrifi vers le 36 00 00 00 avec votre référence.",
      sadad: isAr 
        ? "يرجى الدفع عبر تطبيق السداد برمز الخدمة BASSMA أو الحساب 22 15 00 00."
        : "Effectuez le paiement via Seddad avec le code marchand BASSMA ou le compte 22 15 00 00."
    };

    if (areaEl) areaEl.textContent = (orderData.area_sqm || 0) + " م²";
    if (costEl) costEl.textContent = ((orderData.total_cost || 0).toLocaleString("ar-MR")) + " MRU";
    if (methodEl) methodEl.textContent = methodLabels[orderData.payment_method] || orderData.payment_method;
    if (instEl) instEl.textContent = methodInstructions[orderData.payment_method] || "";

    detailsBox.classList.remove("hidden");
  }

  if (modal) modal.classList.remove("hidden");
}

function copyReferenceCode(codeId) {
  const code = document.getElementById(codeId)?.textContent;
  if (code) {
    navigator.clipboard.writeText(code);
    showToast(currentLang === 'ar' ? 'تم نسخ الرقم المرجعي بنجاح' : 'Référence copiée avec succès !');
  }
}

function trackOrderFromSuccessModal() {
  const code = document.getElementById("successOrderRefCode")?.textContent;
  document.getElementById("orderSuccessModal")?.classList.add("hidden");
  if (code) {
    const trackerInput = document.getElementById("trackerRefInput");
    if (trackerInput) trackerInput.value = code;
    trackOrder();
    document.getElementById("section-tracking")?.scrollIntoView({ behavior: "smooth" });
  }
}

// ==================== متابعة حالة الطلب (Live Tracker) ====================
async function trackOrder() {
  const input = document.getElementById("trackerRefInput");
  const refCode = input?.value.trim();
  const resultContainer = document.getElementById("trackerResultContainer");

  if (!refCode) {
    alert(currentLang === 'ar' ? 'يرجى إدخال الرقم المرجعي للطلب' : 'Veuillez saisir votre référence de suivi');
    return;
  }

  const order = await DB.getOrderByRef(refCode);
  if (!order) {
    alert(currentLang === 'ar' ? `لم يتم العثور على أي طلب بالرقم المرجعي: ${refCode}` : `Aucune demande trouvée avec la référence : ${refCode}`);
    return;
  }

  const isAr = currentLang === 'ar';
  const steps = [
    { key: 'received', title: isAr ? 'تم استلام الطلب' : 'Demande Reçue', desc: isAr ? 'تسجيل البيانات بالنظام' : 'Enregistrement' },
    { key: 'under_review', title: isAr ? 'قيد المعاينة والدراسة' : 'Visite / Examen', desc: isAr ? 'معاينة الموقع وتحديد المتطلبات' : 'Étude sur le terrain' },
    { key: 'approved', title: isAr ? 'تمت الموافقة الرسمية' : 'Approuvée', desc: isAr ? 'تأكيد الحجز وتوقيع الاتفاق' : 'Validation du devis' },
    { key: 'in_progress', title: isAr ? 'قيد التنفيذ الميداني' : 'En Cours', desc: isAr ? 'طاقم العمل الميداني بالموقع' : 'Équipe sur le terrain' },
    { key: 'completed', title: isAr ? 'مكتمل بنجاح' : 'Achevée', desc: isAr ? 'إنهاء الأعمال وتسليم الموقع' : 'Contrôle & Clôture' }
  ];

  const statusOrder = ['received', 'under_review', 'approved', 'in_progress', 'completed'];
  const currentIndex = statusOrder.indexOf(order.status);
  const isRejected = order.status === 'rejected';

  let stepperHtml = '';
  steps.forEach((step, idx) => {
    const isActive = !isRejected && currentIndex >= idx;
    const isCurrent = !isRejected && currentIndex === idx;

    stepperHtml += `
      <div class="step-item ${isActive ? 'active' : ''}">
        <div class="step-circle ${isCurrent ? 'ring-4 ring-sky-300' : ''}">
          ${isActive ? '<i class="fa-solid fa-check"></i>' : (idx + 1)}
        </div>
        <span class="text-xs font-bold mt-2 ${isActive ? 'text-[#0b1d51]' : 'text-slate-400'} text-center">${step.title}</span>
        <span class="text-[10px] text-slate-400 text-center">${step.desc}</span>
      </div>
    `;
  });

  const rejectionAlert = isRejected ? `
    <div class="bg-red-50 border-r-4 border-red-500 p-4 rounded-xl mb-6">
      <div class="flex items-center text-red-800 font-bold text-sm mb-1">
        <i class="fa-solid fa-triangle-exclamation mr-2 ml-2"></i> ${isAr ? 'تم رفض الطلب' : 'Demande refusée'}
      </div>
      <p class="text-xs text-red-700">${order.rejection_reason || (isAr ? 'الطلب خارج نطاق الخدمة أو يتعارض مع الشروط الفنية.' : 'Hors zone d\'intervention.')}</p>
    </div>
  ` : '';

  resultContainer.innerHTML = `
    <div class="glass-card rounded-2xl p-6 border border-sky-200 shadow-md">
      <div class="flex flex-wrap items-center justify-between border-b border-slate-200 pb-4 mb-6">
        <div>
          <span class="text-xs text-slate-400 block">${isAr ? 'الرقم المرجعي للطلب' : 'Référence'}</span>
          <span class="text-xl font-mono font-bold text-sky-700">${order.ref_code}</span>
        </div>
        <div class="text-right mt-2 sm:mt-0">
          <span class="text-xs text-slate-400 block">${isAr ? 'تاريخ التقديم' : 'Date d\'envoi'}</span>
          <span class="text-xs font-bold text-slate-700">${order.created_at}</span>
        </div>
      </div>

      ${rejectionAlert}

      <div class="flex items-center justify-between overflow-x-auto py-6 mb-6">
        ${stepperHtml}
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-xs">
        <div><strong class="text-slate-500">${isAr ? 'العميل:' : 'Client :'}</strong> <span class="font-bold text-slate-800">${order.client_name}</span></div>
        <div><strong class="text-slate-500">${isAr ? 'الخدمة المطلوبة:' : 'Service :'}</strong> <span class="font-bold text-slate-800">${order.service_title}</span></div>
        <div><strong class="text-slate-500">${isAr ? 'الموقع والعنوان:' : 'Adresse :'}</strong> <span>${order.city} - ${order.district || ''} (${order.address})</span></div>
        <div><strong class="text-slate-500">${isAr ? 'ملاحظات الإدارة:' : 'Note opérationnelle :'}</strong> <span>${order.admin_notes || (isAr ? 'جاري التنسيق الميداني.' : 'En cours de coordination.')}</span></div>
      </div>
    </div>
  `;

  resultContainer.classList.remove("hidden");
}

// ==================== الإبلاغ عن تراكم النفايات (Waste Report) ====================
async function handleWasteReportSubmit(e) {
  e.preventDefault();

  const btn = document.getElementById("btnSubmitReport");
  const originalHtml = btn ? btn.innerHTML : "";
  if (btn) btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2 ml-2"></i> ${currentLang === 'ar' ? 'جارٍ تسجيل البلاغ...' : 'Transmission...'}`;

  const name = document.getElementById("repName").value.trim() || (currentLang === 'ar' ? 'مواطن مسؤول' : 'Citoyen Responsable');
  const phone = document.getElementById("repPhone").value.trim();
  const city = document.getElementById("repCity").value.trim() || "نواكشوط";
  const district = document.getElementById("repDistrict").value.trim();
  const street = document.getElementById("repStreet").value.trim();
  const desc = document.getElementById("repDesc").value.trim();
  const lat = parseFloat(document.getElementById("repLatitude").value) || 18.0735;
  const lng = parseFloat(document.getElementById("repLongitude").value) || -15.9582;
  const photoUrl = document.getElementById("repPhotoPreviewImg")?.src || "";

  const user = DB.getCurrentUser();

  const payload = {
    user_id: user ? user.id : null,
    reporter_name: name,
    reporter_phone: phone,
    city,
    district,
    street,
    description: desc,
    latitude: lat,
    longitude: lng,
    photo_url: photoUrl.startsWith("data:") ? photoUrl : (photoUrl || "")
  };

  try {
    const res = await DB.createReport(payload);
    if (res.success) {
      showToast(currentLang === 'ar' ? `تم استلام بلاغكم بنجاح برقم: ${res.ref_code}` : `Signalement enregistré : ${res.ref_code}`);
      e.target.reset();
      document.getElementById("repPhotoPreview")?.classList.add("hidden");
      document.getElementById("repCoordsDisplay").textContent = currentLang === 'ar' ? "نواكشوط (انقر على الخريطة لتحديد الموقع)" : "Nouakchott (cliquez sur la carte)";

      await loadMapReports();

      if (wasteMap) {
        wasteMap.flyTo([lat, lng], 15);
      }
    }
  } catch (err) {
    console.error(err);
    alert("تعذر إرسال البلاغ");
  } finally {
    if (btn) btn.innerHTML = originalHtml;
  }
}

function setupImagePreview(inputId, previewContainerId) {
  const input = document.getElementById(inputId);
  const container = document.getElementById(previewContainerId);

  if (!input || !container) return;

  input.addEventListener("change", function () {
    const file = this.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        container.innerHTML = `
          <div class="relative inline-block mt-2">
            <img id="${inputId.replace('Input', 'PreviewImg')}" src="${e.target.result}" class="h-32 w-48 object-cover rounded-xl border border-slate-300 shadow-sm">
            <button type="button" onclick="document.getElementById('${inputId}').value=''; document.getElementById('${previewContainerId}').classList.add('hidden');" class="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow hover:bg-red-700">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        `;
        container.classList.remove("hidden");
      };
      reader.readAsDataURL(file);
    }
  });
}

// ==================== البرامج وخطط العمل (Action Plans) ====================
async function loadAndRenderActivities(categoryFilter = "all") {
  allActivities = await DB.getActivities();
  const container = document.getElementById("activitiesContainer");
  if (!container) return;

  const isAr = currentLang === "ar";
  const filtered = categoryFilter === "all" ? allActivities : allActivities.filter(a => a.category === categoryFilter);

  let html = "";
  filtered.forEach(act => {
    const title = isAr ? act.title_ar : act.title_fr;
    const desc = isAr ? act.description_ar : act.description_fr;

    html += `
      <div class="glass-card rounded-2xl overflow-hidden hover-lift border border-slate-200 shadow-sm flex flex-col justify-between">
        <div>
          <div class="relative h-48 overflow-hidden group">
            <img src="${act.image}" alt="${title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
            <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
            <div class="absolute bottom-3 right-3 left-3 flex items-center justify-between text-white text-xs">
              <span class="font-semibold"><i class="fa-solid fa-location-dot text-sky-400 mr-1 ml-1"></i> ${act.location}</span>
              <span class="px-2 py-0.5 rounded-full bg-sky-600/90 text-[10px] font-bold">${isAr ? 'برنامج وطني' : 'Plan National'}</span>
            </div>
          </div>
          <div class="p-5">
            <h3 class="font-bold text-base text-slate-900 mb-2 leading-snug">${title}</h3>
            <p class="text-xs text-slate-500 mb-4 leading-relaxed line-clamp-3">${desc}</p>
          </div>
        </div>
        <div class="p-5 pt-0 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
          <div class="text-sky-700 font-bold"><i class="fa-solid fa-flag mr-1 ml-1"></i> ${isAr ? 'في خدمة موريتانيا' : 'Au service du pays'}</div>
          <button onclick="document.getElementById('section-order').scrollIntoView({behavior:'smooth'})" class="text-xs text-[#0b1d51] hover:text-sky-600 font-bold">
            ${isAr ? 'طلب شراكة' : 'Partenariat'} <i class="fa-solid fa-arrow-left mr-1 ml-1"></i>
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function filterActivities(category) {
  document.querySelectorAll(".activity-filter-btn").forEach(btn => {
    btn.classList.remove("bg-[#0b1d51]", "text-white", "font-bold");
    btn.classList.add("bg-white", "text-slate-600", "hover:bg-slate-50");
  });

  const activeBtn = document.getElementById(`actTab_${category}`);
  if (activeBtn) {
    activeBtn.classList.add("bg-[#0b1d51]", "text-white", "font-bold");
    activeBtn.classList.remove("bg-white", "text-slate-600");
  }

  loadAndRenderActivities(category);
}

// ==================== الأخبار والتوعية (News) ====================
async function loadAndRenderNews() {
  const news = await DB.getNews();
  const container = document.getElementById("newsContainer");
  if (!container) return;

  const isAr = currentLang === "ar";
  let html = "";

  news.forEach(item => {
    const title = isAr ? item.title_ar : item.title_fr;
    const summary = isAr ? item.summary_ar : item.summary_fr;
    const content = isAr ? item.content_ar : item.content_fr;

    html += `
      <div class="glass-card rounded-2xl overflow-hidden hover-lift border border-slate-200 shadow-sm flex flex-col justify-between">
        <div>
          <div class="h-44 overflow-hidden relative">
            <img src="${item.image}" alt="${title}" class="w-full h-full object-cover">
            <div class="absolute top-3 right-3 bg-[#0b1d51] text-sky-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-sky-400/30">
              ${item.category === 'news' ? (isAr ? 'أخبار رسمية' : 'Actualité') : (isAr ? 'توعية مدنية' : 'Sensibilisation')}
            </div>
          </div>
          <div class="p-5">
            <span class="text-[11px] text-slate-400 block mb-1">${item.published_at || ''}</span>
            <h3 class="font-bold text-base text-slate-900 mb-2 leading-snug">${title}</h3>
            <p class="text-xs text-slate-500 leading-relaxed line-clamp-3">${summary}</p>
          </div>
        </div>
        <div class="p-5 pt-0">
          <button onclick="openNewsModal('${title.replace(/'/g, "\\'")}', '${item.image}', '${content.replace(/'/g, "\\'")}')" class="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center">
            ${isAr ? 'قراءة المزيد' : 'En savoir plus'} <i class="fa-solid fa-arrow-left mr-1.5 ml-1.5"></i>
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function openNewsModal(title, image, content) {
  const modal = document.getElementById("newsModal");
  const modalContent = document.getElementById("newsModalContent");
  if (!modal || !modalContent) return;

  const isAr = currentLang === "ar";
  modalContent.innerHTML = `
    <div class="space-y-4 text-right" style="direction: ${isAr ? 'rtl' : 'ltr'}; text-align: ${isAr ? 'right' : 'left'};">
      <img src="${image}" class="w-full h-56 object-cover rounded-xl shadow-sm">
      <h2 class="text-xl font-bold text-slate-900">${title}</h2>
      <p class="text-xs md:text-sm text-slate-600 leading-relaxed">${content}</p>
    </div>
  `;

  modal.classList.remove("hidden");
}

// ==================== الشكاوى والآراء (Feedback & Testimonials) ====================
async function handleFeedbackSubmit(e) {
  e.preventDefault();

  const name = document.getElementById("fbName").value.trim();
  const phone = document.getElementById("fbPhone").value.trim();
  const email = document.getElementById("fbEmail").value.trim();
  const feedbackType = document.getElementById("fbType").value;
  const subject = document.getElementById("fbSubject").value.trim();
  const message = document.getElementById("fbMessage").value.trim();
  const rating = parseInt(document.getElementById("fbRating").value) || 5;

  const user = DB.getCurrentUser();

  const payload = {
    user_id: user ? user.id : null,
    name,
    phone,
    email,
    feedback_type: feedbackType,
    subject,
    message,
    rating
  };

  const res = await DB.createFeedback(payload);
  if (res.success) {
    showToast(currentLang === 'ar' ? 'شكراً لكم، تم إرسال رسالتكم لإدارة بصمة كلين' : 'Votre message a été transmis à la direction');
    e.target.reset();
  }
}

async function loadAndRenderTestimonials() {
  const feedback = await DB.getFeedback();
  const container = document.getElementById("testimonialsContainer");
  if (!container) return;

  const approvedRatings = feedback.filter(f => f.feedback_type === 'rating' || f.rating >= 4);

  let html = "";
  approvedRatings.forEach(item => {
    html += `
      <div class="glass-card rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-3">
            <span class="font-bold text-xs text-slate-900">${item.name}</span>
            <div class="text-amber-400 text-xs">${'★'.repeat(item.rating)}${'☆'.repeat(5 - item.rating)}</div>
          </div>
          <p class="text-xs text-slate-600 leading-relaxed italic mb-4">"${item.message}"</p>
        </div>
        ${item.admin_reply ? `
          <div class="bg-sky-50 text-sky-900 p-2.5 rounded-xl text-[11px] border border-sky-100">
            <strong class="block mb-0.5"><i class="fa-solid fa-reply mr-1 ml-1 text-sky-600"></i> ${currentLang === 'ar' ? 'رد إدارة بصمة كلين:' : 'Réponse Bassma Clean :'}</strong>
            ${item.admin_reply}
          </div>
        ` : ''}
      </div>
    `;
  });

  container.innerHTML = html;
}

// ==================== بوابة المشتركين (Client Portal) ====================
function checkAuthSession() {
  const user = DB.getCurrentUser();
  const authNav = document.getElementById("navAuthContainer");

  if (!authNav) return;

  if (user) {
    authNav.innerHTML = `
      <div class="flex items-center gap-2">
        <button onclick="openClientPortalModal()" class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center">
          <i class="fa-solid fa-user-circle text-sky-600 mr-1.5 ml-1.5 text-sm"></i>
          <span>${user.name}</span>
        </button>
        <button onclick="DB.logout(); checkAuthSession(); showToast('تم تسجيل الخروج');" class="p-1.5 text-slate-400 hover:text-red-600 text-xs" title="تسجيل الخروج">
          <i class="fa-solid fa-power-off"></i>
        </button>
      </div>
    `;
  } else {
    authNav.innerHTML = `
      <button onclick="openAuthModal('login')" class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition">
        <i class="fa-solid fa-user mr-1 ml-1 text-sky-600"></i> ${currentLang === 'ar' ? 'دخول / حساب' : 'Connexion'}
      </button>
    `;
  }
}

function openAuthModal(mode = 'login') {
  const modal = document.getElementById("authModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  switchAuthTab(mode);
}

function switchAuthTab(mode) {
  const loginForm = document.getElementById("authLoginForm");
  const registerForm = document.getElementById("authRegisterForm");
  const tabLogin = document.getElementById("authTabLogin");
  const tabRegister = document.getElementById("authTabRegister");

  if (mode === 'login') {
    loginForm?.classList.remove("hidden");
    registerForm?.classList.add("hidden");
    tabLogin?.classList.add("border-b-2", "border-sky-600", "text-sky-700", "font-bold");
    tabRegister?.classList.remove("border-b-2", "border-sky-600", "text-sky-700", "font-bold");
  } else {
    loginForm?.classList.add("hidden");
    registerForm?.classList.remove("hidden");
    tabRegister?.classList.add("border-b-2", "border-sky-600", "text-sky-700", "font-bold");
    tabLogin?.classList.remove("border-b-2", "border-sky-600", "text-sky-700", "font-bold");
  }
}

async function handleClientLogin(e) {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  const res = await DB.login(email, password);
  if (res.success) {
    showToast(currentLang === 'ar' ? `مرحباً بك مجدداً، ${res.user.name}` : `Bienvenue, ${res.user.name}`);
    document.getElementById("authModal")?.classList.add("hidden");
    checkAuthSession();
  } else {
    alert(res.message || "فشل تسجيل الدخول");
  }
}

async function handleClientRegister(e) {
  e.preventDefault();
  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;
  const phone = document.getElementById("regPhone").value.trim();
  const organization = document.getElementById("regOrg").value.trim();

  const res = await DB.register({ name, email, password, phone, organization });
  if (res.success) {
    showToast(currentLang === 'ar' ? 'تم إنشاء الحساب بنجاح' : 'Compte créé avec succès !');
    document.getElementById("authModal")?.classList.add("hidden");
    checkAuthSession();
  } else {
    alert(res.message || "فشل إنشاء الحساب");
  }
}

async function openClientPortalModal() {
  const user = DB.getCurrentUser();
  if (!user) return;

  const modal = document.getElementById("clientPortalModal");
  if (!modal) return;

  const orders = await DB.getOrders(user.id);
  const reports = await DB.getReports();
  const userReports = reports.filter(r => r.user_id == user.id || r.reporter_phone === user.phone);

  const ordersContainer = document.getElementById("portalOrdersList");
  const reportsContainer = document.getElementById("portalReportsList");

  if (ordersContainer) {
    if (orders.length === 0) {
      ordersContainer.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs">لا توجد لديك طلبات سابقة بعد.</div>`;
    } else {
      ordersContainer.innerHTML = orders.map(o => `
        <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
          <div>
            <div class="font-mono font-bold text-sky-700">${o.ref_code}</div>
            <div class="font-semibold text-slate-800">${o.service_title}</div>
            <span class="text-[10px] text-slate-400">${o.created_at}</span>
          </div>
          <div class="text-right">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${o.status === 'completed' ? 'bg-sky-100 text-sky-800' : 'bg-slate-200 text-slate-700'}">
              ${o.status}
            </span>
          </div>
        </div>
      `).join("");
    }
  }

  if (reportsContainer) {
    if (userReports.length === 0) {
      reportsContainer.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs">لا توجد بلاغات مسجلة بحسابك.</div>`;
    } else {
      reportsContainer.innerHTML = userReports.map(r => `
        <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
          <div>
            <div class="font-mono font-bold text-red-600">${r.ref_code}</div>
            <div class="font-semibold text-slate-800">${r.city} - ${r.district}</div>
            <span class="text-[10px] text-slate-400">${r.created_at}</span>
          </div>
          <div class="text-right">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">${r.status}</span>
          </div>
        </div>
      `).join("");
    }
  }

  modal.classList.remove("hidden");
}

function toggleMobileMenu() {
  const menu = document.getElementById("mobileMenuDrawer");
  if (menu) {
    menu.classList.toggle("hidden");
  }
}

// ==================== حاسبة التكلفة وطرق الدفع (Payment Calculator) ====================

/**
 * يحسب التكلفة الإجمالية بناءً على المساحة المُدخَلة
 * يعمل على كل حاسبة (Hero أو قسم الدفع المستقل)
 */
function calcHeroCost() {
  const input = document.getElementById("heroAreaInput");
  const resultBox = document.getElementById("heroCostResult");
  const costValue = document.getElementById("heroCostValue");

  if (!input || !resultBox || !costValue) return;

  const area = parseFloat(input.value);
  if (!area || area <= 0) {
    resultBox.classList.add("hidden");
    return;
  }

  const total = area * PRICE_PER_SQM;
  costValue.textContent = total.toLocaleString("ar-MR");
  resultBox.classList.remove("hidden");

  // مزامنة مع الحاسبة في قسم الدفع المستقل إن وُجدت
  const sectionInput = document.getElementById("payAreaInput");
  if (sectionInput && sectionInput.value !== input.value) {
    sectionInput.value = input.value;
    calcPaySectionCost();
  }
}

/**
 * يحسب التكلفة في قسم الدفع المستقل
 */
function calcPaySectionCost() {
  const input = document.getElementById("payAreaInput");
  const resultBox = document.getElementById("payCostResult");
  const costValue = document.getElementById("payCostValue");
  const areaDisplay = document.getElementById("payCostAreaDisplay");

  if (!input || !resultBox || !costValue) return;

  const area = parseFloat(input.value);
  if (!area || area <= 0) {
    resultBox.classList.add("hidden");
    return;
  }

  const total = area * PRICE_PER_SQM;
  if (costValue) costValue.textContent = total.toLocaleString("ar-MR");
  if (areaDisplay) areaDisplay.textContent = area.toLocaleString("ar-MR") + " م²";
  resultBox.classList.remove("hidden");

  // تحديث عرض الصيغة
  const formulaValue = document.getElementById("payCostValueFormula");
  if (formulaValue) formulaValue.textContent = total.toLocaleString("ar-MR") + " MRU";

  // مزامنة مع حاسبة Hero
  const heroInput = document.getElementById("heroAreaInput");
  if (heroInput && heroInput.value !== input.value) {
    heroInput.value = input.value;
    const heroResult = document.getElementById("heroCostResult");
    const heroCostValue = document.getElementById("heroCostValue");
    if (heroResult && heroCostValue) {
      heroCostValue.textContent = total.toLocaleString("ar-MR");
      heroResult.classList.remove("hidden");
    }
  }
}

/** بيانات طرق الدفع */
const PAYMENT_METHODS_DATA = {
  visit: {
    icon: "fa-building",
    iconColor: "text-[#0b1d51]",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-300",
    title: "زيارة مقر الشركة",
    titleFr: "Visite au siège",
    steps: [
      "توجه إلى مقر شركة بصمة كلين في نواكشوط",
      "أحضر معك مساحة موقعك (أو سيقوم فريقنا بقياسها)",
      "سيتم إعداد عقد رسمي وتحديد موعد التنفيذ",
      "يمكن الدفع نقداً أو بشيك مصرفي"
    ],
    stepsFr: [
      "Rendez-vous au siège de Bassma Clean à Nouakchott",
      "Apportez la superficie ou notre équipe la mesurera",
      "Un contrat officiel sera établi sur place",
      "Paiement en espèces ou par chèque bancaire"
    ],
    note: "📍 العنوان: نواكشوط — اتصل بنا أولاً: 45 25 00 00",
    noteFr: "📍 Adresse : Nouakchott — Contactez-nous d'abord : 45 25 00 00",
    color: "#0b1d51"
  },
  bankily: {
    icon: "fa-mobile-screen-button",
    iconColor: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-300",
    title: "الدفع عبر بنكيلي",
    titleFr: "Paiement via Bankily",
    steps: [
      "افتح تطبيق بنكيلي على هاتفك",
      "اختر 'تحويل' أو 'دفع للأعمال'",
      "أدخل رقم حساب بصمة كلين: 45 25 00 00",
      "أدخل المبلغ المحسوب وأرسل إيصال التحويل على واتساب"
    ],
    stepsFr: [
      "Ouvrez l'application Bankily",
      "Choisissez 'Transfert' ou 'Paiement entreprise'",
      "Entrez le numéro Bassma Clean : 45 25 00 00",
      "Envoyez le reçu par WhatsApp après transfert"
    ],
    note: "🟠 بنكيلي — تابع لـ BPM (البنك الشعبي الموريتاني)",
    noteFr: "🟠 Bankily — Banque Populaire de Mauritanie (BPM)",
    color: "#ea580c"
  },
  masrafi: {
    icon: "fa-mobile-screen-button",
    logoImg: "assets/logo_masrvi.png",
    iconColor: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-300",
    title: "الدفع عبر مصرفي (BMCI)",
    titleFr: "Paiement via Masrvi (BMCI)",
    steps: [
      "افتح تطبيق مصرفي (Masrvi) على هاتفك",
      "اختر 'إرسال أموال' أو 'دفع فاتورة'",
      "أدخل رقم حساب بصمة كلين: 36 00 00 00",
      "أدخل المبلغ المحسوب وأرسل الإيصال للتأكيد"
    ],
    stepsFr: [
      "Ouvrez l'application Masrvi",
      "Choisissez 'Envoi d'argent' ou 'Paiement de facture'",
      "Entrez le numéro Bassma Clean : 36 00 00 00",
      "Envoyez le reçu pour confirmation"
    ],
    note: "🟢 مصرفي (Masrvi) — تابع لـ BMCI (البنك الموريتاني للتجارة الدولية)",
    noteFr: "🟢 Masrvi — Banque Mauritanienne pour le Commerce International (BMCI)",
    color: "#16a34a"
  },
  sadad: {
    icon: "fa-mobile-screen-button",
    logoImg: "assets/logo_sedad.png",
    iconColor: "text-sky-600",
    bgColor: "bg-sky-50",
    borderColor: "border-sky-300",
    title: "الدفع عبر السداد (BMI)",
    titleFr: "Paiement via Sedad (BMI)",
    steps: [
      "افتح تطبيق السداد (Sedad) على هاتفك",
      "اختر 'خدمات' أو 'دفع فاتورة'",
      "ابحث عن 'بصمة كلين' أو أدخل الرمز: BASSMA",
      "أدخل المبلغ وأرسل إيصال الدفع للتأكيد"
    ],
    stepsFr: [
      "Ouvrez l'application Sedad",
      "Choisissez 'Services' ou 'Paiement de facture'",
      "Cherchez 'Bassma Clean' ou entrez le code : BASSMA",
      "Entrez le montant et envoyez le reçu"
    ],
    note: "🔵 السداد (Sedad) — تابع لـ BMI (البنك الموريتاني للاستثمار)",
    noteFr: "🔵 Sedad — Banque Mauritanienne de l'Investissement (BMI)",
    color: "#0284c7"
  }
};

/**
 * يعرض معلومات طريقة الدفع المحددة ديناميكياً
 * @param {string} method - قيمة طريقة الدفع المختارة
 * @param {string} containerId - ID لعنصر عرض المعلومات
 */
function showPaymentInfo(method, containerId) {
  const infoBox = document.getElementById(containerId);
  if (!infoBox) return;

  const data = PAYMENT_METHODS_DATA[method];
  if (!data) {
    infoBox.classList.add("hidden");
    return;
  }

  const isAr = currentLang === "ar";
  const steps = isAr ? data.steps : data.stepsFr;
  const note = isAr ? data.note : data.noteFr;
  const title = isAr ? data.title : data.titleFr;

  const stepsHtml = steps.map((step, i) => `
    <li class="flex items-start gap-2 text-xs text-slate-700">
      <span class="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[10px]" style="background:${data.color};">${i + 1}</span>
      <span>${step}</span>
    </li>
  `).join("");

  infoBox.innerHTML = `
    <div class="border-r-4 p-3 rounded-xl ${data.bgColor} ${data.borderColor}">
      <div class="flex items-center gap-2 mb-2">
        <i class="fa-solid ${data.icon} ${data.iconColor}"></i>
        <span class="text-xs font-black text-slate-800">${title}</span>
      </div>
      <ol class="space-y-1.5 mb-2">${stepsHtml}</ol>
      <p class="text-[11px] font-semibold text-slate-500 mt-1 pt-1 border-t border-slate-200/60">${note}</p>
    </div>
  `;

  infoBox.classList.remove("hidden");
}

/**
 * يُعالج اختيار طريقة الدفع في بطاقة Hero
 */
function onHeroPayMethodChange() {
  const selected = document.querySelector('input[name="heroPayMethod"]:checked');
  if (selected) {
    showPaymentInfo(selected.value, "heroPayInfo");
  }
}

/**
 * يُعالج اختيار طريقة الدفع في قسم الدفع المستقل
 */
function onPaySectionMethodChange() {
  const selected = document.querySelector('input[name="payMethod"]:checked');
  if (selected) {
    showPaymentInfo(selected.value, "payMethodInfo");
  }
}

/**
 * يُؤكد طريقة الدفع المختارة في Hero ويوجّه الزبون
 */
function confirmHeroPayment() {
  const selected = document.querySelector('input[name="heroPayMethod"]:checked');
  const areaInput = document.getElementById("heroAreaInput");

  if (!selected) {
    showToast(currentLang === "ar" ? "⚠️ يرجى اختيار طريقة الدفع أولاً" : "⚠️ Veuillez choisir un mode de paiement", "error");
    return;
  }

  const area = parseFloat(areaInput?.value) || 0;
  const total = area > 0 ? (area * PRICE_PER_SQM).toLocaleString("ar-MR") + " MRU" : "";

  const methodData = PAYMENT_METHODS_DATA[selected.value];
  const methodName = currentLang === "ar" ? methodData.title : methodData.titleFr;

  // مزامنة المساحة وطريقة الدفع تلقائياً مع نموذج طلب الخدمة
  const orderAreaEl = document.getElementById("orderAreaInput");
  if (orderAreaEl && area > 0) {
    orderAreaEl.value = area;
    calcOrderFormCost();
  }

  const orderMethodRadio = document.querySelector(`input[name="order_payment_method"][value="${selected.value}"]`);
  if (orderMethodRadio) {
    orderMethodRadio.checked = true;
    onOrderPayMethodChange();
  }

  if (selected.value === "visit") {
    showToast(
      currentLang === "ar"
        ? `✅ تم اختيار زيارة الشركة. ${total ? "المبلغ المقدر: " + total : ""} — أكمل تفاصيل موقعك بالأسفل.`
        : `✅ Visite au siège sélectionnée. ${total ? "Montant : " + total : ""}`,
      "success"
    );
  } else {
    showToast(
      currentLang === "ar"
        ? `✅ تم اختيار ${methodName}. ${total ? "المبلغ: " + total : ""} — أكمل تفاصيل موقعك بالأسفل.`
        : `✅ ${methodName} sélectionné. ${total ? "Montant : " + total : ""}`,
      "success"
    );
  }

  // التمرير مباشرة لنموذج الطلب لإنهاء الحجز
  setTimeout(() => {
    document.getElementById("section-order")?.scrollIntoView({ behavior: "smooth" });
  }, 800);
}

/**
 * حساب التكلفة في نموذج طلب الخدمة الأساسي (Bilingual Arabic / French)
 */
function calcOrderFormCost() {
  const input = document.getElementById("orderAreaInput");
  const costEl = document.getElementById("orderCostValue");
  const formulaEl = document.getElementById("orderCostFormula");
  if (!input || !costEl) return;

  const area = parseFloat(input.value) || 0;
  const total = area * PRICE_PER_SQM;

  const isAr = (typeof currentLang === "undefined" || currentLang === "ar");
  costEl.textContent = total > 0 ? (isAr ? total.toLocaleString("ar-MR") : total.toLocaleString("fr-FR")) : "0";

  if (formulaEl) {
    if (area > 0) {
      formulaEl.textContent = isAr 
        ? `${area.toLocaleString("ar-MR")} م² × 100 MRU = ${total.toLocaleString("ar-MR")} MRU` 
        : `${area.toLocaleString("fr-FR")} m² × 100 MRU = ${total.toLocaleString("fr-FR")} MRU`;
    } else {
      formulaEl.textContent = isAr 
        ? "أدخل المساحة لحساب المبلغ تلقائياً" 
        : "Entrez la surface pour calculer le montant automatiquement";
    }
  }
}

/**
 * تغيير تفاصيل طريقة الدفع في نموذج طلب الخدمة (Bilingual Arabic / French)
 */
function onOrderPayMethodChange() {
  const selected = document.querySelector('input[name="order_payment_method"]:checked')?.value || "visit";
  const titleEl = document.getElementById("orderPayDetailsTitle");
  const descEl = document.getElementById("orderPayDetailsDesc");
  if (!titleEl || !descEl) return;

  const isAr = (typeof currentLang === "undefined" || currentLang === "ar");

  const data = {
    visit: {
      titleAr: "زيارة مقر شركة بصمة كلين في نواكشوط",
      titleFr: "Paiement au Siège de Bassma Clean à Nouakchott",
      descAr: "يسعدنا استقبالكم في مقرنا الرسمي بنواكشوط (تفرغ زينة) لإتمام الإجراءات وتوقيع العقد والدفع نقداً أو بشيك مصرفي. هاتف المتابعة: 45 25 00 00.",
      descFr: "Rendez-vous à notre siège officiel à Nouakchott (Tevragh-Zeina) pour finaliser le contrat et payer en espèces ou par chèque bancaire. Tél : 45 25 00 00."
    },
    bankily: {
      titleAr: "الدفع عبر تطبيق بنكيلي (Bankily — BPM)",
      titleFr: "Paiement par Bankily (Banque Populaire de Mauritanie)",
      descAr: "أرسل المبلغ إلى رقم حساب بصمة كلين: 45 25 00 00 (أو 36 25 00 00). بعد التحويل احتفظ بالإيصال أو لقطة الشاشة لتأكيد الطلب.",
      descFr: "Transférez le montant au numéro Bassma Clean : 45 25 00 00 (ou 36 25 00 00). Conservez le reçu de transfert pour confirmation."
    },
    masrafi: {
      titleAr: "الدفع عبر تطبيق مصرفي (Masrvi — BMCI)",
      titleFr: "Paiement par Masrvi (Banque Mauritanienne pour le Commerce International - BMCI)",
      descAr: "أرسل المبلغ إلى رقم حساب بصمة كلين: 36 00 00 00 (أو 45 25 00 00). بعد التحويل أرسل إشعار العملية لتأكيد الطلب.",
      descFr: "Transférez le montant sur le compte Bassma Clean : 36 00 00 00 (ou 45 25 00 00). Envoyez le reçu pour valider la commande."
    },
    sadad: {
      titleAr: "الدفع عبر تطبيق السداد (Sedad — BMI)",
      titleFr: "Paiement par Sedad (Banque Mauritanienne de l'Investissement - BMI)",
      descAr: "افتح تطبيق السداد التابع للبنك الموريتاني للاستثمار (BMI)، اختر خدمات الشركات وابحث عن 'بصمة كلين' أو الرمز BASSMA وأدخل المبلغ المحسوب (100 MRU / م²).",
      descFr: "Ouvrez l'application Seddad, sélectionnez services et cherchez 'Bassma Clean' ou le code BASSMA puis réglez le montant calculé (100 MRU / m²)."
    }
  };

  const item = data[selected] || data.visit;
  titleEl.textContent = isAr ? item.titleAr : item.titleFr;
  descEl.textContent = isAr ? item.descAr : item.descFr;
}

/**
 * يُؤكد طريقة الدفع المختارة في قسم الدفع المستقل
 */
function confirmPaySectionPayment() {
  const selected = document.querySelector('input[name="payMethod"]:checked');
  const areaInput = document.getElementById("payAreaInput");

  if (!selected) {
    showToast(currentLang === "ar" ? "⚠️ يرجى اختيار طريقة الدفع أولاً" : "⚠️ Veuillez choisir un mode de paiement", "error");
    return;
  }

  if (!areaInput || !areaInput.value || parseFloat(areaInput.value) <= 0) {
    showToast(currentLang === "ar" ? "⚠️ يرجى إدخال المساحة المراد تنظيفها أولاً" : "⚠️ Veuillez d'abord saisir la superficie à nettoyer", "error");
    return;
  }

  const area = parseFloat(areaInput.value);
  const total = area * PRICE_PER_SQM;
  const methodData = PAYMENT_METHODS_DATA[selected.value];
  const methodName = currentLang === "ar" ? methodData.title : methodData.titleFr;

  showToast(
    currentLang === "ar"
      ? `✅ ${methodName} — مساحة: ${area.toLocaleString("ar-MR")} م² — المبلغ: ${total.toLocaleString("ar-MR")} MRU`
      : `✅ ${methodName} — Surface : ${area} m² — Montant : ${total.toLocaleString()} MRU`,
    "success"
  );

  if (selected.value !== "visit") {
    setTimeout(() => {
      showPaymentInfo(selected.value, "payMethodInfo");
    }, 500);
  } else {
    setTimeout(() => {
      document.getElementById("section-order")?.scrollIntoView({ behavior: "smooth" });
    }, 1200);
  }
}

// ربط مستمعي الأحداث بعد تحميل DOM
document.addEventListener("DOMContentLoaded", () => {
  // Hero payment radios
  document.querySelectorAll('input[name="heroPayMethod"]').forEach(radio => {
    radio.addEventListener("change", onHeroPayMethodChange);
  });

  // Pay section radios (مضافة ديناميكياً لاحقاً)
  document.addEventListener("change", (e) => {
    if (e.target && e.target.name === "payMethod") {
      onPaySectionMethodChange();
    }
  });
});
