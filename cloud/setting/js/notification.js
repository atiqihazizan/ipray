/**
 * Notification Functions
 * Function untuk paparan notification/toast messages
 */

/**
 * Show notification dengan Tailwind styling
 * @param {string} message - Mesej untuk dipapar
 * @param {string} type - Jenis notification: 'success', 'error', 'info'
 */
export function showNotification(message, type = "info") {
  const notification = document.getElementById("notification");

  const iconMap = {
    success: "✅",
    error: "❌",
    info: "ℹ️",
  };

  const icon = iconMap[type] || "ℹ️";

  notification.innerHTML = `
        <div class="notification-${type}">
            <span class="text-2xl">${icon}</span>
            <span class="font-semibold">${message}</span>
        </div>
    `;

  notification.classList.remove("translate-x-[500px]");
  notification.classList.add("translate-x-0");

  setTimeout(() => {
    notification.classList.remove("translate-x-0");
    notification.classList.add("translate-x-[500px]");
  }, 4000);
}

// Export untuk browser environment
if (typeof window !== "undefined") {
  window.NotificationUtils = {
    showNotification,
  };
}
