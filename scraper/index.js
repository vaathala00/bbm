const fs = require("fs");
const puppeteer = require("puppeteer");

const urls = [
  "https://bq32.short.gy/O7fkma", // Example short URL
  "https://www.twitch.tv/heyimenbhizeebal?sr=a",
  "https://www.twitch.tv/kukeeku",
  "https://bigbosslive.com/live/"
].filter(Boolean);

// ✅ Proper IST Time Function
function getFormattedTime() {
  const date = new Date();
  const options = {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  };

  const formatter = new Intl.DateTimeFormat('en-IN', options);
  const parts = formatter.formatToParts(date);

  const get = (type) => parts.find(p => p.type === type)?.value;

  const hour = get('hour');
  const minute = get('minute');
  const ampm = get('dayPeriod');
  const day = get('day');
  const month = get('month');
  const year = get('year');

  return `${hour}:${minute} ${ampm} ${day}-${month}-${year}`;
}

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const results = [];

  for (const url of urls) {
    const page = await browser.newPage();
    let m3u8Url = null;

    try {
      console.log(`Visiting: ${url}`);

      // Listen for response to catch redirects
      page.on('response', (response) => {
        if (response.status() === 301 || response.status() === 302) {
          console.log(`Redirected from ${url} to ${response.headers()['location']}`);
        }
      });

      await page.setRequestInterception(true);
      page.on("request", (request) => {
        const reqUrl = request.url();
        if (reqUrl.includes(".m3u8") && !m3u8Url) {
          m3u8Url = reqUrl;
          console.log(`Found .m3u8 URL on ${url}:`, reqUrl);
        }
        request.continue();
      });

      await page.goto(url, {
        waitUntil: "domcontentloaded", // Wait until the DOM is loaded
        timeout: 60000, // Increased timeout to handle slow loading
      });

      await page.click('button[data-a-target="player-overlay-play-button"]').catch(() => {});

      await page.waitForTimeout(15000); // Wait for stream to load

      results.push({
        source_url: url,
        [`stream_url${results.length + 1}`]: m3u8Url || "Not found"
      });

    } catch (error) {
      console.error(`Error processing ${url}:`, error);
      results.push({
        source_url: url,
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
