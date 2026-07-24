/**
 * Takwim (Jadual Solat) - fungsi berkaitan zon JAKIM, sync setahun, upload fail, dan paparan hari ini
 */

const JAKIM_API_BASE = "https://api.waktusolat.app/v2/solat";
const JAKIM_ZONES_URL = "https://api.waktusolat.app/zones";
const HIJRI_DATA_HEX = "2B75A5B654A76A55D5AA5CA56DD495DA525DAA4DD5AA6A95B652576A4B76C93665ABAC56D94A5DA92DD525BBA49BB255D52A6DA5B65497F4926ED25669ABB495DA525DD22BBA495BA9ABB4955A4B6DA936E916EDA4AED4966A4BB5A5DAA49BB493BA525BAA4DB5AA6A556DD256EA4A6DA92ED5AA6A55B54A5BA92BB525BB549BAA55D52A6DA5AED496EC925DD255D92A6D95B6525BB24B7A493729";

/**
 * Dapatkan zon dari select dropdown atau configData, fallback ke PNG01
 * @returns {string}
 */
function getZone() {
  const select = document.getElementById("TAKWIM_ZONE");
  if (select && select.value) return select.value;
  return "PNG01";
}

/**
 * Format masa untuk input time (HH:MM)
 * @param {string} timeStr
 * @returns {string}
 */
function formatTimeForInput(timeStr) {
  if (!timeStr) return "";
  const trimmed = timeStr.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    return `${match[1].padStart(2, "0")}:${match[2]}`;
  }
  return trimmed;
}

/**
 * Tukar unix timestamp ke HH:MM
 * @param {number} ts - Unix timestamp (saat)
 * @returns {string}
 */
function timestampToTime(ts) {
  const d = new Date(ts * 1000);
  const h = String(d.getHours());
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Tukar tarikh hijri ke format DD-MM-YYYY
 * Sokong input: "1447-07-11" (YYYY-MM-DD dari API) atau nombor 8 digit (17051442)
 * @param {number|string} hijri
 * @returns {string}
 */
function formatHijriDate(hijri) {
  const s = String(hijri).trim();
  // Format YYYY-MM-DD dari API (cth: "1447-07-11")
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [year, month, day] = s.split("-");
    return `${day}-${month}-${year}`;
  }
  // Format nombor 8 digit (cth: 17051442 = hari 17, bulan 05, tahun 1442)
  const padded = s.padStart(8, "0");
  return `${padded.slice(0, 2)}-${padded.slice(2, 4)}-${padded.slice(4)}`;
}

/**
 * Populate dropdown zon JAKIM dari API waktusolat.app
 */
export async function loadZoneDropdown() {
  const select = document.getElementById("TAKWIM_ZONE");
  if (!select) return;

  try {
    // Baca zon dari API config secara terus
    const API_URL = window.Config?.API_URL;
    let currentZone = "PNG01";
    if (API_URL) {
      try {
        const cfgResp = await fetch(`${API_URL}/data/config`);
        if (cfgResp.ok) {
          const cfgResult = await cfgResp.json();
          const zoneRow = cfgResult.data?.find((r) => r.key === "TAKWIM_ZONE");
          if (zoneRow?.value) currentZone = zoneRow.value;
        }
      } catch {
        // fallback PNG01
      }
    }

    const resp = await fetch(JAKIM_ZONES_URL);
    if (!resp.ok) throw new Error(`API zones: ${resp.status}`);
    const zones = await resp.json();

    select.innerHTML = "";

    if (Array.isArray(zones)) {
      zones.forEach((z) => {
        const opt = document.createElement("option");
        opt.value = z.jakimCode || z.code || z.zone;
        const code = z.jakimCode || z.code || z.zone;
        const negeri = z.negeri || z.state || "";
        const daerah = z.daerah || z.district || z.name || "";
        opt.textContent = `${code} - ${negeri}${daerah ? " - " + daerah : ""}`;
        if (code === currentZone) opt.selected = true;
        select.appendChild(opt);
      });
    } else {
      throw new Error("Format API zones tidak dikenali");
    }
  } catch (err) {
    console.error("loadZoneDropdown error:", err);
    select.innerHTML = `<option value="${getZone()}">${getZone()} (offline)</option>`;
    if (window.NotificationUtils) {
      window.NotificationUtils.showNotification("Gagal muat senarai zon: " + err.message, "error");
    }
  }
}

/**
 * Sync data takwim setahun penuh dari API waktusolat.app dan simpan ke takwim.txt
 */
