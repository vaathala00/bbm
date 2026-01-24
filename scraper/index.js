const axios = require("axios");
const puppeteer = require("puppeteer");
const fs = require("fs");

const urls = [
  "https://bq32.short.gy/O7fkma",
  "https://bigbosslive.com/live/",
];

// Format IST time
function getFormattedTime() {
  return new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const results = [];

  for (const url of urls) {
    const page = await browser.newPage();
    let m3u8Url = null;
    let resolvedUrl = url;

    try {
      // 🔐 Inject login cookies (for bigbosslive.com)
      if (process.env.BB_COOKIES) {
        const cookies = JSON.parse(process.env.BB_COOKIES);
        await page.setCookie(...cookies);
        console.log("🍪 Login cookies injected");
      }

      // ⚡ Try raw HTML first
      try {
        const { data } = await axios.get(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120",
          },
        });

        const match = data.match(
          /"hlsManifestUrl":"(https:[^"]+\.m3u8[^"]*)"/
        );

        if (match) {
          m3u8Url = match[1].replace(/\\u0026/g, "&");
          console.log("🎯 Found m3u8 in HTML:", m3u8Url);
        }
      } catch (_) {}

      // 🕷️ Fallback: Puppeteer network sniffing
      if (!m3u8Url) {
        const found = new Set();

        page.on("request", (req) => {
          if (req.url().includes(".m3u8")) {
            found.add(req.url());
            console.log("🔍 Network m3u8:", req.url());
          }
        });

        await page.goto(url, {
          waitUntil: "networkidle2",
          timeout: 30000,
        });

        resolvedUrl = page.url();
        await page.waitForTimeout(6000);

        if (found.size) m3u8Url = [...found][0];
      }
    } catch (err) {
      console.error("❌ Error:", err.message);
    } finally {
      await page.close();
    }

    results.push({
      source: resolvedUrl,
      m3u8: m3u8Url || "Not found",
    });
  }

  await browser.close();

  const output = {
    telegram: "https://t.me/vaathala1",
    "last update time": getFormattedTime(),
    stream: results,
  };

  fs.writeFileSync("stream.json", JSON.stringify(output, null, 2));
  console.log("✅ stream.json saved");
})();
