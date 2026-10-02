```js
const FEEDS="babyFeedings";
const TARGET="babyFeedTarget";
let timer=null;
let alarmPlayed=false;

const $=id=>document.getElementById(id);
const getFeeds=()=>JSON.parse(localStorage.getItem(FEEDS)||"[]");
const saveFeeds=a=>localStorage.setItem(FEEDS,JSON.stringify(a));
const fmt=ts=>new Date(ts).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});
const today=ts=>new Date(ts).toDateString()===new Date().toDateString();

function renderHistory(){
  const feeds=getFeeds().filter(today).sort((a,b)=>b-a);
  $("history").innerHTML=feeds.length
    ? feeds.map(t=>`<div class="historyItem"><span>🍼 Feeding</span><strong>${fmt(t)}</strong></div>`).join("")
    : `<p class="muted">No feedings recorded today.</p>`;
}

function playAlarm(){
  // Create a short alarm sound using the browser's audio system
  try{
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(!AudioContext)return;

    const audio=new AudioContext();

    const beep=()=>{
      const oscillator=audio.createOscillator();
      const gain=audio.createGain();

      oscillator.connect(gain);
      gain.connect(audio.destination);

      oscillator.frequency.value=880;
      oscillator.type="sine";

      gain.gain.setValueAtTime(0.3,audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01,audio.currentTime+0.5);

      oscillator.start();
      oscillator.stop(audio.currentTime+0.5);
    };

    beep();
    setTimeout(beep,700);
    setTimeout(beep,1400);
  }catch(e){
    console.log("Alarm sound could not play:",e);
  }
}

function sendNotification(){
  if("Notification" in window && Notification.permission==="granted"){
    new Notification("🍼 Baby Feeding Reminder",{
      body:"It's time to check if baby needs a feed.",
      icon:"icon-192.png"
    });
  }
}

function triggerAlarm(){
  if(alarmPlayed)return;
  alarmPlayed=true;

  playAlarm();
  sendNotification();
}

function renderCountdown(){
  const target=Number(localStorage.getItem(TARGET)||0);

  if(!target){
    $("countdown").textContent="--:--:--";
    $("countdown").classList.remove("done");
    $("countdownLabel").textContent="Set a reminder below";
    $("alarmStatus").textContent="No reminder set";
    return;
  }

  const remaining=target-Date.now();

  if(remaining<=0){
    $("countdown").textContent="00:00:00";
    $("countdown").classList.add("done");
    $("countdownLabel").textContent="🔔 Time to check if baby needs a feed";
    $("alarmStatus").innerHTML=`Reminder reached at <span class="alarm">${fmt(target)}</span>`;

    clearTimeout(timer);
    triggerAlarm();
    return;
  }

  const total=Math.floor(remaining/1000);
  const h=Math.floor(total/3600);
  const m=Math.floor((total%3600)/60);
  const s=total%60;

  $("countdown").textContent=
    [h,m,s]
      .map(n=>String(n).padStart(2,"0"))
      .join(":");

  $("countdown").classList.remove("done");

  $("countdownLabel").textContent=
    `Next reminder: ${new Date(target).toLocaleTimeString([], {
      hour:"numeric",
      minute:"2-digit"
    })}`;

  $("alarmStatus").textContent=
    `Reminder set for ${new Date(target).toLocaleTimeString([], {
      hour:"numeric",
      minute:"2-digit"
    })}`;
}

function tick(){
  renderCountdown();

  const target=Number(localStorage.getItem(TARGET)||0);

  if(target>Date.now()){
    timer=setTimeout(tick,250);
  }
}

function setCountdown(){
  const minutes=
    Number($("hours").value)*60+
    Number($("minutes").value);

  if(minutes<=0){
    alert("Choose a reminder greater than 0 minutes.");
    return;
  }

  alarmPlayed=false;

  const target=Date.now()+minutes*60000;

  localStorage.setItem(TARGET,String(target));

  tick();

  if("Notification" in window && Notification.permission==="default"){
    Notification.requestPermission();
  }
}

$("feedBtn").addEventListener("click",function(){
  const feeds=getFeeds();
  feeds.push(Date.now());
  saveFeeds(feeds);
  renderHistory();
});

  // Logging a feed does not automatically overwrite an existing countdown.
};

$("alarmBtn").onclick=setCountdown;

$("cancelBtn").onclick=()=>{
  localStorage.removeItem(TARGET);
  clearTimeout(timer);
  alarmPlayed=false;
  renderCountdown();
};

$("clearBtn").onclick=()=>{
  if(confirm("Clear today's feeding history?")){
    saveFeeds(getFeeds().filter(t=>!today(t)));
    renderHistory();
  }
};

$("notifyBtn").onclick=async()=>{
  if(!("Notification" in window)){
    alert("Notifications are not supported here.");
    return;
  }

  const p=await Notification.requestPermission();

  $("notifyBtn").textContent=
    p==="granted"?"🔔 On":"🔕 Blocked";
};

window.addEventListener("load",()=>{
  renderHistory();
  tick();
});
```
