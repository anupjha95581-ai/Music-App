console.log("UI JS LOADED");

const audio = document.getElementById("audio");
const playlistEl = document.getElementById("playlist");

const playerTitle = document.getElementById("playerTitle");
const playerArtist = document.getElementById("playerArtist");
const playPauseBtn = document.getElementById("playPauseBtn");
const progressBar = document.getElementById("progressBar");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");
let playlist = [];
let currentIndex = -1;

const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");

let isPlaying = false;

let currentSong = null;

let isShuffle = false;
let repeatMode = "off"; 
// "off" | "all" | "one"

let shuffledPlaylist = [];


/* Load songs from server */
async function loadSongs() {
  showSkeletonCards(3); // show placeholders immediately

  const res = await fetch("/api/songs");
  playlist = await res.json();

  playlistEl.innerHTML = "";
  musicCards.innerHTML = "";

  playlist.forEach((song, index) => {
    createSidebarCard(song, index);
    createMainCard(song, index);
  });
}

function createSidebarCard(song, index) {
  const card = document.createElement("div");
  card.className = "playlist-card";
  card.dataset.song = song;
  card.innerText = song.replace(".mp3", "");

  card.addEventListener("click", () => {
    playByIndex(index);
  });

  playlistEl.appendChild(card);
}

const musicCards = document.getElementById("musicCards");

function createMainCard(song, index) {
  const card = document.createElement("div");
  card.className = "music-card";
  card.dataset.song = song;

  card.innerHTML = `
    <div class="poster">
      <img src="https://picsum.photos/300?random=${index + 10}">
      <button class="play-btn">▶</button>
    </div>
    <h3 class="song-name">${song.replace(".mp3", "")}</h3>
    <p class="artist-name">Local file</p>
  `;

  const playBtn = card.querySelector(".play-btn");
  playBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    playByIndex(index);
  });

  musicCards.appendChild(card);
}



/* Play selected song */
function loadSongIntoPlayer(song) {
  audio.src = `/songs/${song}`;
  audio.load();

  const index = playlist.indexOf(song);
  if (index !== -1) playByIndex(index);

  playerTitle.innerText = song.replace(".mp3", "");
  playerArtist.innerText = "Local file";

  progressBar.value = 0;
  currentTimeEl.innerText = "0:00";
  durationEl.innerText = "0:00";

  audio.play();
  playPauseBtn.innerText = "⏸";
}



/* Play / Pause toggle */
function togglePlayPause() {
  if (!audio.src) return; // no song loaded

  if (audio.paused) {
    audio.play();
    playPauseBtn.innerText = "⏸";
    isPlaying = true;
  } else {
    audio.pause();
    playPauseBtn.innerText = "▶";
    isPlaying = false;
  }
}

playPauseBtn.addEventListener("click", togglePlayPause);



audio.addEventListener("ended", () => {
  playPauseBtn.innerText = "▶";
  isPlaying = false;
});
const volumeSlider = document.getElementById("volumeSlider");

/* set initial volume */
audio.volume = volumeSlider.value;

/* update volume on change */
volumeSlider.addEventListener("input", () => {
  audio.volume = volumeSlider.value;
});
volumeSlider.addEventListener("input", () => {
  audio.volume = volumeSlider.value;
  audio.muted = volumeSlider.value == 0;
});

const volumeIcon = document.getElementById("volumeIcon");

/* set initial volume */
audio.volume = volumeSlider.value;
updateVolumeIcon(audio.volume);

/* update volume + icon */
volumeSlider.addEventListener("input", () => {
  audio.muted = false; // slider movement always un-mutes
  audio.volume = volumeSlider.value;
  updateVolumeIcon();
});


/* icon state logic */
function updateVolumeIcon() {
  if (audio.muted || audio.volume === 0) {
    volumeIcon.innerText = "🔇";
  } else if (audio.volume <= 0.33) {
    volumeIcon.innerText = "🔈";
  } else if (audio.volume <= 0.66) {
    volumeIcon.innerText = "🔉";
  } else {
    volumeIcon.innerText = "🔊";
  }
}

volumeIcon.addEventListener("click", () => {
  if (audio.muted || audio.volume === 0) {
    audio.muted = false;
    audio.volume = 0.6;
    volumeSlider.value = 0.6;
  } else {
    audio.muted = true;
  }

  updateVolumeIcon();
});

function changeVolume(step) {
  let newVolume = audio.volume + step;
  newVolume = Math.min(1, Math.max(0, newVolume));

  audio.muted = false;
  audio.volume = newVolume;
  volumeSlider.value = newVolume;

  updateVolumeIcon();
}

