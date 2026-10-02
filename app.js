const FEEDS = "babyFeedings";
const TARGET = "babyFeedTarget";

let timer = null;
let alarmPlayed = false;

function $(id) {
  return document.getElementById(id);
}

function getFeeds() {
  try {
    return JSON.parse(localStorage.getItem(FEEDS) || "[]");
  } catch (error) {
    console.error("Could not read feedings:", error);
    return [];
  }
}

function saveFeeds(feeds) {
  localStorage.setItem(FEEDS, JSON.stringify(feeds));
}

function fmt(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

function today(timestamp) {
  return new Date(timestamp).toDateString() === new Date().toDateString();
}

function renderHistory() {
  const history = $("history");

  if (!history) {
    console.error("Missing #history element");
    return;
  }

  const feeds = getFeeds()
    .filter(today)
    .sort((a, b) => b - a);

  if (feeds.length === 0) {
    history.innerHTML = `<p class="muted">No feedings recorded today.</p>`;
    return;
  }

  history.innerHTML = feeds
    .map(
      timestamp => `
        <div class="historyItem">
          <span>🍼 Feeding</span>
          <strong>${fmt(timestamp)}</strong>
        </div>
      `
    )
    .join("");
}

function renderCountdown() {
  const countdown = $("countdown");
  const countdownLabel = $("countdownLabel");
  const alarmStatus = $("alarmStatus");

  if (!countdown || !countdownLabel || !alarmStatus) {
    console.error("Countdown elements are missing");
    return;
  }

  const target = Number(localStorage.getItem(TARGET) || 0);

  if (!target) {
    countdown.textContent = "--:--:--";
    countdown.classList.remove("done");
    countdownLabel.textContent = "Set a reminder below";
    alarmStatus.textContent = "No reminder set";
    return;
  }

  const remaining = target - Date.now();

  if (remaining <= 0) {
    countdown.textContent = "00:00:00";
    countdown.classList.add("done");
    countdownLabel.textContent =
      "🔔 Time to check if baby needs a feed";

    alarmStatus.textContent =
      `Reminder reached at ${fmt(target)}`;

    clearTimeout(timer);

    if (!alarmPlayed) {
      alarmPlayed = true;
      playAlarm();
      sendNotification();
    }

    return;
  }

  const total = Math.floor(remaining / 1000);

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  countdown.textContent =
    `${String(hours).padStart(2, "0")}:` +
    `${String(minutes).padStart(2, "0")}:` +
    `${String(seconds).padStart(2, "0")}`;

  countdown.classList.remove("done");

  const time = new Date(target).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });

  countdownLabel.textContent = `Next reminder: ${time}`;
  alarmStatus.textContent = `Reminder set for ${time}`;

  clearTimeout(timer);
  timer = setTimeout(renderCountdown, 250);
}

function setCountdown() {
  const hoursElement = $("hours");
  const minutesElement = $("minutes");

  if (!hoursElement || !minutesElement) {
    alert("The reminder controls could not be found.");
    return;
  }

  const hours = Number(hoursElement.value);
  const minutes = Number(minutesElement.value);

  const totalMinutes = hours * 60 + minutes;

  if (totalMinutes <= 0) {
    alert("Choose a reminder greater than 0 minutes.");
    return;
  }

  alarmPlayed = false;

  const target = Date.now() + totalMinutes * 60 * 1000;

  localStorage.setItem(TARGET, String(target));

  renderCountdown();

  if (
    "Notification" in window &&
    Notification.permission === "default"
  ) {
    Notification.requestPermission();
  }
}

function cancelCountdown() {
  localStorage.removeItem(TARGET);

  clearTimeout(timer);
  timer = null;
  alarmPlayed = false;

  renderCountdown();
}

function playAlarm() {
  try {
    const AudioContext =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContext) return;

    const audio = new AudioContext();

    if (audio.state === "suspended") {
      audio.resume();
    }

    function beep(delay) {
      setTimeout(() => {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();

        oscillator.connect(gain);
        gain.connect(audio.destination);

        oscillator.frequency.value = 880;
        oscillator.type = "sine";

        gain.gain.setValueAtTime(0.3, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.01,
          audio.currentTime + 0.5
        );

        oscillator.start();
        oscillator.stop(audio.currentTime + 0.5);
      }, delay);
    }

    beep(0);
    beep(700);
    beep(1400);

  } catch (error) {
    console.error("Alarm sound failed:", error);
  }
}

function sendNotification() {
  if (
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    try {
      new Notification("🍼 Baby Feeding Reminder", {
        body: "It's time to check if baby needs a feed."
      });
    } catch (error) {
      console.error("Notification failed:", error);
    }
  }
}

function logFeeding() {
  console.log("Log feeding button pressed");

  const feeds = getFeeds();

  feeds.push(Date.now());

  saveFeeds(feeds);

  renderHistory();

  console.log("Feeding saved");
}

function clearHistory() {
  if (!confirm("Clear today's feeding history?")) {
    return;
  }

  const remaining = getFeeds().filter(timestamp => !today(timestamp));

  saveFeeds(remaining);

  renderHistory();
}

async function enableNotifications() {
  if (!("Notification" in window)) {
    alert("Notifications are not supported in this browser.");
    return;
  }

  try {
    const permission = await Notification.requestPermission();

    const button = $("notifyBtn");

    if (button) {
      button.textContent =
        permission === "granted"
          ? "🔔 On"
          : "🔕 Blocked";
    }

  } catch (error) {
    console.error("Notification permission failed:", error);
  }
}


/* -------------------------------
   START APP
-------------------------------- */

window.addEventListener("DOMContentLoaded", () => {

  console.log("Baby Feeding Tracker started");

  const feedBtn = $("feedBtn");
  const alarmBtn = $("alarmBtn");
  const cancelBtn = $("cancelBtn");
  const clearBtn = $("clearBtn");
  const notifyBtn = $("notifyBtn");

  if (!feedBtn) {
    console.error("ERROR: #feedBtn was not found");
  } else {
    feedBtn.addEventListener("click", logFeeding);
  }

  if (!alarmBtn) {
    console.error("ERROR: #alarmBtn was not found");
  } else {
    alarmBtn.addEventListener("click", setCountdown);
  }

  if (!cancelBtn) {
    console.error("ERROR: #cancelBtn was not found");
  } else {
    cancelBtn.addEventListener("click", cancelCountdown);
  }

  if (!clearBtn) {
    console.error("ERROR: #clearBtn was not found");
  } else {
    clearBtn.addEventListener("click", clearHistory);
  }

  if (!notifyBtn) {
    console.error("ERROR: #notifyBtn was not found");
  } else {
    notifyBtn.addEventListener("click", enableNotifications);
  }

  renderHistory();
  renderCountdown();
});
