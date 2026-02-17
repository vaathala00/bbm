const axios = require("axios");
const fs = require("fs");

// ================= CONFIGURATION =================
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

  // ✅ NEW LOCAL TAMIL CHANNEL PAGES
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

// ================= PLAYLIST FOOTER =================
const PLAYLIST_FOOTER = `
# =========================================
# This m3u link is only for educational purposes
# =========================================
`;

// ================= UTILITIES =================

function section(title) {
  return `\n# ---------------=== ${title} ===-------------------\n`;
}

// ✅ INCREASED TIMEOUT FROM 15s TO 60s
async function safeFetch(url, name) {
  try {
    const res = await axios.get(url, { timeout: 60000 });
    console.log(`✅ Loaded ${name}`);
    return res.data;
  } catch (err) {
    // Only warn if it's not a timeout cancellation (to keep logs clean), or warn briefly
    if (err.code !== 'ECONNABORTED') {
        console.warn(`⚠️ Skipped ${name} (${err.message})`);
    } else {
        console.warn(`⚠️ Skipped ${name} (Request took too long > 60s)`);
    }
    return null;
  }
}

// ================= CONVERTERS =================

// --- LOCAL TAMIL JSON ---
function convertLocalTamil(jsonArray) {
  if (!Array.isArray(jsonArray)) return "";

  const out = [];

  jsonArray.forEach((ch) => {
    if (!ch.stream_url) return;

    const name = ch.title || "Unknown";
    const logo = ch.image || "";

    out.push(
      `#EXTINF:-1 tvg-name="${name}" tvg-logo="${logo}" group-title="VT 📺 | Local Channel Tamil",${name}`,
      ch.stream_url
    );
  });

  return out.join("\n");
}

// --- HOTSTAR ---
function convertHotstar(data) {
  // 1. Handle JSON format
  if (typeof data !== 'string' || !data.trim().startsWith('#EXTM3U')) {
    let json = data;
    if (!Array.isArray(json) && typeof json === 'object') {
      const possibleKeys = ['channels', 'data', 'results', 'streams', 'list'];
      for (const key of possibleKeys) {
        if (Array.isArray(json[key])) { json = json[key]; break; }
      }
    }
    if (Array.isArray(json)) {
      const out = [];
      json.forEach((ch) => {
        const rawUrl = ch.m3u8_url || ch.mpd_url || ch.url || ch.playback_url || ch.streamUrl;
        if (!rawUrl) return;
        try {
          const urlObj = new URL(rawUrl);
          const cookieMatch = rawUrl.match(/hdntl=[^&]*/);
          const cookie = cookieMatch ? cookieMatch[0] : "";
          const userAgent = decodeURIComponent(urlObj.searchParams.get("User-agent") || "") || "Hotstar;in.startv.hotstar/25.02.24.8.11169 (Android/15)";
          urlObj.searchParams.delete("User-agent"); 
          urlObj.searchParams.delete("Origin"); 
          urlObj.searchParams.delete("Referer");
          const logo = ch.logo || ch.logo_url || ch.image || "";
          const name = ch.name || ch.title || ch.channel_name || "Unknown";
          
          out.push(
            `#EXTINF:-1 group-title="VOOT | Jio Cinema" tvg-logo="${logo}" ,${name}`,
            `#EXTVLCOPT:http-user-agent=${userAgent}`,
            `#EXTHTTP:${JSON.stringify({ cookie: cookie, Origin: "https://www.hotstar.com", Referer: "https://www.hotstar.com/" })}`,
            urlObj.toString()
          );
        } catch (e) { console.error("Error parsing Hotstar JSON entry", e); }
      });
      return out.join("\n");
    }
    return "";
  }

  // 2. Handle RAW M3U String
  console.log("✅ Hotstar: Parsing and reformatting raw M3U...");
  const lines = data.split('\n');
  const out = [];
  let currentInf = "";

  const getRawParam = (url, name) => {
    const regex = new RegExp(`(?:[?&%7C])${name}=([^&]*)`);
    const match = url.match(regex);
    return match ? match[1] : "";
  };

  const DEFAULT_UA = "Hotstar;in.startv.hotstar/25.02.24.8.11169 (Android/15)";
  const DEFAULT_ORIGIN = "https://www.hotstar.com";
  const DEFAULT_REFERER = "https://www.hotstar.com/";

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF')) {
      const logoMatch = line.match(/tvg-logo="([^"]*)"/);
      const logo = logoMatch ? logoMatch[1] : "";
      const lastComma = line.lastIndexOf(',');
      const name = (lastComma !== -1) ? line.substring(lastComma + 1).trim() : "Unknown";
      currentInf = `#EXTINF:-1 group-title="VOOT | Jio Cinema" tvg-logo="${logo}" ,${name}`;
    } 
    else if (line.startsWith('http')) {
      const cookie = getRawParam(line, 'Cookie');
      let userAgent = getRawParam(line, 'User-agent');
      let origin = getRawParam(line, 'Origin');
      let referer = getRawParam(line, 'Referer');

      if (!userAgent) userAgent = DEFAULT_UA;
      if (!origin) origin = DEFAULT_ORIGIN;
      if (!referer) referer = DEFAULT_REFERER;

      const cleanUrl = line.split('?')[0];

      if (currentInf) {
        out.push(currentInf);
        const safeUA = userAgent.replace(/ /g, "%20");
        out.push(`#EXTVLCOPT:http-user-agent=${safeUA}`);

        const headers = {
          cookie: cookie,
          Origin: origin,
          Referer: referer
        };
        out.push(`#EXTHTTP:${JSON.stringify(headers)}`);
        out.push(cleanUrl);
        
        currentInf = "";
      }
    }
  }

  console.log(`✅ Processed ${out.length / 4} Hotstar channels.`);
  return out.join("\n");
}

