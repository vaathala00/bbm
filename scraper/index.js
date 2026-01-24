const puppeteer = require("puppeteer");
const fs = require("fs");

// Hotstar URLs to scrape
const urls = [
  "https://www.hotstar.com/in/sports/cricket/kishans-76-vs-nz-in-2nd-t20i/1271525272/watch",
  "https://www.hotstar.com/in/sports/cricket/abhisheks-blitz-floors-nz/1271524824/watch"
];

// Format IST time
function getFormattedTime() {
  return new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true
  });
}

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const results = [];

  for (const url of urls) {
    const page = await browser.newPage();
    let m3u8Url = null;

    try {
      // Inject login cookies if provided
      if (process.env.BB_COOKIES) {
        const cookies = JSON.parse(process.env.BB_COOKIES);
        await page.setCookie(...cookies);
        console.log("🍪 Cookies injected");
      }

      // Listen to network requests to find .m3u8
      page.on("request", (req) => {
        const reqUrl = req.url();
        if (reqUrl.includes(".m3u8")) {
          m3u8Url = reqUrl;
          console.log("🎯 Found HLS URL:", m3u8Url);
        }
      });

      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: 60000
      });

      // Give extra time for Hotstar JS to generate HLS
      await page.waitForTimeout(8000);

      if (!m3u8Url) console.warn("❌ HLS not found:", url);
    } catch (err) {
      console.error("❌ Error:", err.message);
    } finally {
      await page.close();
    }

    results.push({
      source: url,
      m3u8: m3u8Url || "Not found"
    });
  }

  await browser.close();

  const output = {
    telegram: "https://t.me/vaathala1",
    "last update time": getFormattedTime(),
    stream: results
  };

  fs.writeFileSync("stream.json", JSON.stringify(output, null, 2));
  console.log("✅ stream.json saved");
})();
