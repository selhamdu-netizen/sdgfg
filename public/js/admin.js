/**
 * شركة بصمة كلين - لوحة التحكم الإدارية (موريتانيا)
 * BASSMA CLEAN Admin Dashboard Manager
 */

let ordersChartInstance = null;
let reportsChartInstance = null;

const Admin = {
  activeTab: 'overview',

  async init() {
    const user = DB.getCurrentUser();
    if (!user || user.role !== 'admin') {
      this.showLoginModal();
      return;
    }

    this.renderHeader(user);
    this.switchTab('overview');
  },

  showLoginModal() {
    const modal = document.getElementById('adminLoginModal');
    if (modal) modal.classList.remove('hidden');
  },

  hideLoginModal() {
    const modal = document.getElementById('adminLoginModal');
    if (modal) modal.classList.add('hidden');
  },

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;

    const res = await DB.login(email, password);
    if (res.success && res.user && res.user.role === 'admin') {
      this.hideLoginModal();
      showToast(currentLang === 'ar' ? 'مرحباً بكم في لوحة تحكم إدارة بصمة كلين' : 'Bienvenue dans le panneau d\'administration Bassma Clean');
      this.init();
    } else {
      alert(currentLang === 'ar' ? 'بيانات دخول المشرف غير صحيحة' : 'Identifiants administrateur incorrects');
    }
  },

  logout() {
    DB.logout();
    showToast(currentLang === 'ar' ? 'تم تسجيل الخروج بنجاح' : 'Déconnexion réussie');
    window.location.reload();
  },

  renderHeader(user) {
    const nameEl = document.getElementById('adminLoggedName');
    if (nameEl) nameEl.textContent = user.name || 'إدارة بصمة كلين';
  },

  switchTab(tabName) {
    this.activeTab = tabName;

    // Toggle nav buttons
    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
      btn.classList.remove('bg-sky-600', 'text-white', 'font-bold');
      btn.classList.add('text-slate-300', 'hover:bg-slate-800');
    });

    const currentBtn = document.getElementById(`adminBtn_${tabName}`);
    if (currentBtn) {
      currentBtn.classList.add('bg-sky-600', 'text-white', 'font-bold');
      currentBtn.classList.remove('text-slate-300', 'hover:bg-slate-800');
    }

    // Toggle containers
    document.querySelectorAll('.admin-tab-content').forEach(container => {
      container.classList.add('hidden');
    });

    const activeContainer = document.getElementById(`adminContent_${tabName}`);
    if (activeContainer) {
      activeContainer.classList.remove('hidden');
    }

    if (tabName === 'overview') this.loadOverview();
    if (tabName === 'orders') this.loadOrdersTable();
    if (tabName === 'reports') this.loadReportsTable();
    if (tabName === 'feedback') this.loadFeedbackTable();
  },

  // ==================== نظرة عامة ومؤشرات ====================
  async loadOverview() {
    const stats = await DB.getStats();

    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setText('kpi_total_orders', stats.total_orders);
    setText('kpi_pending_orders', stats.pending_orders);
    setText('kpi_inprogress_orders', stats.in_progress_orders);
    setText('kpi_completed_orders', stats.completed_orders);
    setText('kpi_total_reports', stats.total_reports);
    setText('kpi_resolved_reports', stats.resolved_reports);
    setText('kpi_active_reports', stats.active_reports);
    setText('kpi_satisfaction', `${stats.satisfaction_rate}%`);

    this.renderOrdersChart();
    this.renderReportsChart();
  },

  async renderOrdersChart() {
    const ctx = document.getElementById('ordersChart');
    if (!ctx) return;

    const orders = await DB.getOrders();
    const isAr = currentLang === 'ar';

    const counts = {
      received: 0,
      under_review: 0,
      approved: 0,
      in_progress: 0,
      completed: 0,
      rejected: 0
    };

    orders.forEach(o => {
      if (counts[o.status] !== undefined) counts[o.status]++;
    });

    if (ordersChartInstance) ordersChartInstance.destroy();

    ordersChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: isAr 
          ? ['مستلمة', 'قيد المعاينة', 'تمت الموافقة', 'قيد التنفيذ', 'مكتملة', 'مرفوضة']
          : ['Reçues', 'En étude', 'Validées', 'En cours', 'Achevées', 'Refusées'],
        datasets: [{
          data: [counts.received, counts.under_review, counts.approved, counts.in_progress, counts.completed, counts.rejected],
          backgroundColor: ['#94a3b8', '#0284c7', '#00a8cc', '#f59e0b', '#0b1d51', '#ef4444'],
          borderWidth: 2,
          borderColor: '#1e293b'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#cbd5e1' } }
        }
      }
    });
  },

  async renderReportsChart() {
    const ctx = document.getElementById('reportsChart');
    if (!ctx) return;

    const reports = await DB.getReports();
    const isAr = currentLang === 'ar';

    const counts = {
      new: 0,
      reviewed: 0,
      dispatched: 0,
      in_progress: 0,
      resolved: 0
    };

    reports.forEach(r => {
      if (counts[r.status] !== undefined) counts[r.status]++;
    });

    if (reportsChartInstance) reportsChartInstance.destroy();

    reportsChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: isAr 
          ? ['بلاغ جديد', 'تمت المراجعة', 'فريق متوجه', 'قيد الإزالة', 'تم الحل']
          : ['Nouveau', 'Examiné', 'Déployé', 'En cours', 'Résolu'],
        datasets: [{
          label: isAr ? 'بلاغات النفايات' : 'Signalements',
          data: [counts.new, counts.reviewed, counts.dispatched, counts.in_progress, counts.resolved],
          backgroundColor: ['#ef4444', '#0284c7', '#8b5cf6', '#f59e0b', '#00a8cc'],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { ticks: { color: '#cbd5e1' } },
          y: { beginAtZero: true, ticks: { stepSize: 1, color: '#cbd5e1' } }
        }
      }
    });
  },

  // ==================== إدارة الطلبات والعقود ====================
  async loadOrdersTable(filterStatus = 'all') {
    const tableBody = document.getElementById('adminOrdersTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> تحميل الطلبات...</td></tr>`;

    const orders = await DB.getOrders();
    const filtered = filterStatus === 'all' ? orders : orders.filter(o => o.status === filterStatus);

    if (filtered.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400">لا توجد طلبات مسجلة في هذا القسم.</td></tr>`;
      return;
    }

    const isAr = currentLang === 'ar';
    const statusMap = {
      received: { label: isAr ? 'تم الاستلام' : 'Reçue', class: 'badge-status-received' },
      under_review: { label: isAr ? 'قيد المعاينة' : 'En examen', class: 'badge-status-under_review' },
      approved: { label: isAr ? 'تمت الموافقة' : 'Approuvée', class: 'badge-status-approved' },
      in_progress: { label: isAr ? 'قيد التنفيذ' : 'En cours', class: 'badge-status-in_progress' },
      completed: { label: isAr ? 'مكتمل' : 'Terminée', class: 'badge-status-completed' },
      rejected: { label: isAr ? 'مرفوض' : 'Refusée', class: 'badge-status-rejected' }
    };

    let html = '';
    filtered.forEach(order => {
      const st = statusMap[order.status] || { label: order.status, class: 'bg-slate-100 text-slate-600' };
      const contractLabel = {
        one_time: isAr ? 'مرة واحدة' : 'Ponctuel',
        monthly: isAr ? 'شهري' : 'Mensuel',
        annual: isAr ? 'عقد سنوي' : 'Annuel',
        emergency: isAr ? 'تدخل طارئ' : 'Urgence'
      }[order.contract_type] || order.contract_type;

      const payMethodLabel = {
        visit: isAr ? 'زيارة المقر' : 'Au siège',
        bankily: isAr ? 'بنكيلي' : 'Bankily',
        masrafi: isAr ? 'مصرفي' : 'Masrafi',
        sadad: isAr ? 'السداد' : 'Al-Sadad'
      }[order.payment_method] || (isAr ? 'زيارة المقر' : 'Au siège');

      const payBadgeColor = {
        visit: 'bg-blue-900/60 text-blue-300 border-blue-700',
        bankily: 'bg-orange-900/60 text-orange-300 border-orange-700',
        masrafi: 'bg-green-900/60 text-green-300 border-green-700',
        sadad: 'bg-sky-900/60 text-sky-300 border-sky-700'
      }[order.payment_method] || 'bg-slate-800 text-slate-300 border-slate-700';

      const totalCostDisplay = order.total_cost 
        ? `${Number(order.total_cost).toLocaleString('ar-MR')} MRU` 
        : (order.area_sqm ? `${(Number(order.area_sqm) * 100).toLocaleString('ar-MR')} MRU` : '100 MRU / م²');

      html += `
        <tr class="border-b border-slate-700/60 hover:bg-slate-800 transition">
          <td class="p-3 font-mono font-bold text-xs text-sky-400">${order.ref_code}</td>
          <td class="p-3">
            <div class="font-bold text-white text-xs">${order.client_name}</div>
            <div class="text-[11px] text-slate-400"><i class="fa-solid fa-phone mr-1 ml-1 text-sky-400"></i>${order.phone}</div>
          </td>
          <td class="p-3">
            <div class="text-xs text-slate-200 font-medium">${order.service_title}</div>
            <span class="inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-sky-300">${contractLabel}</span>
          </td>
          <td class="p-3 text-xs">
            <div class="font-bold text-amber-300">${totalCostDisplay}</div>
            <div class="text-[10px] text-slate-400">${order.area_sqm ? order.area_sqm + ' م²' : '—'}</div>
            <span class="inline-block px-1.5 py-0.2 rounded text-[10px] border ${payBadgeColor}">${payMethodLabel}</span>
          </td>
          <td class="p-3 text-xs text-slate-300">${order.city} - ${order.district || ''}</td>
          <td class="p-3 text-[11px] text-slate-400">${order.created_at ? order.created_at.substring(0, 10) : ''}</td>
          <td class="p-3">
            <span class="px-2 py-1 rounded-full text-[11px] font-bold ${st.class}">${st.label}</span>
          </td>
          <td class="p-3">
            <div class="flex items-center gap-1">
              <button onclick="Admin.viewOrderDetails('${order.ref_code}')" class="p-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition" title="عرض التفاصيل">
                <i class="fa-solid fa-eye"></i>
              </button>
              <button onclick="Admin.openOrderStatusModal('${order.id}', '${order.status}')" class="p-1.5 text-xs bg-sky-900/60 hover:bg-sky-800 text-sky-300 rounded transition" title="تحديث الحالة">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    tableBody.innerHTML = html;
  },

  async viewOrderDetails(refCode) {
    const order = await DB.getOrderByRef(refCode);
    if (!order) return;

    const modal = document.getElementById('adminViewOrderModal');
    const content = document.getElementById('adminViewOrderContent');
    if (!modal || !content) return;

    const isAr = currentLang === 'ar';
    const photoSection = order.photo_url 
      ? `<div class="mt-3"><label class="block text-xs font-bold text-slate-400 mb-1">صورة الموقع:</label><img src="${order.photo_url}" class="h-44 w-full object-cover rounded-lg border border-slate-700"></div>`
      : '';

    content.innerHTML = `
      <div class="space-y-3 text-right text-slate-200" style="direction: ${isAr ? 'rtl' : 'ltr'}; text-align: ${isAr ? 'right' : 'left'};">
        <div class="flex items-center justify-between border-b border-slate-700 pb-2">
          <span class="font-mono font-bold text-sky-400">${order.ref_code}</span>
          <span class="text-xs text-slate-400">${order.created_at}</span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><strong class="text-slate-400">العميل:</strong> <span class="font-bold text-white">${order.client_name}</span></div>
          <div><strong class="text-slate-400">الهاتف:</strong> <a href="tel:${order.phone}" class="text-sky-400 font-bold">${order.phone}</a></div>
          <div><strong class="text-slate-400">المساحة:</strong> <span class="font-bold text-sky-300">${order.area_sqm ? order.area_sqm + ' م²' : 'غير محددة'}</span></div>
          <div><strong class="text-slate-400">التكلفة الإجمالية:</strong> <span class="font-black text-amber-300">${order.total_cost ? Number(order.total_cost).toLocaleString('ar-MR') + ' MRU' : (order.area_sqm ? (Number(order.area_sqm)*100).toLocaleString('ar-MR') + ' MRU' : '100 MRU / م²')}</span></div>
          <div><strong class="text-slate-400">طريقة الدفع:</strong> <span class="font-bold text-emerald-400">${order.payment_method === 'bankily' ? 'بنكيلي (Bankily)' : (order.payment_method === 'masrafi' ? 'مصرفي (Masrafi)' : (order.payment_method === 'sadad' ? 'السداد (Al-Sadad)' : 'زيارة الشركة'))}</span></div>
          <div><strong class="text-slate-400">الخدمة:</strong> <span class="font-bold text-white">${order.service_title}</span></div>
          <div><strong class="text-slate-400">العقد:</strong> <span>${order.contract_type}</span></div>
          <div class="col-span-2"><strong class="text-slate-400">العنوان:</strong> <span>${order.city}، ${order.district || ''} - ${order.address}</span></div>
        </div>
        <div class="bg-slate-800 p-3 rounded-lg text-xs border border-slate-700">
          <strong class="block text-slate-400 mb-1">الملاحظات والمتطلبات:</strong>
          ${order.description || 'لا توجد ملاحظات إضافية.'}
        </div>
        ${order.rejection_reason ? `<div class="bg-red-950/60 border border-red-800 text-red-200 p-2 rounded text-xs"><strong>سبب الرفض:</strong> ${order.rejection_reason}</div>` : ''}
        ${order.admin_notes ? `<div class="bg-sky-950/60 border border-sky-800 text-sky-200 p-2 rounded text-xs"><strong>ملاحظات الإدارة:</strong> ${order.admin_notes}</div>` : ''}
        ${photoSection}
      </div>
    `;

    modal.classList.remove('hidden');
  },

  openOrderStatusModal(orderId, currentStatus) {
    const modal = document.getElementById('adminOrderStatusModal');
    const orderIdInput = document.getElementById('modalOrderId');
    const select = document.getElementById('modalNewStatus');
    const reasonContainer = document.getElementById('modalRejectionReasonContainer');

    if (!modal) return;
    orderIdInput.value = orderId;
    select.value = currentStatus;

    if (reasonContainer) {
      reasonContainer.classList.toggle('hidden', currentStatus !== 'rejected');
      select.onchange = () => {
        reasonContainer.classList.toggle('hidden', select.value !== 'rejected');
      };
    }

    modal.classList.remove('hidden');
  },

  async saveOrderStatus(e) {
    e.preventDefault();
    const orderId = document.getElementById('modalOrderId').value;
    const newStatus = document.getElementById('modalNewStatus').value;
    const rejectionReason = document.getElementById('modalRejectionReason')?.value || null;
    const adminNotes = document.getElementById('modalAdminNotes')?.value || null;

    const success = await DB.updateOrderStatus(orderId, newStatus, rejectionReason, adminNotes);
    if (success) {
      showToast(currentLang === 'ar' ? 'تم تحديث حالة الطلب بنجاح' : 'Statut mis à jour avec succès');
      document.getElementById('adminOrderStatusModal')?.classList.add('hidden');
      this.loadOrdersTable();
      this.renderOrdersChart();
    }
  },

  // ==================== إدارة بلاغات النفايات ====================
  async loadReportsTable(filterStatus = 'all') {
    const tableBody = document.getElementById('adminReportsTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> تحميل البلاغات...</td></tr>`;

    const reports = await DB.getReports();
    const filtered = filterStatus === 'all' ? reports : reports.filter(r => r.status === filterStatus);

    if (filtered.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400">لا توجد بلاغات مسجلة في هذا القسم.</td></tr>`;
      return;
    }

    const isAr = currentLang === 'ar';
    let html = '';

    filtered.forEach(report => {
      const conf = STATUS_CONFIG[report.status] || STATUS_CONFIG.new;
      const statusLabel = isAr ? conf.label_ar : conf.label_fr;

      html += `
        <tr class="border-b border-slate-700/60 hover:bg-slate-800 transition">
          <td class="p-3 font-mono font-bold text-xs text-red-400">${report.ref_code}</td>
          <td class="p-3">
            <div class="font-bold text-white text-xs">${report.city} - ${report.district}</div>
            <div class="text-[11px] text-slate-400">${report.street || ''}</div>
          </td>
          <td class="p-3 text-xs text-slate-300 max-w-xs truncate">${report.description}</td>
          <td class="p-3 text-[11px] text-slate-400">${report.created_at ? report.created_at.substring(0, 16) : ''}</td>
          <td class="p-3">
            <span class="px-2 py-1 rounded-full text-[11px] font-bold ${conf.badgeClass}">${statusLabel}</span>
          </td>
          <td class="p-3">
            ${report.photo_url ? `<a href="${report.photo_url}" target="_blank" class="text-xs text-sky-400 underline">معاينة الصورة</a>` : '<span class="text-[11px] text-slate-500">لا توجد</span>'}
          </td>
          <td class="p-3">
            <select onchange="Admin.handleReportStatusChange('${report.id}', this.value)" class="text-xs border border-slate-600 rounded px-2 py-1 bg-slate-900 text-slate-200 focus:outline-none">
              <option value="new" ${report.status === 'new' ? 'selected' : ''}>1. بلاغ جديد</option>
              <option value="reviewed" ${report.status === 'reviewed' ? 'selected' : ''}>2. تمت المراجعة</option>
              <option value="dispatched" ${report.status === 'dispatched' ? 'selected' : ''}>3. تم توجيه الفريق</option>
              <option value="in_progress" ${report.status === 'in_progress' ? 'selected' : ''}>4. قيد الإزالة</option>
              <option value="resolved" ${report.status === 'resolved' ? 'selected' : ''}>5. تمت إزالة النفايات</option>
            </select>
          </td>
        </tr>
      `;
    });

    tableBody.innerHTML = html;
  },

  async handleReportStatusChange(reportId, newStatus) {
    const success = await DB.updateReportStatus(reportId, newStatus);
    if (success) {
      showToast(currentLang === 'ar' ? 'تم تحديث حالة البلاغ والخريطة بنجاح' : 'Statut du signalement actualisé !');
      loadMapReports();
      this.renderReportsChart();
    }
  },

  // ==================== إدارة الشكاوى والملاحظات ====================
  async loadFeedbackTable() {
    const tableBody = document.getElementById('adminFeedbackTableBody');
    if (!tableBody) return;

    const feedbacks = await DB.getFeedback();

    if (feedbacks.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400">لا توجد رسائل أو شكاوى واردة.</td></tr>`;
      return;
    }

    let html = '';
    feedbacks.forEach(item => {
      const typeBadge = {
        complaint: '<span class="px-2 py-0.5 rounded text-[10px] bg-red-900/60 text-red-300 font-bold">شكوى</span>',
        note: '<span class="px-2 py-0.5 rounded text-[10px] bg-sky-900/60 text-sky-300 font-bold">ملاحظة</span>',
        suggestion: '<span class="px-2 py-0.5 rounded text-[10px] bg-amber-900/60 text-amber-300 font-bold">اقتراح</span>',
        rating: '<span class="px-2 py-0.5 rounded text-[10px] bg-emerald-900/60 text-emerald-300 font-bold">تقييم</span>'
      }[item.feedback_type] || item.feedback_type;

      html += `
        <tr class="border-b border-slate-700/60 hover:bg-slate-800 transition">
          <td class="p-3">${typeBadge}</td>
          <td class="p-3">
            <div class="font-bold text-xs text-white">${item.name}</div>
            <div class="text-[11px] text-slate-400">${item.phone || item.email || ''}</div>
          </td>
          <td class="p-3">
            <div class="font-bold text-xs text-slate-200">${item.subject}</div>
            <div class="text-xs text-slate-400">${item.message}</div>
          </td>
          <td class="p-3">
            <div class="text-amber-400 text-xs">
              ${'★'.repeat(item.rating || 5)}${'☆'.repeat(5 - (item.rating || 5))}
            </div>
          </td>
          <td class="p-3 text-xs">
            ${item.admin_reply ? `<div class="bg-sky-950 text-sky-300 p-2 rounded text-[11px] border border-sky-800"><i class="fa-solid fa-check-double mr-1 ml-1"></i> ${item.admin_reply}</div>` : `<span class="text-slate-500 text-[11px]">بانتظار الرد</span>`}
          </td>
          <td class="p-3">
            <button onclick="Admin.openReplyModal('${item.id}', '${item.name.replace(/'/g, "\\'")}')" class="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded text-xs transition">
              <i class="fa-solid fa-reply mr-1 ml-1"></i> رد
            </button>
          </td>
        </tr>
      `;
    });

    tableBody.innerHTML = html;
  },

  openReplyModal(feedbackId, clientName) {
    const modal = document.getElementById('adminReplyModal');
    const inputId = document.getElementById('replyFeedbackId');
    const titleEl = document.getElementById('replyClientName');

    if (!modal) return;
    inputId.value = feedbackId;
    if (titleEl) titleEl.textContent = clientName;

    modal.classList.remove('hidden');
  },

  async sendFeedbackReply(e) {
    e.preventDefault();
    const id = document.getElementById('replyFeedbackId').value;
    const replyText = document.getElementById('replyText').value.trim();

    if (!replyText) return;

    const success = await DB.replyFeedback(id, replyText);
    if (success) {
      showToast(currentLang === 'ar' ? 'تم إرسال رد الإدارة بنجاح' : 'Réponse transmise avec succès');
      document.getElementById('adminReplyModal')?.classList.add('hidden');
      document.getElementById('replyText').value = '';
      this.loadFeedbackTable();
    }
  },

  // ==================== تصدير التقارير ====================
  async exportData(type, format) {
    let data = [];
    if (type === 'orders') data = await DB.getOrders();
    if (type === 'reports') data = await DB.getReports();

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bassma_clean_${type}_${new Date().toISOString().substring(0, 10)}.json`;
      a.click();
    } else if (format === 'csv') {
      if (data.length === 0) return alert('لا توجد بيانات للتصدير');
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(item => Object.values(item).map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','));
      const csvContent = '\uFEFF' + [headers, ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bassma_clean_${type}_${new Date().toISOString().substring(0, 10)}.csv`;
      a.click();
    }
  }
};