export async function syncJakimYear() {
  const API_URL = window.Config?.API_URL;
  if (!API_URL) {
    if (window.NotificationUtils) {
      window.NotificationUtils.showNotification("Config.API_URL tidak diset", "error");
    }
    return;
  }

  // Guna zon dari dropdown (terkini), bukan dari configData
  const select = document.getElementById("TAKWIM_ZONE");
  const zone = select ? select.value || getZone() : getZone();
  const btn = document.getElementById("btn-sync-year");
  const origText = btn ? btn.textContent.trim() : "Sync Setahun";

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Menyemak zon...";
    }

    const year = new Date().getFullYear();

    // Validasi zon — fetch bulan 1 dahulu
    const testResp = await fetch(`${JAKIM_API_BASE}/${zone}?year=${year}&month=1`);
    if (!testResp.ok) {
      throw new Error(`Zon "${zone}" tidak dijumpai (HTTP ${testResp.status})`);
    }

    const zoneName = await getZoneName(zone);
    const lines = [];

    // Baris 1: header zon
    lines.push(`${zone} - ${zoneName}`);
    // Baris 2: HIJRI_DATA
    lines.push(`HIJRI_DATA=${HIJRI_DATA_HEX}`);

    // Loop 12 bulan
    for (let month = 1; month <= 12; month++) {
      if (btn) btn.textContent = `Syncing... ${month}/12`;

      const resp = await fetch(`${JAKIM_API_BASE}/${zone}?year=${year}&month=${month}`);
      if (!resp.ok) throw new Error(`Gagal fetch bulan ${month}: HTTP ${resp.status}`);
      const json = await resp.json();

      const prayers = json.prayers || json.data || [];
      if (!prayers.length) throw new Error(`Tiada data untuk bulan ${month}`);

      prayers.forEach((p) => {
        const day = String(p.day).padStart(2, "0");
        const monthStr = String(month).padStart(2, "0");
        const dateGreg = `${day}-${monthStr}-${year}`;
        const dateHijri = p.hijri ? formatHijriDate(p.hijri) : "00-00-0000";

        const imsak = timestampToTime(p.fajr - 10 * 60);
        const subuh = timestampToTime(p.fajr);
        const syuruk = timestampToTime(p.syuruk);
        const zohor = timestampToTime(p.dhuhr);
        const asar = timestampToTime(p.asr);
        const maghrib = timestampToTime(p.maghrib);
        const isyak = timestampToTime(p.isha);

        lines.push(`${dateGreg} ${dateHijri}\t${imsak}\t${subuh}\t${syuruk}\t${zohor}\t${asar}\t${maghrib}\t${isyak}`);
      });
    }

    const content = lines.join("\n");

    const saveResp = await fetch(`${API_URL}/files/takwim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!saveResp.ok) throw new Error(`Gagal simpan fail: HTTP ${saveResp.status}`);

    // Auto-simpan zon ke config.txt
    if (typeof window.saveConfigItem === "function" && select) {
      select.value = zone;
      await window.saveConfigItem("TAKWIM_ZONE");
    }

    if (window.NotificationUtils) {
      window.NotificationUtils.showNotification(`Takwim ${year} (${zone}) berjaya di-sync`, "success");
    }

    await loadTodayTakwim();
  } catch (err) {
    console.error("syncJakimYear error:", err);
    if (window.NotificationUtils) {
      window.NotificationUtils.showNotification("Gagal sync: " + err.message, "error");
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = origText;
    }
  }
}

/**
 * Dapatkan nama zon dari API zones
 * @param {string} zoneCode
 * @returns {Promise<string>}
 */
async function getZoneName(zoneCode) {
  try {
    const resp = await fetch(JAKIM_ZONES_URL);
    if (!resp.ok) return zoneCode;
    const zones = await resp.json();
    if (Array.isArray(zones)) {
      const found = zones.find((z) => (z.jakimCode || z.code || z.zone) === zoneCode);
      if (found) {
        const negeri = found.negeri || found.state || "";
        const daerah = found.daerah || found.district || found.name || "";
        return daerah ? `${negeri} - ${daerah}` : negeri || zoneCode;
      }
    }
  } catch {
    // fallback
  }
  return zoneCode;
}

/**
 * Upload fail takwim.txt dari input file dan overwrite fail di backend
 */
export async function uploadTakwimFile() {
  const API_URL = window.Config?.API_URL;
  if (!API_URL) {
    if (window.NotificationUtils) {
      window.NotificationUtils.showNotification("Config.API_URL tidak diset", "error");
    }
    return;
  }

  const fileInput = document.getElementById("takwim-upload");
  if (!fileInput || !fileInput.files || !fileInput.files[0]) {
    if (window.NotificationUtils) {
      window.NotificationUtils.showNotification("Sila pilih fail .txt dahulu", "error");
    }
    return;
  }

  const file = fileInput.files[0];
  const btn = document.querySelector('[onclick="uploadTakwimFile()"]');
  const origText = btn ? btn.textContent.trim() : "Muat Naik";

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Memuat naik...";
    }

    const content = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error("Gagal baca fail"));
      reader.readAsText(file, "utf-8");
    });

    if (!content || content.trim().split("\n").length < 3) {
      throw new Error("Fail tidak sah atau kandungan terlalu pendek");
    }

    // Sisipkan baris 1 (zon) dan baris 2 (HIJRI_DATA) pada kandungan upload
    const zone = getZone();
    const zoneName = await getZoneName(zone);
    const dataLines = content.split(/\r?\n/).filter((l) => l.trim());
    const finalLines = [`${zone} - ${zoneName}`, `HIJRI_DATA=${HIJRI_DATA_HEX}`, ...dataLines];
    const finalContent = finalLines.join("\n");

    const saveResp = await fetch(`${API_URL}/files/takwim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: finalContent }),
    });
    if (!saveResp.ok) throw new Error(`Gagal simpan: HTTP ${saveResp.status}`);

    if (window.NotificationUtils) {
      window.NotificationUtils.showNotification("Fail takwim berjaya dimuat naik", "success");
    }

    fileInput.value = "";
    await loadTodayTakwim();
  } catch (err) {
    console.error("uploadTakwimFile error:", err);
    if (window.NotificationUtils) {
      window.NotificationUtils.showNotification("Gagal muat naik: " + err.message, "error");
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = origText;
    }
  }
}

