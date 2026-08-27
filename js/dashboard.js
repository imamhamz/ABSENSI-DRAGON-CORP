import { supabase } from "./supabase.js";

const EMPLOYEE_TABLE = "absensi-dragon-corp";
const ATTENDANCE_TABLE = "attendance";

const $ = (id) => document.getElementById(id);

function todayLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatTime(value) {
  if (!value) return "—";
  return String(value).slice(0, 5);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

function statusBadge(status) {
  const s = String(status ?? "").toLowerCase();
  let cls = "belum";
  if (s.includes("terlambat")) cls = "terlambat";
  else if (s.includes("hadir") || s.includes("masuk")) cls = "hadir";
  return `<span class="badge ${cls}">${escapeHtml(status || "Belum Absen")}</span>`;
}

async function loadDashboard() {
  const date = todayLocal();

  const [{ data: employees, error: empError },
         { data: attendance, error: attError }] = await Promise.all([
    supabase.from(EMPLOYEE_TABLE).select("id,kode,nama,jabatan,status").order("id"),
    supabase.from(ATTENDANCE_TABLE)
      .select("id,employee_id,tanggal,jam_masuk,jam_pulang,status,catatan,photo_url,latitude,longitude,accuracy,location_status")
      .eq("tanggal", date)
      .order("jam_masuk", { ascending: true, nullsFirst: false })
  ]);

  if (empError) throw new Error("Pegawai: " + empError.message);
  if (attError) throw new Error("Attendance: " + attError.message);

  const activeEmployees = (employees || []).filter(e =>
    !e.status || String(e.status).toLowerCase() === "aktif"
  );

  const employeeMap = new Map((employees || []).map(e => [e.id, e]));
  const records = attendance || [];

  const hadir = records.filter(r => {
    const s = String(r.status || "").toLowerCase();
    return r.jam_masuk && !s.includes("terlambat");
  }).length;

  const terlambat = records.filter(r =>
    String(r.status || "").toLowerCase().includes("terlambat")
  ).length;

  const belum = Math.max(activeEmployees.length - records.length, 0);

const attendancePercent = activeEmployees.length
  ? Math.round((records.length / activeEmployees.length) * 100)
  : 0;

$("attendancePercent").textContent = `${attendancePercent}%`;

  $("totalPegawai").textContent = activeEmployees.length;
  $("hadirHariIni").textContent = hadir;
  $("terlambat").textContent = terlambat;
  $("belumAbsen").textContent = belum;
  $("tanggalDashboard").textContent = new Date().toLocaleDateString("id-ID", {
    day: "2-digit", month: "long", year: "numeric"
  });

  const tbody = $("attendanceBody");
  if (!records.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty">Belum ada absensi hari ini.</td></tr>`;
  } else {
    tbody.innerHTML = records.map(r => {
      const e = employeeMap.get(r.employee_id);
      const dataIcons = [
        r.latitude != null && r.longitude != null ? "📍" : "",
        r.photo_url ? "📷" : ""
      ].filter(Boolean).join(" ") || "—";
      return `<tr>
        <td><strong>${escapeHtml(e?.nama || `Pegawai #${r.employee_id}`)}</strong><br>
            <span class="muted">${escapeHtml(e?.kode || "")}</span></td>
        <td>${formatTime(r.jam_masuk)}</td>
        <td>${formatTime(r.jam_pulang)}</td>
        <td>${statusBadge(r.status || (r.jam_masuk ? "Hadir" : "Belum Absen"))}</td>
        <td>${dataIcons}</td>
      </tr>`;
    }).join("");
  }

  const activity = $("activityList");
  activity.innerHTML = records.slice(-6).reverse().map(r => {
    const e = employeeMap.get(r.employee_id);
    const label = r.jam_masuk
      ? `${e?.nama || "Pegawai"} melakukan absen masuk`
      : `${e?.nama || "Pegawai"} memperbarui absensi`;
    const extras = [
      r.jam_masuk ? formatTime(r.jam_masuk) : "",
      r.latitude != null ? "GPS terdeteksi" : "",
      r.photo_url ? "Foto tersimpan" : ""
    ].filter(Boolean).join(" • ");
    return `<div class="activity-item"><span class="dot"></span>
      <div><strong>${escapeHtml(label)}</strong><p>${escapeHtml(extras || "Data tersimpan")}</p></div>
    </div>`;
  }).join("") || `<div class="empty">Belum ada aktivitas hari ini.</div>`;

  const markers = records.filter(r => r.latitude != null && r.longitude != null);
  $("locationCount").textContent = `${markers.length} lokasi`;

  window.dispatchEvent(new CustomEvent("attendance-loaded", {
    detail: { employees: activeEmployees, attendance: records, employeeMap }
  }));
}

async function startRealtime() {
  supabase.channel("attendance-dashboard")
    .on("postgres_changes",
      { event: "*", schema: "public", table: ATTENDANCE_TABLE },
      () => loadDashboard().catch(showError)
    )
    .subscribe((status) => {
      $("realtimeStatus").textContent =
        status === "SUBSCRIBED" ? "Realtime aktif" : "Menghubungkan realtime...";
    });
}

function showError(error) {
  console.error(error);
  $("connectionStatus").textContent = "Koneksi Supabase bermasalah";
  $("connectionStatus").className = "connection error";
  $("errorBox").textContent = error.message || String(error);
  $("errorBox").hidden = false;
}

$("connectionStatus").textContent = "Menghubungkan...";

loadDashboard()
  .then(() => {
    $("connectionStatus").textContent = "Supabase terhubung";
    $("connectionStatus").className = "connection ok";
    startRealtime();
  })
  .catch(showError);

$("refreshBtn").addEventListener("click", () => {
  $("refreshBtn").disabled = true;
  loadDashboard().catch(showError).finally(() => $("refreshBtn").disabled = false);
});
