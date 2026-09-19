// events.js v2 - z zaproszeniami
console.log("[events] v2");

function showView(viewId) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  const view = document.getElementById(viewId);
  if (view) view.classList.add("active");
  window.scrollTo(0, 0);
}

document.addEventListener("click", function(e) {
  if (e.target.matches("[data-back]")) {
    const url = new URL(window.location.href);
    url.searchParams.delete("event");
    window.history.replaceState({}, "", url.toString());
    showView("view-list");
    showEventsList();
  }
});

async function showEventsList() {
  const container = document.getElementById("events-container");
  if (!container) return;
  const userId = getMyUserId();
  container.innerHTML = "<div class=\"empty-state\">Ladowanie...</div>";
  try {
    const events = await API.get("/api/event/my/" + encodeURIComponent(userId));
    if (!events || events.length === 0) {
      container.innerHTML = "<div class=\"empty-state\">Nie masz jeszcze wydarzen.<br><br>Kliknij <b>+ Nowe wydarzenie</b>!</div>";
      return;
    }
    container.innerHTML = "";
    events.forEach(ev => {
      const card = document.createElement("div");
      card.className = "event-card";
      const statusLabel = ev.status === "collecting" ? "Zbiera odpowiedzi" : ev.status === "finalized" ? "Termin ustalony" : "Odwolane";
      let extra = "";
      if (ev.finalSlot) extra = "<div class=\"meta\">Termin: " + formatSlot(ev.finalSlot) + "</div>";
      else if (ev.deadline) extra = "<div class=\"meta\">Odpowiedzi do: " + formatDate(ev.deadline) + "</div>";
      card.innerHTML = "<div class=\"title\">" + escapeHtml(ev.title) + "</div>" +
        "<div class=\"meta\">Organizator: " + escapeHtml(ev.ownerName) + "</div>" + extra +
        "<div class=\"badge badge-" + ev.status + "\">" + statusLabel + "</div>";
      card.addEventListener("click", () => showEventDetails(ev.eventId));
      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = "<div class=\"empty-state\">Blad: " + escapeHtml(err.message) + "</div>";
  }
}

document.addEventListener("DOMContentLoaded", function() {
  const newBtn = document.getElementById("btn-new-event");
  if (newBtn) {
    newBtn.addEventListener("click", function() {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 3);
      const dateFrom = document.getElementById("evt-date-from");
      const dateTo = document.getElementById("evt-date-to");
      if (dateFrom && !dateFrom.value) dateFrom.value = formatDateInput(today);
      if (dateTo && !dateTo.value) dateTo.value = formatDateInput(tomorrow);
      document.getElementById("evt-title").value = "";
      document.getElementById("evt-desc").value = "";
      showView("view-create");
    });
  }
  const saveBtn = document.getElementById("btn-save-event");
  if (saveBtn) saveBtn.addEventListener("click", createEvent);

  const urlParams = new URLSearchParams(window.location.search);
  const sharedEventId = urlParams.get("event");
  if (sharedEventId) {
    console.log("[events] Link do wydarzenia: " + sharedEventId);
    setTimeout(() => showJoinView(sharedEventId), 800);
  }
});

async function createEvent() {
  const title = document.getElementById("evt-title").value.trim();
  const description = document.getElementById("evt-desc").value.trim();
  const type = document.getElementById("evt-type").value;
  const dateFrom = document.getElementById("evt-date-from").value;
  const dateTo = document.getElementById("evt-date-to").value;
  const hourFrom = document.getElementById("evt-hour-from").value;
  const hourTo = document.getElementById("evt-hour-to").value;
  const deadlineHours = parseInt(document.getElementById("evt-deadline").value, 10);
  if (!title) { showToast("Wpisz tytul.", "error"); return; }
  if (!dateFrom || !dateTo) { showToast("Wybierz daty.", "error"); return; }
  const btn = document.getElementById("btn-save-event");
  btn.disabled = true; btn.textContent = "Tworzenie...";
  try {
    const result = await API.post("/api/event/create", {
      title, description, ownerId: getMyUserId(), ownerName: getMyName() || "Gosc",
      type, dateFrom, dateTo, hourFrom, hourTo, deadlineHours,
    });
    showToast("Wydarzenie utworzone!", "success");
    setTimeout(() => showEventDetails(result.eventId), 500);
  } catch (err) {
    showToast("Blad: " + err.message, "error");
  } finally {
    btn.disabled = false; btn.textContent = "Utworz wydarzenie";
  }
}

async function showJoinView(eventId) {
  showView("view-details");
  const container = document.getElementById("details-content");
  const titleEl = document.getElementById("details-title");
  container.innerHTML = "<div class=\"empty-state\">Ladowanie...</div>";
  try {
    const data = await API.get("/api/event/" + encodeURIComponent(eventId));
    const ev = data.event;
    titleEl.textContent = "Zaproszenie";
    const alreadyJoined = data.participants.some(p => p.userId === getMyUserId());
    let html = "<div class=\"card\" style=\"text-align: center;\">" +
      "<p style=\"font-size: 14px; color: #888; margin-bottom: 8px;\">Zaproszenie do wydarzenia</p>" +
      "<h2 style=\"font-size: 22px; color: #e94560; margin-bottom: 16px;\">" + escapeHtml(ev.title) + "</h2>" +
      (ev.description ? "<p style=\"margin-bottom: 12px;\">" + escapeHtml(ev.description) + "</p>" : "") +
      "<p style=\"font-size: 13px; color: #aaa;\">Organizator: <b>" + escapeHtml(ev.ownerName) + "</b></p>" +
      "<p style=\"font-size: 13px; color: #aaa; margin-bottom: 20px;\">Uczestnicy: <b>" + data.participants.length + "</b></p>";
    if (alreadyJoined) {
      html += "<p style=\"color: #4caf50; margin-bottom: 16px;\">Juz jestes uczestnikiem.</p>" +
        "<button class=\"btn btn-primary\" id=\"btn-open-event\" style=\"margin-bottom: 10px;\">Otworz wydarzenie</button>" +
        "<button class=\"btn btn-secondary\" id=\"btn-my-events\">Moje wydarzenia i utworz nowe</button>";
    } else {
      html += "<button class=\"btn btn-success\" id=\"btn-join\" style=\"margin-bottom: 10px;\">Dolacz do wydarzenia</button>" +
        "<button class=\"btn btn-secondary\" id=\"btn-cancel-join\">Nie, dzieki</button>";
    }
    html += "</div>";
    container.innerHTML = html;
    if (alreadyJoined) {
      document.getElementById("btn-open-event").addEventListener("click", () => showEventDetails(eventId));
      document.getElementById("btn-my-events").addEventListener("click", () => {
        const url = new URL(window.location.href);
        url.searchParams.delete("event");
        window.history.replaceState({}, "", url.toString());
        showView("view-list");
        showEventsList();
      });
    } else {
      document.getElementById("btn-join").addEventListener("click", () => joinThisEvent(eventId));
      document.getElementById("btn-cancel-join").addEventListener("click", () => {
        const url = new URL(window.location.href);
        url.searchParams.delete("event");
        window.history.replaceState({}, "", url.toString());
        showView("view-list");
        showEventsList();
      });
    }
  } catch (err) {
    container.innerHTML = "<div class=\"empty-state\">Wydarzenie nie znalezione.</div>";
  }
}

async function joinThisEvent(eventId) {
  try {
    await API.post("/api/event/" + encodeURIComponent(eventId) + "/join", {
      userId: getMyUserId(), userName: getMyName() || "Gosc",
    });
    showToast("Dolaczyles!", "success");
    setTimeout(() => showEventDetails(eventId), 500);
  } catch (err) {
    showToast("Blad: " + err.message, "error");
  }
}

async function showEventDetails(eventId) {
  showView("view-details");
  const container = document.getElementById("details-content");
  const titleEl = document.getElementById("details-title");
  container.innerHTML = "<div class=\"empty-state\">Ladowanie...</div>";
  try {
    const data = await API.get("/api/event/" + encodeURIComponent(eventId));
    const ev = data.event;
    titleEl.textContent = ev.title;
    const isOwner = ev.ownerId === getMyUserId();
    let html = "";
    // Sekcja instalacji PWA - pokazuj tylko raz
    if (!localStorage.getItem("mp_install_dismissed") && !window.matchMedia("(display-mode: standalone)").matches) {
      html += "<div class=\"card\" style=\"background: linear-gradient(135deg, #0f3460, #16213e); border-color: #e94560;\">" +
        "<h2>📱 Dodaj do ekranu glownego</h2>" +
        "<p>Miej wszystkie wydarzenia pod reka. Otwieraj jednym kliknieciem, bez wpisywania adresu.</p>" +
        "<button class=\"btn btn-primary\" id=\"btn-install-inline\" style=\"margin-top: 10px;\">Dodaj do ekranu glownego</button>" +
        "<button class=\"btn btn-secondary\" id=\"btn-install-dismiss\" style=\"margin-top: 6px; font-size: 12px; padding: 8px;\">Nie teraz</button>" +
        "</div>";
    }
    html += "<div class=\"card\">" +
      "<h2>" + escapeHtml(ev.title) + "</h2>" +
      (ev.description ? "<p>" + escapeHtml(ev.description) + "</p>" : "") +
      "<p style=\"margin-top: 10px;\">Organizator: <b>" + escapeHtml(ev.ownerName) + "</b></p>" +
      "<p>Status: <b>" + ev.status + "</b></p>";
    if (ev.finalSlot) html += "<p style=\"color:#4caf50; font-weight:bold;\">Termin: " + formatSlot(ev.finalSlot) + "</p>";
    else if (ev.deadline) html += "<p>Odpowiedzi do: " + formatDate(ev.deadline) + "</p>";
    html += "<button class=\"btn btn-secondary\" id=\"btn-invite\" style=\"margin-top: 14px;\">Zapros znajomych</button>";
    html += "</div>";
    html += "<div class=\"card\"><h2>Uczestnicy (" + data.participants.length + ")</h2>";
    data.participants.forEach(p => {
      html += "<p>" + (p.isOwner ? "👑 " : "") + escapeHtml(p.userName) + "</p>";
    });
    html += "</div>";
    const slots = generateSlots(ev.dateFrom, ev.dateTo, ev.hourFrom, ev.hourTo);
    const mySlots = data.availabilities.filter(a => a.userId === getMyUserId()).map(a => a.slot);
    html += "<div class=\"card\"><h2>Kiedy mozesz?</h2>" +
      "<p style=\"font-size:12px; color:#888; margin-bottom:10px;\">Zaznacz wszystkie terminy.</p>" +
      "<div id=\"slots-container\">";
    slots.forEach(slot => {
      const checked = mySlots.includes(slot) ? " checked" : "";
      const count = data.availabilities.filter(a => a.slot === slot).length;
      const countLabel = count > 0 ? " <span style=\"color:#4caf50;\">(" + count + ")</span>" : "";
      html += "<label style=\"display:flex; align-items:center; gap:8px; padding:8px; background:#1a1a2e; border-radius:6px; margin-bottom:6px; cursor:pointer;\">" +
        "<input type=\"checkbox\" data-slot=\"" + slot + "\"" + checked + " style=\"width:20px; height:20px; margin:0;\">" +
        "<span style=\"font-size:13px;\">" + formatSlot(slot) + countLabel + "</span></label>";
    });
    html += "</div><button class=\"btn btn-success\" id=\"btn-save-availability\" style=\"margin-top:12px;\">Zapisz dostepnosc</button></div>";
    if (data.bestSlots && data.bestSlots.length > 0) {
      html += "<div class=\"card\"><h2>Najlepsze terminy</h2>";
      data.bestSlots.slice(0, 5).forEach(s => {
        html += "<p><b style=\"color:#4caf50;\">" + formatSlot(s.slot) + "</b> - " + s.count + " osob: " + escapeHtml(s.users.join(", ")) + "</p>";
      });
      html += "</div>";
    }
    const messages = await API.get("/api/event/" + encodeURIComponent(eventId) + "/messages");
    html += "<div class=\"card\"><h2>Czat (" + messages.length + ")</h2>" +
      "<div id=\"chat-messages\" style=\"max-height:300px; overflow-y:auto; margin-bottom:12px;\">";
    if (messages.length === 0) html += "<p style=\"color:#666; font-size:12px;\">Brak wiadomosci.</p>";
    else messages.forEach(m => {
      const isMe = m.userId === getMyUserId();
      html += "<div style=\"padding:8px; margin-bottom:6px; background:" + (isMe ? "#0f3460" : "#1a1a2e") + "; border-radius:6px;\">" +
        "<div style=\"font-size:11px; color:#888;\">" + escapeHtml(m.userName) + "</div>" +
        "<div style=\"font-size:14px; margin-top:2px;\">" + escapeHtml(m.text) + "</div></div>";
    });
    html += "</div><div style=\"display:flex; gap:8px;\">" +
      "<input type=\"text\" id=\"chat-input\" placeholder=\"Napisz...\" maxlength=\"500\">" +
      "<button class=\"btn btn-primary\" id=\"btn-send-message\" style=\"width:auto; padding:12px 18px;\">Wyslij</button></div></div>";
    if (isOwner && ev.status === "collecting") {
      html += "<div class=\"card\"><h2>Akcje organizatora</h2>" +
        "<button class=\"btn btn-success\" id=\"btn-finalize\">Zamknij i wybierz termin</button></div>";
    }
    container.innerHTML = html;
    const installInlineBtn = document.getElementById("btn-install-inline");
    if (installInlineBtn) {
      installInlineBtn.addEventListener("click", () => {
        if (typeof triggerInstall === "function") triggerInstall();
      });
    }
    const installDismissBtn = document.getElementById("btn-install-dismiss");
    if (installDismissBtn) {
      installDismissBtn.addEventListener("click", () => {
        localStorage.setItem("mp_install_dismissed", "1");
        showEventDetails(eventId);
      });
    }

    const inviteBtn = document.getElementById("btn-invite");
    if (inviteBtn) inviteBtn.addEventListener("click", () => inviteFriends(eventId, ev.title));
    const saveAvailBtn = document.getElementById("btn-save-availability");
    if (saveAvailBtn) saveAvailBtn.addEventListener("click", () => saveMyAvailability(eventId));
    const sendBtn = document.getElementById("btn-send-message");
    if (sendBtn) sendBtn.addEventListener("click", () => sendMessage(eventId));
    const chatInput = document.getElementById("chat-input");
    if (chatInput) chatInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(eventId); });
    const finalizeBtn = document.getElementById("btn-finalize");
    if (finalizeBtn) finalizeBtn.addEventListener("click", () => finalizeMyEvent(eventId));
    const chatBox = document.getElementById("chat-messages");
    if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
  } catch (err) {
    container.innerHTML = "<div class=\"empty-state\">Blad: " + escapeHtml(err.message) + "</div>";
  }
}

