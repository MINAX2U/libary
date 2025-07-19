// 支援多個 JSON 檔案，並給每個檔案一個可編輯名稱
const DATA_FILES = [
  { file: "k1_new.json", label: "K1" },
  { file: "e1_new.json", label: "E1" },
  { file: "j1_new.json", label: "J1" },
  { file: "school04_new.json", label: "學校(範例)" },
  { file: "s2_new.json", label: "S2" },
  { file: "sp1_new.json", label: "SP1" },
  { file: "u2_new.json", label: "U2" },
  { file: "u3_new.json", label: "U3" },
  { file: "u1_new.json", label: "U1" },
  { file: "highO.json", label: "HighO" },
  { file: "highA.json", label: "HighA" },
  { file: "highT.json", label: "HighT" },
  { file: "high.json", label: "High" },
  { file: "native_new.json", label: "Native" },
  { file: "faraway3.json", label: "Faraway3" },
  { file: "faraway2.json", label: "Faraway2" },
  { file: "faraway1.json", label: "Faraway1" },
  { file: "k2_new.json", label: "K2" },
  { file: "aj_new.json", label: "AJ" },
  { file: "ac.json", label: "AC" },
  { file: "school_exp.json", label: "SchoolExp" },
  { file: "afterschool.json", label: "afterschool" },
  { file: "libraries.json", label: "圖書館" },
];

const JSONS_PATH = "./jsons/";
let records = [];
let currentFile = DATA_FILES[0].file;
let currentPage = 1;
const pageSize = 6;

// 移除 getPageSize 與 resize 事件

const map = L.map("map").setView([23.5, 121], 7);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
}).addTo(map);
const markers = L.layerGroup().addTo(map);

const dataTypeSelect = document.getElementById("data-type-select");
const countySelect = document.getElementById("county-select");
const listEl = document.getElementById("library-list");

initDataTypeOptions();
loadData(currentFile);

dataTypeSelect.addEventListener("change", () => {
  currentFile = dataTypeSelect.value;
  currentPage = 1;
  loadData(currentFile);
});

function initDataTypeOptions() {
  dataTypeSelect.innerHTML = "";
  DATA_FILES.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d.file;
    opt.textContent = d.label;
    dataTypeSelect.appendChild(opt);
  });
}

function loadData(file) {
  fetch(JSONS_PATH + file)
    .then((res) => res.json())
    .then((data) => {
      records = normalizeData(file, data);
      currentPage = 1;
      initCountyOptions(records);
      renderMap(records);
      renderList(records);
    })
    .catch((err) => {
      records = [];
      renderMap(records);
      renderList(records);
      console.error("資料讀取失敗：", err);
    });
}

function normalizeData(file, data) {
  // libraries.json 特例
  if (file === "libraries.json" && Array.isArray(data)) {
    return data.flatMap((city) =>
      (city["圖書館資訊"] || []).map((item) => {
        // 嘗試抓縣市
        let county =
          city["縣市"] || extractCounty(item["地址"] || item["Address"] || "");
        return { ...item, County: county };
      })
    );
  }
  // afterschool.json 特例
  if (file === "afterschool.json") {
    return (Array.isArray(data) ? data : []).map((item) => {
      let county = item["地區縣市"] || extractCounty(item["地址"] || "");
      return {
        Name: item["短期補習班名稱"] || "",
        Address: item["地址"] || "",
        Category: item["短期補習班類別"] || "",
        City: item["地區縣市"] || "",
        Date: item["立案時間"] || "",
        TEL: item["電子郵件"] || "",
        County: county,
        Latitude: item["緯度"] || item["Latitude"] || item["latitude"] || "",
        Longitude: item["經度"] || item["Longitude"] || item["longitude"] || "",
      };
    });
  }
  let arr = Array.isArray(data) ? data : [];
  // 欄位對應表
  const fieldMap = [
    {
      name: "Name",
      keys: ["Name", "名稱", "學校名稱", "圖書館名稱", "機構名稱", "本校名稱"],
    },
    {
      name: "Address",
      keys: ["Address", "地址", "學校地址", "圖書館地址"],
    },
    {
      name: "Latitude",
      keys: ["Latitude", "緯度", "lat", "Y", "y", "latitude"],
    },
    {
      name: "Longitude",
      keys: ["Longitude", "經度", "lon", "lng", "X", "x", "longitude"],
    },
    { name: "TEL", keys: ["TEL", "電話", "聯絡電話"] },
    { name: "URL", keys: ["URL", "網址", "連結", "官網"] },
    { name: "Intro", keys: ["Intro", "簡介", "備註", "說明"] },
    { name: "City", keys: ["City", "縣市", "縣市名稱"] },
  ];
  // 特例：faraway3.json、native_new.json
  if (file === "faraway3.json" || file === "native_new.json") {
    return arr.map((item) => {
      let name =
        item["本校名稱"] ||
        item["學校名稱"] ||
        item["Name"] ||
        item["名稱"] ||
        "";
      let county = (
        item["縣市名稱"] ||
        item["縣市"] ||
        extractCounty(item["地址"] || item["Address"] || "")
      ).replace(/^\[\d+\]/, "");
      let address = county + (item["鄉鎮市區"] || "") + name;
      let tel = item["電話"] || item["TEL"] || "";
      let lat = item["緯度"] || item["Latitude"] || item["latitude"] || "";
      let lon = item["經度"] || item["Longitude"] || item["longitude"] || "";
      return {
        Name: name,
        Address: address,
        TEL: tel,
        Latitude: lat,
        Longitude: lon,
        URL: "",
        Intro: "",
        County: county,
      };
    });
  }
  // 一般自動對應
  return arr.map((item) => {
    const obj = {};
    fieldMap.forEach((f) => {
      for (const k of f.keys) {
        if (item[k] !== undefined) {
          obj[f.name] = item[k];
          break;
        }
      }
      if (obj[f.name] === undefined) obj[f.name] = "";
    });
    // school_exp.json 特例
    if (file === "school_exp.json") {
      if (!obj.Name) obj.Name = item["機構名稱"] || "";
      if (!obj.Address) obj.Address = item["地址"] || "";
      if (!obj.TEL) obj.TEL = item["電話"] || "";
    }
    // 補 County 欄位
    obj.County =
      item["縣市"] ||
      item["縣市名稱"] ||
      item["City"] ||
      extractCounty(obj.Address || "");
    return obj;
  });
}

