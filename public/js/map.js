/**
 * شركة بصمة كلين - نظام الخريطة التفاعلية وتحديد مواقع البلاغات في موريتانيا
 * BASSMA CLEAN Interactive Waste Reports Map (Nouakchott, Mauritania)
 */

let wasteMap = null;
let pickerMap = null;
let mapMarkers = [];
let pickerMarker = null;

const STATUS_CONFIG = {
  new: {
    color: '#ef4444', // Red
    label_ar: 'بلاغ جديد',
    label_fr: 'Nouveau signalement',
    badgeClass: 'badge-report-new',
    icon: 'fa-triangle-exclamation'
  },
  reviewed: {
    color: '#0284c7', // Sky Blue
    label_ar: 'تمت مراجعة البلاغ',
    label_fr: 'Signalement examiné',
    badgeClass: 'badge-report-reviewed',
    icon: 'fa-clipboard-check'
  },
  dispatched: {
    color: '#8b5cf6', // Purple
    label_ar: 'تم توجيه فريق العمل',
    label_fr: 'Équipe déployée',
    badgeClass: 'badge-report-dispatched',
    icon: 'fa-truck-fast'
  },
  in_progress: {
    color: '#f59e0b', // Amber
    label_ar: 'قيد الإزالة والمعالجة',
    label_fr: 'Évacuation en cours',
    badgeClass: 'badge-report-in_progress',
    icon: 'fa-broom'
  },
  resolved: {
    color: '#00a8cc', // Cyan Brand
    label_ar: 'تمت إزالة النفايات وإغلاق البلاغ',
    label_fr: 'Déchets évacués & assaini',
    badgeClass: 'badge-report-resolved',
    icon: 'fa-circle-check'
  }
};

function initWasteMap() {
  const mapContainer = document.getElementById('wasteMap');
  if (!mapContainer || wasteMap) return;

  // Center around Nouakchott, Mauritania
  const nouakchottCenter = [18.0735, -15.9582];
  
  wasteMap = L.map('wasteMap', {
    center: nouakchottCenter,
    zoom: 13,
    zoomControl: true,
    scrollWheelZoom: true
  });

  // OpenStreetMap Tile Layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | Bassma Clean Mauritanie',
    maxZoom: 19
  }).addTo(wasteMap);

  // Load and render markers
  loadMapReports();

  // Allow clicking on map to pre-fill report coordinates directly
  wasteMap.on('click', function(e) {
    const lat = e.latlng.lat.toFixed(5);
    const lng = e.latlng.lng.toFixed(5);
    
    const latInput = document.getElementById('repLatitude');
    const lngInput = document.getElementById('repLongitude');
    const coordsDisplay = document.getElementById('repCoordsDisplay');

    if (latInput && lngInput) {
      latInput.value = lat;
      lngInput.value = lng;
    }
    if (coordsDisplay) {
      coordsDisplay.textContent = `${lat}, ${lng}`;
      coordsDisplay.classList.remove('text-slate-400');
      coordsDisplay.classList.add('text-sky-700', 'font-bold');
    }

    showToast(
      currentLang === 'ar' 
        ? `تم تحديد الإحداثيات: ${lat}, ${lng} في نموذج التبليغ` 
        : `Coordonnées sélectionnées : ${lat}, ${lng}`
    );
  });
}

