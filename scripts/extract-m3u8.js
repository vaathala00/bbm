const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

(async () => {
  const OUTPUT_DIR = path.resolve(__dirname, "extracted");
  const OUTPUT_FILE = path.join(OUTPUT_DIR, "stream.json");
  const TARGET_URL = "https://bigbosslive.com/live/";

  let browser;

  try {
    console.log("Launching browser...");
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    const client = await page.target().createCDPSession();
    await client.send("Network.enable");

    let m3u8Url = null;

    const waitForM3U8 = new Promise((resolve) => {
      client.on("Network.responseReceived", async (params) => {
        const url = params.response.url;
        if (url.includes(".m3u8") && !m3u8Url) {
          m3u8Url = url;
          console.log("✅ Found stream:", m3u8Url);
          resolve();
        }
      });
    });

    console.log(`Navigating to ${TARGET_URL}...`);
    await page.goto(TARGET_URL, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    console.log("⏳ Waiting for .m3u8 stream or 15s timeout...");
    await Promise.race([
      waitForM3U8,
      page.waitForTimeout(15000),
    ]);

    if (m3u8Url) {
      if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      }

      fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ url: m3u8Url }, null, 2));
      console.log(`✅ Stream URL saved to ${OUTPUT_FILE}`);
    } else {
      console.error("❌ No .m3u8 stream URL found.");
      process.exit(1);
    }

  } catch (error) {
    console.error("❌ An error occurred:", error.message);
    process.exit(1);

  } finally {
    if (browser) {
      await browser.close();
      console.log("🧹 Browser closed.");
    }
  }
})();
