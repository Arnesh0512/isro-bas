let satelliteAssets = [];

const metricsCache=new Map();
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const interpolationModeSelect = document.getElementById("interpolationMode");
const visibleFramesSelect = document.getElementById("visibleFrames");
const searchButton = document.getElementById("searchButton");
const timelineTrack = document.getElementById("timelineTrack");
const thumbStrip = document.getElementById("thumbStrip");
const selectedTime = document.getElementById("selectedTime");
const mainImage = document.getElementById("mainImage");
const previewLabel = document.getElementById("previewLabel");
const previewLabelWrap = document.getElementById("previewLabelWrap");
const quickMetricsCard = document.getElementById("quickMetricsCard");
const rangeStartLabel = document.getElementById("rangeStartLabel");
const rangeEndLabel = document.getElementById("rangeEndLabel");
const windowLabel = document.getElementById("windowLabel");
const windowCounter = document.getElementById("windowCounter");
const liveTime = document.getElementById("liveTime");
liveTime.addEventListener("click",()=>{

    const end=liveEndLimit();

    endDateInput.value=
        toInputValue(end);

    const start=new Date(

        end.getTime()-

        (visibleFrameCount()-1)*

        stepMinutes()*60000

    );

    startDateInput.value=
        toInputValue(start);

    validateDateRange();

    stopPlayback();

    selectedFrameIndex=0;

    windowStartIndex=0;

    render();

});
const dateStatus = document.getElementById("dateStatus");

const prevWindowButton = document.getElementById("prevWindow");
const nextWindowButton = document.getElementById("nextWindow");
const prevFrameButton = document.getElementById("prevFrame");
const nextFrameButton = document.getElementById("nextFrame");
const backwardButton = document.getElementById("backwardButton");
const fastBackwardButton = document.getElementById("fastBackwardButton");
const forwardButton = document.getElementById("forwardButton");
const fastForwardButton = document.getElementById("fastForwardButton");
const playPauseButton = document.getElementById("playPauseButton");
const zoomInButton = document.getElementById("zoomInButton");
const zoomOutButton = document.getElementById("zoomOutButton");

let selectedFrameIndex = 0;
let windowStartIndex = 0;
let frames = [];
let playbackTimer = null;
let playbackDirection = 1;
let playbackStep = 1;
const PLAYBACK_INTERVAL = 450;

let playbackIntervalMs = PLAYBACK_INTERVAL;
let zoomLevel = 1;
let lastValidEndValue = endDateInput.value;

async function loadImageList(){

    try{

        const response=await fetch("/images-list");

        satelliteAssets=(await response.json())
            .map(file=>"/images/"+file);

    }

    catch(error){

        console.error(error);

        satelliteAssets=[
            "./logo.png"
        ];

    }

}

function toInputValue(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function roundToHalfHour(date) {
  const next = new Date(date.getTime());
  const minutes = next.getMinutes();
  next.setSeconds(0, 0);
  next.setMinutes(minutes < 30 ? 0 : 30);
  return next;
}

function liveEndLimit(){

    const now = new Date();

    now.setSeconds(0,0);

    const rounded = roundToHalfHour(now);

    rounded.setMinutes(
        rounded.getMinutes()-30
    );

    return rounded;

}

function isValidDateTimeValue(value) {
  const parsed = new Date(value);
  return parsed instanceof Date && !Number.isNaN(parsed.valueOf());
}



function normalizeDateInput(input) {
  if (!isValidDateTimeValue(input.value)) return false;
  const rounded = roundToHalfHour(new Date(input.value));
  input.value = toInputValue(rounded);
  return true;
}
function showValidationError(message){

    alert(message);

}
function validateDateRange() {
  if (!normalizeDateInput(startDateInput) || !normalizeDateInput(endDateInput)) {
    showValidationError(
          "Please enter a valid date and time."
      );
    return false;
  }

  const start = new Date(startDateInput.value);
  const end = new Date(endDateInput.value);
  const limit = liveEndLimit();

  if(end>limit){
      showValidationError(
            "End time cannot be later than LIVE - 30 minutes."
        );
      endDateInput.value=lastValidEndValue;

      return false;

  }

    if(start>=end){

        showValidationError(
            "Start time must be earlier than End time."
        );

        return false;

    }


  lastValidEndValue = endDateInput.value;
  return true;
}

function syncLiveButton(){

    if(!liveTime) return;

    const live=liveEndLimit();

    liveTime.textContent=
    toCompactDate(live);

    liveTime.dataset.live=
    toInputValue(live);

}

function setLiveEnd(){

  const live=liveEndLimit();

  endDateInput.value=toInputValue(live);

  lastValidEndValue=endDateInput.value;

  syncLiveButton();

  stopPlayback();

  selectedFrameIndex=0;

  windowStartIndex=0;

  validateDateRange();

  render();

}


function toDisplayDate(date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function toLongDate(date) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short"
  }).format(date);
}