function inviteFriends(eventId, eventTitle) {
  const baseUrl = window.location.origin + window.location.pathname;
  const inviteUrl = baseUrl + "?event=" + eventId;
  const shareText = "Zapraszam Cie na wydarzenie \"" + eventTitle + "\"!";

  const modal = document.createElement("div");
  modal.className = "modal-overlay visible";
  modal.style.alignItems = "flex-start";
  modal.style.paddingTop = "60px";
  modal.innerHTML =
    "<div class=\"modal\" style=\"max-height: 80vh; overflow-y: auto;\">" +
    "<h2>Zapros znajomych</h2>" +
    "<p>Skopiuj link lub wyslij przez jedna z opcji ponizej.</p>" +

    "<input type=\"text\" id=\"invite-link-input\" value=\"" + inviteUrl + "\" readonly style=\"font-size:12px;\" onclick=\"this.select()\">" +

    "<button class=\"btn btn-primary\" id=\"btn-copy-link\" style=\"margin-top: 12px;\">📋 Kopiuj link</button>" +

    "<div style=\"margin-top: 20px; margin-bottom: 12px; font-size: 12px; color: #888; text-align: center;\">— lub udostepnij przez —</div>" +

    "<div style=\"display: grid; grid-template-columns: 1fr 1fr; gap: 8px;\">" +
      "<button class=\"btn\" id=\"btn-share-whatsapp\" style=\"background: #25D366; color: #fff;\">💬 WhatsApp</button>" +
      "<button class=\"btn\" id=\"btn-share-messenger\" style=\"background: #0084FF; color: #fff;\">💌 Messenger</button>" +
      "<button class=\"btn\" id=\"btn-share-sms\" style=\"background: #34C759; color: #fff;\">📱 SMS</button>" +
      "<button class=\"btn\" id=\"btn-share-email\" style=\"background: #666; color: #fff;\">✉️ Email</button>" +
    "</div>" +

    "<button class=\"btn btn-secondary\" id=\"btn-share-native\" style=\"margin-top: 12px; display: none;\">📤 Udostepnij przez system</button>" +

    "<button class=\"btn btn-secondary\" id=\"btn-close-invite\" style=\"margin-top: 8px;\">Zamknij</button>" +
    "</div>";

  document.body.appendChild(modal);

  // Kopiuj link
  document.getElementById("btn-copy-link").addEventListener("click", async function() {
    const input = document.getElementById("invite-link-input");
    try {
      await navigator.clipboard.writeText(input.value);
      showToast("Link skopiowany do schowka!", "success");
    } catch (err) {
      input.select();
      document.execCommand("copy");
      showToast("Link skopiowany!", "success");
    }
  });

  // WhatsApp
  document.getElementById("btn-share-whatsapp").addEventListener("click", function() {
    const url = "https://wa.me/?text=" + encodeURIComponent(shareText + "\n\n" + inviteUrl);
    window.open(url, "_blank");
  });

  // Messenger (przez FB sharer z linkiem do Messengera)
  document.getElementById("btn-share-messenger").addEventListener("click", function() {
    const url = "https://www.facebook.com/dialog/send?link=" + encodeURIComponent(inviteUrl) +
      "&app_id=291494419107518&redirect_uri=" + encodeURIComponent(inviteUrl);
    window.open(url, "_blank");
  });

  // SMS
  document.getElementById("btn-share-sms").addEventListener("click", function() {
    const url = "sms:?body=" + encodeURIComponent(shareText + " " + inviteUrl);
    window.open(url, "_blank");
  });

  // Email
  document.getElementById("btn-share-email").addEventListener("click", function() {
    const url = "mailto:?subject=" + encodeURIComponent(shareText) +
      "&body=" + encodeURIComponent("Kliknij link aby dolaczyc:\n\n" + inviteUrl);
    window.open(url, "_blank");
  });

  // Natywny share systemowy (jesli dostepny)
  if (navigator.share) {
    const shareBtn = document.getElementById("btn-share-native");
    shareBtn.style.display = "block";
    shareBtn.addEventListener("click", async function() {
      try {
        await navigator.share({
          title: eventTitle,
          text: shareText,
          url: inviteUrl,
        });
      } catch (err) {
        console.log("Share anulowany lub blad:", err.message);
      }
    });
  }

  // Zamknij
  document.getElementById("btn-close-invite").addEventListener("click", function() {
    modal.remove();
  });

  // Klik obok modala = zamknij
  modal.addEventListener("click", function(e) {
    if (e.target === modal) modal.remove();
  });
}