function extractCounty(addressOrObj) {
  // 若傳進來是物件且有 County 欄位，直接回傳
  if (
    typeof addressOrObj === "object" &&
    addressOrObj !== null &&
    addressOrObj.County
  ) {
    return addressOrObj.County;
  }
  let address = addressOrObj;
  if (!address) return "";
  // 嘗試抓「XX縣」、「XX市」、「XX區」等
  const match = address.match(/[\u4e00-\u9fa5]{2,4}[縣市區]/);
  if (match) return match[0];
  // fallback: 前 3~4 字
  return address.slice(0, 3);
}

function initCountyOptions(data) {
  countySelect.innerHTML = '<option value="all">全部縣市</option>';
  const counties = [...new Set(data.map((r) => r.County || extractCounty(r)))]
    .filter(Boolean)
    .sort();
  counties.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    countySelect.appendChild(opt);
  });
  countySelect.addEventListener("change", onFilterChange);
}

function onFilterChange() {
  const county = countySelect.value;
  currentPage = 1;
  const filtered =
    county === "all"
      ? records
      : records.filter((r) =>
          (r.County || extractCounty(r)).startsWith(county)
        );
  renderMap(filtered);
  renderList(filtered);
}

function renderMap(data) {
  markers.clearLayers();
  data.forEach((lib) => {
    const lat = parseFloat(lib.Latitude);
    const lon = parseFloat(lib.Longitude);
    if (!isNaN(lat) && !isNaN(lon)) {
      L.circleMarker([lat, lon], {
        radius: 7,
        color: "#4A90E2",
        fillOpacity: 0.8,
      })
        .bindPopup(
          `<strong>${lib.Name || "無名稱"}</strong><br>${lib.Address || ""}`
        )
        .addTo(markers);
    }
  });

  const layerList = markers.getLayers();
  if (layerList.length > 0) {
    const bounds = L.latLngBounds(layerList.map((m) => m.getLatLng()));
    map.fitBounds(bounds, { padding: [50, 50] });
  }
}

// 事件代理：確保『查看更多』彈窗永遠可點
listEl.addEventListener("click", function (e) {
  if (e.target.classList.contains("expand-btn")) {
    e.stopPropagation();
    const btn = e.target;
    const modal = document.getElementById("intro-modal");
    document.getElementById("modal-title").textContent = decodeURIComponent(
      btn.dataset.title
    );
    document.getElementById("modal-intro").textContent = decodeURIComponent(
      btn.dataset.intro
    );
    modal.classList.add("show");
  }
});

const FIELD_LABELS = {
  Name: "名稱",
  Address: "地址",
  TEL: "電子郵件",
  URL: "網站",
  Intro: "簡介",
  Longitude: "經度",
  Latitude: "緯度",
  Category: "補習班類別",
  City: "縣市",
  Date: "立案時間",
  機構名稱: "機構名稱",
  縣市名稱: "縣市",
  鄉鎮市區: "鄉鎮市區",
  分校分班名稱: "分校/分班",
  學校名稱: "學校名稱",
  本校名稱: "本校名稱",
  學校代碼: "學校代碼",
  山地別: "山地別",
  "公/私立": "公/私立",
};