audio.volume = volumeSlider.value;
updateVolumeIcon();



loadSongs();

function showSkeletonCards(count = 3) {
  musicCards.innerHTML = "";

  for (let i = 0; i < count; i++) {
    const skeleton = document.createElement("div");
    skeleton.className = "music-card skeleton-card";

    skeleton.innerHTML = `
      <div class="skeleton skeleton-poster"></div>
      <div class="skeleton skeleton-line"></div>
      <div class="skeleton skeleton-line short"></div>
    `;

    musicCards.appendChild(skeleton);
  }
}


/* format seconds → mm:ss */
function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec < 10 ? "0" : ""}${sec}`;
}

/* when metadata loads */
audio.addEventListener("loadedmetadata", () => {
  durationEl.innerText = formatTime(audio.duration);
});

/* update progress while playing */
audio.addEventListener("timeupdate", () => {
  const percent = (audio.currentTime / audio.duration) * 100 || 0;
  progressBar.value = percent;
  currentTimeEl.innerText = formatTime(audio.currentTime);
});

/* seek when user drags */
progressBar.addEventListener("input", () => {
  const seekTime = (progressBar.value / 100) * audio.duration;
  audio.currentTime = seekTime;
});

function playByIndex(index) {
  const list = getActivePlaylist();
  if (index < 0 || index >= list.length) return;

  currentIndex = index;
  const song = list[currentIndex];

  audio.src = `/songs/${song}`;
  audio.load();

  playerTitle.innerText = song.replace(".mp3", "");
  playerArtist.innerText = "Local file";

  audio.play();
  playPauseBtn.innerText = "⏸";
}

nextBtn.addEventListener("click", () => {
  const list = getActivePlaylist();
  if (currentIndex === -1) return;

  if (repeatMode === "one") {
    playByIndex(currentIndex);
    return;
  }

  currentIndex = (currentIndex + 1) % list.length;
  playByIndex(currentIndex);
});


prevBtn.addEventListener("click", () => {
  const list = getActivePlaylist();
  if (currentIndex === -1) return;

  currentIndex =
    (currentIndex - 1 + list.length) % list.length;
  playByIndex(currentIndex);
});


audio.addEventListener("ended", () => {
  const list = getActivePlaylist();
  if (list.length === 0) return;

  if (repeatMode === "one") {
    playByIndex(currentIndex);
    return;
  }

  if (currentIndex === list.length - 1 && repeatMode === "off") {
    playPauseBtn.innerText = "▶";
    return;
  }

  currentIndex = (currentIndex + 1) % list.length;
  playByIndex(currentIndex);
});


//  console.log("Title el:", playerTitle);
// console.log("Artist el:", playerArtist);
// console.log("Play btn:", playPauseBtn);
// console.log("Audio el:", audio);
function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getActivePlaylist() {
  return isShuffle ? shuffledPlaylist : playlist;
}
const shuffleBtn = document.getElementById("shuffleBtn");

shuffleBtn.addEventListener("click", () => {
  isShuffle = !isShuffle;

  if (isShuffle) {
    shuffledPlaylist = shuffleArray(playlist);

    // keep current song at correct index
    const currentSong = playlist[currentIndex];
    currentIndex = shuffledPlaylist.indexOf(currentSong);
  }

  shuffleBtn.style.opacity = isShuffle ? "1" : "0.5";
});
const repeatBtn = document.getElementById("repeatBtn");

repeatBtn.addEventListener("click", () => {
  if (repeatMode === "off") {
    repeatMode = "all";
    repeatBtn.innerText = "🔁";
    repeatBtn.style.opacity = "1";
  } else if (repeatMode === "all") {
    repeatMode = "one";
    repeatBtn.innerText = "🔂";
  } else {
    repeatMode = "off";
    repeatBtn.innerText = "🔁";
    repeatBtn.style.opacity = "0.5";
  }
});
repeatBtn.style.opacity = "0.5";
shuffleBtn.style.opacity = "0.5";


document.addEventListener("keydown", (e) => {
  const activeTag = document.activeElement.tagName;

  // Disable shortcuts while typing
  if (activeTag === "INPUT" || activeTag === "TEXTAREA") return;

  switch (e.code) {
    case "Space":
      e.preventDefault();
      togglePlayPause();
      break;

    case "ArrowRight":
      nextBtn.click();
      break;

    case "ArrowLeft":
      prevBtn.click();
      break;

    case "ArrowUp":
      e.preventDefault();
      changeVolume(0.05);
      break;

    case "ArrowDown":
      e.preventDefault();
      changeVolume(-0.05);
      break;

    case "KeyM":
      volumeIcon.click();
      break;
  }
});