async function saveMyAvailability(eventId) {
  const checkboxes = document.querySelectorAll("[data-slot]:checked");
  const slots = Array.from(checkboxes).map(cb => cb.getAttribute("data-slot"));
  if (slots.length === 0) { showToast("Zaznacz przynajmniej jeden termin.", "error"); return; }
  try {
    await API.post("/api/event/" + encodeURIComponent(eventId) + "/availability", {
      userId: getMyUserId(), userName: getMyName() || "Gosc", slots,
    });
    showToast("Zapisano!", "success");
    setTimeout(() => showEventDetails(eventId), 500);
  } catch (err) { showToast("Blad: " + err.message, "error"); }
}

async function sendMessage(eventId) {
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) return;
  try {
    await API.post("/api/event/" + encodeURIComponent(eventId) + "/message", {
      userId: getMyUserId(), userName: getMyName() || "Gosc", text,
    });
    input.value = "";
    setTimeout(() => showEventDetails(eventId), 300);
  } catch (err) { showToast("Blad: " + err.message, "error"); }
}

async function finalizeMyEvent(eventId) {
  if (!confirm("Zamknac wydarzenie?")) return;
  try {
    await API.post("/api/event/" + encodeURIComponent(eventId) + "/finalize", {});
    showToast("Zamkniete!", "success");
    setTimeout(() => showEventDetails(eventId), 500);
  } catch (err) { showToast("Blad: " + err.message, "error"); }
}