function renderList(data) {
  listEl.innerHTML = "";
  const total = data.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (currentPage - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const pageData = data.slice(start, end);

  // 收集所有出現過的 key
  const allKeys = new Set();
  pageData.forEach((item) => Object.keys(item).forEach((k) => allKeys.add(k)));
  // 不顯示空值的 key
  let displayKeys = Array.from(allKeys).filter((k) =>
    pageData.some((item) => item[k])
  );

  // 若是圖書館，移除經緯度
  if (currentFile === "libraries.json") {
    displayKeys = displayKeys.filter(
      (k) => k !== "Longitude" && k !== "Latitude"
    );
  }

  pageData.forEach((item, idx) => {
    const div = document.createElement("div");
    div.className = "library-item";
    let html = `<h3>${item.Name || item.名稱 || "無名稱"}</h3>`;
    // 只顯示前 6 個有值的欄位
    let shown = 0;
    for (const key of displayKeys) {
      if (key === "Name") continue;
      let value = item[key];
      if (!value) continue;
      if (key === "URL") {
        value = `<a href="${value}" target="_blank">前往</a>`;
      }
      if (key === "Intro" && value.length > 60) {
        value = value.slice(0, 60) + "...";
      }
      const label = FIELD_LABELS[key] || key;
      html += `<p><small><b>${label}：</b>${value}</small></p>`;
      shown++;
      if (shown >= 6) break;
    }
    div.innerHTML = html;
    div.addEventListener("click", (e) => {
      const lat = parseFloat(item.Latitude);
      const lon = parseFloat(item.Longitude);
      if (!isNaN(lat) && !isNaN(lon)) map.setView([lat, lon], 15);
    });
    listEl.appendChild(div);
  });

  renderPagination(totalPages, data);
}

function renderPagination(totalPages, data) {
  let pagination = document.getElementById("pagination");
  if (!pagination) {
    pagination = document.createElement("div");
    pagination.id = "pagination";
    listEl.parentNode.appendChild(pagination);
  }
  pagination.innerHTML = "";
  if (totalPages <= 1) {
    pagination.style.display = "none";
    return;
  }
  pagination.style.display = "flex";

  const maxButtons = 7; // 最多顯示幾個分頁按鈕（含省略號）
  let start = Math.max(1, currentPage - 2);
  let end = Math.min(totalPages, currentPage + 2);

  if (currentPage <= 3) {
    end = Math.min(totalPages, maxButtons - 2);
  }
  if (currentPage >= totalPages - 2) {
    start = Math.max(1, totalPages - (maxButtons - 3));
  }

  // 首頁
  if (start > 1) {
    addPageBtn(1);
    if (start > 2) addEllipsis();
  }
  for (let i = start; i <= end; i++) {
    addPageBtn(i);
  }
  // 末頁
  if (end < totalPages) {
    if (end < totalPages - 1) addEllipsis();
    addPageBtn(totalPages);
  }

  function addPageBtn(i) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.className = i === currentPage ? "button active" : "button";
    btn.onclick = () => {
      currentPage = i;
      renderList(data);
    };
    pagination.appendChild(btn);
  }
  function addEllipsis() {
    const span = document.createElement("span");
    span.textContent = "...";
    span.style = "padding:0 0.3rem;color:#aaa;";
    pagination.appendChild(span);
  }

  // 跳頁功能
  const jumpForm = document.createElement("form");
  jumpForm.style.display = "inline-flex";
  jumpForm.style.alignItems = "center";
  jumpForm.style.marginLeft = "1rem";
  jumpForm.onsubmit = function (e) {
    e.preventDefault();
    let val = parseInt(jumpInput.value, 10);
    if (isNaN(val) || val < 1) val = 1;
    if (val > totalPages) val = totalPages;
    currentPage = val;
    renderList(data);
  };
  const jumpInput = document.createElement("input");
  jumpInput.type = "number";
  jumpInput.min = 1;
  jumpInput.max = totalPages;
  jumpInput.value = currentPage;
  jumpInput.style.width = "3.2em";
  jumpInput.style.margin = "0 0.3em";
  jumpInput.style.fontSize = "1em";
  jumpInput.style.border = "1px solid #b3c6e0";
  jumpInput.style.borderRadius = "5px";
  jumpInput.style.padding = "0.1em 0.3em";
  const jumpBtn = document.createElement("button");
  jumpBtn.type = "submit";
  jumpBtn.textContent = "跳轉";
  jumpBtn.className = "button";
  jumpBtn.style.padding = "0.2em 0.8em";
  jumpBtn.style.fontSize = "1em";
  jumpForm.append("第", jumpInput, "頁", jumpBtn);
  pagination.appendChild(jumpForm);
}

// Modal 關閉事件（必須等 DOM 元素存在後再綁定）
window.addEventListener("DOMContentLoaded", function () {
  if (document.getElementById("modal-close")) {
    document.getElementById("modal-close").onclick = closeModal;
    document.getElementById("intro-modal").onclick = function (e) {
      if (e.target === this) closeModal();
    };
  }
});
function closeModal() {
  document.getElementById("intro-modal").classList.remove("show");
}
