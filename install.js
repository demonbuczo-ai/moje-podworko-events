// Instalacja PWA - nakladka nad aplikacja
(function() {
  console.log("[install] Ladowanie modułu instalacji");

  let deferredInstall = null;

  window.addEventListener("beforeinstallprompt", function(e) {
    e.preventDefault();
    deferredInstall = e;
    console.log("[install] PWA gotowa do instalacji");
    showInstallBanner();
  });

  function showInstallBanner() {
    if (document.getElementById("install-banner")) return;
    if (localStorage.getItem("mp_install_dismissed") === "1") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const banner = document.createElement("div");
    banner.id = "install-banner";
    banner.style.cssText = [
      "position: fixed",
      "top: 0",
      "left: 0",
      "right: 0",
      "background: linear-gradient(135deg, #0f3460, #e94560)",
      "color: #fff",
      "padding: 12px 16px",
      "z-index: 9999",
      "box-shadow: 0 2px 10px rgba(0,0,0,0.5)",
      "display: flex",
      "align-items: center",
      "gap: 10px",
      "font-size: 13px"
    ].join(";");

    banner.innerHTML =
      "<div style=\"flex:1;\"><b>📱 Dodaj do ekranu glownego</b><br>" +
      "<span style=\"font-size:11px; opacity:0.9;\">Szybki dostep do Twoich wydarzen.</span></div>" +
      "<button id=\"install-yes\" style=\"background:#fff; color:#e94560; border:none; padding:8px 14px; border-radius:6px; font-size:12px; font-weight:bold; cursor:pointer;\">Dodaj</button>" +
      "<button id=\"install-no\" style=\"background:transparent; color:#fff; border:1px solid rgba(255,255,255,0.4); padding:8px 12px; border-radius:6px; font-size:12px; cursor:pointer;\">Nie</button>";

    document.body.appendChild(banner);

    document.getElementById("install-yes").addEventListener("click", async function() {
      if (!deferredInstall) {
        showToast("Uzyj menu przegladarki: 'Dodaj do ekranu glownego'", "info");
        return;
      }
      deferredInstall.prompt();
      const result = await deferredInstall.userChoice;
      if (result.outcome === "accepted") {
        showToast("Dodano do ekranu glownego!", "success");
        banner.remove();
      }
      deferredInstall = null;
    });

    document.getElementById("install-no").addEventListener("click", function() {
      localStorage.setItem("mp_install_dismissed", "1");
      banner.remove();
    });
  }

  // Jesli juz mamy deferred z main app.js
  window.triggerInstall = function() {
    if (deferredInstall) {
      deferredInstall.prompt();
    } else {
      showToast("Uzyj menu przegladarki: 'Dodaj do ekranu glownego'", "info");
    }
  };

  console.log("[install] Gotowe");
})();
