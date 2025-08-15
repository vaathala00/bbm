const fs = require("fs");
const puppeteer = require("puppeteer");

const urls = [
  "https://www.twitch.tv/kukeeku",
  "https://bigbosslive.com/live/"
].filter(Boolean); // Remove any empty or falsy URLs

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

      // Intercept requests to catch .m3u8 URLs
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

      // Try clicking play button (optional, may fail silently)
      await page.click('button[data-a-target="player-overlay-play-button"]').catch(() => {});

      // Wait for stream to load
      await page.waitForTimeout(15000);

      results.push({
        source_url: url,
        stream_url: m3u8Url || "Not found"
      });

    } catch (error) {
      console.error(`Error processing ${url}:`, error);
      results.push({
        source_url: url,
        stream_url: "Error"
      });
    }

    await page.close();
  }

  await browser.close();

  // Save results to JSON file
  fs.writeFileSync("stream.json", JSON.stringify(results, null, 2));
  console.log("Saved all stream URLs to stream.json");
})();
