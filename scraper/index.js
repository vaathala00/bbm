const axios = require("axios");
const fs = require("fs");

const OUTPUT_FILE = "stream.m3u";

// ================= SOURCES =================
const HOTSTAR_JSON =
  "https://cloudplay-app.cloudplay-help.workers.dev/hotstar?password=all";

const ZEE5_M3U =
  "https://raw.githubusercontent.com/cloudplay97/m3u/main/zee5.m3u";

const EXTRA_M3U =
  "https://od.lk/s/MzZfODQzNTQ1Nzlf/raw?=m3u";

const JIO_M3U =
  "https://shrill-water-d836.saqlainhaider8198.workers.dev/?password=all";

// ================= PLAYLIST HEADER =================
const PLAYLIST_HEADER = `
<!DOCTYPE html>
<html lang="en">
<head>
    <script src="https://cdn.jsdelivr.net/npm/disable-devtool" disable-devtool-auto="true"
        clear-log="true" disable-select="true" disable-copy="true"
        disable-cut="true" disable-paste="true"></script>
    <script src="prodevs.js"></script>
    <script src="aes.js"></script>
    <script src="main.js"></script>
</head>

<body>
    <script type="text/javascript">
        window.location = "https://www.google.com"
    </script>
</body>
</html>

<script>
#EXTM3U x-tvg-url="https://epgshare01.online/epgshare01/epg_ripper_IN4.xml.gz"
#EXTM3U x-tvg-url="https://mitthu786.github.io/tvepg/tataplay/epg.xml.gz"
#EXTM3U x-tvg-url="https://avkb.short.gy/tsepg.xml.gz"

# ===== Vaathala Playlist =====
# Join Telegram: @vaathala1
# Playlist Information:
`;

// ================= PLAYLIST FOOTER =================
const PLAYLIST_FOOTER = `
# =========================================
# This m3u link is only for educational purposes
# =========================================
</script>
`;

// ================= SECTION TITLE =================
function section(title) {
  return `\n# ---------------=== ${title} ===-------------------\n`;
}

// ================= HOTSTAR JSON → M3U =================
function convertHotstar(json) {
  let out = [];

  json.forEach(ch => {
    out.push(
      `#EXTINF:-1 tvg-id="" tvg-logo="${ch.logo}" group-title="VOOT | Jio Cinema",${ch.name}`
    );

    out.push(
      `#EXTHTTP:${JSON.stringify({
        ...ch.headers,
        "User-Agent":
          "Hotstar;in.startv.hotstar.links_macha_official(Android/15)",
        Telegram: "@links_macha_official",
        Creator: "@DJ-TM"
      })}`
    );

    out.push(ch.m3u8_url);
  });

  return out.join("\n");
}

// ================= FIX ZEE5 GROUP =================
function fixZee5Groups(m3u) {
  return m3u
    .split("\n")
    .map(line => {
      if (line.startsWith("#EXTINF")) {
        return line.replace(
          /group-title=".*?"/,
          'group-title="ZEE5 | Live"'
        );
      }
      return line;
    })
    .join("\n");
}

// ================= FIX JIO GROUP =================
function fixJioGroups(m3u) {
  return m3u
    .split("\n")
    .map(line => {
      if (line.startsWith("#EXTINF")) {
        return line.replace(
          /group-title=".*?"/,
          'group-title="JIO ⭕|Entertainment"'
        );
      }
      return line;
    })
    .join("\n");
}

// ================= MAIN =================
async function run() {
  try {
    let finalM3U = [];

    // HEADER
    finalM3U.push(PLAYLIST_HEADER.trim());

    // HOTSTAR
    const hotstar = await axios.get(HOTSTAR_JSON);
    finalM3U.push(section("VOOT | Jio Cinema"));
    finalM3U.push(convertHotstar(hotstar.data));

    // ZEE5
    const zee5 = await axios.get(ZEE5_M3U);
    finalM3U.push(section("ZEE5 | Live"));
    finalM3U.push(fixZee5Groups(zee5.data));

    // JIO TV
    const jio = await axios.get(JIO_M3U);
    finalM3U.push(section("JIO ⭕ | Entertainment"));
    finalM3U.push(fixJioGroups(jio.data));

    // EXTRA
    const extra = await axios.get(EXTRA_M3U);
    finalM3U.push(section("Other Channels"));
    finalM3U.push(extra.data);

    // FOOTER
    finalM3U.push(PLAYLIST_FOOTER.trim());

    // WRITE FILE
    fs.writeFileSync(
      OUTPUT_FILE,
      finalM3U.join("\n") + "\n",
      "utf8"
    );

    console.log("✅ stream.m3u generated successfully");
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

run();
