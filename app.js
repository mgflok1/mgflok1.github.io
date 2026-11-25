const VAPID_PUBLIC_KEY = "BDh_3Td2pbFwwcVfkFv0zbhwxXkiJNndgqMf3o1TOa-kHIBCBXRKj-TlE9sJaiv1P7_ij9QJoX5TRwEkzLhG2HI";
const APP_SCHEME = "mymessenger";

const installHintEl = document.getElementById("install-hint");
const pwaControlsEl = document.getElementById("pwa-controls");
const enableBtn = document.getElementById("enable-btn");
const openAppBtn = document.getElementById("open-app-btn");
const statusEl = document.getElementById("status");

function setStatus(text, type = "") {
  statusEl.textContent = text;
  statusEl.className = "status" + (type ? " " + type : "");
}

function isStandalone() {
  return (
    window.navigator.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function buildDeepLink(subscription) {
  const json = subscription.toJSON();
  const params = new URLSearchParams({
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
  });
  return `${APP_SCHEME}://webpush?${params.toString()}`;
}

async function subscribeAndLink() {
  if (!VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY.includes("PASTE_YOUR")) {
    setStatus("Ошибка: отсутстует VAPID_PUBLIC_KEY в app.js", "err");
    return;
  }

  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    setStatus("Web Push не поддерживается", "err");
    return;
  }

  enableBtn.disabled = true;
  setStatus("Запрашиваем разрешение…");

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setStatus("Разрешение отклонено", "err");
      enableBtn.disabled = false;
      return;
    }

    setStatus("Регистрируем сервис уведомлений…");
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    const registration = await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const deepLink = buildDeepLink(subscription);
    openAppBtn.href = deepLink;
    openAppBtn.classList.remove("hidden");

    setStatus("Готово! Переходим в мессенджер для сохранения подписки…", "ok");
    window.location.href = deepLink;
  } catch (err) {
    console.error(err);
    setStatus("Ошибка: " + (err.message || err), "err");
  } finally {
    enableBtn.disabled = false;
  }
}

if (isStandalone()) {
  pwaControlsEl.classList.remove("hidden");
  enableBtn.addEventListener("click", subscribeAndLink);
} else {
  installHintEl.classList.remove("hidden");
}
