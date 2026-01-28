// ============================
// CONFIG
// ============================
// 🔴 Reemplaza con tu endpoint real de Power Automate
const endpoint = "https://default3a26d729512149f4b2d9fa86a9ee02.9b.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/babbdd7365c341be8331c56e0ab98b10/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=NkqwDPpWVeG9adRF5r0_BfamoXffLnP5k4AFP40Znuc";

// ============================
// Helpers seguros
// ============================
function $(id) { return document.getElementById(id); }

function getFormEl() {
  // Tu HTML usa wizardForm :contentReference[oaicite:4]{index=4}
  return $("wizardForm") || $("coopetrolForm"); // fallback por compatibilidad
}

function getStatusEl() {
  // Tu HTML usa status :contentReference[oaicite:5]{index=5}
  return $("status") || $("statusMessage"); // fallback
}

function safeOn(el, event, handler) {
  if (!el) return;
  el.addEventListener(event, handler);
}

function setRequired(container, required) {
  if (!container) return;
  container.querySelectorAll("input, select, textarea").forEach(el => {
    // no tocar radios/checkbox fuera de la sección, pero esto es ok para paneles
    el.required = required;
  });
}

// ============================
// Wizard: pasos (porque tu HTML es paginado)
// ============================
document.addEventListener("DOMContentLoaded", () => {
  const form = getFormEl();
  if (!form) {
    console.error("No se encontró el formulario (wizardForm / coopetrolForm).");
    return;
  }

  const steps = Array.from(document.querySelectorAll(".step"));
  const prevBtn = $("prevBtn");
  const nextBtn = $("nextBtn");
  const submitBtn = $("submitBtn");
  const progressBar = $("progressBar");
  const stepLabel = $("stepLabel");

  let current = 0;

  function updateWizardUI() {
    steps.forEach((s, idx) => s.classList.toggle("active", idx === current));

    const total = steps.length || 1;
    const pct = Math.round(((current + 1) / total) * 100);

    if (progressBar) progressBar.style.width = `${pct}%`;
    if (stepLabel) stepLabel.textContent = `Paso ${current + 1} de ${total}`;

    if (prevBtn) prevBtn.disabled = current === 0;
    if (nextBtn) nextBtn.classList.toggle("hidden", current === total - 1);
    if (submitBtn) submitBtn.classList.toggle("hidden", current !== total - 1);
  }

  function validateStep(stepEl) {
    if (!stepEl) return true;

    // Validación nativa de campos visibles en el step actual
    const inputs = Array.from(stepEl.querySelectorAll("input, select, textarea"));
    for (const el of inputs) {
      // omitir elementos ocultos por panel hidden
      if (el.closest(".hidden")) continue;

      if (!el.checkValidity()) {
        el.reportValidity();
        return false;
      }
    }
    return true;
  }

  safeOn(prevBtn, "click", () => {
    if (current > 0) current--;
    updateWizardUI();
  });

  safeOn(nextBtn, "click", () => {
    const activeStep = steps[current];
    if (!validateStep(activeStep)) return;

    if (current < steps.length - 1) current++;
    updateWizardUI();
  });

  updateWizardUI();

  // ============================
  // Secciones repetibles (las nuevas: noFormal/formal/exp)
  // ============================
  function addRepeatItem({ listId, tplId, wrapId }) {
    const list = $(listId);
    const tpl = $(tplId);
    const wrap = $(wrapId);
    if (!list || !tpl || !wrap) return;

    const node = tpl.content.cloneNode(true);
    const itemEl = node.querySelector(".repeat-item");
    const removeBtn = node.querySelector(".btn-remove");

    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        itemEl?.remove();
        // si está activo (visible) no permitir quedar en 0
        if (!wrap.classList.contains("hidden") && !list.querySelector(".repeat-item")) {
          addRepeatItem({ listId, tplId, wrapId });
        }
        if (!wrap.classList.contains("hidden")) setRequired(wrap, true);
      });
    }

    list.appendChild(node);

    if (!wrap.classList.contains("hidden")) setRequired(wrap, true);
  }

  function bindFlag(flagName, wrapId, listId, tplId, addBtnId) {
    const wrap = $(wrapId);
    const list = $(listId);
    const addBtn = $(addBtnId);
    const radios = document.getElementsByName(flagName);

    if (!wrap || !list || !addBtn || !radios?.length) return;

    function ensureOneItem() {
      if (!list.querySelector(".repeat-item")) {
        addRepeatItem({ listId, tplId, wrapId });
      }
    }

    Array.from(radios).forEach(r => {
      r.addEventListener("change", () => {
        if (!r.checked) return;

        if (r.value === "Si") {
          wrap.classList.remove("hidden");
          ensureOneItem();
          setRequired(wrap, true);
        } else {
          wrap.classList.add("hidden");
          setRequired(wrap, false);
          list.innerHTML = "";
        }
      });
    });

    addBtn.addEventListener("click", () => addRepeatItem({ listId, tplId, wrapId }));
  }

  // En tu HTML existen estos flags/ids :contentReference[oaicite:6]{index=6}
  bindFlag("noFormalFlag", "noFormalWrap", "noFormalList", "tplNoFormal", "addNoFormalBtn");
  bindFlag("formalFlag", "formalWrap", "formalList", "tplFormal", "addFormalBtn");
  bindFlag("expFlag", "expWrap", "expList", "tplExp", "addExpBtn");

  // ============================
  // Juramento detalles (j3 y j6) existen en HTML :contentReference[oaicite:7]{index=7}
  // ============================
  function bindJuramentoDetalle(radioName, yesValue, wrapId, inputId) {
    const wrap = $(wrapId);
    const input = $(inputId);
    const radios = document.getElementsByName(radioName);
    if (!wrap || !input || !radios?.length) return;

    function sync() {
      const checked = Array.from(radios).find(r => r.checked)?.value;
      if (checked === yesValue) {
        wrap.classList.remove("hidden");
        input.required = true;
      } else {
        wrap.classList.add("hidden");
        input.required = false;
        input.value = "";
      }
    }

    Array.from(radios).forEach(r => r.addEventListener("change", sync));
    sync();
  }

  bindJuramentoDetalle("j3", "Sí", "j3_detail_wrap", "j3_detail");

  function bindOrganos(radioName, wrapId) {
    const wrap = $(wrapId);
    const radios = document.getElementsByName(radioName);
    const orgNombre = $("org_nombre");
    const orgNit = $("org_nit");
    const orgCargo = $("org_cargo");

    if (!wrap || !radios?.length) return;

    function sync() {
      const checked = Array.from(radios).find(r => r.checked)?.value;
      if (checked === "Sí") {
        wrap.classList.remove("hidden");
        if (orgNombre) orgNombre.required = true;
        if (orgNit) orgNit.required = true;
        if (orgCargo) orgCargo.required = true;
      } else {
        wrap.classList.add("hidden");
        if (orgNombre) { orgNombre.required = false; orgNombre.value = ""; }
        if (orgNit) { orgNit.required = false; orgNit.value = ""; }
        if (orgCargo) { orgCargo.required = false; orgCargo.value = ""; }
      }
    }

    Array.from(radios).forEach(r => r.addEventListener("change", sync));
    sync();
  }

  bindOrganos("j6", "j6_detail_wrap");

  // Antigüedad max 2 dígitos (ya lo tienes min/max en HTML, reforzamos) :contentReference[oaicite:8]{index=8}
  const antig = $("antiguedad");
  safeOn(antig, "input", () => {
    const val = String(antig.value).replace(/\D/g, "").slice(0, 2);
    antig.value = val;
  });

  // ============================
