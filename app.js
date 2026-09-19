// ============================================================
// Moje Podworko - Moja Paczka
// app.js - logika PWA + instalacja + API
// ============================================================

console.log("[app] Start aplikacji");

// ------------------------------------------------------------
// KONFIGURACJA API
// ------------------------------------------------------------
const API_BASE = "https://moje-podworko-events-api.onrender.com";
const API = {
  base: API_BASE,
  async get(path) {
    const res = await fetch(API_BASE + path);
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  },
  async post(path, body) {
    const res = await fetch(API_BASE + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "HTTP " + res.status);
    }
    return res.json();
  },
};

// ------------------------------------------------------------
// IDENTITY - kim jestem w aplikacji
// ------------------------------------------------------------
function getMyUserId() {
  let id = localStorage.getItem("mp_userId");
  if (!id) {
    id = "user-" + Math.random().toString(36).substring(2, 10);
    localStorage.setItem("mp_userId", id);
  }
  return id;
}

function getMyName() {
  return localStorage.getItem("mp_userName") || "";
}

function setMyName(name) {
  localStorage.setItem("mp_userName", name);
}

// ------------------------------------------------------------
// TOAST
// ------------------------------------------------------------
function showToast(message, type) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = "toast visible" + (type ? " " + type : "");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(function() {
    toast.className = "toast";
  }, 3500);
}

// ------------------------------------------------------------
// SERVICE WORKER
// ------------------------------------------------------------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function() {
    navigator.serviceWorker.register("sw.js")
      .then(function(reg) { console.log("[app] Service Worker:", reg.scope); })
      .catch(function(err) { console.warn("[app] SW blad:", err); });
  });
}

// ------------------------------------------------------------
// PWA INSTALL
// ------------------------------------------------------------
let deferredInstallPrompt = null;

window.addEventListener("beforeinstallprompt", function(e) {
  e.preventDefault();
  deferredInstallPrompt = e;
  console.log("[app] PWA gotowa do instalacji");
  const prompt = document.getElementById("install-prompt");
  if (prompt) prompt.classList.add("visible");
});

window.addEventListener("appinstalled", function() {
  console.log("[app] Zainstalowana!");
  showToast("Dzieki! Aplikacja dodana do ekranu glownego.", "success");
  deferredInstallPrompt = null;
});

// ------------------------------------------------------------
// USTAW IMIE PRZY STARCIE
// ------------------------------------------------------------
function askForName() {
  return new Promise(function(resolve) {
    const modal = document.getElementById("name-modal");
    const input = document.getElementById("name-input");
    const btn = document.getElementById("name-save");

    if (!modal || !input || !btn) {
      resolve("Gosc");
      return;
    }

    const existing = getMyName();
    if (existing) {
      resolve(existing);
      return;
    }

    modal.classList.add("visible");
    input.focus();

    btn.onclick = function() {
      const name = input.value.trim();
      if (name.length < 2) {
        input.style.borderColor = "#e94560";
        return;
      }
      setMyName(name);
      modal.classList.remove("visible");
      resolve(name);
    };
  });
}

// ------------------------------------------------------------
// START APLIKACJI
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async function() {
  console.log("[app] DOM zaladowany");

  // Obsluga instalacji
  const installBtn = document.getElementById("install-btn");
  if (installBtn) {
    installBtn.addEventListener("click", async function() {
      if (!deferredInstallPrompt) {
        showToast("Aplikacja juz zainstalowana lub Twoja przegladarka nie wspiera instalacji.", "info");
        return;
      }
      deferredInstallPrompt.prompt();
      const result = await deferredInstallPrompt.userChoice;
      if (result.outcome === "accepted") {
        showToast("Dodano do ekranu glownego!", "success");
      }
      deferredInstallPrompt = null;
      const prompt = document.getElementById("install-prompt");
      if (prompt) prompt.classList.remove("visible");
    });
  }

  // Sprawdz czy zainstalowana
  if (window.matchMedia("(display-mode: standalone)").matches) {
    const prompt = document.getElementById("install-prompt");
    if (prompt) prompt.classList.remove("visible");
  }

  // Zapytaj o imie
  await askForName();
  console.log("[app] Uzytkownik: " + getMyName() + " (" + getMyUserId() + ")");

  // Test polaczenia z API
  try {
    const health = await API.get("/api/health");
    console.log("[app] API health:", health);
  } catch (err) {
    console.warn("[app] API niedostepne:", err.message);
    showToast("Backend wydarzen nie odpowiada. Uruchom serwer.", "error");
  }

  // Pokaz katalog wydarzen
  if (typeof showEventsList === "function") {
    showEventsList();
  }
});

// Funkcja globalna do wywolania instalacji z innych plikow
window.triggerInstall = async function() {
  if (!deferredInstallPrompt) {
    showToast("Nie mozna zainstalowac automatycznie. Uzyj menu przegladarki: 'Dodaj do ekranu glownego'.", "info");
    return;
  }
  deferredInstallPrompt.prompt();
  const result = await deferredInstallPrompt.userChoice;
  if (result.outcome === "accepted") {
    showToast("Dodano do ekranu glownego!", "success");
  }
  deferredInstallPrompt = null;
};

console.log("[app] Gotowe");


