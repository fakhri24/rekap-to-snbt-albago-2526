document
  .getElementById("print-single-btn")
  .addEventListener("click", () => window.print());

let radarChartInstance = null;
let lineChartInstance = null;
let allStudentsData = [];
let chartDataStorage = {};
let chartInstances = {};

const LABELS_PANJANG = [
  "Penalaran Umum (PU)",
  "Pengetahuan Kuantitatif (PK)",
  "Pengetahuan dan Pemahaman Umum (PPU)",
  "Pemahaman Bacaan dan Menulis (PBM)",
  "Literasi Dalam Bahasa Indonesia (LBI)",
  "Literasi Dalam Bahasa Inggris (LBE)",
  "Penalaran Matematika (PM)",
];
const LABELS_PENDEK = ["PU", "PK", "PPU", "PBM", "LBI", "LBE", "PM"];

const SCHOOL_AVG = [513, 348, 531, 561, 452, 457, 320];
const SCHOOL_MAX = [709, 733, 738, 805, 759, 707, 720];

const TANGGAL_TO = [
  "11-09-2025",
  "11-10-2025",
  "21-11-2025",
  "17-11-2025",
  "9-01-2025",
  "22-01-2025",
  "28-02-2025",
  "07-03-2026",
  "09-03-2026",
  "Maret 2026",
  "Maret 2026",
  "Maret 2026",
];

function formatAngka(str) {
  if (!str) return 0;
  let num = parseFloat(String(str).replace(",", ".").trim());
  return isNaN(num) ? 0 : Math.round(num);
}
function tampilAngka(num) {
  return Math.round(num).toString();
}
function getStatus(nilai, rata, maks) {
  if (nilai >= maks)
    return { text: "Nilai maksimum sekolah", class: "text-blue" };
  if (nilai >= rata)
    return { text: "Diatas rata-rata sekolah", class: "text-green" };
  return { text: "Dibawah rata-rata sekolah", class: "text-red" };
}
function getColor(text) {
  if (!text) return "";
  if (text.toLowerCase().includes("mencapai")) return "text-green";
  if (text.toLowerCase().includes("belum")) return "text-red";
  return "";
}

