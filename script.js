console.log("UI JS LOADED");

const audio = document.getElementById("audio");
const playlistEl = document.getElementById("playlist");
const musicCards = document.getElementById("musicCards");
const searchInput = document.querySelector(".topbar input");

const playerTitle = document.getElementById("playerTitle");
const playerArtist = document.getElementById("playerArtist");
const playPauseBtn = document.getElementById("playPauseBtn");
const progressBar = document.getElementById("progressBar");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");
const volumeSlider = document.getElementById("volumeSlider");
const volumeIcon = document.getElementById("volumeIcon");
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const repeatBtn = document.getElementById("repeatBtn");
const categoryChips = document.querySelectorAll(".category-chip");

let songs = [];
let activeSongs = [];
let shuffledSongs = [];
let currentIndex = -1;
let currentSongFile = null;
let activeCategory = "trending now";
let activeQuery = "";

let isShuffle = false;
let repeatMode = "off";

const ICONS = {
  play: "&#9654;",
  pause: "&#9208;",
  repeat: "&#128257;",
  repeatOne: "&#128258;",
  volumeMute: "&#128263;",
  volumeLow: "&#128264;",
  volumeMid: "&#128265;",
  volumeHigh: "&#128266;"
};

function stripExt(name = "") {
  return name.replace(/\.(mp3|wav)$/i, "");
}

function normalizeSong(song, index) {
  const file = song.file || song.name || song;
  const fileTitle = stripExt(file || "Unknown Song");

  return {
    id: song.id || `song-${index + 1}`,
    file,
    title: song.title || fileTitle,
    artist: song.artist || "Unknown Artist",
    language: (song.language || "unknown").toLowerCase(),
    era: (song.era || "unknown").toLowerCase(),
    year: typeof song.year === "number" ? song.year : null,
    mood: (song.mood || "general").toLowerCase(),
    tags: Array.isArray(song.tags) ? song.tags.map((t) => String(t).toLowerCase()) : [],
    trendingScore: typeof song.trendingScore === "number" ? song.trendingScore : 0
  };
}

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

async function loadSongs() {
  showSkeletonCards(3);

  try {
    const res = await fetch("/api/songs");
    const data = await res.json();

    songs = Array.isArray(data)
      ? data.map((item, index) => normalizeSong(item, index))
      : [];

    activeSongs = [...songs];
    renderSidebar();
    applyFilters();
  } catch (err) {
    musicCards.innerHTML = "";
    const errorState = document.createElement("div");
    errorState.className = "playlist-card";
    errorState.innerText = "Failed to load songs.";
    musicCards.appendChild(errorState);
  }
}

function renderSidebar() {
  playlistEl.innerHTML = "";
  songs.forEach((song) => {
    const card = document.createElement("div");
    card.className = "playlist-card";
    card.dataset.song = song.file;
    card.innerText = song.title;

    card.addEventListener("click", () => {
      playSongByFile(song.file);
    });

    playlistEl.appendChild(card);
  });

  updateActiveSongUI();
}

function createMainCard(song, index) {
  const card = document.createElement("div");
  card.className = "music-card";
  card.dataset.song = song.file;

  card.innerHTML = `
    <div class="poster">
      <img src="https://picsum.photos/300?random=${index + 10}" alt="${song.title}">
      <button class="play-btn">&#9654;</button>
    </div>
    <h3 class="song-name">${song.title}</h3>
    <p class="artist-name">${song.artist}</p>
  `;

  card.addEventListener("click", () => playSongByFile(song.file));

  const playBtn = card.querySelector(".play-btn");
  playBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    playSongByFile(song.file);
  });

  return card;
}

function renderMainCards(list) {
  musicCards.innerHTML = "";

  if (!list.length) {
    const emptyState = document.createElement("div");
    emptyState.className = "playlist-card";
    emptyState.innerText = "No songs found for this filter.";
    musicCards.appendChild(emptyState);
    return;
  }

  list.forEach((song, index) => {
    musicCards.appendChild(createMainCard(song, index));
  });

  updateActiveSongUI();
}

