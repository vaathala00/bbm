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

    try {
      // Inject login cookies if provided
      if (process.env.BB_COOKIES) {
        const cookies = JSON.parse(process.env.BB_COOKIES);
        await page.setCookie(...cookies);
        console.log("🍪 Login cookies injected");
      }

      // Capture network requests for .m3u8
      const found = new Set();
      page.on("request", (req) => {
        const reqUrl = req.url();
        if (reqUrl.includes(".m3u8")) {
          found.add(reqUrl);
          console.log("🔍 Found HLS:", reqUrl);
        }
      });

      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
      await page.waitForTimeout(6000);

      if (found.size) m3u8Url = [...found][0];

    } catch (err) {
      console.error("❌ Error scraping URL:", url, err.message);
    } finally {
      await page.close();
    }

    results.push({
      source: url,
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
