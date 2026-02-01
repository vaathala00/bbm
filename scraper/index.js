const axios = require("axios");
const fs = require("fs");

const OUTPUT_FILE = "stream.m3u";

// ================= SOURCES =================
const SOURCES = {
  HOTSTAR_JSON: "https://cloudplay-app.cloudplay-help.workers.dev/hotstar?password=all",
  ZEE5_M3U: "https://raw.githubusercontent.com/Sufiyan123yivh/Testing/refs/heads/main/Zee5.m3u",
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

// ================= HOTSTAR JSON → M3U (MPD FIX) =================
function convertHotstar(json) {
  if (!json || !Array.isArray(json)) {
    console.warn("⚠️ Hotstar JSON invalid or empty, skipping");
    return "";
  }

  const out = [];

  json.forEach((ch) => {
    const streamUrl = ch.mpd_url || ch.m3u8_url;

    if (!streamUrl) {
      console.warn(`⚠️ Missing stream URL for ${ch.name}`);
      return;
    }

    out.push(
      `#EXTINF:-1 tvg-id="" tvg-logo="${ch.logo}" group-title="VOOT | Jio Cinema",${ch.name}`
    );

    out.push(
      `#EXTHTTP:${JSON.stringify({
        ...ch.headers,
        Referer: "https://www.hotstar.com/",
        Origin: "https://www.hotstar.com",
        "User-Agent":
          ch.user_agent ||
          "Hotstar;in.startv.hotstar/25.01.27.5.3788 (Android/13)",
        Telegram: "@links_macha_official",
        Creator: "@DJ-TM",
      })}`
    );

    // MPD OR M3U8
    out.push(streamUrl);
  });

  return out.join("\n");
}

// ================= ZEE5 → EXTHTTP =================
function convertZee5(m3u) {
  const lines = m3u.split("\n");
  const output = [];

  let currentCookie = "";
  let currentUA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36";

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    if (line.startsWith("#EXTINF")) {
      line = line.replace(/group-title=".*?"/, 'group-title="ZEE5 | Live"');
      output.push(line);

      const nextLine = lines[i + 1]?.trim() || "";
      if (nextLine.startsWith("#EXTVLCOPT:http-user-agent=")) {
        currentUA = nextLine.split("=")[1];
        i++;
      }

      const urlLine = lines[i + 1]?.trim() || "";
      if (urlLine.startsWith("http")) {
        const cookieMatch = urlLine.match(/hdntl=[^&]*/);
        if (cookieMatch) currentCookie = cookieMatch[0];

 // 🔥 REMOVE hdntl FROM URL
  const cleanUrl = urlLine
    .replace(/([?&])hdntl=[^&]*/g, "")
    .replace(/[?&]$/, "");

        output.push(
          `#EXTHTTP:${JSON.stringify({
            Cookie: currentCookie,
            "User-Agent": currentUA,
            Telegram: "@links_macha_official",
            Creator: "@DJ-TM",
          })}`
        );
        output.push(urlLine);
        i++;
      }
    }
  }

  return output.join("\n");
}

// ================= JIO GROUP FIX =================
function fixJioGroups(m3u) {
  return m3u.replace(/group-title="([^"]+)"/g, (m, g) => {
    if (g.startsWith("JIO")) return m;
    return `group-title="JIO ⭕ | ${g}"`;
  });
}

// ================= SONYLIV =================
function convertSonyliv(json) {
  if (!json || !Array.isArray(json.matches)) return "";

  const ua =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/129.0.0.0 Safari/537.36";

  return json.matches
    .filter((m) => m.isLive)
    .map((m) => {
      const url = m.dai_url || m.pub_url || m.video_url;
      if (!url) return null;

      return [
        `#EXTINF:-1 tvg-id="${m.contentId}" group-title="SonyLiv | Sports" tvg-logo="${m.src}",${m.match_name}`,
        `#EXTHTTP:${JSON.stringify({
          Origin: "https://www.sonyliv.com",
          Referer: "https://www.sonyliv.com/",
          "User-Agent": ua,
          Telegram: "@links_macha_official",
          Creator: "@DJ-TM",
        })}`,
        url,
      ].join("\n");
    })
    .filter(Boolean)
    .join("\n");
}

// ================= FANCODE =================
function convertFancode(json) {
  if (!json || !Array.isArray(json.matches)) return "";

  return json.matches
    .filter((m) => m.status === "LIVE")
    .map((m) => {
      const url = m.adfree_url || m.dai_url;
      if (!url) return null;

      return [
        `#EXTINF:-1 tvg-id="${m.match_id}" group-title="FanCode | Sports" tvg-logo="${m.src}",${m.match_name}`,
        url,
      ].join("\n");
    })
    .filter(Boolean)
    .join("\n");
}

// ================= SAFE FETCH =================
async function safeFetch(url, name) {
  try {
    const res = await axios.get(url, {
      timeout: 15000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    console.log(`✅ Loaded ${name}`);
    return res.data;
  } catch (e) {
    console.warn(`⚠️ Skipped ${name}`);
    return null;
  }
}

// ================= MAIN =================
async function run() {
  const finalM3U = [];
  finalM3U.push(PLAYLIST_HEADER.trim());

  const hotstar = await safeFetch(SOURCES.HOTSTAR_JSON, "Hotstar");
  if (hotstar) {
    finalM3U.push(section("VOOT | Jio Cinema"));
    finalM3U.push(convertHotstar(hotstar));
  }

  const zee5 = await safeFetch(SOURCES.ZEE5_M3U, "ZEE5");
  if (zee5) {
    finalM3U.push(section("ZEE5 | Live"));
    finalM3U.push(convertZee5(zee5));
  }

  const jio = await safeFetch(SOURCES.JIO_M3U, "JIO TV");
  if (jio) {
    finalM3U.push(section("JIO ⭕ | Live TV"));
    finalM3U.push(fixJioGroups(jio));
  }

  const extra = await safeFetch(SOURCES.EXTRA_M3U, "Extra");
  if (extra) {
    finalM3U.push(section("Other Channels"));
    finalM3U.push(extra);
  }

  const sony = await safeFetch(SOURCES.SONYLIV_JSON, "SonyLiv");
  if (sony) {
    finalM3U.push(section("SonyLiv | Sports"));
    finalM3U.push(convertSonyliv(sony));
  }

  const fan = await safeFetch(SOURCES.FANCODE_JSON, "FanCode");
  if (fan) {
    finalM3U.push(section("FanCode | Sports"));
    finalM3U.push(convertFancode(fan));
  }

  finalM3U.push(PLAYLIST_FOOTER.trim());

  fs.writeFileSync(OUTPUT_FILE, finalM3U.join("\n") + "\n");
  console.log(`✅ ${OUTPUT_FILE} generated successfully`);
}

run();