// SUBMIT -> Power Automate (JSON)
// ============================
async function fileToBase64(file) {
  if (!file) return null;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // reader.result: "data:application/pdf;base64,AAAA..."
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      const base64 = comma >= 0 ? result.slice(comma + 1) : result;

      resolve({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        base64
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Convierte FormData a objeto, soportando name="x[]" => array
function formDataToObject(fd) {
  const obj = {};

  for (const [key, value] of fd.entries()) {
    const isArrayKey = key.endsWith("[]");
    const cleanKey = isArrayKey ? key.slice(0, -2) : key;

    if (isArrayKey) {
      if (!Array.isArray(obj[cleanKey])) obj[cleanKey] = [];
      obj[cleanKey].push(value);
    } else {
      // Si el campo se repite sin [], lo guardamos como array
      if (obj[cleanKey] !== undefined) {
        if (!Array.isArray(obj[cleanKey])) obj[cleanKey] = [obj[cleanKey]];
        obj[cleanKey].push(value);
      } else {
        obj[cleanKey] = value;
      }
    }
  }

  return obj;
}

// ============================
// Helpers: agrupar secciones repetibles (nf/f/exp) en un solo JSON
// ============================
function buildSectionFromArrays(raw, prefix, fields, wrapId) {
  // Si la sección está oculta, no la enviamos
  if (wrapId) {
    const wrap = document.getElementById(wrapId);
    if (wrap && wrap.classList.contains("hidden")) return [];
  }

  // Calcular cantidad de filas con base en el max de longitudes
  let n = 0;
  for (const f of fields) {
    const k = `${prefix}_${f}`;
    if (Array.isArray(raw[k])) n = Math.max(n, raw[k].length);
  }
  if (!n) return [];

  const arr = [];
  for (let i = 0; i < n; i++) {
    const obj = {};
    for (const f of fields) {
      const k = `${prefix}_${f}`;
      obj[f] = Array.isArray(raw[k]) ? (raw[k][i] ?? "") : "";
    }
    arr.push(obj);
  }
  return arr;
}

// Normaliza checkboxes (true/false) y deja radios/text tal cual
function normalizeBooleans(rawObj, formEl) {
  const out = { ...rawObj };

  // checkboxes: si no vienen en FormData, es false (porque no se envían)
  const checkboxes = Array.from(formEl.querySelectorAll('input[type="checkbox"][name]'));
  for (const cb of checkboxes) {
    out[cb.name] = cb.checked; // true/false
  }

  return out;
}

async function collectFilesAsJson(formEl) {
  // Soportes repetibles (del HTML)
  const nfFiles = Array.from(formEl.querySelectorAll('input[type="file"][name="nf_soporte[]"]'));
  const fFiles  = Array.from(formEl.querySelectorAll('input[type="file"][name="f_soporte[]"]'));
  const expFiles= Array.from(formEl.querySelectorAll('input[type="file"][name="exp_soporte[]"]'));

  // Convertir a base64 en el mismo orden
  const nf_soporte = await Promise.all(nfFiles.map(i => fileToBase64(i.files?.[0] || null)));
  const f_soporte  = await Promise.all(fFiles.map(i => fileToBase64(i.files?.[0] || null)));
  const exp_soporte= await Promise.all(expFiles.map(i => fileToBase64(i.files?.[0] || null)));

  return { nf_soporte, f_soporte, exp_soporte };
}

// ============================
// Helper: asociar archivo (base64) dentro de cada registro nf/f/exp por índice
// ============================
function attachFilesToSection(sectionArr, fileArr) {
  return (sectionArr || []).map((row, i) => {
    const f = Array.isArray(fileArr) ? fileArr[i] : null;
    if (!f) return { ...row };
    if (f === null) return { ...row };
    return {
      ...row,
      fileName: f.fileName,
      mimeType: f.mimeType,
      size: f.size,
      base64: f.base64
    };
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Validar último step antes de enviar
  const activeStep = steps[current];
  if (!validateStep(activeStep)) return;

  const status = getStatusEl();
  if (status) {
    status.textContent = "Enviando información...";
    status.style.color = "#007d7b";
  }

  try {
    if (!endpoint || endpoint.includes("prod-XX") || endpoint.includes(".../invoke")) {
      throw new Error("Falta configurar el endpoint real del Flow en script.js");
    }

    // 1) Capturar datos “planos”
    const fd = new FormData(form);

    // OJO: FormData incluye File objects para inputs file; los quitamos del objeto plano
    // porque los enviaremos como base64 aparte (files{}).
    const raw = formDataToObject(fd);

    // Eliminar keys de soporte que vienen como File/empty, porque ya se enviarán en files{}
    delete raw["nf_soporte"];
    delete raw["f_soporte"];
    delete raw["exp_soporte"];

    // 2) Construir secciones repetibles (nf/f/exp) como arrays de objetos (JSON agrupado)
    const nf = buildSectionFromArrays(raw, "nf", ["institucion", "duracion", "inicio", "fin", "programa"], "noFormalWrap");
    const f  = buildSectionFromArrays(raw, "f",  ["institucion", "terminacion", "programa"], "formalWrap");
    const exp = buildSectionFromArrays(raw, "exp", ["entidad", "inicio", "fin", "cargo", "funciones"], "expWrap");

    // Quitar del raw los arrays paralelos para que no se dupliquen en data
    [
      "nf_institucion","nf_duracion","nf_inicio","nf_fin","nf_programa",
      "f_institucion","f_terminacion","f_programa",
      "exp_entidad","exp_inicio","exp_fin","exp_cargo","exp_funciones"
    ].forEach((k) => { delete raw[k]; });

    // 3) Normalizar booleanos (checkbox)
    const data = normalizeBooleans(raw, form);

    // 4) Adjuntos en base64 (JSON) y asociación dentro de cada registro
    const files = await collectFilesAsJson(form);

    // Asociar por índice (nf[i] ↔ nf_soporte[i], etc.)
    const nf_with_files  = attachFilesToSection(nf,  files.nf_soporte);
    const f_with_files   = attachFilesToSection(f,   files.f_soporte);
    const exp_with_files = attachFilesToSection(exp, files.exp_soporte);

    // 5) Payload final (archivos van dentro de nf/f/exp)
    const payload = {
      submittedAt: new Date().toISOString(),
      data: { ...data, nf: nf_with_files, f: f_with_files, exp: exp_with_files }
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const respText = await response.text();

    if (response.ok) {
      if (status) {
        status.textContent = "Formulario enviado correctamente. ¡Gracias por su participación!";
        status.style.color = "#007d7b";
      }
      form.reset();
      current = 0;
      updateWizardUI();
    } else {
      console.error("Error HTTP:", response.status, respText);
      if (status) {
        status.textContent = `Error enviando (HTTP ${response.status}). Revisa consola (F12).`;
        status.style.color = "red";
      }
      throw new Error(respText || "Error en el envío");
    }

  } catch (error) {
    console.error(error);
    if (status) {
      status.textContent = "Ocurrió un error al enviar el formulario. Inténtelo de nuevo. (Ver F12)";
      status.style.color = "red";
    }
  }
});


});
