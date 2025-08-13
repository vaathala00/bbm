const fs = require("fs");
const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // Disable cache to ensure we get fresh requests
  await page.setCacheEnabled(false);

  let m3u8Url = null;

  // Monitor all requests
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes(".m3u8") && !m3u8Url) {
      m3u8Url = url;
      console.log("Found .m3u8 URL (from request):", m3u8Url);
    }
  });

  await page.goto("https://bigbosslive.com/live/", {
    waitUntil: "networkidle2",
    timeout: 0,
  });

  // OPTIONAL: Click play if needed (uncomment if there's a play button)
  // await page.click("video"); // or use correct selector

  await page.waitForTimeout(10000); // wait for stream to start loading

  if (m3u8Url) {
    const json = { stream_url: m3u8Url };
    fs.writeFileSync("stream.json", JSON.stringify(json, null, 2));
    console.log("Saved to stream.json");
  } else {
    console.log("No .m3u8 URL found.");
  }

  await browser.close();
})();
