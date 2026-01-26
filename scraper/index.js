const axios = require("axios");
const fs = require("fs");

const OUTPUT_FILE = "stream.m3u";

// SOURCES
const HOTSTAR_JSON =
  "https://cloudplay-app.cloudplay-help.workers.dev/hotstar?password=all";

const ZEE5_M3U =
  "https://raw.githubusercontent.com/cloudplay97/m3u/main/zee5.m3u";

const EXTRA_M3U =
  "https://od.lk/s/MjFfNTI0OTk4NTBf/raw?=m3u";

// ---------------- HOTSTAR JSON → M3U ----------------
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

// ---------------- M3U GROUP FIX ----------------
function fixGroups(m3u) {
  return m3u
    .split("\n")
    .map(line => {
      if (line.startsWith("#EXTINF")) {
        if (line.includes("Zee")) {
          return line.replace(
            /group-title=".*?"/,
            'group-title="ZEE5 | Live"'
          );
        }
      }
      return line;
    })
    .join("\n");
}

// ---------------- MAIN ----------------
async function run() {
  try {
    let finalM3U = ["#EXTM3U"];

    // HOTSTAR
    const hotstar = await axios.get(HOTSTAR_JSON);
    finalM3U.push(convertHotstar(hotstar.data));

    // ZEE5
    const zee5 = await axios.get(ZEE5_M3U);
    finalM3U.push(fixGroups(zee5.data));

    // EXTRA
    const extra = await axios.get(EXTRA_M3U);
    finalM3U.push(extra.data);

    fs.writeFileSync(OUTPUT_FILE, finalM3U.join("\n") + "\n", "utf8");
    console.log("✅ stream.m3u updated");
  } catch (e) {
    console.error("❌ Error:", e.message);
    process.exit(1);
  }
}

run();
