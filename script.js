const JSON_URL = './libraries.json';
let records = [];

const map = L.map('map').setView([23.5, 121], 7);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map);
const markers = L.layerGroup().addTo(map);

const countySelect = document.getElementById('county-select');
const listEl = document.getElementById('library-list');

fetch(JSON_URL)
  .then(res => res.json())
  .then(data => {
    records = data.flatMap(city => city['圖書館資訊']);

    initCountyOptions(records);
    renderMap(records);
    renderList(records);
  })
  .catch(err => console.error('資料讀取失敗：', err));


function initCountyOptions(data) {
  const counties = [...new Set(data.map(r => (r.Address || '').slice(0, 3)))].sort();
  counties.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    countySelect.appendChild(opt);
  });
  countySelect.addEventListener('change', onFilterChange);
}

function onFilterChange() {
  const county = countySelect.value;
  const filtered = county === 'all'
    ? records
    : records.filter(r => r.Address && r.Address.startsWith(county));
  renderMap(filtered);
  renderList(filtered);
}

function renderMap(data) {
  markers.clearLayers();
  data.forEach(lib => {
    const lat = parseFloat(lib.Latitude);
    const lon = parseFloat(lib.Longitude);
    if (!isNaN(lat) && !isNaN(lon)) {
      L.circleMarker([lat, lon], { radius: 6, color: '#4A90E2' })
        .bindPopup(`<strong>${lib.Name}</strong><br>${lib.Address}`)
        .addTo(markers);
    }
  });

  const layerList = markers.getLayers();
  if (layerList.length > 0) {
    const bounds = L.latLngBounds(layerList.map(m => m.getLatLng()));
    map.fitBounds(bounds, { padding: [50, 50] });
  }
}

function renderList(data) {
  listEl.innerHTML = '';
  data.forEach(lib => {
    const div = document.createElement('div');
    div.className = 'library-item';
    div.innerHTML = `
      <h3>${lib.Name}</h3>
      <p>${lib.Address}</p>
      <p><small>電話：${lib.TEL || '無'}</small></p>
      <p><small>網站：${lib.URL ? `<a href="${lib.URL}" target="_blank">前往</a>` : '無'}</small></p>
      <p><small>${lib.Intro || ''}</small></p>
    `;
    div.addEventListener('click', () => {
      const lat = parseFloat(lib.Latitude);
      const lon = parseFloat(lib.Longitude);
      if (!isNaN(lat) && !isNaN(lon)) map.setView([lat, lon], 15);
    });
    listEl.appendChild(div);
  });
}