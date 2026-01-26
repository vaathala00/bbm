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
#EXTM3U
#EXTM3U x-tvg-url="https://epgshare01.online/epgshare01/epg_ripper_IN4.xml.gz"
#EXTM3U x-tvg-url="https://mitthu786.github.io/tvepg/tataplay/epg.xml.gz"
#EXTM3U x-tvg-url="https://avkb.short.gy/tsepg.xml.gz"

# ===== Vaathala Playlist =====
# Join Telegram: @vaathala1
`;

// ================= PLAYLIST FOOTER =================
const PLAYLIST_FOOTER = `
# =========================================
# This m3u link is only for educational purposes
# =========================================
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

// ================= FIX / NORMALIZE JIO GROUPS =================
function fixJioGroups(m3u) {
  return m3u.replace(
    /group-title="([^"]+)"/g,
    (match, group) => {
      // keep existing JIO groups (News, Entertainment, Sports, etc)
      if (group.startsWith("JIO")) return match;

      // normalize non-JIO group titles
      return `group-title="JIO ⭕ | ${group}"`;
    }
  );
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

    // JIO TV (MULTI GROUP SAFE)
    const jio = await axios.get(JIO_M3U);
    finalM3U.push(section("JIO ⭕ | Live TV"));
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