// --- JIO ---
function convertJioJson(json) {
  if (!json) return "";
  const out = [];

  for (const id in json) {
    const ch = json[id];
    const cookie = `hdnea=${ch.url.match(/__hdnea__=([^&]*)/)?.[1] || ""}`;

    out.push(
      `#EXTINF:-1 tvg-id="${id}" tvg-logo="${ch.tvg_logo}" group-title="JIO ⭕ | Live TV",${ch.channel_name}`,
      `#KODIPROP:inputstream.adaptive.license_type=clearkey`,
      `#KODIPROP:inputstream.adaptive.license_key=${ch.kid}:${ch.key}`,
      `#EXTHTTP:${JSON.stringify({
        Cookie: cookie,
        "User-Agent": ch.user_agent,
      })}`,
      ch.url
    );
  }
  return out.join("\n");
}

// --- SONYLIV ---
function convertSonyliv(json) {
  if (!Array.isArray(json.matches)) return "";
  return json.matches
    .filter((m) => m.isLive)
    .map((m) => {
      const url = m.dai_url || m.pub_url;
      if (!url) return null;
      return `#EXTINF:-1 tvg-logo="${m.src}" group-title="SonyLiv | Sports",${m.match_name}\n${url}`;
    })
    .filter(Boolean)
    .join("\n");
}

// --- FANCODE ---
function convertFancode(json) {
  if (!Array.isArray(json.matches)) return "";
  return json.matches
    .filter((m) => m.status === "LIVE")
    .map((m) => {
      const url = m.adfree_url || m.dai_url;
      if (!url) return null;
      return `#EXTINF:-1 tvg-logo="${m.src}" group-title="FanCode | Sports",${m.match_name}\n${url}`;
    })
    .filter(Boolean)
    .join("\n");
}

// --- ICC TV ---
function convertIccTv(json) {
  if (!Array.isArray(json.tournaments)) return "";
  const out = [];

  json.tournaments.forEach((t) => {
    if (t.status !== "success") return;

    t.live_streams.forEach((s) => {
      if (!s.mpd || !s.keys) return;

      out.push(
        `#KODIPROP:inputstream.adaptive.license_type=clearkey`,
        `#KODIPROP:inputstream.adaptive.license_key=${s.keys}`,
        `#EXTINF:-1 group-title="T20 World Cup |Live Matches" tvg-logo="${s.match?.thumbnail || ""}",ICC-${s.title || "Live"}`,
        s.mpd
      );
    });
  });

  return out.join("\n");
}

// --- SPORTS JSON ---
function convertSportsJson(json) {
  if (!json || !Array.isArray(json.streams)) return "";
  const out = [];

  json.streams.forEach((s, i) => {
    if (!s.url) return;

    const urlObj = new URL(s.url);
    const drm = urlObj.searchParams.get("drmLicense") || "";
    const [kid, key] = drm.split(":");

    const ua = urlObj.searchParams.get("User-Agent") || "";
    const hdnea = urlObj.searchParams.get("__hdnea__") || "";

    urlObj.searchParams.delete("drmLicense");
    urlObj.searchParams.delete("User-Agent");

    out.push(
      `#EXTINF:-1 tvg-id="${1100 + i}" tvg-logo="https://img.u0k.workers.dev/joinvaathala1.webp" group-title="T20 World Cup |Live Matches",${s.language}`,
      `#KODIPROP:inputstream.adaptive.license_type=clearkey`,
      `#KODIPROP:inputstream.adaptive.license_key=${kid}:${key}`,
      `#EXTHTTP:${JSON.stringify({
        Cookie: hdnea ? `__hdnea__=${hdnea}` : "",