function matchesCategory(song, category) {
  if (category === "trending now") return true;

  const text = `${song.title} ${song.artist} ${song.tags.join(" ")}`.toLowerCase();

  if (category === "bollywood hindi") {
    return song.language === "hindi" || text.includes("bollywood") || text.includes("hindi");
  }

  if (category === "90s hits") {
    return song.era === "90s" || (song.year >= 1990 && song.year <= 1999) || song.tags.includes("90s");
  }

  if (category === "80s classics") {
    return song.era === "80s" || (song.year >= 1980 && song.year <= 1989) || song.tags.includes("80s");
  }

  if (category === "punjabi beats") {
    return song.language === "punjabi" || text.includes("punjabi");
  }

  if (category === "lo-fi") {
    return song.mood === "lofi" || song.tags.includes("lofi") || song.tags.includes("lo-fi");
  }

  if (category === "romantic") {
    return song.mood === "romantic" || song.tags.includes("romantic") || song.tags.includes("love");
  }

  if (category === "workout") {
    return song.mood === "workout" || song.tags.includes("workout") || song.tags.includes("gym");
  }

  if (category === "party mix") {
    return song.mood === "party" || song.tags.includes("party") || song.tags.includes("dance");
  }

  return true;
}

function matchesSearch(song, query) {
  if (!query) return true;

  const haystack = `${song.title} ${song.artist} ${song.language} ${song.era} ${song.tags.join(" ")}`.toLowerCase();
  return haystack.includes(query);
}

function applyFilters() {
  const categoryFiltered = songs.filter((song) => matchesCategory(song, activeCategory));
  const searchFiltered = categoryFiltered.filter((song) => matchesSearch(song, activeQuery));

  if (activeCategory === "trending now") {
    searchFiltered.sort((a, b) => b.trendingScore - a.trendingScore);
  }

  activeSongs = searchFiltered;

  if (isShuffle) {
    shuffledSongs = shuffleArray(activeSongs);
  }

  if (currentSongFile) {
    const baseList = getBasePlaylist();
    const idx = baseList.findIndex((s) => s.file === currentSongFile);
    currentIndex = idx;
  }

  renderMainCards(activeSongs);
}

function setActiveCategoryChip() {
  categoryChips.forEach((chip) => {
    const isActive = chip.innerText.trim().toLowerCase() === activeCategory;
    chip.classList.toggle("active", isActive);
  });
}

function setupCategoryFilters() {
  categoryChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      activeCategory = chip.innerText.trim().toLowerCase();
      setActiveCategoryChip();
      applyFilters();
    });
  });
}

function setupSearch() {
  if (!searchInput) return;

  searchInput.addEventListener("input", () => {
    activeQuery = searchInput.value.trim().toLowerCase();
    applyFilters();
  });
}

function getBasePlaylist() {
  return activeSongs;
}

function getActivePlaylist() {
  return isShuffle ? shuffledSongs : activeSongs;
}

function playSongByFile(file) {
  let baseList = getBasePlaylist();
  let index = baseList.findIndex((song) => song.file === file);

  if (index === -1) {
    activeCategory = "trending now";
    setActiveCategoryChip();
    applyFilters();
    baseList = getBasePlaylist();
    index = baseList.findIndex((song) => song.file === file);
  }

  if (index === -1) return;

  if (isShuffle) {
    if (!shuffledSongs.length || shuffledSongs.length !== baseList.length) {
      shuffledSongs = shuffleArray(baseList);
    }
    currentIndex = shuffledSongs.findIndex((song) => song.file === file);
  } else {
    currentIndex = index;
  }

  playByIndex(currentIndex);
}

function updateActiveSongUI() {
  const activeList = getActivePlaylist();
  const activeSong = activeList[currentIndex];

  document.querySelectorAll(".playlist-card, .music-card").forEach((el) => {
    const isActive = Boolean(activeSong) && el.dataset.song === activeSong.file;
    el.classList.toggle("active", isActive);
  });
}

function playByIndex(index) {
  const list = getActivePlaylist();
  if (index < 0 || index >= list.length) return;

  currentIndex = index;
  const song = list[currentIndex];
  currentSongFile = song.file;

  audio.src = `/songs/${song.file}`;
  audio.load();

  playerTitle.innerText = song.title;
  playerArtist.innerText = song.artist;
  updateActiveSongUI();

  audio.play();
  playPauseBtn.innerHTML = ICONS.pause;
}

