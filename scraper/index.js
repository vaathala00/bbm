const axios = require("axios");
const fs = require("fs");

const OUTPUT_FILE = "stream.m3u";

// ================= SOURCES =================
const SOURCES = {
  HOTSTAR_JSON: "https://cloudplay-app.cloudplay-help.workers.dev/hotstar?password=all",
  ZEE5_M3U: "https://raw.githubusercontent.com/Sufiyan123yivh/Testing/refs/heads/main/Zee5.m3u",
  EXTRA_M3U: "https://od.lk/s/MzZfODQzNTQ1Nzlf/raw?=m3u",
  JIO_JSON: "https://raw.githubusercontent.com/vaathala00/jo/main/stream.jso",
  SONYLIV_JSON: "https://raw.githubusercontent.com/drmlive/sliv-live-events/main/sonyliv.json",
  FANCODE_JSON: "https://raw.githubusercontent.com/drmlive/fancode-live-events/main/fancode.json",
  ICC_TV_JSON: "https://psplay.indevs.in/icctv",
  SPORTS_JSON: "https://sports.vodep39240327.workers.dev/sports.jso",
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

// ================= SECTION =================
function section(title) {
  return `\n# ---------------=== ${title} ===-------------------\n`;
}

// ================= HOTSTAR =================
function convertHotstar(json) {
  if (!Array.isArray(json)) return "";
  const out = [];

  json.forEach((ch) => {
    const url = ch.mpd_url || ch.m3u8_url;
    if (!url) return;

    out.push(
      `#EXTINF:-1 tvg-logo="${ch.logo}" group-title="VOOT | Jio Cinema",${ch.name}`,
      `#EXTHTTP:${JSON.stringify({
        ...ch.headers,
        Referer: "https://www.hotstar.com/",
        Origin: "https://www.hotstar.com",
        "User-Agent":
          ch.user_agent ||
          "Hotstar;in.startv.hotstar/25.01.27.5.3788 (Android/13)",
      })}`,
      url
    );
  });

  return out.join("\n");
}

// ================= ZEE5 =================
function convertZee5(m3u) {
  const lines = m3u.split("\n");
  const out = [];
  let ua =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36";
  let cookie = "";

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    if (line.startsWith("#EXTINF")) {
      out.push(line.replace(/group-title=".*?"/, 'group-title="ZEE5 | Live"'));

      const url = lines[i + 1]?.trim();
      if (url?.startsWith("http")) {
        const m = url.match(/hdntl=[^&]*/);
        if (m) cookie = m[0];

        const clean = url
          .replace(/([?&])hdntl=[^&]*/g, "")
          .replace(/[?&]$/, "");

        out.push(
          `#EXTHTTP:${JSON.stringify({
            Cookie: cookie,
            "User-Agent": ua,
          })}`,
          clean
        );
        i++;
      }
    }
  }
  return out.join("\n");
}

// ================= JIO =================
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

// ================= SONYLIV =================
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

// ================= FANCODE =================
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

// ================= ICC TV =================
function convertIccTv(json) {
  if (!Array.isArray(json.tournaments)) return "";
  const out = [];

  json.tournaments.forEach((t) => {
    if (t.status !== "success") return;

    t.live_streams.forEach((s) => {
      if (!s.mpd || !s.keys) return;

      const logo = s.match?.thumbnail || "";
      const title = s.title || "ICC Live";

      out.push(
        `#KODIPROP:inputstream.adaptive.license_type=clearkey`,
        `#KODIPROP:inputstream.adaptive.license_key=${s.keys}`,
        `#EXTINF:-1 group-title="T20 World Cup |Live Matches" tvg-logo="${logo}",ICC-${title}`,
        s.mpd
      );
    });
  });

  return out.join("\n");
}

// ================= SPORTS JSON =================
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
        Origin: "",
        Referer: "",
        "User-Agent": ua,
        Telegram: "@vaathala1",
        Creator: "@vaathala1",
      })}`,
      urlObj.toString()
    );
  });

  return out.join("\n");
}

// ================= SAFE FETCH =================
async function safeFetch(url, name) {
  try {
    const res = await axios.get(url, { timeout: 15000 });
    console.log(`✅ Loaded ${name}`);
    return res.data;
  } catch {
    console.warn(`⚠️ Skipped ${name}`);
    return null;
  }
}

// ================= MAIN =================
async function run() {
  const out = [];
  out.push(PLAYLIST_HEADER.trim());

  const hotstar = await safeFetch(SOURCES.HOTSTAR_JSON, "Hotstar");
  if (hotstar) out.push(section("VOOT | Jio Cinema"), convertHotstar(hotstar));

  const zee5 = await safeFetch(SOURCES.ZEE5_M3U, "ZEE5");
  if (zee5) out.push(section("ZEE5 | Live"), convertZee5(zee5));

  const jio = await safeFetch(SOURCES.JIO_JSON, "JIO");
  if (jio) out.push(section("JIO ⭕ | Live TV"), convertJioJson(jio));

  const sports = await safeFetch(SOURCES.SPORTS_JSON, "Sports JSON");
  if (sports)
    out.push(section("T20 World Cup | Live Matches"), convertSportsJson(sports));

  const icc = await safeFetch(SOURCES.ICC_TV_JSON, "ICC TV");
  if (icc) out.push(section("ICC TV"), convertIccTv(icc));

  const sony = await safeFetch(SOURCES.SONYLIV_JSON, "SonyLiv");
  if (sony) out.push(section("SonyLiv | Sports"), convertSonyliv(sony));

  const fan = await safeFetch(SOURCES.FANCODE_JSON, "FanCode");
  if (fan) out.push(section("FanCode | Sports"), convertFancode(fan));

  const extra = await safeFetch(SOURCES.EXTRA_M3U, "Extra");
  if (extra) out.push(section("Other Channels"), extra);

  out.push(PLAYLIST_FOOTER.trim());

  fs.writeFileSync(OUTPUT_FILE, out.join("\n") + "\n");
  console.log(`✅ ${OUTPUT_FILE} generated successfully`);
}

run();
