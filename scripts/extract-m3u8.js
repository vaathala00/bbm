const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

(async () => {
  const OUTPUT_DIR = path.resolve(__dirname, "extracted");
  const OUTPUT_FILE = path.join(OUTPUT_DIR, "stream.json");
  const TARGET_URL = "https://bigbosslive.com/live/";

  let browser;

  try {
    console.log("🚀 Launching browser...");
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    let m3u8Url = null;

    // Filter for .m3u8 in console logs
    page.on('console', async (msg) => {
      const text = msg.text();
      if (text.includes('.m3u8') && !m3u8Url) {
        const match = text.match(/https?:\/\/[^\s'"\\<>]+\.m3u8(\?[^\s'"\\<>]*)?/);
        if (match) {
          m3u8Url = match[0];
          console.log("🎯 Found .m3u8 URL:", m3u8Url);
        }
      }
    });

    console.log(`🌐 Navigating to ${TARGET_URL}...`);
    await page.goto(TARGET_URL, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    console.log("⏳ Waiting for .m3u8 console log...");
    const timeout = 20000;
    const pollInterval = 500;
    const endTime = Date.now() + timeout;

    while (!m3u8Url && Date.now() < endTime) {
      await page.waitForTimeout(pollInterval);
    }

    if (m3u8Url) {
      if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      }

      fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ url: m3u8Url }, null, 2));
      console.log(`✅ Saved stream URL to: ${OUTPUT_FILE}`);
    } else {
      console.error("❌ No .m3u8 URL found in console.");
      process.exit(1);
    }

  } catch (error) {
    console.error("❌ Script error:", error.message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
      console.log("🧹 Browser closed.");
    }
  }
})();