// --- FUNGSI PABRIK HTML ---
function generateReportHTML(flatData, idSuffix, isBatch = false) {
  if (!flatData) return "";

  const namaSiswa = flatData["Nama Murid"] || "-";
  const kelasSiswa = flatData["Kelas"] || "-";
  const guru = flatData["Guru Pembimbing"] || "-";

  let latestTO = 1;
  for (let i = 20; i >= 1; i--) {
    if (
      flatData[`TO${i}_Total`] !== undefined &&
      flatData[`TO${i}_Total`] !== ""
    ) {
      latestTO = i;
      break;
    }
  }

  const skorTerkini = [
    formatAngka(flatData[`TO${latestTO}_PU`]),
    formatAngka(flatData[`TO${latestTO}_PK`]),
    formatAngka(flatData[`TO${latestTO}_PPU`]),
    formatAngka(flatData[`TO${latestTO}_PBM`]),
    formatAngka(flatData[`TO${latestTO}_LBI`]),
    formatAngka(flatData[`TO${latestTO}_LBE`]),
    formatAngka(flatData[`TO${latestTO}_PM`]),
  ];

  chartDataStorage[idSuffix] = {
    radar: skorTerkini,
    historyDates: [],
    historyTotals: [],
    historyTargets: [],
  };

  let currentScoresHTML = "";
  let dataAnalisis = [];
  skorTerkini.forEach((nilai, i) => {
    let status = getStatus(nilai, SCHOOL_AVG[i], SCHOOL_MAX[i]);
    currentScoresHTML += `<tr><td>${LABELS_PANJANG[i]}</td><td>${tampilAngka(nilai)}</td><td>${tampilAngka(SCHOOL_AVG[i])}</td><td>${tampilAngka(SCHOOL_MAX[i])}</td><td class="${status.class}">${status.text}</td></tr>`;
    dataAnalisis.push({ nama: LABELS_PANJANG[i], skor: nilai });
  });

  let top3 = [...dataAnalisis].sort((a, b) => b.skor - a.skor).slice(0, 3);
  let bottom3 = [...dataAnalisis].sort((a, b) => a.skor - b.skor).slice(0, 3);
  let strengthListHTML = top3
    .map(
      (item) =>
        `<li><span>${item.nama}</span> <strong>${tampilAngka(item.skor)}</strong></li>`,
    )
    .join("");
  let weaknessListHTML = bottom3
    .map(
      (item) =>
        `<li><span>${item.nama}</span> <strong>${tampilAngka(item.skor)}</strong></li>`,
    )
    .join("");

  const totalTerkini = formatAngka(flatData[`TO${latestTO}_Total`]);
  const totalSeb =
    latestTO > 1
      ? formatAngka(flatData[`TO${latestTO - 1}_Total`])
      : totalTerkini;
  const selisih = totalTerkini - totalSeb;
  const badgeHTML =
    selisih >= 0
      ? `<div class="score-badge badge-up">▲ +${tampilAngka(selisih)}</div>`
      : `<div class="score-badge badge-down">▼ ${tampilAngka(selisih)}</div>`;

  let targetsHTML = "";
  if (flatData["Prodi Pilihan 1"])
    targetsHTML += `<tr><td>${flatData["Prodi Pilihan 1"]}</td><td class="${getColor(flatData["Status 1"])}">${flatData["Status 1"]}</td></tr>`;
  if (flatData["Prodi Pilihan 2"])
    targetsHTML += `<tr><td>${flatData["Prodi Pilihan 2"]}</td><td class="${getColor(flatData["Status 2"])}">${flatData["Status 2"]}</td></tr>`;

  let historyBodyHTML = "";
  let maxScores = Array(8).fill(0);
  let sumScores = Array(8).fill(0);
  let countTO = 0;

  for (let i = 1; i <= latestTO; i++) {
    if (
      flatData[`TO${i}_Total`] !== undefined &&
      flatData[`TO${i}_Total`] !== ""
    ) {
      countTO++;
      let subTes = [
        formatAngka(flatData[`TO${i}_PU`]),
        formatAngka(flatData[`TO${i}_PK`]),
        formatAngka(flatData[`TO${i}_PPU`]),
        formatAngka(flatData[`TO${i}_PBM`]),
        formatAngka(flatData[`TO${i}_LBI`]),
        formatAngka(flatData[`TO${i}_LBE`]),
        formatAngka(flatData[`TO${i}_PM`]),
        formatAngka(flatData[`TO${i}_Total`]),
      ];

      let tgl = TANGGAL_TO[i - 1] || `TO-${i}`;
      let parts = tgl.split("-");
      let month =
        parts.length > 1
          ? parts[1] === "08"
            ? "Agu"
            : parts[1] === "09"
              ? "Sept"
              : parts[1] === "10"
                ? "Okt"
                : parts[1] === "11"
                  ? "Nov"
                  : parts[1] === "12"
                    ? "Des"
                    : parts[1] === "01"
                      ? "Jan"
                      : parts[1] === "02"
                        ? "Feb"
                        : parts[1]
          : tgl;

      chartDataStorage[idSuffix].historyDates.push(`${month} (${i})`);
      chartDataStorage[idSuffix].historyTotals.push(subTes[7]);
      chartDataStorage[idSuffix].historyTargets.push(
        formatAngka(flatData[`TO${i}_Target`]) || 0,
      );

      for (let j = 0; j < 8; j++) {
        if (subTes[j] > maxScores[j]) maxScores[j] = subTes[j];
        sumScores[j] += subTes[j];
      }
      historyBodyHTML += `<tr><td>${i} (${tgl})</td>${subTes
        .slice(0, 7)
        .map((s) => `<td>${tampilAngka(s)}</td>`)
        .join("")}<td>${tampilAngka(subTes[7])}</td></tr>`;
    }
  }

  let avgScores = sumScores.map((sum) => (countTO > 0 ? sum / countTO : 0));
  let historyFooterHTML = `
        <tr class="table-footer"><td>Skor Tertinggi</td>${maxScores.map((m) => `<td class="text-blue">${tampilAngka(m)}</td>`).join("")}</tr>
        <tr class="table-footer"><td>Skor Rerata</td>${avgScores.map((a) => `<td>${tampilAngka(a)}</td>`).join("")}</tr>
    `;

  let statusTarget =
    totalTerkini >= formatAngka(flatData[`TO${latestTO}_Target`])
      ? "sangat baik dan telah mencapai target"
      : "cukup baik";
  let headerHTML = isBatch
    ? `<div class="header"><h1>LAPORAN HASIL TRYOUT UTBK 2026</h1><p>Periode Bulan Februari 2026</p></div>`
    : ``;

  return `
        ${headerHTML}
        <table class="identity-table">
            <tbody><tr><th>Nama Murid</th><th>Kelas</th><th>Guru Pembimbing</th></tr><tr><td>${namaSiswa}</td><td>${kelasSiswa}</td><td>${guru}</td></tr></tbody>
        </table>
        <div class="table-section"><h2 class="section-title">Hasil Tryout UTBK-SNBT Terkini (TO-${latestTO})</h2><table class="data-table"><thead><tr><th>ASPEK</th><th>NILAI</th><th>Rata-rata Sekolah</th><th>Maksimum Sekolah</th><th>Keterangan</th></tr></thead><tbody class="body-class">${currentScoresHTML}</tbody></table></div>
        <div class="score-summary-container"><div class="score-card"><div class="score-card-title">Skor Tryout Terkini</div><div class="score-card-body"><div class="score-main">${tampilAngka(totalTerkini)}</div>${badgeHTML}</div></div></div>
        <div class="table-section"><h2 class="section-title">Target Pilihan Program Studi</h2><table class="data-table"><thead><tr><th>Pilihan Program Studi</th><th>Keterangan</th></tr></thead><tbody>${targetsHTML}</tbody></table></div>
        
        <div class="charts-wrapper">
            <div class="chart-section"><h2 class="section-title">Komparasi Skor Sub-Tes</h2><div class="radar-container"><canvas id="radarChart_${idSuffix}"></canvas></div></div>
            <div class="chart-section"><h2 class="section-title">Analisis Sub-Tes Terkini</h2><div class="analysis-container"><div class="analysis-box box-strength"><h3>Kekuatan Utama</h3><ul class="analysis-list">${strengthListHTML}</ul></div><div class="analysis-box box-weakness"><h3>Perlu Ditingkatkan</h3><ul class="analysis-list">${weaknessListHTML}</ul></div></div></div>
        </div>

        <div class="chart-section page-break" style="margin-bottom: 30px;"><h2 class="section-title">Grafik Perkembangan Tryout</h2><div class="line-container"><canvas id="lineChart_${idSuffix}"></canvas></div></div>
        
        <div class="table-section"><h2 class="section-title">Riwayat Perkembangan Skor Tryout</h2><div style="overflow-x: auto;"><table class="data-table"><thead><tr><th>TO Ke-</th><th>PU</th><th>PK</th><th>PPU</th><th>PBM</th><th>LBI</th><th>LBE</th><th>PM</th><th>Skor TO</th></tr></thead><tbody class="history-body-class">${historyBodyHTML}</tbody><tfoot>${historyFooterHTML}</tfoot></table></div></div>
        
        <div class="table-section"><h2 class="section-title">Ringkasan</h2><div class="summary-content"><p>Secara keseluruhan pencapaian ${namaSiswa} ${statusTarget} dalam tryout UTBK-SNBT. Performa yang memuaskan terlihat khususnya pada sub-tes ${top3[0].nama}, ${top3[1].nama}, dan ${top3[2].nama}.</p><p>Tingkatkan terus semangat belajar serta fokus dan teliti ketika mengikuti kegiatan tryout, semoga pada tryout berikutnya kamu bisa mendapatkan hasil yang semakin baik.</p><div class="summary-signature">Tim Sukses PTN 2025/2026 - SMA PU Albayan Putri Goalpara</div></div></div>
    `;
}

