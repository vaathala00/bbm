const axios = require("axios");
const puppeteer = require("puppeteer");
const fs = require("fs");

const urls = [
  "https://bq32.short.gy/O7fkma",
  "https://bigbosslive.com/live/",
].filter(Boolean);

function getFormattedTime() {
  const date = new Date();
  const options = {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  };

  const formatter = new Intl.DateTimeFormat("en-IN", options);
  const parts = formatter.formatToParts(date);

  const get = (type) => parts.find((p) => p.type === type)?.value;

  return `${get("hour")}:${get("minute")} ${get("dayPeriod")} ${get("day")}-${get("month")}-${get("year")}`;
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
      // 1. Try fetching raw page source (before JS executes)
      const { data: rawHTML } = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/118.0.5993.90 Safari/537.36",
        },
      });

      // 2. Try to extract hlsManifestUrl from raw HTML
      const hlsMatch = rawHTML.match(/"hlsManifestUrl":"(https:[^"]+\.m3u8[^"]*)"/);
      if (hlsMatch && hlsMatch[1]) {
        m3u8Url = hlsMatch[1].replace(/\\u0026/g, "&"); // decode escaped ampersands
        console.log(`🎯 Found hlsManifestUrl from raw HTML: ${m3u8Url}`);
      }

      // 3. If not found, fallback to Puppeteer for .m3u8 via network requests
      if (!m3u8Url) {
        let m3u8UrlsFromNetwork = new Set();

        page.on("request", (request) => {
          const reqUrl = request.url();
          if (reqUrl.includes(".m3u8")) {
            m3u8UrlsFromNetwork.add(reqUrl);
            console.log(`🔍 Found .m3u8 in network request: ${reqUrl}`);
          }
        });

        await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });

        resolvedUrl = page.url();

        // Wait a bit to allow network requests to finish
        await page.waitForTimeout(5000);

        if (m3u8UrlsFromNetwork.size > 0) {
          m3u8Url = [...m3u8UrlsFromNetwork][0];
        }
      }
    } catch (err) {
      console.error(`❌ Error while processing ${url}:`, err.message);
    } finally {
      if (!page.isClosed()) {
        await page.close();
      }
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

  fs.writeFileSync("stream.json", JSON.stringify(output, null, 2), "utf-8");
  console.log("✅ Saved all stream URLs to stream.json");
})();
