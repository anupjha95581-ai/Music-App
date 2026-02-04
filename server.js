const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.static(__dirname));

app.get("/api/songs", (req, res) => {
  const songsDir = path.join(__dirname, "songs");

  fs.readdir(songsDir, (err, files) => {
    if (err) return res.status(500).json([]);

    const songs = files.filter(file =>
      file.endsWith(".mp3") || file.endsWith(".wav")
    );

    res.json(songs);
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
