const fs = require("fs");
const puppeteer = require("puppeteer");

const urls = [
  "https://www.twitch.tv/kukeeku",
  "https://bigbosslive.com/live/"
].filter(Boolean); // Remove falsy URLs

function getFormattedTime() {
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  const hours24 = now.getHours();
  const hours = hours24 % 12 || 12;
  const ampm = hours24 >= 12 ? "PM" : "AM";
  const minutes = pad(now.getMinutes());
  const day = pad(now.getDate());
  const month = pad(now.getMonth() + 1);
  const year = now.getFullYear();
  return `${pad(hours)}:${minutes} ${ampm} ${day}-${month}-${year}`;
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
        waitUntil: "networkidle2",
        timeout: 0
      });

      // Try clicking play button (works for Twitch)
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

  // Final structured output
  const output = {
    telegram: "https://t.me/vaathala1",
    "last update time": getFormattedTime(),
    stream: results
  };

  fs.writeFileSync("stream.json", JSON.stringify(output, null, 2));
  console.log("Saved all stream URLs to stream.json");
})();
