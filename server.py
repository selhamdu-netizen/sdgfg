"""
شركة بصمة كلين للخدمات والنظافة العامة - خادم التطبيق المتكامل (موريتانيا)
BASSMA CLEAN Mauritanie - Full-Stack Application Server
Built with Python 3 Standard Library (ThreadingHTTPServer, SQLite3, JSON)
"""

import os
import sys
import json
import sqlite3
import urllib.parse
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from datetime import datetime

PORT = int(os.environ.get("PORT", 8080))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
DB_FILE = os.path.join(BASE_DIR, "clean_eco.db")
UPLOADS_DIR = os.path.join(PUBLIC_DIR, "uploads")

os.makedirs(PUBLIC_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)


def init_db(force_reseed=False):
    """تهيئة قاعدة البيانات بجداول منظمة وبيانات واقعية تعكس الهوية الموريتانية لشركة بصمة كلين"""
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()

    if force_reseed:
        c.execute("DROP TABLE IF EXISTS users")
        c.execute("DROP TABLE IF EXISTS services")
        c.execute("DROP TABLE IF EXISTS service_orders")
        c.execute("DROP TABLE IF EXISTS waste_reports")
        c.execute("DROP TABLE IF EXISTS activities")
        c.execute("DROP TABLE IF EXISTS feedback")
        c.execute("DROP TABLE IF EXISTS news")
        c.execute("DROP TABLE IF EXISTS notifications")

    # جدول المستخدمين
    c.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone TEXT,
        role TEXT DEFAULT 'client',
        organization TEXT,
        address TEXT,
        created_at TEXT
    )
    """)

    # جدول الخدمات
    c.execute("""
    CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title_ar TEXT NOT NULL,
        title_fr TEXT NOT NULL,
        category TEXT NOT NULL,
        description_ar TEXT NOT NULL,
        description_fr TEXT NOT NULL,
        features_ar TEXT,
        features_fr TEXT,
        equipment_ar TEXT,
        equipment_fr TEXT,
        icon TEXT,
        image TEXT
    )
    """)

    # جدول طلبات الخدمات والعقود
    c.execute("""
    CREATE TABLE IF NOT EXISTS service_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ref_code TEXT UNIQUE NOT NULL,
        user_id INTEGER,
        client_name TEXT NOT NULL,
        client_type TEXT DEFAULT 'individual',
        phone TEXT NOT NULL,
        email TEXT,
        service_id INTEGER,
        service_title TEXT NOT NULL,
        contract_type TEXT NOT NULL,
        city TEXT NOT NULL,
        district TEXT,
        address TEXT NOT NULL,
        area_sqm REAL DEFAULT 0,
        total_cost REAL DEFAULT 0,
        payment_method TEXT DEFAULT 'visit',
        description TEXT,
        photo_url TEXT,
        status TEXT DEFAULT 'received',
        rejection_reason TEXT,
        admin_notes TEXT,
        created_at TEXT,
        updated_at TEXT
    )
    """)

    # ترحيل وإضافة أعمدة الدفع والمساحة لقاعدة البيانات الحالية إن لم تكن موجودة
    for col_def in [
        ("area_sqm", "REAL DEFAULT 0"),
        ("total_cost", "REAL DEFAULT 0"),
        ("payment_method", "TEXT DEFAULT 'visit'")
    ]:
        try:
            c.execute(f"ALTER TABLE service_orders ADD COLUMN {col_def[0]} {col_def[1]}")
        except Exception:
            pass

    # جدول بلاغات تراكم النفايات
    c.execute("""
    CREATE TABLE IF NOT EXISTS waste_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ref_code TEXT UNIQUE NOT NULL,
        user_id INTEGER,
        reporter_name TEXT,
        reporter_phone TEXT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        city TEXT NOT NULL,
        district TEXT NOT NULL,
        street TEXT NOT NULL,
        description TEXT NOT NULL,
        photo_url TEXT,
        status TEXT DEFAULT 'new',
        admin_notes TEXT,
        created_at TEXT,
        updated_at TEXT
    )
    """)

    # جدول البرامج والمبادرات الميدانية
    c.execute("""
    CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title_ar TEXT NOT NULL,
        title_fr TEXT NOT NULL,
        category TEXT NOT NULL,
        location TEXT NOT NULL,
        description_ar TEXT NOT NULL,
        description_fr TEXT NOT NULL,
        image TEXT NOT NULL,
        created_at TEXT
    )
    """)

    # جدول الشكاوى والملاحظات
    c.execute("""
    CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        feedback_type TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        rating INTEGER DEFAULT 5,
        status TEXT DEFAULT 'pending',
        admin_reply TEXT,
        created_at TEXT
    )
    """)

    # جدول الأخبار والتوعية
    c.execute("""
    CREATE TABLE IF NOT EXISTS news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title_ar TEXT NOT NULL,
        title_fr TEXT NOT NULL,
        summary_ar TEXT NOT NULL,
        summary_fr TEXT NOT NULL,
        content_ar TEXT NOT NULL,
        content_fr TEXT NOT NULL,
        category TEXT NOT NULL,
        image TEXT NOT NULL,
        published_at TEXT
    )
    """)

    conn.commit()
    seed_initial_data(c, conn)
    conn.close()
    print("Database initialized successfully with Bassma Clean Mauritania context.")


def seed_initial_data(c, conn):
    """بذر البيانات الواقعية لشركة بصمة كلين في موريتانيا"""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # مستخدمين افتراضيين: مشرف وعميل مؤسسي
    c.execute("SELECT COUNT(*) FROM users")
    if c.fetchone()[0] == 0:
        c.execute("""
        INSERT INTO users (name, email, password, phone, role, organization, address, created_at)
        VALUES 
        ('إدارة شركة بصمة كلين', 'admin@bassmaclean.mr', 'admin123', '+222 45 25 00 00', 'admin', 'شركة بصمة كلين - موريتانيا', 'تفرغ زينة، نواكشوط', ?),
        ('شركة موريتل للاتصالات', 'client@mauritel.mr', 'client123', '+222 45 25 11 22', 'client', 'شركة موريتل', 'نواكشوط، شارع عبد الناصر', ?)
        """, (now, now))

    # بذر الخدمات الـ 11
    c.execute("SELECT COUNT(*) FROM services")
    if c.fetchone()[0] == 0:
        services = [
            (
                "تنظيف الشوارع والطرقات العامة",
                "Nettoyage des Rues et Artères Urbaines",
                "urban",
                "كنس وإزالة الرمال والأتربة المتراكمة على الطرقات الحضرية، وغسيل الممرات والأرصفة الرئيسية في العاصمة نواكشوط لإظهار شوارعنا بمظهر حضاري يليق ببلادنا.",
                "Désensablement et balayage soigné des grandes avenues urbaines, lavage des trottoirs et axes principaux de Nouakchott pour valoriser l'image de notre capitale.",
                "إزالة الرمال والأتربة الزاحفة;كنس الحواف والأرصفة بعناية;خدمات دورية صباحية ومسائية;تنسيق مع السلطات المحلية والبلديات",
                "Élimination continue du sable;Balayage méticuleux des bordures;Passages réguliers matin et soir;Coordination avec les municipalités",
                "مكانس ميكانيكية ويدوية متينة، مجارف سحب الرمال، شاحنات قلابة، ومعدات غسيل مائي",
                "Balayeuses adaptées au sable, pelles de déblaiement, camions bennes et matériel de lavage",
                "road",
                "assets/street_nouakchott.jpg"
            ),
            (
                "جمع ونقل النفايات والأكياس",
                "Collecte et Évacuation des Déchets",
                "urban",
                "إفراغ الحاويات وتفريغ نقاط تجميع القمامة ونقلها في شاحنات مجهزة إلى المفرغة العمومية المعتمدة خارج المدينة لمنع انتشار الروائح والتلوث.",
                "Vidage régulier des bacs et ramassage des dépôts vers les décharges autorisées hors des zones habitées pour préserver l'hygiène publique.",
                "جدول تفريغ منتظم ومدروس;نقل محكم يمنع تطاير النفايات;تطهير محيط الحاويات بعد الرفع;حماية الصحة العامة والمظهر الحضري",
                "Calendrier régulier et rigoureux;Transport sécurisé évitant la dispersion;Désinfection des abords des bacs;Préservation de la salubrité",
                "شاحنات نقل مجهزة بشباك إحكام، رافعات حاويات، حاويات نفايات مقاومة للحرارة",
                "Camions bennes équipés de filets de retenue, lève-bacs et conteneurs urbains solides",
                "trash-can",
                "assets/street_nouakchott.jpg"
            ),
            (
                "تنظيف الأحياء والمناطق السكنية",
                "Nettoyage des Quartiers Résidentiels",
                "urban",
                "برامج نظافة شاملة للأحياء والمجمعات السكنية بنواكشوط تشمل كنس الشوارع الفرعية، تنظيف الساحات، وإزالة الأكياس البلاستيكية العالقة.",
                "Entretien global des quartiers résidentiels et cités de Nouakchott : balayage des ruelles, nettoyage des places et collecte des plastiques.",
                "فرق عمل راجلة منتظمة;تنظيف الساحات ومحيط المنازل;جمع الأكياس والمخلفات الخفيفة;تعزيز المظهر اللائق للحي",
                "Équipes pédestres régulières;Entretien des espaces communs;Élimination des sachets plastiques;Embellissement du cadre de vie",
                "عربات كنس يدوية خفيفة، أدوات التقاط الأكياس، ملابس حماية مريحة لعمال النظافة",
                "Chariots de voirie légers, pinces ramasse-déchets, tenues de haute visibilité",
                "house",
                "assets/street_nouakchott.jpg"
            ),
            (
                "تنظيف مقرات البلديات والمدن الداخلية",
                "Salubrité Municipale et Villes de l'Intérieur",
                "urban",
                "شراكات مع البلديات الحضرية والريفية لتنظيم حملات نظافة مكثفة للأسواق الشعبية والمحطات الطرقية والمناطق العامة في العاصمة والولايات الداخلية.",
                "Partenariats de soutien aux communes pour assainir les grands marchés, gares routières et espaces publics à Nouakchott et dans les régions.",
                "تنظيف شامل للأسواق والمحطات;إسناد فرق النظافة البلدية;حملات مكثفة قبل الأعياد والمواسم;تقارير ميدانية واضحة للبلدية",
                "Nettoyage approfondi des marchés;Appui technique aux communes;Campagnes renforcées avant les fêtes;Suivi transparent des opérations",
                "معدات كنس ثقيلة، شاحنات تفريغ، مجارف آلية، ومضخات غسيل",
                "Matériel lourd de déblaiement, camions bennes et motopompes de lavage",
                "city",
                "assets/street_nouakchott.jpg"
            ),
            (
                "تنظيف المؤسسات الحكومية والإدارات",
                "Entretien des Institutions Publiques & Ministères",
                "corporate",
                "خدمات صيانة ونظافة متقنة للمقرات الوزارية، الإدارات العمومية، والمصالح الرسمية في موريتانيا، بأطقم عمل موثوقة ومنضبطة.",
                "Prestations rigoureuses de propreté et d'hygiène pour les ministères, directions administratives et établissements publics en Mauritanie.",
                "عمالة موريتانية موثوقة وأمينة;تنظيف المكاتب وقاعات الاستقبال;تلميع الأرضيات والممرات;الحفاظ على هيبة ونظافة المقر الرسمي",
                "Personnel intègre et de confiance;Entretien des bureaux et salles de réunion;Lustrage des sols;Respect strict de la confidentialité",
                "ماكينات تلميع وجلي الأرضيات، مكانس صناعية هادئة، معقمات ومطهرات معتمدة",
                "Monobrosses de lustrage, aspirateurs professionnels silencieux, produits d'hygiène agréés",
                "landmark",
                "assets/bank_bmi.jpg"
            ),
            (
                "تنظيف البنوك والمصارف والشركات",
                "Nettoyage des Banques et Sièges d'Entreprises",
                "corporate",
                "خدمات تنظيف راقية للمقرات المصرفية وشركات التأمين والاتصالات، مع مرونة تامة في ساعات العمل (صباحاً قبل الدوام أو بعد الإغلاق).",
                "Services d'entretien haut de gamme pour agences bancaires, sièges de télécoms et assurances avec horaires décalés flexibles.",
                "مواعيد عمل لا تعطل المراجعين;تنظيف الواجهات الزجاجية بدقة;العناية بالسجاد والمقاعد الجلدية;تعطير مستمر وتطهير المكاتب",
                "Interventions sans gêne pour la clientèle;Lavage soigné des vitrines;Entretien moquettes et fauteuils;Désinfection régulière",
                "معدات تنظيف زجاج متخصصة، آلات غسيل السجاد والموكيت، مواد تنظيف وتلميع فاخرة",
                "Kits de perches télescopiques vitres, injecteurs moquette, produits neutres parfumés",
                "building-columns",
                "assets/bank_bmi.jpg"
            ),
            (
                "تنظيف الفنادق والمطاعم السياحية",
                "Hygiène & Entretien Hôtelier & Restauration",
                "special",
                "حلول نظافة متكاملة للفنادق والمطاعم تشمل تنظيف الغرف، الأجنحة، المطابخ، إزالة الشحوم، وتطهير الصالات والمرافق الصحية.",
                "Solutions complètes d'hygiène pour complexes hôteliers et restaurants : chambres, cuisines professionnelles et salles de réception.",
                "معايير سلامة غذائية ونظافة صارمة;إزالة الدهون من أسطح المطابخ;تنظيف وتطهير أسرّة ومفروشات النزلاء;لمعان دائم للصالات والمداخل",
                "Respect des règles d'hygiène alimentaire;Dégraissage en profondeur des cuisines;Désinfection du linge et literie;Éclat des espaces d'accueil",
                "أجهزة تنظيف بالبخار الساخن، مزيلات شحوم معتمدة، معدات غسيل مفروشات",
                "Nettoyeurs vapeur, dégraissants professionnels certifiés, matériel d'entretien textile",
                "hotel",
                "assets/restaurant_paul.jpg"
            ),
            (
                "تنظيف وتطهير المستشفيات والعيادات",
                "Désinfection et Hygiène Hospitalière",
                "special",
                "بروتوكولات تعقيم وتطهير دقيقة للمراكز الصحية والعيادات للوقاية من الميكروبات وضمان بيئة استشفائية آمنة للمرضى والكوادر الطبية.",
                "Protocoles rigoureux de bio-nettoyage et désinfection pour polycliniques, cabinets médicaux et centres de santé en Mauritanie.",
                "تعقيم دوري للغرف وممرات المرضى;فرز آمن للنفايات الصحية;تطهير الأسطح بمحاليل طبية معتمدة;فريق مدرب على الوقاية الصحية",
                "Désinfection continue des zones de soins;Gestion sécurisée des déchets médicaux;Produits antiseptiques homologués;Agents formés à l'hygiène",
                "مضخات تعقيم رذاذية دقيقة، ممسحات قطنية ذات استخدام محدد، ملابس وقاية متكاملة",
                "Pulvérisateurs désinfectants, textiles microfibres à usage contrôlé, équipements de protection EPI",
                "hospital",
                "assets/hospital_cnc.jpg"
            ),
            (
                "تنظيف المراكز التجارية والأسواق",
                "Entretien des Centres Commerciaux & Marchés",
                "corporate",
                "نظافة مستمرة للأسواق والمجمعات التجارية الكبرى التي تشهد إقبالاً كثيفاً في تفرغ زينة ولكصر وبقية مقاطعات نواكشوط.",
                "Permanence propreté pour centres commerciaux et galeries marchandes à fort trafic à Nouakchott (Tevragh-Zeina, Ksar...).",
                "تواجد مستمر طوال ساعات التسوق;تنظيف وتلميع الممرات والأرضيات;تعقيم دورات المياه باستمرار;إفراغ فوري لسلات المهملات",
                "Présence continue durant les heures d'ouverture;Lavage régulier des allées marchandes;Hygiène constante des sanitaires;Vidage rapide des corbeilles",
                "ماكينات غسيل وتجفيف سريعة للأرضيات، معدات مسح سريعة ومواد تعقيم عطرية",
                "Autolaveuses compactes maniables, chariots de lavage doubles bacs, détergents désodorisants",
                "cart-shopping",
                "assets/hotel_nouakchott.jpg"
            ),
            (
                "عقود النظافة الدورية للمؤسسات",
                "Contrats d'Entretien Périodiques pour Entreprises",
                "contracts",
                "شراكات تعاقدية مخصصة (يومية، أسبوعية، شهرية أو سنوية) تتضمن التزامات واضحة وجداول عمل منتظمة مع إشراف ومتابعة مستمرة.",
                "Partenariats contractuels personnalisés (quotidiens, hebdomadaires, mensuels ou annuels) avec cahier des charges clair et superviseur attitré.",
                "تسعير واضح ومناسب لواقع السوق;فريق عمل ثابت ومدرّب;توفير مستلزمات النظافة والصابون;تقييم شهري دوري للأداء",
                "Tarification transparente et compétitive;Équipe dédiée et stable;Fourniture des consommables hygiène;Audit qualité périodique",
                "تجهيز الموقع بكافة المعدات والمواد المطلوبة طيلة فترة العقد مع توفير البديل فوراً",
                "Dotation complète de matériel et consommables sur site pour toute la durée du contrat",
                "file-signature",
                "assets/hotel_nouakchott.jpg"
            ),
            (
                "خدمات النظافة الخاصة والطارئة",
                "Interventions Spécifiques & Urgences Salubrité",
                "contracts",
                "تدخلات نوعية للمناسبات والمؤتمرات، تنظيف ما بعد البناء والتشطيب، وإزالة الأنقاض والمخلفات الطارئة بنواكشوط والولايات المجاورة.",
                "Prestations ponctuelles sur mesure : après chantier, événements officiels, foires et interventions urgentes de salubrité à Nouakchott.",
                "فريق تدخل سريع وجاهز للطوارئ;تنظيف بقايا الأسمنت والطلاء;جلي عميق للأرضيات وتلميع النوافذ;تسليم الموقع نظيفاً وجاهزاً للسكن",
                "Équipe mobile réactive;Décapage des résidus de colle et plâtre;Nettoyage en profondeur des baies vitrées;Livraison de locaux impeccables",
                "مكانس شفط صناعية للغبار والماء، ماكينات كشط الأرضيات، معدات ضغط عالي",
                "Aspirateurs industriels eau et poussière, monobrosses décapantes, nettoyeurs haute pression",
                "shield-halved",
                "assets/hospital_cnc.jpg"
            )
        ]

        c.executemany("""
        INSERT INTO services (
            title_ar, title_fr, category, description_ar, description_fr,
            features_ar, features_fr, equipment_ar, equipment_fr, icon, image
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, services)

    # بذر بلاغات تراكم النفايات بنواكشوط
    c.execute("SELECT COUNT(*) FROM waste_reports")
    if c.fetchone()[0] == 0:
        reports = [
            (
                "REP-2026-101",
                "مواطن من تفرغ زينة",
                "36112233",
                18.0980, -15.9750,
                "نواكشوط", "تفرغ زينة", "قرب فندق موري سانتر، شارع المختار ولد داداه",
                "تراكم أكياس نفايات وبقايا مواد بناء تعيق الرصيف بعد إصلاحات بالشارع.",
                "assets/street_nouakchott.jpg",
                "dispatched",
                "تم توجيه فريق ميداني وشاحنة لرفع المخلفات وتنظيف الرصيف.",
                "2026-11-06 14:30:00", "2026-11-06 15:10:00"
            ),
            (
                "REP-2026-102",
                "محمد ولد سيدي",
                "46223344",
                18.0850, -15.9650,
                "نواكشوط", "لكصر", "قرب سوق لكصر المركزي، ملتقى الطرق",
                "تراكم صناديق كرتون ومخلفات خضار خارج الحاويات بعد نهاية نشاط السوق.",
                "assets/street_nouakchott.jpg",
                "in_progress",
                "الفريق متواجد حالياً بالموقع لجمع النفايات وكنس المساحة المحيطة.",
                "2026-11-07 09:15:00", "2026-11-07 10:00:00"
            ),
            (
                "REP-2026-103",
                "فاطمة منت أحمد",
                "22334455",
                18.0400, -15.9500,
                "نواكشوط", "عرفات", "قرب العمود 11، شارع الداية",
                "تجمع أكياس بلاستيكية مبعثرة قرب الساحة العامة المفتوحة.",
                "assets/street_nouakchott.jpg",
                "resolved",
                "تمت إزالة الأكياس بالكامل وتنظيف الساحة ورش معقمات بالموقع.",
                "2026-11-05 11:20:00", "2026-11-05 16:45:00"
            ),
            (
                "REP-2026-104",
                "مواطن مسؤول",
                "",
                18.0650, -15.9800,
                "نواكشوط", "السبخة", "شارع العيادة المجمعة، قرب السينما القديمة",
                "تراكم مخلفات مياه وأتربة تعيق عبور المشاة قرب المحلات.",
                "assets/street_nouakchott.jpg",
                "new",
                "تم تسجيل البلاغ وإحالته لجدول التدخل المسائي.",
                "2026-11-08 08:30:00", "2026-11-08 08:30:00"
            ),
            (
                "REP-2026-105",
                "إبراهيم ولد فال",
                "33445566",
                18.1150, -15.9400,
                "نواكشوط", "تياريت", "طريق أكجوجت، قرب دار الشباب",
                "تراكم ركام أشجار وأخشاب على جانب الطريق العام.",
                "assets/street_nouakchott.jpg",
                "reviewed",
                "تمت المعاينة وسيتم توجيه شاحنة قلابة لرفع المخلفات اليوم.",
                "2026-11-07 16:45:00", "2026-11-07 18:20:00"
            ),
            (
                "REP-2026-106",
                "مريم منت المصطفى",
                "",
                18.0500, -15.9900,
                "نواكشوط", "الميناء", "قرب ملتقى طرق نانسي، شارع الميناء",
                "تراكم قناني ومخلفات تجارية في زاوية الشارع.",
                "assets/street_nouakchott.jpg",
                "resolved",
                "تمت المعالجة ورفع القمامة وتهيئة الموقع بنجاح.",
                "2026-11-04 20:00:00", "2026-11-04 21:30:00"
            )
        ]

        c.executemany("""
        INSERT INTO waste_reports (
            ref_code, reporter_name, reporter_phone, latitude, longitude,
            city, district, street, description, photo_url, status, admin_notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, reports)

    # بذر طلبات الخدمات والعقود بموريتانيا
    c.execute("SELECT COUNT(*) FROM service_orders")
    if c.fetchone()[0] == 0:
        orders = [
            (
                "BC-2026-8041", 2, "شركة موريتل للاتصالات", "corporate", "+222 45 25 11 22", "facilities@mauritel.mr",
                6, "تنظيف البنوك والمصارف والشركات", "annual", "نواكشوط", "تفرغ زينة", "شارع جمال عبد الناصر، المقر الإداري",
                "عقد صيانة ونظافة سنوي شامل للمقر الإداري والمكاتب وقاعات الاستقبال وواجهات المبنى.",
                "assets/bank_bmi.jpg",
                "in_progress", None, "تم توقيع العقد وبدء الخدمة الميدانية بطاقم منضبط يشرف عليه مراقب جودة مقيم.",
                "2026-11-02 09:30:00", "2026-11-03 11:00:00"
            ),
            (
                "BC-2026-8042", None, "مجمع شنقيط الفندقي", "corporate", "+222 45 29 44 55", "contact@hotel-chinguetti.mr",
                7, "تنظيف الفنادق والمطاعم السياحية", "monthly", "نواكشوط", "تفرغ زينة", "قرب السفارة الفرنسية، شارع المختار ولد داداه",
                "طلب عقد نظافة دوري للصالات والمطعم والمرافق العامة بالفندق قبل الموسم السياحي.",
                "assets/restaurant_paul.jpg",
                "under_review", None, "تمت المعاينة الفنية وجاري إعداد مقايسة التكاليف والعمالة المقترحة.",
                "2026-11-05 14:15:00", "2026-11-06 10:00:00"
            ),
            (
                "BC-2026-8043", None, "محمد الأمين ولد فال", "individual", "+222 36 22 33 44", "med.lemine@gmail.com",
                11, "خدمات النظافة الخاصة والطارئة", "one_time", "نواكشوط", "لكصر", "قرب ملتقى طرق ولد اماه، منزل سكني",
                "تنظيف منزل بعد انتهاء أعمال الصيانة والطلاء وجلي أرضيات الصالون.",
                "assets/hotel_nouakchott.jpg",
                "approved", None, "تمت الموافقة وتحديد موعد التدخل يوم السبت القادم صباحاً.",
                "2026-11-06 16:40:00", "2026-11-07 09:30:00"
            ),
            (
                "BC-2026-8044", None, "مستشفى الصداقة - قسم الإدارة", "corporate", "+222 45 24 88 99", "direction@hopital-amitie.mr",
                8, "تنظيف وتطهير المستشفيات والعيادات", "annual", "نواكشوط", "عرفات", "شارع الأمل، مقاطعة عرفات",
                "دراسة لإبرام عقد تطهير بيئي ونظافة مستمرة لقاعات الانتظار والممرات الخارجية.",
                "assets/hospital_cnc.jpg",
                "completed", None, "تم إنجاز التدخل الأولي بنجاح وتقديم التقرير الفني للإدارة.",
                "2026-10-25 10:00:00", "2026-10-28 16:00:00"
            ),
            (
                "BC-2026-8045", None, "عيادة الشفاء التخصصية", "corporate", "+222 22 11 00 99", "chifa.clinique@gmail.com",
                8, "تنظيف وتطهير المستشفيات والعيادات", "one_time", "نواكشوط", "السبخة", "قرب السوق الكبير، السبخة",
                "طلب تعقيم شامل للعيادة وغرف الفحص.",
                "",
                "received", None, "تم تسجيل الطلب وبانتظار اتصال المشرف للتأكيد.",
                "2026-11-08 08:00:00", "2026-11-08 08:00:00"
            )
        ]

        c.executemany("""
        INSERT INTO service_orders (
            ref_code, user_id, client_name, client_type, phone, email,
            service_id, service_title, contract_type, city, district, address,
            description, photo_url, status, rejection_reason, admin_notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, orders)

    # بذر البرامج والمبادرات الوطنية
    c.execute("SELECT COUNT(*) FROM activities")
    if c.fetchone()[0] == 0:
        activities = [
            (
                "برنامج إسناد نظافة الشوارع والأسواق الكبرى بنواكشوط",
                "Programme d'Assainissement des Grandes Artères et Marchés",
                "campaigns",
                "نواكشوط - الشوارع الحيوية والأسواق",
                "خطة عمل ميدانية دورية تركز على كنس حواف الطرقات الرئيسية، إزالة الرمال المتراكمة، وتنظيف محيط الأسواق الشعبية لمساندة الجهود البلدية وإبراز المظهر اللائق للعاصمة.",
                "Plan d'intervention régulier ciblant le désensablement des grands boulevards, le balayage des axes prioritaires et l'assainissement des abords des marchés de Nouakchott.",
                "assets/street_nouakchott.jpg",
                now
            ),
            (
                "مبادرة التوعية البيئية والتعقيم في المنشآت الصحية والمدارس",
                "Initiative d'Hygiène Hospitalière & Salubrité dans les Écoles",
                "volunteer",
                "نواكشوط - المستشفيات والمجمعات السكنية",
                "برنامج توعوي وطني بالتعاون مع المنشآت الصحية لحث المواطنين على الالتزام بإرشادات النظافة والحد من النفايات العشوائية.",
                "Actions pédagogiques citoyennes auprès des hôpitaux et centres de formation pour promouvoir la désinfection et les bonnes pratiques d'hygiène.",
                "assets/hospital_cnc.jpg",
                now
            ),
            (
                "برنامج التعاقد المستدام مع البنوك والشركات الموريتانية",
                "Programme de Partenariat Propreté avec les Entreprises",
                "projects",
                "نواكشوط ونواذيبو - مقرات الشركات والبنوك",
                "تقديم حلول نظافة وتعقيم متكاملة للمؤسسات العامة والخاصة بعمالة موريتانية مدربة وبجداول زمنية مرنة تحفظ خصوصية وسير العمل في المقرات الإدارية.",
                "Offre d'entretien continue et sur mesure dédiée aux sièges d'entreprises, institutions et banques mauritaniennes par des équipes qualifiées et fiables.",
                "assets/bank_bmi.jpg",
                now
            ),
            (
                "خطة التدخل السريع لنظافة المرافق الفندقية والمطاعم",
                "Plan d'Intervention pour l'Hôtellerie et la Restauration",
                "campaigns",
                "نواكشوط - الفنادق والمنشآت التجارية",
                "آلية استجابة سريعة لخدمات الضيافة، المطاعم، والمجمعات التجارية لتطبيق أعلى معايير السلامة والنظافة البيئية.",
                "Dispositif d'intervention réactif pour le secteur hôtelier, les restaurants et les centres d'affaires à Nouakchott.",
                "assets/restaurant_paul.jpg",
                now
            )
        ]

        c.executemany("""
        INSERT INTO activities (
            title_ar, title_fr, category, location, description_ar, description_fr,
            image, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, activities)

    # بذر الأخبار
    c.execute("SELECT COUNT(*) FROM news")
    if c.fetchone()[0] == 0:
        news = [
            (
                "شركة بصمة كلين تطلق خدماتها المتكاملة لنظافة المؤسسات بالعاصمة نواكشوط",
                "Bassma Clean lance ses services de propreté d'entreprises à Nouakchott",
                "انطلاقة رسمية للشركة برؤية موريتانية شابة تهدف إلى تقديم حلول نوعية لنظافة وصيانة مقرات الشركات والبنوك والمرافق العامة بنواكشوط.",
                "Lancement officiel de nos prestations d'hygiène professionnelle avec des équipes mauritaniennes formées pour accompagner le développement de nos entreprises.",
                "تسعى شركة بصمة كلين إلى إرساء معايير جديدة في خدمات النظافة والصيانة من خلال كفاءات وطنية شابة، وتوفير عقود مرنة تضمن بيئة عمل نظيفة ومحفزة للمؤسسات الوطنية.",
                "Bassma Clean s'engage à instaurer une rigueur exemplaire dans la gestion de l'hygiène tertiaire et urbaine à Nouakchott au service du développement de notre pays.",
                "announcement",
                "assets/bank_bmi.jpg",
                "2026-11-01"
            ),
            (
                "إطلاق منصة التبليغ التفاعلية عن تراكم النفايات في شوارع نواكشوط",
                "Lancement de la plateforme interactive de signalement des déchets à Nouakchott",
                "أتاحت الشركة للمواطنين إمكانية تحديد أماكن تراكم القمامة عبر الخريطة التفاعلية للمساهمة في توجيه فرق التدخل ومعالجة النقاط الملوثة.",
                "Un outil numérique citoyen permettant à chaque habitant de localiser sur la carte les déchets sauvages pour faciliter l'intervention de nos équipes.",
                "تهدف هذه المبادرة إلى ترسيخ السلوك المدني الإيجابي والتعاون بين الساكنة وفرق النظافة لجعل أحيائنا وشوارعنا أنظف وأجمل.",
                "Cette initiative vise à encourager l'engagement civique et à coordonner les efforts pour préserver la propreté de nos quartiers.",
                "news",
                "assets/street_nouakchott.jpg",
                "2026-10-25"
            ),
            (
                "عقود نظافة سنوية شاملة للمجمعات الفندقية والمرافق الكبرى",
                "Contrats de maintenance annuelle pour complexes hôteliers et grands ensembles",
                "بصمة كلين توفر حزم تعاقدية مرنة لصيانة ونظافة الأبراج والمجمعات الفندقية ومراكز التسوق بنواكشوط.",
                "Des forfaits sur mesure pour l'entretien continu des grands ensembles hôteliers et commerciaux de la capitale.",
                "تشمل الخدمات صيانة الواجهات الزجاجية الحديثة، تعقيم الصالات، وتنظيف الممرات ومواقف السيارات بانتظام.",
                "Nos prestations couvrent l'entretien des façades modernes, la désinfection des halls et le nettoyage continu des espaces publics.",
                "awareness",
                "assets/hotel_nouakchott.jpg",
                "2026-10-15"
            )
        ]

        c.executemany("""
        INSERT INTO news (
            title_ar, title_fr, summary_ar, summary_fr, content_ar, content_fr, category, image, published_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, news)

    # بذر آراء من موريتانيا
    c.execute("SELECT COUNT(*) FROM feedback")
    if c.fetchone()[0] == 0:
        feedbacks = [
            (
                None, "أحمد ولد المختار - مسير مجمع تجاري بتفرغ زينة", "36554433", "ahmed.mokhtar@gmail.com",
                "rating", "إشادة بانضباط طاقم النظافة",
                "فريق عمل محترم ومنضبط جداً في المواعيد، نلمس فيهم حب العمل والأمانة. نشكركم على هذه الخدمة الوطنية الممتازة.",
                5, "replied", "شكراً جزيلاً أخي أحمد على ثقتكم في بصمة كلين، ونسعى دائماً لنكون عند حسن ظنكم في خدمة مؤسستكم ووطننا.",
                "2026-11-04 10:30:00"
            ),
            (
                None, "عيشة منت ببكر - ناشطة جمعوية بلكصر", "22889900", "aicha.babacar@gmail.com",
                "suggestion", "اقتراح حملة مشتركة لتنظيف محيط المدارس",
                "نقترح تنظيم حملة تنظيف تطوعية لمحيط المدارس الابتدائية بلكصر لتوعية التلاميذ بنظافة حيهم ومدرستهم.",
                5, "replied", "اقتراح قيم ومرحب به جداً، سنقوم بالتنسيق معكم لإدراج هذه المبادرة ضمن خطط عملنا الميدانية القادمة.",
                "2026-11-06 16:00:00"
            ),
            (
                None, "سيدي محمد ولد اسويدات", "46778899", "sidi.med@yahoo.com",
                "note", "ملاحظة بخصوص حاويات الحي بعرفات",
                "نرجو تعزيز نقطة جمع النفايات قرب المسجد بحاوية إضافية لمنع تكدس الأكياس على الأرض.",
                4, "reviewed", "شكراً لملاحظتكم الكريمة، تمت إحالة الملاحظة للمشرف لمعاينتها والتنسيق لمعالجة المشكلة.",
                "2026-11-07 11:20:00"
            )
        ]

        c.executemany("""
        INSERT INTO feedback (
            user_id, name, phone, email, feedback_type, subject, message, rating, status, admin_reply, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, feedbacks)

    conn.commit()


class BassmaRequestHandler(SimpleHTTPRequestHandler):
    """معالج طلبات الويب والـ REST API لشركة بصمة كلين - موريتانيا"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def _send_json(self, data, status_code=200):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
        response_bytes = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.wfile.write(response_bytes)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query = urllib.parse.parse_qs(parsed_url.query)

        if path.startswith("/api/"):
            self._handle_api_get(path, query)
        else:
            super().do_GET()

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        if path.startswith("/api/"):
            content_length = int(self.headers.get("Content-Length", 0))
            post_body = self.rfile.read(content_length)
            try:
                data = json.loads(post_body.decode("utf-8")) if post_body else {}
            except Exception:
                data = {}
            self._handle_api_post(path, data)
        else:
            self.send_error(404, "Endpoint not found")

    def do_PUT(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        if path.startswith("/api/"):
            content_length = int(self.headers.get("Content-Length", 0))
            post_body = self.rfile.read(content_length)
            try:
                data = json.loads(post_body.decode("utf-8")) if post_body else {}
            except Exception:
                data = {}
            self._handle_api_put(path, data)
        else:
            self.send_error(404, "Endpoint not found")

    def _handle_api_get(self, path, query):
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()

        try:
            if path == "/api/stats":
                c.execute("SELECT COUNT(*) FROM service_orders")
                total_orders = c.fetchone()[0]

                c.execute("SELECT COUNT(*) FROM service_orders WHERE status = 'received' OR status = 'under_review'")
                pending_orders = c.fetchone()[0]

                c.execute("SELECT COUNT(*) FROM service_orders WHERE status = 'in_progress'")
                in_progress_orders = c.fetchone()[0]

                c.execute("SELECT COUNT(*) FROM service_orders WHERE status = 'completed'")
                completed_orders = c.fetchone()[0]

                c.execute("SELECT COUNT(*) FROM waste_reports")
                total_reports = c.fetchone()[0]

                c.execute("SELECT COUNT(*) FROM waste_reports WHERE status = 'resolved'")
                resolved_reports = c.fetchone()[0]

                c.execute("SELECT COUNT(*) FROM waste_reports WHERE status != 'resolved'")
                active_reports = c.fetchone()[0]

                c.execute("SELECT COUNT(*) FROM users")
                total_users = c.fetchone()[0]

                self._send_json({
                    "success": True,
                    "stats": {
                        "total_orders": total_orders,
                        "pending_orders": pending_orders,
                        "in_progress_orders": in_progress_orders,
                        "completed_orders": completed_orders,
                        "total_reports": total_reports,
                        "resolved_reports": resolved_reports,
                        "active_reports": active_reports,
                        "total_users": total_users,
                        "satisfaction_rate": 98.5
                    }
                })

            elif path == "/api/services":
                c.execute("SELECT * FROM services ORDER BY id ASC")
                rows = [dict(row) for row in c.fetchall()]
                self._send_json({"success": True, "services": rows})

            elif path == "/api/orders":
                ref_code = query.get("ref", [None])[0]
                user_id = query.get("user_id", [None])[0]

                if ref_code:
                    c.execute("SELECT * FROM service_orders WHERE ref_code = ?", (ref_code,))
                    row = c.fetchone()
                    if row:
                        self._send_json({"success": True, "order": dict(row)})
                    else:
                        self._send_json({"success": False, "message": "Order not found"}, status_code=404)
                elif user_id:
                    c.execute("SELECT * FROM service_orders WHERE user_id = ? ORDER BY id DESC", (user_id,))
                    rows = [dict(row) for row in c.fetchall()]
                    self._send_json({"success": True, "orders": rows})
                else:
                    c.execute("SELECT * FROM service_orders ORDER BY id DESC")
                    rows = [dict(row) for row in c.fetchall()]
                    self._send_json({"success": True, "orders": rows})

            elif path == "/api/reports":
                ref_code = query.get("ref", [None])[0]
                status_filter = query.get("status", [None])[0]

                if ref_code:
                    c.execute("SELECT * FROM waste_reports WHERE ref_code = ?", (ref_code,))
                    row = c.fetchone()
                    if row:
                        self._send_json({"success": True, "report": dict(row)})
                    else:
                        self._send_json({"success": False, "message": "Report not found"}, status_code=404)
                elif status_filter:
                    c.execute("SELECT * FROM waste_reports WHERE status = ? ORDER BY id DESC", (status_filter,))
                    rows = [dict(row) for row in c.fetchall()]
                    self._send_json({"success": True, "reports": rows})
                else:
                    c.execute("SELECT * FROM waste_reports ORDER BY id DESC")
                    rows = [dict(row) for row in c.fetchall()]
                    self._send_json({"success": True, "reports": rows})

            elif path == "/api/activities":
                c.execute("SELECT * FROM activities ORDER BY id ASC")
                rows = [dict(row) for row in c.fetchall()]
                self._send_json({"success": True, "activities": rows})

            elif path == "/api/news":
                c.execute("SELECT * FROM news ORDER BY id DESC")
                rows = [dict(row) for row in c.fetchall()]
                self._send_json({"success": True, "news": rows})

            elif path == "/api/feedback":
                c.execute("SELECT * FROM feedback ORDER BY id DESC")
                rows = [dict(row) for row in c.fetchall()]
                self._send_json({"success": True, "feedback": rows})

            else:
                self._send_json({"error": "Unknown API endpoint"}, status_code=404)

        except Exception as e:
            self._send_json({"error": str(e)}, status_code=500)
        finally:
            conn.close()

    def _handle_api_post(self, path, data):
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()

        try:
            now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            if path == "/api/orders":
                import random
                ref_code = f"BC-2026-{random.randint(1000, 9999)}"

                client_name = data.get("client_name") or data.get("name", "عميل")
                client_type = data.get("client_type", "individual")
                phone = data.get("phone", "")
                email = data.get("email", "")
                service_id = data.get("service_id", 1)
                service_title = data.get("service_title", "خدمات عامة")
                contract_type = data.get("contract_type", "one_time")
                city = data.get("city", "نواكشوط")
                district = data.get("district", "تفرغ زينة")
                address = data.get("address", "")
                description = data.get("description", "")
                photo_url = data.get("photo_url", "")
                user_id = data.get("user_id", None)

                area_sqm = float(data.get("area_sqm", 0) or 0)
                total_cost = float(data.get("total_cost", 0) or (area_sqm * 100))
                payment_method = data.get("payment_method", "visit")

                c.execute("""
                INSERT INTO service_orders (
                    ref_code, user_id, client_name, client_type, phone, email,
                    service_id, service_title, contract_type, city, district, address,
                    area_sqm, total_cost, payment_method,
                    description, photo_url, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', ?, ?)
                """, (
                    ref_code, user_id, client_name, client_type, phone, email,
                    service_id, service_title, contract_type, city, district, address,
                    area_sqm, total_cost, payment_method,
                    description, photo_url, now, now
                ))

                order_id = c.lastrowid
                conn.commit()

                self._send_json({
                    "success": True,
                    "message": "تم إرسال الطلب بنجاح",
                    "ref_code": ref_code,
                    "order_id": order_id
                }, status_code=201)

            elif path == "/api/reports":
                import random
                ref_code = f"REP-2026-{random.randint(100, 999)}"

                reporter_name = data.get("reporter_name", "مواطن مسؤول")
                reporter_phone = data.get("reporter_phone", "")
                latitude = float(data.get("latitude", 18.0735))
                longitude = float(data.get("longitude", -15.9582))
                city = data.get("city", "نواكشوط")
                district = data.get("district", "تفرغ زينة")
                street = data.get("street", "")
                description = data.get("description", "تراكم نفايات بحاجة إلى رفع")
                photo_url = data.get("photo_url", "")
                user_id = data.get("user_id", None)

                c.execute("""
                INSERT INTO waste_reports (
                    ref_code, user_id, reporter_name, reporter_phone, latitude, longitude,
                    city, district, street, description, photo_url, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)
                """, (
                    ref_code, user_id, reporter_name, reporter_phone, latitude, longitude,
                    city, district, street, description, photo_url, now, now
                ))

                report_id = c.lastrowid
                conn.commit()

                self._send_json({
                    "success": True,
                    "message": "تم تسجيل البلاغ بنجاح",
                    "ref_code": ref_code,
                    "report_id": report_id,
                    "status": "new"
                }, status_code=201)

            elif path == "/api/feedback":
                name = data.get("name", "عميل")
                phone = data.get("phone", "")
                email = data.get("email", "")
                feedback_type = data.get("feedback_type", "complaint")
                subject = data.get("subject", "ملاحظة عامة")
                message = data.get("message", "")
                rating = int(data.get("rating", 5))
                user_id = data.get("user_id", None)

                c.execute("""
                INSERT INTO feedback (
                    user_id, name, phone, email, feedback_type, subject, message, rating, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
                """, (user_id, name, phone, email, feedback_type, subject, message, rating, now))

                feedback_id = c.lastrowid
                conn.commit()

                self._send_json({
                    "success": True,
                    "message": "تم إرسال رسالتكم بنجاح",
                    "feedback_id": feedback_id
                }, status_code=201)

            elif path == "/api/auth/register":
                name = data.get("name")
                email = data.get("email")
                password = data.get("password")
                phone = data.get("phone", "")
                organization = data.get("organization", "")
                address = data.get("address", "")

                try:
                    c.execute("""
                    INSERT INTO users (name, email, password, phone, role, organization, address, created_at)
                    VALUES (?, ?, ?, ?, 'client', ?, ?, ?)
                    """, (name, email, password, phone, organization, address, now))
                    user_id = c.lastrowid
                    conn.commit()

                    self._send_json({
                        "success": True,
                        "message": "تم إنشاء الحساب بنجاح",
                        "user": { "id": user_id, "name": name, "email": email, "role": "client", "phone": phone }
                    }, status_code=201)
                except sqlite3.IntegrityError:
                    self._send_json({"success": False, "message": "البريد الإلكتروني مسجل مسبقاً"}, status_code=400)

            elif path == "/api/auth/login":
                email = data.get("email")
                password = data.get("password")

                c.execute("SELECT * FROM users WHERE email = ? AND password = ?", (email, password))
                user = c.fetchone()

                if user:
                    user_dict = dict(user)
                    user_dict.pop("password", None)
                    self._send_json({ "success": True, "user": user_dict })
                else:
                    self._send_json({ "success": False, "message": "بيانات الدخول غير صحيحة" }, status_code=401)

            else:
                self._send_json({"error": "Unknown POST endpoint"}, status_code=404)

        except Exception as e:
            self._send_json({"error": str(e)}, status_code=500)
        finally:
            conn.close()

    def _handle_api_put(self, path, data):
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()

        try:
            now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            if path.startswith("/api/orders/"):
                order_id = path.replace("/api/orders/", "").split("/")[0]
                status = data.get("status")
                rejection_reason = data.get("rejection_reason", None)
                admin_notes = data.get("admin_notes", None)

                c.execute("""
                UPDATE service_orders
                SET status = COALESCE(?, status),
                    rejection_reason = COALESCE(?, rejection_reason),
                    admin_notes = COALESCE(?, admin_notes),
                    updated_at = ?
                WHERE id = ? OR ref_code = ?
                """, (status, rejection_reason, admin_notes, now, order_id, order_id))

                conn.commit()
                self._send_json({"success": True, "message": "تم تحديث حالة الطلب بنجاح"})

            elif path.startswith("/api/reports/"):
                report_id = path.replace("/api/reports/", "").split("/")[0]
                status = data.get("status")
                admin_notes = data.get("admin_notes", None)

                c.execute("""
                UPDATE waste_reports
                SET status = COALESCE(?, status),
                    admin_notes = COALESCE(?, admin_notes),
                    updated_at = ?
                WHERE id = ? OR ref_code = ?
                """, (status, admin_notes, now, report_id, report_id))

                conn.commit()
                self._send_json({"success": True, "message": "تم تحديث حالة البلاغ بنجاح"})

            elif path.startswith("/api/feedback/"):
                feedback_id = path.replace("/api/feedback/", "").split("/")[0]
                admin_reply = data.get("admin_reply")

                c.execute("""
                UPDATE feedback
                SET admin_reply = ?, status = 'replied'
                WHERE id = ?
                """, (admin_reply, feedback_id))

                conn.commit()
                self._send_json({"success": True, "message": "تم إرسال رد الإدارة بنجاح"})

            else:
                self._send_json({"error": "Unknown PUT endpoint"}, status_code=404)

        except Exception as e:
            self._send_json({"error": str(e)}, status_code=500)
        finally:
            conn.close()


def run_server():
    init_db(force_reseed=False)
    server_address = ("0.0.0.0", PORT)
    httpd = ThreadingHTTPServer(server_address, BassmaRequestHandler)
    print(f"==================================================")
    print(f" BASSMA CLEAN Server running successfully!       ")
    print(f" URL: http://localhost:{PORT}                      ")
    print(f" Admin Account: admin@bassmaclean.mr / admin123   ")
    print(f" Client Account: client@mauritel.mr / client123   ")
    print(f" Location: Nouakchott, Mauritanie                 ")
    print(f"==================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer shutting down gracefully.")
        httpd.server_close()


if __name__ == "__main__":
    run_server()
