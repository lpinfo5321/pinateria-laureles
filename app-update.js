(function () {
  if (!("serviceWorker" in navigator)) return;
  if (window.__VP_UPDATE_PROMPT_INSTALLED) return;
  window.__VP_UPDATE_PROMPT_INSTALLED = true;

  let pendingRegistration = null;
  let waitingForReload = false;
  let hadController = !!navigator.serviceWorker.controller;

  function ensureStyles() {
    if (document.getElementById("vpUpdateStyles")) return;
    const style = document.createElement("style");
    style.id = "vpUpdateStyles";
    style.textContent = `
      .vp-update-modal{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:22px;background:rgba(17,24,39,.62);backdrop-filter:blur(5px)}
      .vp-update-card{width:min(420px,100%);background:#fff;border-radius:24px;padding:24px 22px;text-align:center;box-shadow:0 24px 80px rgba(0,0,0,.28);font-family:Inter,'Plus Jakarta Sans',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#171717}
      .vp-update-icon{width:58px;height:58px;border-radius:20px;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#ec4899,#a855f7);color:#fff;font-size:28px;box-shadow:0 10px 28px rgba(236,72,153,.34)}
      .vp-update-title{font-size:22px;font-weight:900;margin:0 0 8px}
      .vp-update-text{font-size:14px;line-height:1.45;color:#6b7280;margin:0 0 18px}
      .vp-update-btn{width:100%;border:0;border-radius:16px;padding:14px 18px;background:linear-gradient(135deg,#ec4899,#a855f7);color:#fff;font-size:15px;font-weight:900;cursor:pointer;box-shadow:0 10px 24px rgba(236,72,153,.28)}
      .vp-update-btn:active{transform:scale(.98)}
    `;
    document.head.appendChild(style);
  }

  function showUpdatePrompt() {
    if (document.getElementById("vpUpdateModal")) return;
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", showUpdatePrompt, { once: true });
      return;
    }
    ensureStyles();
    const modal = document.createElement("div");
    modal.id = "vpUpdateModal";
    modal.className = "vp-update-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML = `
      <div class="vp-update-card">
        <div class="vp-update-icon">↻</div>
        <h2 class="vp-update-title">Nueva actualización lista</h2>
        <p class="vp-update-text">Se publicó una versión nueva de Viva Piñata. Actualiza ahora para ver los últimos cambios.</p>
        <button type="button" class="vp-update-btn" id="vpUpdateNow">Actualizar ahora</button>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById("vpUpdateNow").addEventListener("click", () => {
      waitingForReload = true;
      const waiting = pendingRegistration && pendingRegistration.waiting;
      if (waiting) {
        waiting.postMessage({ type: "skip-waiting" });
      } else {
        window.location.reload();
      }
    });
  }

  function watchRegistration(reg) {
    pendingRegistration = reg;
    if (reg.waiting && navigator.serviceWorker.controller) {
      showUpdatePrompt();
    }
    reg.addEventListener("updatefound", () => {
      const sw = reg.installing;
      if (!sw) return;
      sw.addEventListener("statechange", () => {
        if (sw.state === "installed" && navigator.serviceWorker.controller) {
          pendingRegistration = reg;
          showUpdatePrompt();
        }
      });
    });
    setInterval(() => reg.update().catch(() => {}), 60 * 1000);
  }

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController) {
      hadController = true;
      return;
    }
    if (waitingForReload) {
      window.location.reload();
      return;
    }
    showUpdatePrompt();
  });

  navigator.serviceWorker.register("/service-worker.js", { scope: "/" })
    .then(watchRegistration)
    .catch(() => {});
})();
