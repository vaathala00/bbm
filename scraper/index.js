const fs = require("fs");
const puppeteer = require("puppeteer");

const urls = [
  "https://bq32.short.gy/O7fkma", 
  "https://bigbosslive.com/live/"
].filter(Boolean);

// ✅ IST Time Formatter
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
      console.log(`🔗 Visiting: ${url}`);

      const response = await page.goto(url, {
        waitUntil: "networkidle2", // Wait for full page load
        timeout: 60000,
      });

      const finalUrl = page.url();
      console.log(`➡️ Final resolved URL: ${finalUrl}`);

      // 🔍 Extract HTML content
      const html = await page.content();

      // 🧠 Look for .m3u8 using regex
      const m3u8Matches = html.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/g);
      if (m3u8Matches && m3u8Matches.length > 0) {
        m3u8Url = m3u8Matches[0];
        console.log(`✅ Found .m3u8: ${m3u8Url}`);
      } else {
        console.log(`❌ No .m3u8 link found on ${finalUrl}`);
      }

      results.push({
        source_url: url,
        resolved_url: finalUrl,
        [`stream_url${results.length + 1}`]: m3u8Url || "Not found"
      });

    } catch (error) {
      console.error(`💥 Error processing ${url}:`, error.message);
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