function drawCharts(idSuffix, animate = true) {
  const data = chartDataStorage[idSuffix];
  const animConfig = animate ? {} : { animation: false };

  if (chartInstances[`radar_${idSuffix}`])
    chartInstances[`radar_${idSuffix}`].destroy();
  if (chartInstances[`line_${idSuffix}`])
    chartInstances[`line_${idSuffix}`].destroy();

  const ctxRadar = document
    .getElementById(`radarChart_${idSuffix}`)
    .getContext("2d");
  const ctxLine = document
    .getElementById(`lineChart_${idSuffix}`)
    .getContext("2d");

  chartInstances[`radar_${idSuffix}`] = new Chart(ctxRadar, {
    type: "radar",
    data: {
      labels: LABELS_PENDEK,
      datasets: [
        {
          label: "Skor Ananda",
          data: data.radar,
          borderColor: "rgba(220, 53, 69, 1)",
          backgroundColor: "rgba(220, 53, 69, 0.1)",
          borderWidth: 3,
        },
        {
          label: "Rata-rata Sekolah",
          data: SCHOOL_AVG,
          borderColor: "rgba(13, 110, 253, 1)",
          backgroundColor: "transparent",
          borderWidth: 2,
        },
        {
          label: "Maksimum Sekolah",
          data: SCHOOL_MAX,
          borderColor: "rgba(25, 135, 84, 1)",
          backgroundColor: "transparent",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { r: { min: 0, max: 1000, ticks: { stepSize: 250 } } },
      ...animConfig,
    },
  });

  chartInstances[`line_${idSuffix}`] = new Chart(ctxLine, {
    type: "line",
    data: {
      labels: data.historyDates,
      datasets: [
        {
          label: "Hasil Tryout",
          data: data.historyTotals,
          borderColor: "rgba(13, 110, 253, 1)",
          backgroundColor: "rgba(13, 110, 253, 1)",
          borderWidth: 2,
          tension: 0.1,
        },
        {
          label: "Target",
          data: data.historyTargets,
          borderColor: "rgba(220, 53, 69, 1)",
          backgroundColor: "transparent",
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { min: 0, max: 1000, ticks: { stepSize: 200 } } },
      ...animConfig,
    },
  });
}

function populateDropdown(filterText = "") {
  const selectEl = document.getElementById("student-select");
  selectEl.innerHTML = "";
  let firstMatchIndex = -1;

  allStudentsData.forEach((student, originalIndex) => {
    if (
      (student["Nama Murid"] || "")
        .toLowerCase()
        .includes(filterText.toLowerCase())
    ) {
      const option = document.createElement("option");
      option.value = originalIndex;
      option.textContent = `${student["Nama Murid"]} (${student["Kelas"]})`;
      selectEl.appendChild(option);
      if (firstMatchIndex === -1) firstMatchIndex = originalIndex;
    }
  });

  if (selectEl.options.length === 0) {
    selectEl.innerHTML =
      '<option value="">-- Siswa tidak ditemukan --</option>';
  }
}

function renderSingleStudent(index) {
  const container = document.getElementById("single-report-content");
  container.innerHTML = generateReportHTML(
    allStudentsData[index],
    "single",
    false,
  );
  drawCharts("single", true);
}

// === FITUR BATCH PRINT (MEMOTRET GRAFIK) ===
document.getElementById("print-all-btn").addEventListener("click", async () => {
  const btn = document.getElementById("print-all-btn");
  const originalText = btn.textContent;
  btn.disabled = true;

  // 1. Tampilkan Wadah Rahasia ke layar
  document.body.classList.add("is-batch-printing");
  const batchContainer = document.getElementById("batch-report-container");
  batchContainer.innerHTML = "";

  // Paksa browser "menyadari" wadah ini ada ukurannya (Reflow)
  void batchContainer.offsetWidth;

  for (let i = 0; i < allStudentsData.length; i++) {
    btn.textContent = `Memproses Laporan... (${i + 1}/${allStudentsData.length})`;

    // 2. Buat HTML Siswa
    const div = document.createElement("div");
    div.className = "report-container batch-item";
    div.innerHTML = generateReportHTML(allStudentsData[i], `batch_${i}`, true);
    batchContainer.appendChild(div);

    // 3. Gambar Grafik (Tanpa Animasi)
    drawCharts(`batch_${i}`, false);

    // 4. FIX BUG: Tunggu agak lama (300ms) agar browser benar-benar selesai "melukis" canvas
    await new Promise((resolve) => setTimeout(resolve, 300));

    // 5. Tangkap elemen Canvas
    const radarCanvas = document.getElementById(`radarChart_batch_${i}`);
    const lineCanvas = document.getElementById(`lineChart_batch_${i}`);

    // 6. Ambil foto grafiknya menggunakan metode bawaan HTML5 (paling aman)
    const radarBase64 = radarCanvas.toDataURL("image/png");
    const lineBase64 = lineCanvas.toDataURL("image/png");

    // 7. Hancurkan memori Chart.js DULU sebelum elemen canvas-nya dihapus dari layar
    if (chartInstances[`radar_batch_${i}`])
      chartInstances[`radar_batch_${i}`].destroy();
    if (chartInstances[`line_batch_${i}`])
      chartInstances[`line_batch_${i}`].destroy();

    // 8. Buat tag <img> statis
    const radarImg = document.createElement("img");
    radarImg.src = radarBase64;
    radarImg.style.width = "100%";
    radarImg.style.height = "100%";
    radarImg.style.objectFit = "contain";

    const lineImg = document.createElement("img");
    lineImg.src = lineBase64;
    lineImg.style.width = "100%";
    lineImg.style.height = "100%";
    lineImg.style.objectFit = "contain";

    // 9. Ganti tag <canvas> yang sudah mati dengan tag <img> statis yang baru
    radarCanvas.parentNode.replaceChild(radarImg, radarCanvas);
    lineCanvas.parentNode.replaceChild(lineImg, lineCanvas);
  }

  btn.textContent = "Membuka Jendela Cetak...";

  // Beri waktu 1 detik ekstra sebelum dialog print ditarik keluar
  setTimeout(() => {
    window.print();

    // Sembunyikan dan bersihkan kembali wadah rahasia agar komputer tidak lemot
    document.body.classList.remove("is-batch-printing");
    batchContainer.innerHTML = "";
    btn.textContent = originalText;
    btn.disabled = false;
  }, 1000);
});

async function initializeApp() {
  try {
    const response = await fetch("data.json");
    allStudentsData = await response.json();

    populateDropdown("");
    if (allStudentsData.length > 0) renderSingleStudent(0);

    document.getElementById("search-input").addEventListener("input", (e) => {
      populateDropdown(e.target.value);
      const selectEl = document.getElementById("student-select");
      if (selectEl.options.length > 0 && selectEl.options[0].value !== "")
        renderSingleStudent(selectEl.options[0].value);
    });

    document
      .getElementById("student-select")
      .addEventListener("change", (e) => {
        if (e.target.value !== "") renderSingleStudent(e.target.value);
      });
  } catch (error) {
    console.error("Gagal memuat:", error);
    document.getElementById("student-select").innerHTML =
      "<option>Gagal memuat data JSON</option>";
  }
}

window.onload = initializeApp;
