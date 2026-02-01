const axios = require("axios");
const fs = require("fs");

const OUTPUT_FILE = "stream.m3u";

// ================= SOURCES =================
const SOURCES = {
  HOTSTAR_JSON: "https://cloudplay-app.cloudplay-help.workers.dev/hotstar?password=all",
  ZEE5_M3U: "https://raw.githubusercontent.com/cloudplay97/m3u/main/zee5.m3u",
  EXTRA_M3U: "https://od.lk/s/MzZfODQzNTQ1Nzlf/raw?=m3u",
  JIO_M3U: "https://shrill-water-d836.saqlainhaider8198.workers.dev/?password=all",
  SONYLIV_JSON: "https://raw.githubusercontent.com/drmlive/sliv-live-events/main/sonyliv.json",
  FANCODE_JSON: "https://raw.githubusercontent.com/drmlive/fancode-live-events/main/fancode.json",
};

// ================= PLAYLIST HEADER =================
const PLAYLIST_HEADER = `#EXTM3U
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
  if (!json || !Array.isArray(json)) {
    console.warn("⚠️ Hotstar JSON invalid or empty, skipping");
    return "";
  }

  let out = [];
  json.forEach((ch) => {
    out.push(
      `#EXTINF:-1 tvg-id="" tvg-logo="${ch.logo}" group-title="VOOT | Jio Cinema",${ch.name}`
    );
    out.push(
      `#EXTHTTP:${JSON.stringify({
        ...ch.headers,
        // Keep the original User-Agent from JSON
        "User-Agent": ch.user_agent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        Telegram: "@links_macha_official",
        Creator: "@DJ-TM",
      })}`
    );
    out.push(ch.m3u8_url);
  });
  return out.join("\n");
}

// ================= ZEE5 → NORMALIZE GROUP =================
function fixZee5Groups(m3u) {
  return m3u
    .split("\n")
    .map((line) => line.startsWith("#EXTINF") ? line.replace(/group-title=".*?"/, 'group-title="ZEE5 | Live"') : line)
    .join("\n");
}

// ================= JIO → NORMALIZE GROUP =================
function fixJioGroups(m3u) {
  return m3u.replace(/group-title="([^"]+)"/g, (match, group) => {
    if (group.startsWith("JIO")) return match;
    return `group-title="JIO ⭕ | ${group}"`;
  });
}

// ================= SONYLIV JSON → M3U =================
function convertSonyliv(json) {
  if (!json || !Array.isArray(json.matches)) return "";
  const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/129.0.0.0 Safari/537.36";

  return json.matches
    .filter((m) => m.isLive)
    .map((match) => {
      const name = match.match_name || match.event_name;
      const logo = match.src || "";
      const tvgId = match.contentId || "";
      const lang = match.audioLanguageName || "ENG";

      return [
        `#EXTINF:-1 tvg-id="${tvgId}" tvg-name="${match.event_category}" group-title="SonyLiv | Sports" tvg-language="${lang}" tvg-logo="${logo}",${name}`,
        `#EXTHTTP:${JSON.stringify({
          Cookie: "",
          Origin: "https://www.sonyliv.com",
          Referer: "https://www.sonyliv.com/",
          "User-Agent": ua,
          Telegram: "@links_macha_official",
          Creator: "@DJ-TM"
        })}`,
        match.dai_url || match.pub_url || match.video_url
      ].join("\n");
    }).join("\n");
}

// ================= FANCODE JSON → M3U =================
function convertFancode(json) {
  if (!json || !Array.isArray(json.matches)) return "";
  return json.matches
    .filter((m) => m.status === "LIVE")
    .map((match) => {
      const name = match.match_name || match.title || match.event_name;
      const logo = match.src || "";
      const tvgId = match.match_id || "";
      const url = match.adfree_url || match.dai_url || "";
      if (!url) return null;
      return [
        `#EXTINF:-1 tvg-id="${tvgId}" tvg-name="${match.event_category}" group-title="FanCode | Sports" tvg-language="" tvg-logo="${logo}",${name}`,
        url
      ].join("\n");
    })
    .filter(Boolean)
    .join("\n");
}

// ================= SAFE FETCH =================
async function safeFetch(url, description) {
  try {
    const res = await axios.get(url, {
      timeout: 15000,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    });
    console.log(`✅ Fetched ${description}`);
    return res.data;
  } catch (err) {
    console.warn(`⚠️ Skipping ${description}: ${err.response?.status || err.message}`);
    return null;
  }
}

// ================= MAIN =================
async function run() {
  let finalM3U = [];
  finalM3U.push(PLAYLIST_HEADER.trim());

  // HOTSTAR
  const hotstarData = await safeFetch(SOURCES.HOTSTAR_JSON, "Hotstar");
  if (hotstarData) {
    finalM3U.push(section("VOOT | Jio Cinema"));
    finalM3U.push(convertHotstar(hotstarData));
  }

  // ZEE5
  const zee5Data = await safeFetch(SOURCES.ZEE5_M3U, "ZEE5");
  if (zee5Data) {
    finalM3U.push(section("ZEE5 | Live"));
    finalM3U.push(fixZee5Groups(zee5Data));
  }

  // JIO TV
  const jioData = await safeFetch(SOURCES.JIO_M3U, "JIO TV");
  if (jioData) {
    finalM3U.push(section("JIO ⭕ | Live TV"));
    finalM3U.push(fixJioGroups(jioData));
  }

  // EXTRA
  const extraData = await safeFetch(SOURCES.EXTRA_M3U, "Other Channels");
  if (extraData) {
    finalM3U.push(section("Other Channels"));
    finalM3U.push(extraData);
  }

  // SONYLIV
  const sonylivData = await safeFetch(SOURCES.SONYLIV_JSON, "SonyLiv Sports");
  if (sonylivData) {
    finalM3U.push(section("SonyLiv | Live Sports"));
    finalM3U.push(convertSonyliv(sonylivData));
  }

  // FANCODE
  const fancodeData = await safeFetch(SOURCES.FANCODE_JSON, "FanCode Sports");
  if (fancodeData) {
    finalM3U.push(section("FanCode | Live Sports"));
    finalM3U.push(convertFancode(fancodeData));
  }

  finalM3U.push(PLAYLIST_FOOTER.trim());

  fs.writeFileSync(OUTPUT_FILE, finalM3U.join("\n") + "\n", "utf8");
  console.log(`✅ ${OUTPUT_FILE} generated successfully`);
}

run();