function togglePlayPause() {
  if (!audio.src) return;

  if (audio.paused) {
    audio.play();
    playPauseBtn.innerHTML = ICONS.pause;
  } else {
    audio.pause();
    playPauseBtn.innerHTML = ICONS.play;
  }
}

function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec < 10 ? "0" : ""}${sec}`;
}

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function updateVolumeIcon() {
  if (audio.muted || audio.volume === 0) {
    volumeIcon.innerHTML = ICONS.volumeMute;
  } else if (audio.volume <= 0.33) {
    volumeIcon.innerHTML = ICONS.volumeLow;
  } else if (audio.volume <= 0.66) {
    volumeIcon.innerHTML = ICONS.volumeMid;
  } else {
    volumeIcon.innerHTML = ICONS.volumeHigh;
  }
}

function changeVolume(step) {
  let newVolume = audio.volume + step;
  newVolume = Math.min(1, Math.max(0, newVolume));

  audio.muted = false;
  audio.volume = newVolume;
  volumeSlider.value = newVolume;
  updateVolumeIcon();
}

playPauseBtn.addEventListener("click", togglePlayPause);

nextBtn.addEventListener("click", () => {
  const list = getActivePlaylist();
  if (!list.length || currentIndex === -1) return;

  if (repeatMode === "one") {
    playByIndex(currentIndex);
    return;
  }

  currentIndex = (currentIndex + 1) % list.length;
  playByIndex(currentIndex);
});

prevBtn.addEventListener("click", () => {
  const list = getActivePlaylist();
  if (!list.length || currentIndex === -1) return;

  currentIndex = (currentIndex - 1 + list.length) % list.length;
  playByIndex(currentIndex);
});

audio.addEventListener("ended", () => {
  const list = getActivePlaylist();
  if (!list.length) return;

  if (repeatMode === "one") {
    playByIndex(currentIndex);
    return;
  }

  if (currentIndex === list.length - 1 && repeatMode === "off") {
    playPauseBtn.innerHTML = ICONS.play;
    return;
  }

  currentIndex = (currentIndex + 1) % list.length;
  playByIndex(currentIndex);
});

audio.addEventListener("loadedmetadata", () => {
  durationEl.innerText = formatTime(audio.duration);
});

audio.addEventListener("timeupdate", () => {
  const percent = (audio.currentTime / audio.duration) * 100 || 0;
  progressBar.value = percent;
  currentTimeEl.innerText = formatTime(audio.currentTime);
});

progressBar.addEventListener("input", () => {
  const seekTime = (progressBar.value / 100) * audio.duration;
  audio.currentTime = seekTime;
});

audio.volume = volumeSlider.value;
updateVolumeIcon();

volumeSlider.addEventListener("input", () => {
  audio.muted = false;
  audio.volume = volumeSlider.value;
  updateVolumeIcon();
});

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

shuffleBtn.addEventListener("click", () => {
  isShuffle = !isShuffle;
  const baseList = getBasePlaylist();

  if (isShuffle) {
    shuffledSongs = shuffleArray(baseList);
    if (currentSongFile) {
      currentIndex = shuffledSongs.findIndex((song) => song.file === currentSongFile);
    }
  } else if (currentSongFile) {
    currentIndex = baseList.findIndex((song) => song.file === currentSongFile);
  }

  shuffleBtn.style.opacity = isShuffle ? "1" : "0.5";
});

repeatBtn.addEventListener("click", () => {
  if (repeatMode === "off") {
    repeatMode = "all";
    repeatBtn.innerHTML = ICONS.repeat;
    repeatBtn.style.opacity = "1";
  } else if (repeatMode === "all") {
    repeatMode = "one";
    repeatBtn.innerHTML = ICONS.repeatOne;
  } else {
    repeatMode = "off";
    repeatBtn.innerHTML = ICONS.repeat;
    repeatBtn.style.opacity = "0.5";
  }
});

repeatBtn.style.opacity = "0.5";
shuffleBtn.style.opacity = "0.5";

document.addEventListener("keydown", (e) => {
  const activeTag = document.activeElement.tagName;
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

const navButtons = document.querySelectorAll(".nav-btn");
const pages = document.querySelectorAll(".page");

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetPage = btn.dataset.page;

    navButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    pages.forEach((page) => {
      page.classList.toggle("active", page.id === targetPage);
    });
  });
});

setupCategoryFilters();
setupSearch();
loadSongs();
