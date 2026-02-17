const axios = require("axios");
const fs = require("fs");

const OUTPUT_FILE = "stream.m3u";

// ================= SOURCES =================
const SOURCES = {
  HOTSTAR_M3U: "https://livetv.panguplay.workers.dev/hotstar?uid=vaathala",
  ZEE5_M3U: "https://join-vaathala1-for-more.vodep39240327.workers.dev/zee5.m3u",
  EXTRA_M3U: "https://od.lk/s/MzZfODQzNTQ1Nzlf/raw?=m3u",
  JIO_JSON: "https://raw.githubusercontent.com/vaathala00/jo/main/stream.jso",
  SONYLIV_JSON: "https://raw.githubusercontent.com/drmlive/sliv-live-events/main/sonyliv.json",
  FANCODE_JSON: "https://raw.githubusercontent.com/drmlive/fancode-live-events/main/fancode.json",
  ICC_TV_JSON: "https://icc.vodep39240327.workers.dev/icctv.jso",
  SPORTS_JSON: "https://sports.vodep39240327.workers.dev/sports.jso",

  LOCAL_JSON: [
    "https://b4u.vodep39240327.workers.dev/1.json?url=https://tulnit.com/channel/local-tamil-tv/",
    "https://b4u.vodep39240327.workers.dev/1.json?url=https://tulnit.com/channel/local-tamil-tv/page/2",
    "https://b4u.vodep39240327.workers.dev/1.json?url=https://tulnit.com/channel/local-tamil-tv/page/3",
    "https://b4u.vodep39240327.workers.dev/1.json?url=https://tulnit.com/channel/local-tamil-tv/page/4",
    "https://b4u.vodep39240327.workers.dev/1.json?url=https://tulnit.com/channel/local-tamil-tv/page/5",
    "https://b4u.vodep39240327.workers.dev/1.json?url=https://tulnit.com/channel/local-tamil-tv/page/6",
    "https://b4u.vodep39240327.workers.dev/1.json?url=https://tulnit.com/channel/local-tamil-tv/page/7",
  ],
};

// ================= PLAYLIST HEADER =================
const PLAYLIST_HEADER = `#EXTM3U
#EXTM3U x-tvg-url="https://epgshare01.online/epgshare01/epg_ripper_IN4.xml.gz"
#EXTM3U x-tvg-url="https://mitthu786.github.io/tvepg/tataplay/epg.xml.gz"
#EXTM3U x-tvg-url="https://avkb.short.gy/tsepg.xml.gz"
# ===== Vaathala Playlist =====
# Join Telegram: @vaathala1
`;

const PLAYLIST_FOOTER = `
# =========================================
# This m3u link is only for educational purposes
# =========================================
`;

function section(title) {
  return `\n# ---------------=== ${title} ===-------------------\n`;
}

// ================= SAFE FETCH (Improved) =================
async function safeFetch(url, name, retries = 2) {
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const res = await axios.get(url, {
        timeout: 60000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
      });

      console.log(`✅ Loaded ${name}`);
      return res.data;

    } catch (err) {
      console.warn(`⚠️ Attempt ${attempt} failed for ${name}`);

      if (attempt > retries) {
        console.warn(`❌ Skipped ${name}`);
        return null;
      }

      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

// ================= LOCAL TAMIL =================
function convertLocalTamil(jsonArray) {
  if (!Array.isArray(jsonArray)) return "";

  return jsonArray
    .filter(ch => ch.stream_url)
    .map(ch => {
      const name = ch.title || "Unknown";
      const logo = ch.image || "";
      return `#EXTINF:-1 tvg-name="${name}" tvg-logo="${logo}" group-title="VT 📺 | Local Channel Tamil",${name}\n${ch.stream_url}`;
    })
    .join("\n");
}

// ================= HOTSTAR =================
function convertHotstar(data) {
  if (!data) return "";

  if (typeof data !== "string" || !data.trim().startsWith("#EXTM3U")) {
    if (!Array.isArray(data)) return "";
    return data.map(ch => {
      if (!ch.m3u8_url) return null;
      return `#EXTINF:-1 group-title="VOOT | Jio Cinema" tvg-logo="${ch.logo || ""}",${ch.name}\n${ch.m3u8_url}`;
    }).filter(Boolean).join("\n");
  }

  return data;
}

// ================= JIO =================
function convertJioJson(json) {
  if (!json) return "";

  return Object.entries(json).map(([id, ch]) => {
    return `#EXTINF:-1 tvg-id="${id}" tvg-logo="${ch.tvg_logo}" group-title="JIO ⭕ | Live TV",${ch.channel_name}
#KODIPROP:inputstream.adaptive.license_type=clearkey
#KODIPROP:inputstream.adaptive.license_key=${ch.kid}:${ch.key}
${ch.url}`;
  }).join("\n");
}

// ================= SONYLIV =================
function convertSonyliv(json) {
  if (!json?.matches) return "";
  return json.matches
    .filter(m => m.isLive)
    .map(m => `#EXTINF:-1 tvg-logo="${m.src}" group-title="SonyLiv | Sports",${m.match_name}\n${m.dai_url || m.pub_url}`)
    .join("\n");
}

// ================= FANCODE =================
function convertFancode(json) {
  if (!json?.matches) return "";
  return json.matches
    .filter(m => m.status === "LIVE")
    .map(m => `#EXTINF:-1 tvg-logo="${m.src}" group-title="FanCode | Sports",${m.match_name}\n${m.adfree_url || m.dai_url}`)
    .join("\n");
}

// ================= MAIN =================
async function run() {
  const out = [];
  out.push(PLAYLIST_HEADER.trim());

  // ---------- LOCAL TAMIL (Parallel Load) ----------
  const localResults = await Promise.all(
    SOURCES.LOCAL_JSON.map(url => safeFetch(url, "Local Tamil"))
  );

  const allLocal = localResults
    .filter(Array.isArray)
    .flat();

  if (allLocal.length) {
    out.push(section("VT 📺 | Local Channel Tamil"));
    out.push(convertLocalTamil(allLocal));
  }

  // ---------- OTHER SOURCES ----------
  const [
    hotstar,
    zee5,
    jio,
    sony,
    fan,
    extra
  ] = await Promise.all([
    safeFetch(SOURCES.HOTSTAR_M3U, "Hotstar"),
    safeFetch(SOURCES.ZEE5_M3U, "ZEE5"),
    safeFetch(SOURCES.JIO_JSON, "JIO"),
    safeFetch(SOURCES.SONYLIV_JSON, "SonyLiv"),
    safeFetch(SOURCES.FANCODE_JSON, "FanCode"),
    safeFetch(SOURCES.EXTRA_M3U, "Extra"),
  ]);

  if (hotstar) out.push(section("VOOT | Jio Cinema"), convertHotstar(hotstar));
  if (zee5) out.push(section("ZEE5 | Live"), zee5);
  if (jio) out.push(section("JIO ⭕ | Live TV"), convertJioJson(jio));
  if (sony) out.push(section("SonyLiv | Sports"), convertSonyliv(sony));
  if (fan) out.push(section("FanCode | Sports"), convertFancode(fan));
  if (extra) out.push(section("Other Channels"), extra);

  out.push(PLAYLIST_FOOTER.trim());

  fs.writeFileSync(OUTPUT_FILE, out.join("\n") + "\n");
  console.log(`\n🎉 ${OUTPUT_FILE} generated successfully`);
}

run();