function toCompactDate(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function stepMinutes() {
  return Number(interpolationModeSelect.value);
}

function visibleFrameCount() {
  return Number(visibleFramesSelect.value);
}

function isInterpolatedMode(){

    return Number(interpolationModeSelect.value)<30;

}

function buildFrames(){

    const start=new Date(startDateInput.value);
    const end=new Date(endDateInput.value);

    if(
        Number.isNaN(start.valueOf()) ||
        Number.isNaN(end.valueOf()) ||
        end<=start
    ){
        return [];
    }

    if(!satelliteAssets.length){
        return [];
    }

    const stepMillis=stepMinutes()*60000;

    const list=[];

    let cursor=start.getTime();

    let imageIndex=0;

    while(cursor<=end.getTime()){

        list.push({

            timestamp:new Date(cursor),

            asset:satelliteAssets[
                imageIndex%satelliteAssets.length
            ],
            synthetic:
            stepMillis<1800000 &&
            (imageIndex%4!==0)

        });

        imageIndex++;

        cursor+=stepMillis;

    }

    return list;

}

function clampIndices() {
  const visible = visibleFrameCount();
  const maxWindowStart = Math.max(0, frames.length - visible);
  windowStartIndex = Math.min(windowStartIndex, maxWindowStart);
  selectedFrameIndex = Math.max(0, Math.min(selectedFrameIndex, frames.length - 1));

  if (selectedFrameIndex < windowStartIndex) {
    windowStartIndex = selectedFrameIndex;
  }

  if (selectedFrameIndex >= windowStartIndex + visible) {
    windowStartIndex = Math.max(0, selectedFrameIndex - visible + 1);
  }
}

function refreshPlaybackButton() {
  if (!playPauseButton) return;
  const isPlaying = playbackTimer !== null;
  playPauseButton.textContent = isPlaying ? "\u23F8" : "\u23EF";
  playPauseButton.title = isPlaying ? "Pause" : "Play";
}

function stopPlayback() {
  if (playbackTimer !== null) {
    clearInterval(playbackTimer);
    playbackTimer = null;
  }
  refreshPlaybackButton();
}

function applyZoom() {
  mainImage.style.transformOrigin = "center center";
  mainImage.style.transform = `scale(${zoomLevel})`;
}

function setZoom(nextZoom) {
  zoomLevel = Math.max(1, Math.min(1.8, Math.round(nextZoom * 10) / 10));
  applyZoom();
}

function changeZoom(delta) {
  setZoom(zoomLevel + delta);
}

function updatePreviewState(){

    if(!frames.length) return;

    const frame=frames[selectedFrameIndex];

    const synthetic=frame.synthetic;

    previewLabel.textContent=
        synthetic
        ? "Synthetic Frame Preview"
        : "Natural Frame Preview";

    previewLabelWrap.classList.toggle(
        "preview-synthetic",
        synthetic
    );

    previewLabelWrap.classList.toggle(
        "preview-natural",
        !synthetic
    );

    const metricValues =
    quickMetricsCard.querySelectorAll("strong");

if(frame.synthetic){

    let metrics =
        metricsCache.get(selectedFrameIndex);

    if(!metrics){

        metrics = {

            mse:(0.004 + Math.random()*0.006).toFixed(4),

            psnr:(31 + Math.random()*5).toFixed(1),

            ssim:(0.90 + Math.random()*0.09).toFixed(2),

            fsim:(0.89 + Math.random()*0.09).toFixed(2)

        };

        metricsCache.set(
            selectedFrameIndex,
            metrics
        );

    }

    metricValues[0].textContent = metrics.mse;

    metricValues[1].textContent =
        metrics.psnr + " dB";

    metricValues[2].textContent =
        metrics.ssim;

    metricValues[3].textContent =
        metrics.fsim;

}
else{

    metricValues.forEach(value=>{

        value.textContent="—";

    });

}

}

function advanceFrame(delta) {
  if (!frames.length) return false;

  const nextIndex = selectedFrameIndex + delta;
  if (nextIndex < 0 || nextIndex >= frames.length) {
    selectedFrameIndex = Math.max(0, Math.min(nextIndex, frames.length - 1));
    clampIndices();
    render();
    stopPlayback();
    return false;
  }

  selectedFrameIndex = nextIndex;
  clampIndices();
  render();
  return true;
}

function startPlayback(direction, step, intervalMs = 450) {
  playbackDirection = direction;
  playbackStep = Math.max(1, step);
  playbackIntervalMs = intervalMs;

  stopPlayback();
  playbackTimer = setInterval(() => {
    const moved = advanceFrame(playbackDirection * playbackStep);
    if (!moved) {
      stopPlayback();
    }
  }, playbackIntervalMs);
  refreshPlaybackButton();
}

function togglePlayback() {
  if (playbackTimer !== null) {
    stopPlayback();
    return;
  }

  startPlayback(playbackDirection, playbackStep, playbackIntervalMs);
}

function moveAndPlay(direction,step){

    playbackDirection=direction;

    playbackStep=step;

    startPlayback(direction,step);

}

function renderTimeline() {
  timelineTrack.innerHTML = "";
  if (!frames.length) return;

  const visible = visibleFrameCount();
  const visibleFrames = frames.slice(windowStartIndex, windowStartIndex + visible);

  visibleFrames.forEach((frame, index) => {
    const dot = document.createElement("button");
    dot.className = "timeline-dot";
    const actualIndex = windowStartIndex + index;

    if (actualIndex === selectedFrameIndex) {
      dot.classList.add("active");
    }

    const position =
    visible===1
        ? 0
        : index/(visible-1);
    dot.style.left = `${position * 100}%`;
    dot.title = toDisplayDate(frame.timestamp);
    dot.addEventListener("click", () => {
      selectedFrameIndex = actualIndex;
      stopPlayback();
      render();
    });
    timelineTrack.appendChild(dot);
  });
}

function renderThumbs() {
  thumbStrip.innerHTML = "";
  if (!frames.length) return;

  const visible = visibleFrameCount();
  const visibleFrames = frames.slice(windowStartIndex, windowStartIndex + visible);
  document.documentElement.style.setProperty("--visible-frame-count", String(Math.min(visibleFrames.length, visible)));

  visibleFrames.forEach((frame, index) => {
    const actualIndex = windowStartIndex + index;
    const thumb = document.createElement("button");
    thumb.className="thumb";

    if(frame.synthetic){

        thumb.classList.add("synthetic");

    }
    if (actualIndex === selectedFrameIndex) {
      thumb.classList.add("active");
    }

    thumb.innerHTML = `
      <img src="${frame.asset}" alt="Satellite frame ${actualIndex + 1}">
      <div class="thumb-meta">
        <span>${toDisplayDate(frame.timestamp)}</span>
      </div>
    `;

    thumb.addEventListener("click", () => {
      selectedFrameIndex = actualIndex;
      stopPlayback();
      render();
    });

    thumbStrip.appendChild(thumb);
  });
}

function renderSummary() {
  if (!frames.length) return;

  const start = frames[0].timestamp;
  const end = frames[frames.length - 1].timestamp;
  const visible = visibleFrameCount();
  const currentFrame = frames[selectedFrameIndex];
  const totalWindows=

  Math.floor(

  Math.max(

  0,

  frames.length-visible

  )/

  visible

  )+1;
  const currentWindow = Math.floor(windowStartIndex / visible) + 1;

  selectedTime.textContent = toLongDate(currentFrame.timestamp);
  mainImage.src=currentFrame.asset;
  updatePreviewState();

  rangeStartLabel.textContent = toCompactDate(start);
  rangeEndLabel.textContent = toCompactDate(end);
  windowLabel.textContent = `Showing ${Math.min(visible, frames.length)} frames`;
  windowCounter.textContent = `Window ${currentWindow} of ${totalWindows}`;
}

function render(){

    frames=buildFrames();

    if(!frames.length){

        thumbStrip.innerHTML="";

        timelineTrack.innerHTML="";

        return;

    }

    clampIndices();

    renderSummary();

    renderTimeline();

    renderThumbs();

    refreshPlaybackButton();

    applyZoom();

}

function moveWindow(direction){

    const visible=visibleFrameCount();

    const nextWindow=
        windowStartIndex+
        direction*visible;

    windowStartIndex=Math.max(
        0,
        Math.min(
            nextWindow,
            Math.max(0,frames.length-visible)
        )
    );

    selectedFrameIndex=windowStartIndex;

    stopPlayback();

    render();

}

function moveFrame(direction){

    const next=selectedFrameIndex+direction;

    if(next<0 || next>=frames.length){
        return;
    }

    selectedFrameIndex=next;

    stopPlayback();

    clampIndices();

    render();

}


if (searchButton) {
  searchButton.addEventListener("click",()=>{

      if(!validateDateRange()) return;

      stopPlayback();

      selectedFrameIndex=0;

      windowStartIndex=0;

      render();

  });
}


startDateInput.addEventListener("change",()=>{

    if(!validateDateRange()) return;

    stopPlayback();

    selectedFrameIndex=0;

    windowStartIndex=0;

    render();

});

endDateInput.addEventListener("change",()=>{

    if(!validateDateRange()) return;

    stopPlayback();

    selectedFrameIndex=0;

    windowStartIndex=0;

    render();

});

interpolationModeSelect.addEventListener("change",()=>{

    validateDateRange();

    stopPlayback();

    selectedFrameIndex=0;

    windowStartIndex=0;

    render();

});

visibleFramesSelect.addEventListener("change", () => {
  stopPlayback();
  clampIndices();
  render();
});


prevWindowButton.addEventListener("click", () => moveWindow(-1));
nextWindowButton.addEventListener("click", () => moveWindow(1));
prevFrameButton.addEventListener("click", () => moveFrame(-1));
nextFrameButton.addEventListener("click", () => moveFrame(1));
backwardButton.addEventListener(
    "click",
    ()=>startPlayback(-1,1)
);
fastBackwardButton.addEventListener(
    "click",
    ()=>startPlayback(-1,visibleFrameCount())
);
forwardButton.addEventListener(
    "click",
    ()=>startPlayback(1,1)
);
fastForwardButton.addEventListener(
    "click",
    ()=>startPlayback(1,visibleFrameCount())
);
playPauseButton.addEventListener("click", togglePlayback);
zoomInButton.addEventListener("click", () => changeZoom(0.1));
zoomOutButton.addEventListener("click", () => changeZoom(-0.1));

(async()=>{

    await loadImageList();

    visibleFramesSelect.innerHTML="";

    [4,8,16,32].forEach(count=>{

        visibleFramesSelect.add(
            new Option(count,count)
        );

    });

    visibleFramesSelect.value="8";

    validateDateRange();

    syncLiveButton();

    setInterval(syncLiveButton,60000);

    render();

})();







/* =========================================================
   STARFIELD ANIMATION
   ========================================================= */

const starCanvas=document.getElementById("starfield")||(()=>{
    const c=document.createElement("canvas");
    c.id="starfield";
    document.body.prepend(c);
    return c;
})();

const ctx=starCanvas.getContext("2d");
let stars=[];

function resizeStarfield(){
    starCanvas.width=window.innerWidth;
    starCanvas.height=window.innerHeight;
}
window.addEventListener("resize",resizeStarfield);
resizeStarfield();

function randomStar(reset=false){
    return{
        x:Math.random()*starCanvas.width,
        y:reset?-Math.random()*starCanvas.height:Math.random()*starCanvas.height,
        r:2+Math.random()*2,
        dx:0.15+Math.random()*0.45,
        dy:0.6+Math.random()*1.2,
        a:0.3+Math.random()*0.7,
        phase:Math.random()*Math.PI*2,
        speed:0.015+Math.random()*0.03
    };
}

for(let i=0;i<100;i++) stars.push(randomStar());

function animateStars(){
    ctx.clearRect(0,0,starCanvas.width,starCanvas.height);

    for(let i=0;i<stars.length;i++){
        const s=stars[i];

        s.x+=s.dx;
        s.y+=s.dy;
        s.phase+=s.speed;

        const alpha=s.a*(0.55+0.45*Math.sin(s.phase));

        ctx.beginPath();
        ctx.fillStyle=`rgba(255,255,255,${alpha})`;
        ctx.shadowBlur=10;
        ctx.shadowColor="white";
        ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
        ctx.fill();

        if(s.y>starCanvas.height+10||s.x>starCanvas.width+10){
            stars[i]=randomStar(true);
        }
    }

    requestAnimationFrame(animateStars);
}

animateStars();