/**
 * Muat paparan jadual solat hari ini (config layout dengan field edit)
 */
export async function loadTodayTakwim() {
  const container = document.getElementById("takwim-table-container");
  if (!container) return;

  const API_URL = window.Config?.API_URL;
  if (!API_URL) {
    container.innerHTML = '<div class="text-center py-8 text-red-500">Config.API_URL tidak diset</div>';
    return;
  }

  container.innerHTML =
    '<div class="text-center py-8 text-gray-500">Memuatkan jadual solat hari ini...</div>';

  try {
    const response = await fetch(`${API_URL}/data/takwim/today`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (!result.data) {
      const today = new Date();
      const gregorianDate = today
        .toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
        .replace(/\//g, "-");

      container.innerHTML = `
        <div class="today-takwim-container">
          <header class="today-takwim-header">
            <h2 class="today-takwim-title">Jadual Solat Hari Ini</h2>
            <div class="today-takwim-dates">
              <div>Tarikh Masihi: ${gregorianDate}</div>
              <div>Tarikh Hijri: Tiada data</div>
            </div>
          </header>
          <div class="today-takwim-empty">
            <p class="text-lg mb-2">Tiada data jadual solat untuk hari ini.</p>
            <p class="text-sm">Sila sync data setahun atau muat naik fail takwim.</p>
          </div>
        </div>
      `;
      return;
    }

    const data = result.data;
    let formData = {
      imsak: data.imsak || "",
      subuh: data.subuh || "",
      syuruk: data.syuruk || "",
      zohor: data.zohor || "",
      asar: data.asar || "",
      maghrib: data.maghrib || "",
      isyak: data.isyak || "",
    };

    const saveField = async (fieldName, inputElement, saveButton) => {
      const newValue = inputElement.value;
      formData[fieldName] = newValue;

      try {
        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        const allDataResponse = await fetch(`${API_URL}/data/takwim`);
        const allData = await allDataResponse.json();
        const todayRow = allData.data?.find((row) => row.date === data.date);

        if (!todayRow) {
          throw new Error("Today's row not found");
        }

        const rawLine = `${data.date} ${data.hijri}\t${formData.imsak}\t${formData.subuh}\t${formData.syuruk}\t${formData.zohor}\t${formData.asar}\t${formData.maghrib}\t${formData.isyak}`;

        const updateResponse = await fetch(`${API_URL}/data/takwim/${todayRow.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ row: { raw: rawLine } }),
        });

        if (!updateResponse.ok) {
          throw new Error("Failed to save");
        }

        data[fieldName] = newValue;
      } catch (err) {
        console.error("Error saving:", err);
        if (window.NotificationUtils) {
          window.NotificationUtils.showNotification(
            "Gagal menyimpan waktu " + fieldName + ": " + err.message,
            "error",
          );
        }
        inputElement.value = formatTimeForInput(data[fieldName] || "");
      } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Simpan";
      }
    };

    const prayerTimes = [
      { key: "imsak", label: "Imsak" },
      { key: "subuh", label: "Subuh" },
      { key: "syuruk", label: "Syuruk" },
      { key: "zohor", label: "Zohor" },
      { key: "asar", label: "Asar" },
      { key: "maghrib", label: "Maghrib" },
      { key: "isyak", label: "Isyak" },
    ];

    container.innerHTML = `
      <div class="today-takwim-container">
        <div class="today-takwim-fields">
          ${prayerTimes
            .map(
              (prayer) => `
            <div class="today-takwim-field">
              <label class="today-takwim-label">${prayer.label}</label>
              <input type="time" class="today-takwim-input" value="${formatTimeForInput(formData[prayer.key])}" 
                data-field="${prayer.key}" />
              <button class="today-takwim-btn-field-save" data-field="${prayer.key}">Simpan</button>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    `;

    container.querySelectorAll(".today-takwim-btn-field-save").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const fieldName = e.target.dataset.field;
        const inputElement = container.querySelector(`input[data-field="${fieldName}"]`);
        if (inputElement) {
          await saveField(fieldName, inputElement, e.target);
        }
      });
    });
  } catch (error) {
    console.error("Error loading today takwim:", error);
    container.innerHTML = `
      <div class="text-center py-8 text-red-500">
        Error: ${error.message}
      </div>
    `;
    if (window.NotificationUtils) {
      window.NotificationUtils.showNotification("Gagal memuat data hari ini", "error");
    }
  }
}
