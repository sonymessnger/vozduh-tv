// Обновление статуса эфира (проверка каждые 30 секунд)
async function checkLiveStatus() {
  const statusEl = document.getElementById('liveStatus');
  if (!statusEl) return;

  try {
    // Простая проверка — если не знаем точный API, просто показываем "в эфире"
    // Позже можно подключить Twitch API
    const now = new Date();
    const hours = now.getHours();
    const day = now.getDay(); // 0 = воскресенье, 6 = суббота

    let isLive = false;
    if (day >= 1 && day <= 5) { // Пн-Пт
      isLive = hours >= 14 && hours < 23;
    } else { // Сб-Вс
      isLive = hours >= 13 && hours < 24;
    }

    if (isLive) {
      statusEl.textContent = '● Сейчас в эфире';
      statusEl.style.color = '#ff4444';
    } else {
      statusEl.textContent = '○ Эфир скоро начнётся';
      statusEl.style.color = '#888';
    }
  } catch (e) {
    console.error(e);
  }
}

checkLiveStatus();
setInterval(checkLiveStatus, 60000); // каждую минуту