async function loadMapReports(statusFilter = null) {
  if (!wasteMap) return;

  // Clear existing markers
  mapMarkers.forEach(m => wasteMap.removeLayer(m));
  mapMarkers = [];

  const reports = await DB.getReports(statusFilter);

  reports.forEach(report => {
    if (!report.latitude || !report.longitude) return;

    const conf = STATUS_CONFIG[report.status] || STATUS_CONFIG.new;
    const isAr = currentLang === 'ar';
    const statusLabel = isAr ? conf.label_ar : conf.label_fr;

    // Custom HTML marker pin with brand colors
    const customIcon = L.divIcon({
      className: 'custom-map-marker',
      html: `
        <div style="
          background-color: ${conf.color};
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 2px solid #ffffff;
          box-shadow: 0 4px 10px rgba(11,29,81,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <i class="fa-solid ${conf.icon}" style="transform: rotate(45deg); color: white; font-size: 13px;"></i>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });

    const marker = L.marker([report.latitude, report.longitude], { icon: customIcon }).addTo(wasteMap);

    const photoHtml = report.photo_url 
      ? `<div class="h-36 w-full overflow-hidden bg-slate-100">
           <img src="${report.photo_url}" alt="Report photo" class="w-full h-full object-cover">
         </div>`
      : `<div class="h-14 w-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
           <i class="fa-solid fa-camera mr-1 ml-1"></i> ${isAr ? 'لا توجد صورة مرفقة' : 'Aucune photo'}
         </div>`;

    const popupHtml = `
      <div class="w-64 max-w-xs overflow-hidden font-sans text-right" style="direction: ${isAr ? 'rtl' : 'ltr'}; text-align: ${isAr ? 'right' : 'left'};">
        ${photoHtml}
        <div class="p-3 bg-white">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-mono font-bold text-slate-500">${report.ref_code}</span>
            <span class="px-2 py-0.5 rounded-full text-[11px] font-bold" style="background-color: ${conf.color}20; color: ${conf.color};">
              ${statusLabel}
            </span>
          </div>
          <h4 class="font-bold text-sm text-slate-900 mb-1">
            <i class="fa-solid fa-location-dot text-sky-600 mr-1 ml-1"></i>
            ${report.city} - ${report.district}
          </h4>
          <p class="text-xs text-slate-500 mb-2 font-medium">
            ${report.street || ''}
          </p>
          <div class="bg-slate-50 p-2 rounded text-xs text-slate-700 mb-2 border border-slate-100">
            ${report.description}
          </div>
          <div class="flex items-center justify-between text-[11px] text-slate-400">
            <span><i class="fa-regular fa-clock mr-1 ml-1"></i> ${report.created_at ? report.created_at.substring(0, 16) : ''}</span>
            <span class="text-sky-600 font-semibold">${isAr ? 'نواكشوط' : 'Nouakchott'}</span>
          </div>
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml);
    mapMarkers.push(marker);
  });
}

function filterMapByStatus(status) {
  document.querySelectorAll('.map-filter-btn').forEach(b => {
    b.classList.remove('bg-sky-600', 'text-white', 'font-bold');
    b.classList.add('bg-white', 'text-slate-600');
  });

  const activeBtn = document.getElementById(`btnFilterMap_${status}`);
  if (activeBtn) {
    activeBtn.classList.add('bg-sky-600', 'text-white', 'font-bold');
    activeBtn.classList.remove('bg-white', 'text-slate-600');
  }

  loadMapReports(status === 'all' ? null : status);
}

function useCurrentLocationForReport() {
  if (!navigator.geolocation) {
    alert(currentLang === 'ar' ? 'خاصية تحديد الموقع غير مدعومة في متصفحك' : 'La géolocalisation n\'est pas supportée');
    return;
  }

  const btn = document.getElementById('btnGeoLocation');
  if (btn) btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1 ml-1"></i> ${currentLang === 'ar' ? 'جارٍ تحديد موقعك...' : 'Recherche GPS...'}`;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude.toFixed(5);
      const lng = pos.coords.longitude.toFixed(5);

      const latInput = document.getElementById('repLatitude');
      const lngInput = document.getElementById('repLongitude');
      const coordsDisplay = document.getElementById('repCoordsDisplay');

      if (latInput && lngInput) {
        latInput.value = lat;
        lngInput.value = lng;
      }
      if (coordsDisplay) {
        coordsDisplay.textContent = `${lat}, ${lng}`;
        coordsDisplay.classList.remove('text-slate-400');
        coordsDisplay.classList.add('text-sky-700', 'font-bold');
      }

      if (wasteMap) {
        wasteMap.setView([lat, lng], 15);
      }

      if (btn) btn.innerHTML = `<i class="fa-solid fa-location-crosshairs mr-1 ml-1"></i> ${t('btn_use_current_location')}`;
      showToast(currentLang === 'ar' ? 'تم تحديد موقعك في نواكشوط بنجاح' : 'Position GPS détectée avec succès !');
    },
    (err) => {
      console.warn("Geolocation fallback to Nouakchott center:", err);
      const lat = 18.0735;
      const lng = -15.9582;
      const latInput = document.getElementById('repLatitude');
      const lngInput = document.getElementById('repLongitude');
      const coordsDisplay = document.getElementById('repCoordsDisplay');

      if (latInput && lngInput) {
        latInput.value = lat;
        lngInput.value = lng;
      }
      if (coordsDisplay) {
        coordsDisplay.textContent = `${lat}, ${lng} (نواكشوط)`;
        coordsDisplay.classList.remove('text-slate-400');
        coordsDisplay.classList.add('text-sky-700', 'font-bold');
      }

      if (btn) btn.innerHTML = `<i class="fa-solid fa-location-crosshairs mr-1 ml-1"></i> ${t('btn_use_current_location')}`;
      showToast(currentLang === 'ar' ? 'تم تعيين موقع نواكشوط، يمكنك النقر على الخريطة لتعديله' : 'Position Nouakchott assignée, cliquez sur la carte pour affiner.');
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

window.addEventListener('languageChanged', () => {
  loadMapReports();
});
