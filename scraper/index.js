const fs = require("fs");
const https = require("https");
const puppeteer = require("puppeteer");

const urls = [
  "https://bq32.short.gy/O7fkma", // Kick stream short URL
  "https://www.twitch.tv/heyimenbhizeebal?sr=a",
  "https://www.twitch.tv/kukeeku",
  "https://bigbosslive.com/live/"
].filter(Boolean);

// Expand short URL
function expandShortURL(shortUrl) {
  return new Promise((resolve) => {
    https.get(shortUrl, (res) => {
      resolve(res.headers.location || shortUrl);
    }).on("error", () => {
      resolve(shortUrl);
    });
  });
}

// ✅ Proper IST Time Function
function getFormattedTime() {
  const date = new Date();
  const options = {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  };

  const formatter = new Intl.DateTimeFormat("en-IN", options);
  const parts = formatter.formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value;

  return `${get("hour")}:${get("minute")} ${get("dayPeriod")} ${get("day")}-${get("month")}-${get("year")}`;
}

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const results = [];

  for (const originalUrl of urls) {
    const page = await browser.newPage();
    let m3u8Url = null;

    try {
      const expandedUrl = await expandShortURL(originalUrl);
      console.log(`Visiting: ${expandedUrl}`);

      // Set user agent for compatibility
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0"
      );

      await page.setRequestInterception(true);
      page.on("request", (request) => {
        const reqUrl = request.url();
        if (reqUrl.includes(".m3u8") && !m3u8Url) {
          m3u8Url = reqUrl;
          console.log(`✅ Found .m3u8 URL on ${expandedUrl}: ${reqUrl}`);
        }
        request.continue();
      });

      await page.goto(expandedUrl, {
        waitUntil: "domcontentloaded",
        timeout: 60000
      });

      // Try clicking play button for both Twitch and Kick
      await page.click('button[data-a-target="player-overlay-play-button"]').catch(() => {});
      await page.click('[data-testid="play-button"]').catch(() => {});

      // Wait longer for stream to load
      await page.waitForTimeout(20000);

      results.push({
        source_url: originalUrl,
        [`stream_url${results.length + 1}`]: m3u8Url || "Not found"
      });

    } catch (error) {
      console.error(`❌ Error processing ${originalUrl}:`, error);
      results.push({
        source_url: originalUrl,
        [`stream_url${results.length + 1}`]: "Error"
      });
    }

    await page.close();
  }

  await browser.close();

  const output = {
    telegram: "https://t.me/vaathala1",
    "last update time": getFormattedTime(),
    stream: results
  };

  fs.writeFileSync("stream.json", JSON.stringify(output, null, 2));
  console.log("✅ Saved all stream URLs to stream.json");
})();
