// worker.js
const axios = require("axios");
const puppeteer = require("puppeteer");
const fs = require("fs");

// 🔗 Hotstar URLs to process
const urls = [
  "https://www.hotstar.com/in/sports/cricket/kishans-76-vs-nz-in-2nd-t20i/1271525272/watch",
  // Add more URLs here if needed
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
      // 🔐 Optional: inject login cookies
      if (process.env.BB_COOKIES) {
        const cookies = JSON.parse(process.env.BB_COOKIES);
        await page.setCookie(...cookies);
        console.log("🍪 Login cookies injected");
      }

      // ⚡ First try: fetch raw HTML
      try {
        const { data } = await axios.get(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120",
          },
        });

        // Look for HLS links in HTML
        const matches = data.match(
          /"hlsManifestUrl":"(https:[^"]+\.m3u8[^"]*)"/g
        );

        if (matches) {
          // Filter Tamil links
          const tamLink = matches
            .map(m => m.replace(/"hlsManifestUrl":"|\\u0026/g, ""))
            .find(u => u.includes("/tam/"));

          if (tamLink) {
            m3u8Url = tamLink;
            console.log("🎯 Found Tamil m3u8 in HTML:", m3u8Url);
          }
        }
      } catch (err) {
        console.warn("⚠️ Axios HTML fetch failed:", err.message);
      }

      // 🕷️ Fallback: Puppeteer network sniffing
      if (!m3u8Url) {
        const found = new Set();

        page.on("request", (req) => {
          const reqUrl = req.url();
          if (reqUrl.includes(".m3u8") && reqUrl.includes("/tam/")) {
            found.add(reqUrl);
            console.log("🔍 Network m3u8 (Tamil):", reqUrl);
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

      if (!m3u8Url) {
        console.warn("❌ Tamil m3u8 not found for URL:", url);
      }
    } catch (err) {
      console.error("❌ Error processing URL:", url, err.message);
    } finally {
      await page.close();
    }

    results.push({
      source: resolvedUrl,
      m3u8: m3u8Url || "Not found",
    });
  }

  await browser.close();

  // Save results
  const output = {
    telegram: "https://t.me/vaathala1",
    "last update time": getFormattedTime(),
    stream: results,
  };

  fs.writeFileSync("stream.json", JSON.stringify(output, null, 2));
  console.log("✅ stream.json saved");
})();
