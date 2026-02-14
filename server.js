const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.static(__dirname));

function stripExt(fileName) {
  return fileName.replace(/\.(mp3|wav)$/i, "");
}

function parseTitleArtist(fileName) {
  const base = stripExt(fileName);
  const parts = base.split(" - ");
  if (parts.length >= 2) {
    const artist = parts[parts.length - 1].trim();
    const title = parts.slice(0, -1).join(" - ").trim();
    return { title, artist };
  }
  return { title: base, artist: "Unknown Artist" };
}

function readMetadataMap(songsDir) {
  const metadataPath = path.join(songsDir, "songs.json");
  if (!fs.existsSync(metadataPath)) return {};

  try {
    const data = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
    if (!Array.isArray(data)) return {};

    return data.reduce((acc, item) => {
      if (item && item.file) {
        acc[item.file] = item;
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
}

app.get("/api/songs", (req, res) => {
  const songsDir = path.join(__dirname, "songs");

  fs.readdir(songsDir, (err, files) => {
    if (err) return res.status(500).json([]);

    const songFiles = files.filter(file =>
      file.endsWith(".mp3") || file.endsWith(".wav")
    );

    const metadataMap = readMetadataMap(songsDir);
    const songs = songFiles.map((file, index) => {
      const fallback = parseTitleArtist(file);
      const meta = metadataMap[file] || {};

      return {
        id: meta.id || `song-${index + 1}`,
        file,
        title: meta.title || fallback.title,
        artist: meta.artist || fallback.artist,
        language: meta.language || "unknown",
        era: meta.era || "unknown",
        year: typeof meta.year === "number" ? meta.year : null,
        mood: meta.mood || "general",
        tags: Array.isArray(meta.tags) ? meta.tags : [],
        trendingScore: typeof meta.trendingScore === "number" ? meta.trendingScore : 0
      };
    });

    res.json(songs);
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
