/**
 * شركة بصمة كلين للخدمات والنظافة العامة - موريتانيا
 * BASSMA CLEAN Data Access Layer (Mauritania Context)
 */

const DB = {
  isApiAvailable: false,

  async init() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch('/api/stats', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        this.isApiAvailable = true;
        console.log("Connected to Bassma Clean Python backend.");
        return;
      }
    } catch (e) {
      // Standalone mode
    }
    this.isApiAvailable = false;
    this.seedLocalData();
  },

  // ==================== الخدمات (Services) ====================
  async getServices() {
    if (this.isApiAvailable) {
      try {
        const res = await fetch('/api/services');
        const data = await res.json();
        if (data.success) return data.services;
      } catch (e) {
        console.error("API error", e);
      }
    }
    this.seedLocalData();
    return JSON.parse(localStorage.getItem('bassma_services') || '[]');
  },

  // ==================== الإحصائيات (Stats) ====================
  async getStats() {
    if (this.isApiAvailable) {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        if (data.success) return data.stats;
      } catch (e) {
        console.error("API error", e);
      }
    }
    this.seedLocalData();
    const orders = JSON.parse(localStorage.getItem('bassma_orders') || '[]');
    const reports = JSON.parse(localStorage.getItem('bassma_reports') || '[]');
    const users = JSON.parse(localStorage.getItem('bassma_users') || '[]');
    return {
      total_orders: orders.length,
      pending_orders: orders.filter(o => o.status === 'received' || o.status === 'under_review').length,
      in_progress_orders: orders.filter(o => o.status === 'in_progress').length,
      completed_orders: orders.filter(o => o.status === 'completed').length,
      total_reports: reports.length,
      resolved_reports: reports.filter(r => r.status === 'resolved').length,
      active_reports: reports.filter(r => r.status !== 'resolved').length,
      total_users: users.length,
      satisfaction_rate: 98.5
    };
  },

  // ==================== طلبات الخدمات والعقود (Orders) ====================
  async getOrders(userId = null) {
    if (this.isApiAvailable) {
      try {
        const url = userId ? `/api/orders?user_id=${userId}` : '/api/orders';
        const res = await fetch(url);
        const data = await res.json();
        if (data.success) return data.orders;
      } catch (e) {
        console.error(e);
      }
    }
    this.seedLocalData();
    let orders = JSON.parse(localStorage.getItem('bassma_orders') || '[]');
    if (userId) {
      orders = orders.filter(o => o.user_id == userId);
    }
    return orders;
  },

  async getOrderByRef(refCode) {
    if (this.isApiAvailable) {
      try {
        const res = await fetch(`/api/orders?ref=${encodeURIComponent(refCode)}`);
        const data = await res.json();
        if (data.success) return data.order;
      } catch (e) {
        console.error(e);
      }
    }
    this.seedLocalData();
    const orders = JSON.parse(localStorage.getItem('bassma_orders') || '[]');
    return orders.find(o => o.ref_code.toLowerCase() === refCode.toLowerCase().trim()) || null;
  },

  async createOrder(orderData) {
    if (this.isApiAvailable) {
      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        });
        const data = await res.json();
        if (data.success) return data;
      } catch (e) {
        console.error("API error, saving locally", e);
      }
    }
    this.seedLocalData();
    const orders = JSON.parse(localStorage.getItem('bassma_orders') || '[]');
    const ref_code = `BC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder = {
      id: Date.now(),
      ref_code,
      user_id: orderData.user_id || null,
      client_name: orderData.client_name || orderData.name,
      client_type: orderData.client_type || 'individual',
      phone: orderData.phone,
      email: orderData.email || '',
      service_id: orderData.service_id || 1,
      service_title: orderData.service_title || 'خدمات النظافة العامة',
      contract_type: orderData.contract_type || 'one_time',
      city: orderData.city || 'نواكشوط',
      district: orderData.district || 'تفرغ زينة',
      address: orderData.address || '',
      description: orderData.description || '',
      photo_url: orderData.photo_url || '',
      status: 'received',
      rejection_reason: null,
      admin_notes: 'تم تسجيل الطلب بالنظام وسيتم التواصل معكم للمعاينة الميدانية.',
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    orders.unshift(newOrder);
    localStorage.setItem('bassma_orders', JSON.stringify(orders));
    return { success: true, ref_code, order_id: newOrder.id };
  },

  async updateOrderStatus(orderId, status, rejectionReason = null, adminNotes = null) {
    if (this.isApiAvailable) {
      try {
        const res = await fetch(`/api/orders/${orderId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, rejection_reason: rejectionReason, admin_notes: adminNotes })
        });
        const data = await res.json();
        if (data.success) return true;
      } catch (e) {
        console.error(e);
      }
    }
    this.seedLocalData();
    const orders = JSON.parse(localStorage.getItem('bassma_orders') || '[]');
    const idx = orders.findIndex(o => o.id == orderId || o.ref_code == orderId);
    if (idx !== -1) {
      orders[idx].status = status;
      if (rejectionReason !== null) orders[idx].rejection_reason = rejectionReason;
      if (adminNotes !== null) orders[idx].admin_notes = adminNotes;
      orders[idx].updated_at = new Date().toISOString().replace('T', ' ').substring(0, 19);
      localStorage.setItem('bassma_orders', JSON.stringify(orders));
      return true;
    }
    return false;
  },

  // ==================== بلاغات تراكم النفايات (Waste Reports) ====================
  async getReports(statusFilter = null) {
    if (this.isApiAvailable) {
      try {
        const url = statusFilter ? `/api/reports?status=${statusFilter}` : '/api/reports';
        const res = await fetch(url);
        const data = await res.json();
        if (data.success) return data.reports;
      } catch (e) {
        console.error(e);
      }
    }
    this.seedLocalData();
    let reports = JSON.parse(localStorage.getItem('bassma_reports') || '[]');
    if (statusFilter) {
      reports = reports.filter(r => r.status === statusFilter);
    }
    return reports;
  },

  async getReportByRef(refCode) {
    if (this.isApiAvailable) {
      try {
        const res = await fetch(`/api/reports?ref=${encodeURIComponent(refCode)}`);
        const data = await res.json();
        if (data.success) return data.report;
      } catch (e) {
        console.error(e);
      }
    }
    this.seedLocalData();
    const reports = JSON.parse(localStorage.getItem('bassma_reports') || '[]');
    return reports.find(r => r.ref_code.toLowerCase() === refCode.toLowerCase().trim()) || null;
  },

  async createReport(reportData) {
    if (this.isApiAvailable) {
      try {
        const res = await fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reportData)
        });
        const data = await res.json();
        if (data.success) return data;
      } catch (e) {
        console.error(e);
      }
    }
    this.seedLocalData();
    const reports = JSON.parse(localStorage.getItem('bassma_reports') || '[]');
    const ref_code = `REP-2026-${Math.floor(100 + Math.random() * 900)}`;
    const newReport = {
      id: Date.now(),
      ref_code,
      user_id: reportData.user_id || null,
      reporter_name: reportData.reporter_name || 'مواطن مسؤول',
      reporter_phone: reportData.reporter_phone || '',
      latitude: parseFloat(reportData.latitude) || 18.0735,
      longitude: parseFloat(reportData.longitude) || -15.9582,
      city: reportData.city || 'نواكشوط',
      district: reportData.district || 'تفرغ زينة',
      street: reportData.street || '',
      description: reportData.description || 'تراكم نفايات في الشارع العام',
      photo_url: reportData.photo_url || '',
      status: 'new',
      admin_notes: 'تم تسجيل البلاغ وبانتظار معاينة المشرف وتوجيه الفريق الميداني.',
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    reports.unshift(newReport);
    localStorage.setItem('bassma_reports', JSON.stringify(reports));
    return { success: true, ref_code, report_id: newReport.id, status: 'new' };
  },

  async updateReportStatus(reportId, status, adminNotes = null) {
    if (this.isApiAvailable) {
      try {
        const res = await fetch(`/api/reports/${reportId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, admin_notes: adminNotes })
        });
        const data = await res.json();
        if (data.success) return true;
      } catch (e) {
        console.error(e);
      }
    }
    this.seedLocalData();
    const reports = JSON.parse(localStorage.getItem('bassma_reports') || '[]');
    const idx = reports.findIndex(r => r.id == reportId || r.ref_code == reportId);
    if (idx !== -1) {
      reports[idx].status = status;
      if (adminNotes !== null) reports[idx].admin_notes = adminNotes;
      reports[idx].updated_at = new Date().toISOString().replace('T', ' ').substring(0, 19);
      localStorage.setItem('bassma_reports', JSON.stringify(reports));
      return true;
    }
    return false;
  },

  // ==================== البرامج والمبادرات (Action Plans) ====================
  async getActivities() {
    if (this.isApiAvailable) {
      try {
        const res = await fetch('/api/activities');
        const data = await res.json();
        if (data.success) return data.activities;
      } catch (e) {
        console.error(e);
      }
    }
    this.seedLocalData();
    return JSON.parse(localStorage.getItem('bassma_activities') || '[]');
  },

  // ==================== الأخبار والتوعية (News) ====================
  async getNews() {
    if (this.isApiAvailable) {
      try {
        const res = await fetch('/api/news');
        const data = await res.json();
        if (data.success) return data.news;
      } catch (e) {
        console.error(e);
      }
    }
    this.seedLocalData();
    return JSON.parse(localStorage.getItem('bassma_news') || '[]');
  },

  // ==================== الآراء والشكاوى (Feedback) ====================
  async getFeedback() {
    if (this.isApiAvailable) {
      try {
        const res = await fetch('/api/feedback');
        const data = await res.json();
        if (data.success) return data.feedback;
      } catch (e) {
        console.error(e);
      }
    }
    this.seedLocalData();
    return JSON.parse(localStorage.getItem('bassma_feedback') || '[]');
  },

  async createFeedback(feedbackData) {
    if (this.isApiAvailable) {
      try {
        const res = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(feedbackData)
        });
        const data = await res.json();
        if (data.success) return data;
      } catch (e) {
        console.error(e);
      }
    }
    this.seedLocalData();
    const fbs = JSON.parse(localStorage.getItem('bassma_feedback') || '[]');
    const newFb = {
      id: Date.now(),
      ...feedbackData,
      status: 'pending',
      admin_reply: null,
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    fbs.unshift(newFb);
    localStorage.setItem('bassma_feedback', JSON.stringify(fbs));
    return { success: true, message: 'تم إرسال رسالتكم بنجاح' };
  },

  async replyFeedback(feedbackId, adminReply) {
    if (this.isApiAvailable) {
      try {
        const res = await fetch(`/api/feedback/${feedbackId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ admin_reply: adminReply })
        });
        const data = await res.json();
        if (data.success) return true;
      } catch (e) {
        console.error(e);
      }
    }
    this.seedLocalData();
    const fbs = JSON.parse(localStorage.getItem('bassma_feedback') || '[]');
    const idx = fbs.findIndex(f => f.id == feedbackId);
    if (idx !== -1) {
      fbs[idx].admin_reply = adminReply;
      fbs[idx].status = 'replied';
      localStorage.setItem('bassma_feedback', JSON.stringify(fbs));
      return true;
    }
    return false;
  },

  // ==================== المصادقة والمستخدمين (Auth) ====================
  async login(email, password) {
    if (this.isApiAvailable) {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.success) {
          localStorage.setItem('bassma_current_user', JSON.stringify(data.user));
          return data;
        }
        return data;
      } catch (e) {
        console.error(e);
      }
    }
    this.seedLocalData();
    const users = JSON.parse(localStorage.getItem('bassma_users') || '[]');
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (user) {
      const { password, ...safeUser } = user;
      localStorage.setItem('bassma_current_user', JSON.stringify(safeUser));
      return { success: true, user: safeUser };
    }
    return { success: false, message: 'بيانات الدخول غير صحيحة' };
  },

  async register(userData) {
    if (this.isApiAvailable) {
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        });
        const data = await res.json();
        if (data.success) {
          localStorage.setItem('bassma_current_user', JSON.stringify(data.user));
          return data;
        }
        return data;
      } catch (e) {
        console.error(e);
      }
    }
    this.seedLocalData();
    const users = JSON.parse(localStorage.getItem('bassma_users') || '[]');
    if (users.some(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
      return { success: false, message: 'البريد الإلكتروني مسجل مسبقاً' };
    }
    const newUser = {
      id: Date.now(),
      name: userData.name,
      email: userData.email,
      password: userData.password,
      phone: userData.phone || '',
      role: 'client',
      organization: userData.organization || '',
      address: userData.address || '',
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    users.push(newUser);
    localStorage.setItem('bassma_users', JSON.stringify(users));
    const { password, ...safeUser } = newUser;
    localStorage.setItem('bassma_current_user', JSON.stringify(safeUser));
    return { success: true, user: safeUser };
  },

  getCurrentUser() {
    return JSON.parse(localStorage.getItem('bassma_current_user') || 'null');
  },

  logout() {
    localStorage.removeItem('bassma_current_user');
  },

  // ==================== بذر البيانات الموريتانية الرسمية ====================
  seedLocalData() {
    try {
      // Force clear any previous cached data to ensure Mauritanian assets and payment updates appear immediately
      const v = localStorage.getItem('bassma_data_version');
      if (v !== '6.0') {
        localStorage.removeItem('bassma_services');
        localStorage.removeItem('bassma_activities');
        localStorage.removeItem('bassma_news');
        localStorage.setItem('bassma_data_version', '6.0');
      }
    } catch(e) {}

    // 1. Users (Mauritania)
    if (!localStorage.getItem('bassma_users')) {
      localStorage.setItem('bassma_users', JSON.stringify([
        { id: 1, name: 'إدارة شركة بصمة كلين', email: 'admin@bassmaclean.mr', password: 'admin123', role: 'admin', phone: '+222 45 25 00 00' },
        { id: 2, name: 'شركة موريتل للاتصالات', email: 'client@mauritel.mr', password: 'client123', role: 'client', phone: '+222 45 25 11 22', organization: 'شركة موريتل' }
      ]));
    }

    // 2. Services (11 services with authentic Mauritanian photos)
    if (!localStorage.getItem('bassma_services')) {
      localStorage.setItem('bassma_services', JSON.stringify([
        {
          id: 1,
          title_ar: "تنظيف الشوارع والطرقات العامة",
          title_fr: "Nettoyage des Rues et Artères Urbaines",
          category: "urban",
          description_ar: "كنس وإزالة الرمال والأتربة المتراكمة على الطرقات الحضرية، وغسيل الممرات والأرصفة الرئيسية في العاصمة نواكشوط لإظهار شوارعنا بمظهر حضاري يليق ببلادنا.",
          description_fr: "Désensablement et balayage soigné des grandes avenues urbaines, lavage des trottoirs et axes principaux de Nouakchott pour valoriser l'image de notre capitale.",
          features_ar: "إزالة الرمال والأتربة الزاحفة;كنس الحواف والأرصفة بعناية;خدمات دورية صباحية ومسائية;تنسيق مع السلطات المحلية والبلديات",
          features_fr: "Élimination continue du sable;Balayage méticuleux des bordures;Passages réguliers matin et soir;Coordination avec les municipalités",
          equipment_ar: "مكانس ميكانيكية ويدوية متينة، مجارف سحب الرمال، شاحنات قلابة، ومعدات غسيل مائي",
          equipment_fr: "Balayeuses adaptées au sable, pelles de déblaiement, camions bennes et matériel de lavage",
          icon: "road",
          image: "assets/street_nouakchott.jpg"
        },
        {
          id: 2,
          title_ar: "جمع ونقل النفايات والأكياس",
          title_fr: "Collecte et Évacuation des Déchets",
          category: "urban",
          description_ar: "إفراغ الحاويات وتفريغ نقاط تجميع القمامة ونقلها في شاحنات مجهزة إلى المفرغة العمومية المعتمدة خارج المدينة لمنع انتشار الروائح والتلوث.",
          description_fr: "Vidage régulier des bacs et ramassage des dépôts vers les décharges autorisées hors des zones habitées pour préserver l'hygiène publique.",
          features_ar: "جدول تفريغ منتظم ومدروس;نقل محكم يمنع تطاير النفايات;تطهير محيط الحاويات بعد الرفع;حماية الصحة العامة والمظهر الحضري",
          features_fr: "Calendrier régulier et rigoureux;Transport sécurisé évitant la dispersion;Désinfection des abords des bacs;Préservation de la salubrité",
          equipment_ar: "شاحنات نقل مجهزة بشباك إحكام، رافعات حاويات، حاويات نفايات مقاومة للحرارة",
          equipment_fr: "Camions bennes équipés de filets de retenue, lève-bacs et conteneurs urbains solides",
          icon: "trash-can",
          image: "assets/street_nouakchott.jpg"
        },
        {
          id: 3,
          title_ar: "تنظيف الأحياء والمناطق السكنية",
          title_fr: "Nettoyage des Quartiers Résidentiels",
          category: "urban",
          description_ar: "برامج نظافة شاملة للأحياء والمجمعات السكنية بنواكشوط تشمل كنس الشوارع الفرعية، تنظيف الساحات، وإزالة الأكياس البلاستيكية العالقة.",
          description_fr: "Entretien global des quartiers résidentiels et cités de Nouakchott : balayage des ruelles, nettoyage des places et collecte des plastiques.",
          features_ar: "فرق عمل راجلة منتظمة;تنظيف الساحات ومحيط المنازل;جمع الأكياس والمخلفات الخفيفة;تعزيز المظهر اللائق للحي",
          features_fr: "Équipes pédestres régulières;Entretien des espaces communs;Élimination des sachets plastiques;Embellissement du cadre de vie",
          equipment_ar: "عربات كنس يدوية خفيفة، أدوات التقاط الأكياس، ملابس حماية مريحة لعمال النظافة",
          equipment_fr: "Chariots de voirie légers, pinces ramasse-déchets, tenues de haute visibilité",
          icon: "house",
          image: "assets/street_nouakchott.jpg"
        },
        {
          id: 4,
          title_ar: "تنظيف مقرات البلديات والمدن الداخلية",
          title_fr: "Salubrité Municipale et Villes de l'Intérieur",
          category: "urban",
          description_ar: "شراكات مع البلديات الحضرية والريفية لتنظيم حملات نظافة مكثفة للأسواق الشعبية والمحطات الطرقية والمناطق العامة في العاصمة والولايات الداخلية.",
          description_fr: "Partenariats de soutien aux communes pour assainir les grands marchés, gares routières et espaces publics à Nouakchott et dans les régions.",
          features_ar: "تنظيف شامل للأسواق والمحطات;إسناد فرق النظافة البلدية;حملات مكثفة قبل الأعياد والمواسم;تقارير ميدانية واضحة للبلدية",
          features_fr: "Nettoyage approfondi des marchés;Appui technique aux communes;Campagnes renforcées avant les fêtes;Suivi transparent des opérations",
          equipment_ar: "معدات كنس ثقيلة، شاحنات تفريغ، مجارف آلية، ومضخات غسيل",
          equipment_fr: "Matériel lourd de déblaiement, camions bennes et motopompes de lavage",
          icon: "city",
          image: "assets/street_nouakchott.jpg"
        },
        {
          id: 5,
          title_ar: "تنظيف المؤسسات الحكومية والإدارات",
          title_fr: "Entretien des Institutions Publiques & Ministères",
          category: "corporate",
          description_ar: "خدمات صيانة ونظافة متقنة للمقرات الوزارية، الإدارات العمومية، والمصالح الرسمية في موريتانيا، بأطقم عمل موثوقة ومنضبطة.",
          description_fr: "Prestations rigoureuses de propreté et d'hygiène pour les ministères, directions administratives et établissements publics en Mauritanie.",
          features_ar: "عمالة موريتانية موثوقة وأمينة;تنظيف المكاتب وقاعات الاستقبال;تلميع الأرضيات والممرات;الحفاظ على هيبة ونظافة المقر الرسمي",
          features_fr: "Personnel intègre et de confiance;Entretien des bureaux et salles de réunion;Lustrage des sols;Respect strict de la confidentialité",
          equipment_ar: "ماكينات تلميع وجلي الأرضيات، مكانس صناعية هادئة، معقمات ومطهرات معتمدة",
          equipment_fr: "Monobrosses de lustrage, aspirateurs professionnels silencieux, produits d'hygiène agréés",
          icon: "landmark",
          image: "assets/bank_bmi.jpg"
        },
        {
          id: 6,
          title_ar: "تنظيف البنوك والمصارف والشركات",
          title_fr: "Nettoyage des Banques et Sièges d'Entreprises",
          category: "corporate",
          description_ar: "خدمات تنظيف راقية للمقرات المصرفية وشركات التأمين والاتصالات، مع مرونة تامة في ساعات العمل (صباحاً قبل الدوام أو بعد الإغلاق).",
          description_fr: "Services d'entretien haut de gamme pour agences bancaires, sièges de télécoms et assurances avec horaires décalés flexibles.",
          features_ar: "مواعيد عمل لا تعطل المراجعين;تنظيف الواجهات الزجاجية بدقة;العناية بالسجاد والمقاعد الجلدية;تعطير مستمر وتطهير المكاتب",
          features_fr: "Interventions sans gêne pour la clientèle;Lavage soigné des vitrines;Entretien moquettes et fauteuils;Désinfection régulière",
          equipment_ar: "معدات تنظيف زجاج متخصصة، آلات غسيل السجاد والموكيت، مواد تنظيف وتلميع فاخرة",
          equipment_fr: "Kits de perches télescopiques vitres, injecteurs moquette, produits neutres parfumés",
          icon: "building-columns",
          image: "assets/bank_bmi.jpg"
        },
        {
          id: 7,
          title_ar: "تنظيف الفنادق والمطاعم السياحية",
          title_fr: "Hygiène & Entretien Hôtelier & Restauration",
          category: "special",
          description_ar: "حلول نظافة متكاملة للفنادق والمطاعم تشمل تنظيف الغرف، الأجنحة، المطابخ، إزالة الشحوم، وتطهير الصالات والمرافق الصحية.",
          description_fr: "Solutions complètes d'hygiène pour complexes hôteliers et restaurants : chambres, cuisines professionnelles et salles de réception.",
          features_ar: "معايير سلامة غذائية ونظافة صارمة;إزالة الدهون من أسطح المطابخ;تنظيف وتطهير أسرّة ومفروشات النزلاء;لمعان دائم للصالات والمداخل",
          features_fr: "Respect des règles d'hygiène alimentaire;Dégraissage en profondeur des cuisines;Désinfection du linge et literie;Éclat des espaces d'accueil",
          equipment_ar: "أجهزة تنظيف بالبخار الساخن، مزيلات شحوم معتمدة، معدات غسيل مفروشات",
          equipment_fr: "Nettoyeurs vapeur, dégraissants professionnels certifiés, matériel d'entretien textile",
          icon: "hotel",
          image: "assets/restaurant_paul.jpg"
        },
        {
          id: 8,
          title_ar: "تنظيف وتطهير المستشفيات والعيادات",
          title_fr: "Désinfection et Hygiène Hospitalière",
          category: "special",
          description_ar: "بروتوكولات تعقيم وتطهير دقيقة للمراكز الصحية والعيادات للوقاية من الميكروبات وضمان بيئة استشفائية آمنة للمرضى والكوادر الطبية.",
          description_fr: "Protocoles rigoureux de bio-nettoyage et désinfection pour polycliniques, cabinets médicaux et centres de santé en Mauritanie.",
          features_ar: "تعقيم دوري للغرف وممرات المرضى;فرز آمن للنفايات الصحية;تطهير الأسطح بمحاليل طبية معتمدة;فريق مدرب على الوقاية الصحية",
          features_fr: "Désinfection continue des zones de soins;Gestion sécurisée des déchets médicaux;Produits antiseptiques homologués;Agents formés à l'hygiène",
          equipment_ar: "مضخات تعقيم رذاذية دقيقة، ممسحات قطنية ذات استخدام محدد، ملابس وقاية متكاملة",
          equipment_fr: "Pulvérisateurs désinfectants, textiles microfibres à usage contrôlé, équipements de protection EPI",
          icon: "hospital",
          image: "assets/hospital_cnc.jpg"
        },
        {
          id: 9,
          title_ar: "تنظيف المراكز التجارية والأسواق",
          title_fr: "Entretien des Centres Commerciaux & Marchés",
          category: "corporate",
          description_ar: "نظافة مستمرة للأسواق والمجمعات التجارية الكبرى التي تشهد إقبالاً كثيفاً في تفرغ زينة ولكصر وبقية مقاطعات نواكشوط.",
          description_fr: "Permanence propreté pour centres commerciaux et galeries marchandes à fort trafic à Nouakchott (Tevragh-Zeina, Ksar...).",
          features_ar: "تواجد مستمر طوال ساعات التسوق;تنظيف وتلميع الممرات والأرضيات;تعقيم دورات المياه باستمرار;إفراغ فوري لسلات المهملات",
          features_fr: "Présence continue durant les heures d'ouverture;Lavage régulier des allées marchandes;Hygiène constante des sanitaires;Vidage rapide des corbeilles",
          equipment_ar: "ماكينات غسيل وتجفيف سريعة للأرضيات، معدات مسح سريعة ومواد تعقيم عطرية",
          equipment_fr: "Autolaveuses compactes maniables, chariots de lavage doubles bacs, détergents désodorisants",
          icon: "cart-shopping",
          image: "assets/hotel_nouakchott.jpg"
        },
        {
          id: 10,
          title_ar: "عقود النظافة الدورية للمؤسسات",
          title_fr: "Contrats d'Entretien Périodiques pour Entreprises",
          category: "contracts",
          description_ar: "شراكات تعاقدية مخصصة (يومية، أسبوعية، شهرية أو سنوية) تتضمن التزامات واضحة وجداول عمل منتظمة مع إشراف ومتابعة مستمرة.",
          description_fr: "Partenariats contractuels personnalisés (quotidiens, hebdomadaires, mensuels ou annuels) avec cahier des charges clair et superviseur attitré.",
          features_ar: "تسعير واضح ومناسب لواقع السوق;فريق عمل ثابت ومدرّب;توفير مستلزمات النظافة والصابون;تقييم شهري دوري للأداء",
          features_fr: "Tarification transparente et compétitive;Équipe dédiée et stable;Fourniture des consommables hygiène;Audit qualité périodique",
          equipment_ar: "تجهيز الموقع بكافة المعدات والمواد المطلوبة طيلة فترة العقد مع توفير البديل فوراً",
          equipment_fr: "Dotation complète de matériel et consommables sur site pour toute la durée du contrat",
          icon: "file-signature",
          image: "assets/hotel_nouakchott.jpg"
        },
        {
          id: 11,
          title_ar: "خدمات النظافة الخاصة والطارئة",
          title_fr: "Interventions Spécifiques & Urgences Salubrité",
          category: "contracts",
          description_ar: "تدخلات نوعية للمناسبات والمؤتمرات، تنظيف ما بعد البناء والتشطيب، وإزالة الأنقاض والمخلفات الطارئة بنواكشوط والولايات المجاورة.",
          description_fr: "Prestations ponctuelles sur mesure : après chantier, événements officiels, foires et interventions urgentes de salubrité à Nouakchott.",
          features_ar: "فريق تدخل سريع وجاهز للطوارئ;تنظيف بقايا الأسمنت والطلاء;جلي عميق للأرضيات وتلميع النوافذ;تسليم الموقع نظيفاً وجاهزاً للسكن",
          features_fr: "Équipe mobile réactive;Décapage des résidus de colle et plâtre;Nettoyage en profondeur des baies vitrées;Livraison de locaux impeccables",
          equipment_ar: "مكانس شفط صناعية للغبار والماء، ماكينات كشط الأرضيات، معدات ضغط عالي",
          equipment_fr: "Aspirateurs industriels eau et poussière, monobrosses décapantes, nettoyeurs haute pression",
          icon: "shield-halved",
          image: "assets/hospital_cnc.jpg"
        }
      ]));
    }

    // 3. Orders (Mauritanian clients & institutions)
    if (!localStorage.getItem('bassma_orders')) {
      localStorage.setItem('bassma_orders', JSON.stringify([
        {
          id: 1,
          ref_code: "BC-2026-8041",
          user_id: 2,
          client_name: "شركة موريتل للاتصالات",
          client_type: "corporate",
          phone: "+222 45 25 11 22",
          email: "facilities@mauritel.mr",
          service_id: 6,
          service_title: "تنظيف البنوك والمصارف والشركات",
          contract_type: "annual",
          city: "نواكشوط",
          district: "تفرغ زينة",
          address: "شارع جمال عبد الناصر، المقر الإداري",
          description: "عقد صيانة ونظافة سنوي شامل للمقر الإداري والمكاتب وقاعات الاستقبال وواجهات المبنى.",
          photo_url: "assets/bank_bmi.jpg",
          status: "in_progress",
          rejection_reason: null,
          admin_notes: "تم توقيع العقد وبدء الخدمة الميدانية بطاقم منضبط يشرف عليه مراقب جودة مقيم.",
          created_at: "2026-11-02 09:30:00",
          updated_at: "2026-11-03 11:00:00"
        },
        {
          id: 2,
          ref_code: "BC-2026-8042",
          user_id: null,
          client_name: "مجمع شنقيط الفندقي",
          client_type: "corporate",
          phone: "+222 45 29 44 55",
          email: "contact@hotel-chinguetti.mr",
          service_id: 7,
          service_title: "تنظيف الفنادق والمطاعم السياحية",
          contract_type: "monthly",
          city: "نواكشوط",
          district: "تفرغ زينة",
          address: "قرب السفارة الفرنسية، شارع المختار ولد داداه",
          description: "طلب عقد نظافة دوري للصالات والمطعم والمرافق العامة بالفندق قبل الموسم السياحي.",
          photo_url: "assets/restaurant_paul.jpg",
          status: "under_review",
          rejection_reason: null,
          admin_notes: "تمت المعاينة الفنية وجاري إعداد مقايسة التكاليف والعمالة المقترحة.",
          created_at: "2026-11-05 14:15:00",
          updated_at: "2026-11-06 10:00:00"
        },
        {
          id: 3,
          ref_code: "BC-2026-8043",
          user_id: null,
          client_name: "محمد الأمين ولد فال",
          client_type: "individual",
          phone: "+222 36 22 33 44",
          email: "med.lemine@gmail.com",
          service_id: 11,
          service_title: "خدمات النظافة الخاصة والطارئة",
          contract_type: "one_time",
          city: "نواكشوط",
          district: "لكصر",
          address: "قرب ملتقى طرق ولد اماه، منزل سكني",
          description: "تنظيف منزل بعد انتهاء أعمال الصيانة والطلاء وجلي أرضيات الصالون.",
          photo_url: "assets/hotel_nouakchott.jpg",
          status: "approved",
          rejection_reason: null,
          admin_notes: "تمت الموافقة وتحديد موعد التدخل يوم السبت القادم صباحاً.",
          created_at: "2026-11-06 16:40:00",
          updated_at: "2026-11-07 09:30:00"
        },
        {
          id: 4,
          ref_code: "BC-2026-8044",
          user_id: null,
          client_name: "مستشفى الصداقة - قسم الإدارة",
          client_type: "corporate",
          phone: "+222 45 24 88 99",
          email: "direction@hopital-amitie.mr",
          service_id: 8,
          service_title: "تنظيف وتطهير المستشفيات والعيادات",
          contract_type: "annual",
          city: "نواكشوط",
          district: "عرفات",
          address: "شارع الأمل، مقاطعة عرفات",
          description: "دراسة لإبرام عقد تطهير بيئي ونظافة مستمرة لقاعات الانتظار والممرات الخارجية.",
          photo_url: "assets/hospital_cnc.jpg",
          status: "completed",
          rejection_reason: null,
          admin_notes: "تم إنجاز التدخل الأولي بنجاح وتقديم التقرير الفني للإدارة.",
          created_at: "2026-10-25 10:00:00",
          updated_at: "2026-10-28 16:00:00"
        },
        {
          id: 5,
          ref_code: "BC-2026-8045",
          user_id: null,
          client_name: "عيادة الشفاء التخصصية",
          client_type: "corporate",
          phone: "+222 22 11 00 99",
          email: "chifa.clinique@gmail.com",
          service_id: 8,
          service_title: "تنظيف وتطهير المستشفيات والعيادات",
          contract_type: "one_time",
          city: "نواكشوط",
          district: "السبخة",
          address: "قرب السوق الكبير، السبخة",
          description: "طلب تعقيم شامل للعيادة وغرف الفحص.",
          photo_url: "",
          status: "received",
          rejection_reason: null,
          admin_notes: "تم تسجيل الطلب وبانتظار اتصال المشرف للتأكيد.",
          created_at: "2026-11-08 08:00:00",
          updated_at: "2026-11-08 08:00:00"
        }
      ]));
    }

    // 4. Waste Reports in Nouakchott (Realistic Coordinates)
    if (!localStorage.getItem('bassma_reports')) {
      localStorage.setItem('bassma_reports', JSON.stringify([
        {
          id: 1,
          ref_code: "REP-2026-101",
          reporter_name: "مواطن من تفرغ زينة",
          reporter_phone: "36112233",
          latitude: 18.0980,
          longitude: -15.9750,
          city: "نواكشوط",
          district: "تفرغ زينة",
          street: "قرب فندق موري سانتر، شارع المختار ولد داداه",
          description: "تراكم أكياس نفايات وبقايا مواد بناء تعيق الرصيف بعد إصلاحات بالشارع.",
          photo_url: "assets/street_nouakchott.jpg",
          status: "dispatched",
          admin_notes: "تم توجيه فريق ميداني وشاحنة لرفع المخلفات وتنظيف الرصيف.",
          created_at: "2026-11-06 14:30:00",
          updated_at: "2026-11-06 15:10:00"
        },
        {
          id: 2,
          ref_code: "REP-2026-102",
          reporter_name: "محمد ولد سيدي",
          reporter_phone: "46223344",
          latitude: 18.0850,
          longitude: -15.9650,
          city: "نواكشوط",
          district: "لكصر",
          street: "قرب سوق لكصر المركزي، ملتقى الطرق",
          description: "تراكم صناديق كرتون ومخلفات خضار خارج الحاويات بعد نهاية نشاط السوق.",
          photo_url: "assets/street_nouakchott.jpg",
          status: "in_progress",
          admin_notes: "الفريق متواجد حالياً بالموقع لجمع النفايات وكنس المساحة المحيطة.",
          created_at: "2026-11-07 09:15:00",
          updated_at: "2026-11-07 10:00:00"
        },
        {
          id: 3,
          ref_code: "REP-2026-103",
          reporter_name: "فاطمة منت أحمد",
          reporter_phone: "22334455",
          latitude: 18.0400,
          longitude: -15.9500,
          city: "نواكشوط",
          district: "عرفات",
          street: "قرب العمود 11، شارع الداية",
          description: "تجمع أكياس بلاستيكية مبعثرة قرب الساحة العامة المفتوحة.",
          photo_url: "assets/street_nouakchott.jpg",
          status: "resolved",
          admin_notes: "تمت إزالة الأكياس بالكامل وتنظيف الساحة ورش معقمات بالموقع.",
          created_at: "2026-11-05 11:20:00",
          updated_at: "2026-11-05 16:45:00"
        },
        {
          id: 4,
          ref_code: "REP-2026-104",
          reporter_name: "مواطن مسؤول",
          reporter_phone: "",
          latitude: 18.0650,
          longitude: -15.9800,
          city: "نواكشوط",
          district: "السبخة",
          street: "شارع العيادة المجمعة، قرب السينما القديمة",
          description: "تراكم مخلفات مياه وأتربة تعيق عبور المشاة قرب المحلات.",
          photo_url: "assets/street_nouakchott.jpg",
          status: "new",
          admin_notes: "تم تسجيل البلاغ وإحالته لجدول التدخل المسائي.",
          created_at: "2026-11-08 08:30:00",
          updated_at: "2026-11-08 08:30:00"
        },
        {
          id: 5,
          ref_code: "REP-2026-105",
          reporter_name: "إبراهيم ولد فال",
          reporter_phone: "33445566",
          latitude: 18.1150,
          longitude: -15.9400,
          city: "نواكشوط",
          district: "تياريت",
          street: "طريق أكجوجت، قرب دار الشباب",
          description: "تراكم ركام أشجار وأخشاب على جانب الطريق العام.",
          photo_url: "assets/street_nouakchott.jpg",
          status: "reviewed",
          admin_notes: "تمت المعاينة وسيتم توجيه شاحنة قلابة لرفع المخلفات اليوم.",
          created_at: "2026-11-07 16:45:00",
          updated_at: "2026-11-07 18:20:00"
        },
        {
          id: 6,
          ref_code: "REP-2026-106",
          reporter_name: "مريم منت المصطفى",
          reporter_phone: "",
          latitude: 18.0500,
          longitude: -15.9900,
          city: "نواكشوط",
          district: "الميناء",
          street: "قرب ملتقى طرق نانسي، شارع الميناء",
          description: "تراكم قناني ومخلفات تجارية في زاوية الشارع.",
          photo_url: "assets/street_nouakchott.jpg",
          status: "resolved",
          admin_notes: "تمت المعالجة ورفع القمامة وتهيئة الموقع بنجاح.",
          created_at: "2026-11-04 20:00:00",
          updated_at: "2026-11-04 21:30:00"
        }
      ]));
    }

    // 5. Operational Action Plans & Programs (Realistic, future-oriented)
    if (!localStorage.getItem('bassma_activities')) {
      localStorage.setItem('bassma_activities', JSON.stringify([
        {
          id: 1,
          title_ar: "برنامج إسناد نظافة الشوارع والأسواق الكبرى بنواكشوط",
          title_fr: "Programme d'Assainissement des Grandes Artères et Marchés",
          category: "campaigns",
          location: "نواكشوط - الشوارع الحيوية والأسواق",
          description_ar: "خطة عمل ميدانية دورية تركز على كنس حواف الطرقات الرئيسية، إزالة الرمال المتراكمة، وتنظيف محيط الأسواق الشعبية لمساندة الجهود البلدية وإبراز المظهر اللائق للعاصمة.",
          description_fr: "Plan d'intervention régulier ciblant le désensablement des grands boulevards, le balayage des axes prioritaires et l'assainissement des abords des marchés de Nouakchott.",
          image: "assets/street_nouakchott.jpg"
        },
        {
          id: 2,
          title_ar: "مبادرة التوعية البيئية والتعقيم في المنشآت الصحية والمدارس",
          title_fr: "Initiative d'Hygiène Hospitalière & Salubrité dans les Écoles",
          category: "volunteer",
          location: "نواكشوط - المستشفيات والمجمعات السكنية",
          description_ar: "برنامج توعوي وطني بالتعاون مع المنشآت الصحية لحث المواطنين على الالتزام بإرشادات النظافة والحد من النفايات العشوائية.",
          description_fr: "Actions pédagogiques citoyennes auprès des hôpitaux et centres de formation pour promouvoir la désinfection et les bonnes pratiques d'hygiène.",
          image: "assets/hospital_cnc.jpg"
        },
        {
          id: 3,
          title_ar: "برنامج التعاقد المستدام مع البنوك والشركات الموريتانية",
          title_fr: "Programme de Partenariat Propreté avec les Entreprises",
          category: "projects",
          location: "نواكشوط ونواذيبو - مقرات الشركات والبنوك",
          description_ar: "تقديم حلول نظافة وتعقيم متكاملة للمؤسسات العامة والخاصة بعمالة موريتانية مدربة وبجداول زمنية مرنة تحفظ خصوصية وسير العمل في المقرات الإدارية.",
          description_fr: "Offre d'entretien continue et sur mesure dédiée aux sièges d'entreprises, institutions et banques mauritaniennes par des équipes qualifiées et fiables.",
          image: "assets/bank_bmi.jpg"
        },
        {
          id: 4,
          title_ar: "خطة التدخل السريع لنظافة المرافق الفندقية والمطاعم",
          title_fr: "Plan d'Intervention pour l'Hôtellerie et la Restauration",
          category: "campaigns",
          location: "نواكشوط - الفنادق والمنشآت التجارية",
          description_ar: "آلية استجابة سريعة لخدمات الضيافة، المطاعم، والمجمعات التجارية لتطبيق أعلى معايير السلامة والنظافة البيئية.",
          description_fr: "Dispositif d'intervention réactif pour le secteur hôtelier, les restaurants et les centres d'affaires à Nouakchott.",
          image: "assets/restaurant_paul.jpg"
        }
      ]));
    }

    // 6. News tailored to Mauritania
    if (!localStorage.getItem('bassma_news')) {
      localStorage.setItem('bassma_news', JSON.stringify([
        {
          id: 1,
          title_ar: "شركة بصمة كلين تطلق خدماتها المتكاملة لنظافة المؤسسات بالعاصمة نواكشوط",
          title_fr: "Bassma Clean lance ses services de propreté d'entreprises à Nouakchott",
          summary_ar: "انطلاقة رسمية للشركة برؤية موريتانية شابة تهدف إلى تقديم حلول نوعية لنظافة وصيانة مقرات الشركات والبنوك والمرافق العامة بنواكشوط.",
          summary_fr: "Lancement officiel de nos prestations d'hygiène professionnelle avec des équipes mauritaniennes formées pour accompagner le développement de nos entreprises.",
          content_ar: "تسعى شركة بصمة كلين إلى إرساء معايير جديدة في خدمات النظافة والصيانة من خلال كفاءات وطنية شابة، وتوفير عقود مرنة تضمن بيئة عمل نظيفة ومحفزة للمؤسسات الوطنية.",
          content_fr: "Bassma Clean s'engage à instaurer une rigueur exemplaire dans la gestion de l'hygiène tertiaire et urbaine à Nouakchott au service du développement de notre pays.",
          category: "announcement",
          image: "assets/bank_bmi.jpg",
          published_at: "2026-11-01"
        },
        {
          id: 2,
          title_ar: "إطلاق منصة التبليغ التفاعلية عن تراكم النفايات في شوارع نواكشوط",
          title_fr: "Lancement de la plateforme interactive de signalement des déchets à Nouakchott",
          summary_ar: "أتاحت الشركة للمواطنين إمكانية تحديد أماكن تراكم القمامة عبر الخريطة التفاعلية للمساهمة في توجيه فرق التدخل ومعالجة النقاط الملوثة.",
          summary_fr: "Un outil numérique citoyen permettant à chaque habitant de localiser sur la carte les déchets sauvages pour faciliter l'intervention de nos équipes.",
          content_ar: "تهدف هذه المبادرة إلى ترسيخ السلوك المدني الإيجابي والتعاون بين الساكنة وفرق النظافة لجعل أحيائنا وشوارعنا أنظف وأجمل.",
          content_fr: "Cette initiative vise à encourager l'engagement civique et à coordonner les efforts pour préserver la propreté de nos quartiers.",
          category: "news",
          image: "assets/street_nouakchott.jpg",
          published_at: "2026-10-25"
        },
        {
          id: 3,
          title_ar: "عقود نظافة سنوية شاملة للمجمعات الفندقية والمرافق الكبرى",
          title_fr: "Contrats de maintenance annuelle pour complexes hôteliers et grands ensembles",
          summary_ar: "بصمة كلين توفر حزم تعاقدية مرنة لصيانة ونظافة الأبراج والمجمعات الفندقية ومراكز التسوق بنواكشوط.",
          summary_fr: "Des forfaits sur mesure pour l'entretien continu des grands ensembles hôteliers et commerciaux de la capitale.",
          content_ar: "تشمل الخدمات صيانة الواجهات الزجاجية الحديثة، تعقيم الصالات، وتنظيف الممرات ومواقف السيارات بانتظام.",
          content_fr: "Nos prestations couvrent l'entretien des façades modernes, la désinfection des halls et le nettoyage continu des espaces publics.",
          category: "awareness",
          image: "assets/hotel_nouakchott.jpg",
          published_at: "2026-10-15"
        }
        }
      ]));
    }

    // 7. Feedback in Mauritania
    if (!localStorage.getItem('bassma_feedback')) {
      localStorage.setItem('bassma_feedback', JSON.stringify([
        {
          id: 1,
          name: "أحمد ولد المختار - مسير مجمع تجاري بتفرغ زينة",
          phone: "36554433",
          email: "ahmed.mokhtar@gmail.com",
          feedback_type: "rating",
          subject: "إشادة بانضباط طاقم النظافة",
          message: "فريق عمل محترم ومنضبط جداً في المواعيد، نلمس فيهم حب العمل والأمانة. نشكركم على هذه الخدمة الوطنية الممتازة.",
          rating: 5,
          status: "replied",
          admin_reply: "شكراً جزيلاً أخي أحمد على ثقتكم في بصمة كلين، ونسعى دائماً لنكون عند حسن ظنكم في خدمة مؤسستكم ووطننا.",
          created_at: "2026-11-04 10:30:00"
        },
        {
          id: 2,
          name: "عيشة منت ببكر - ناشطة جمعوية بلكصر",
          phone: "22889900",
          email: "aicha.babacar@gmail.com",
          feedback_type: "suggestion",
          subject: "اقتراح حملة مشتركة لتنظيف محيط المدارس",
          message: "نقترح تنظيم حملة تنظيف تطوعية لمحيط المدارس الابتدائية بلكصر لتوعية التلاميذ بنظافة حيهم ومدرستهم.",
          rating: 5,
          status: "replied",
          admin_reply: "اقتراح قيم ومرحب به جداً، سنقوم بالتنسيق معكم لإدراج هذه المبادرة ضمن خطط عملنا الميدانية القادمة.",
          created_at: "2026-11-06 16:00:00"
        },
        {
          id: 3,
          name: "سيدي محمد ولد اسويدات",
          phone: "46778899",
          email: "sidi.med@yahoo.com",
          feedback_type: "note",
          subject: "ملاحظة بخصوص حاويات الحي بعرفات",
          message: "نرجو تعزيز نقطة جمع النفايات قرب المسجد بحاوية إضافية لمنع تكدس الأكياس على الأرض.",
          rating: 4,
          status: "reviewed",
          admin_reply: "شكراً لملاحظتكم الكريمة، تمت إحالة الملاحظة للمشرف لمعاينتها والتنسيق لمعالجة المشكلة.",
          created_at: "2026-11-07 11:20:00"
        }
      ]));
    }
  }
};
