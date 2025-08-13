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

    // Listen for .m3u8 links in console output
    page.on('console', async (msg) => {
      const text = msg.text();
      if (text.includes('.m3u8') && !m3u8Url) {
        m3u8Url = text.match(/https?:\/\/.*?\.m3u8(\?.*?)?/i)?.[0];
        if (m3u8Url) {
          console.log("🎯 Found .m3u8 in console log:", m3u8Url);
        }
      }
    });

    console.log(`🌐 Navigating to ${TARGET_URL}...`);
    await page.goto(TARGET_URL, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    // Wait up to 20 seconds for console log to appear
    console.log("⏳ Waiting for console logs to contain .m3u8...");
    const waitUntil = Date.now() + 20000;
    while (!m3u8Url && Date.now() < waitUntil) {
      await page.waitForTimeout(500);
    }

    if (m3u8Url) {
      if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      }

      fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ url: m3u8Url }, null, 2));
      console.log(`✅ Stream URL saved to ${OUTPUT_FILE}`);
    } else {
      console.error("❌ No .m3u8 URL found in console.");
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