function formatSlot(slot) {
  if (!slot) return "";
  const parts = slot.split("_");
  if (parts.length !== 2) return slot;
  const [date, time] = parts;
  const [y, m, d] = date.split("-");
  const days = ["Nd", "Pn", "Wt", "Sr", "Cz", "Pt", "So"];
  const dateObj = new Date(y, parseInt(m, 10) - 1, d);
  return days[dateObj.getDay()] + " " + d + "." + m + " " + time;
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function formatDateInput(date) {
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function generateSlots(dateFrom, dateTo, hourFrom, hourTo) {
  const slots = [];
  if (!dateFrom || !dateTo) return slots;
  const start = new Date(dateFrom);
  const end = new Date(dateTo);
  const fromH = parseInt(hourFrom.split(":")[0], 10);
  const toH = parseInt(hourTo.split(":")[0], 10);
  const current = new Date(start);
  while (current <= end) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    const d = String(current.getDate()).padStart(2, "0");
    const dateStr = y + "-" + m + "-" + d;
    for (let h = fromH; h <= toH; h++) {
      slots.push(dateStr + "_" + String(h).padStart(2, "0") + ":00");
    }
    current.setDate(current.getDate() + 1);
  }
  return slots;
}

window.showEventsList = showEventsList;
window.showEventDetails = showEventDetails;
window.showJoinView = showJoinView;
console.log("[events] v2 gotowe");


