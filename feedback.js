// ============================================================
// feedback.js - przycisk sugestii + modal do pisania
// ============================================================
console.log("[feedback] Ladowanie feedback.js");

(function() {
  function init() {
    const main = document.getElementById("main");
    if (!main) {
      console.warn("[feedback] Brak elementu main - przycisk nie zostanie dodany");
      return;
    }

    if (document.getElementById("btn-feedback")) return;

    const btn = document.createElement("button");
    btn.id = "btn-feedback";
    btn.className = "btn btn-secondary";
    btn.style.cssText = "margin-top: 20px; background: #0f3460; font-size: 13px;";
    btn.textContent = "💬 Wyslij sugestie lub uwage";
    btn.addEventListener("click", openFeedbackModal);
    main.appendChild(btn);

    console.log("[feedback] Przycisk dodany");
  }

  function openFeedbackModal() {
    if (document.getElementById("feedback-modal")) return;

    const modal = document.createElement("div");
    modal.id = "feedback-modal";
    modal.className = "modal-overlay visible";
    modal.innerHTML =
      "<div class=\"modal\">" +
      "<h2>💬 Wyslij sugestie</h2>" +
      "<p>Co mozna poprawic? Co dodac? Pisz smialo - czytamy wszystko!</p>" +
      "<label style=\"display:block; text-align:left; font-size:13px; color:#aaa; margin-bottom:6px;\">Typ</label>" +
      "<select id=\"fb-type\" style=\"width:100%; padding:10px; margin-bottom:12px; background:#1a1a2e; color:#eee; border:2px solid #0f3460; border-radius:8px; font-size:14px;\">" +
      "<option value=\"suggestion\">💡 Sugestia / pomysl</option>" +
      "<option value=\"bug\">🐛 Blad / cos nie dziala</option>" +
      "<option value=\"praise\">❤️ Chwale / podoba mi sie</option>" +
      "<option value=\"other\">📝 Inne</option>" +
      "</select>" +
      "<label style=\"display:block; text-align:left; font-size:13px; color:#aaa; margin-bottom:6px;\">Twoja wiadomosc</label>" +
      "<textarea id=\"fb-text\" rows=\"5\" placeholder=\"Napisz co myslisz...\" maxlength=\"2000\" style=\"width:100%; padding:10px; background:#1a1a2e; color:#eee; border:2px solid #0f3460; border-radius:8px; font-size:14px; font-family:inherit; resize:vertical;\"></textarea>" +
      "<button class=\"btn btn-primary\" id=\"fb-send\" style=\"margin-top:12px;\">Wyslij</button>" +
      "<button class=\"btn btn-secondary\" id=\"fb-cancel\" style=\"margin-top:8px;\">Anuluj</button>" +
      "</div>";

    document.body.appendChild(modal);

    document.getElementById("fb-cancel").addEventListener("click", () => modal.remove());

    document.getElementById("fb-send").addEventListener("click", async function() {
      const type = document.getElementById("fb-type").value;
      const text = document.getElementById("fb-text").value.trim();

      if (text.length < 3) {
        showToast("Napisz cos wiecej (min. 3 znaki).", "error");
        return;
      }

      const sendBtn = this;
      sendBtn.disabled = true;
      sendBtn.textContent = "Wysylanie...";

      try {
        await API.post("/api/feedback", {
          userId: getMyUserId(),
          userName: getMyName() || "Anonim",
          type,
          text,
        });
        showToast("Dziekujemy! Twoja wiadomosc zostala wyslana.", "success");
        modal.remove();
      } catch (err) {
        showToast("Blad: " + err.message, "error");
        sendBtn.disabled = false;
        sendBtn.textContent = "Wyslij";
      }
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

