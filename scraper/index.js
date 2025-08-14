const fs = require("fs");
const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  let m3u8Url = null;

  // Listen to network requests
  page.on("response", async (response) => {
    const url = response.url();
    if (url.includes(".m3u8") && !m3u8Url) {
      m3u8Url = url;
      console.log("Found .m3u8 URL:", url);
    }
  });

  await page.goto("https://t.me/biggbosss07new?livestream", {
    waitUntil: "networkidle2",
    timeout: 0
  });

  // Wait a bit to ensure all requests are made
  await page.waitForTimeout(10000);

  if (m3u8Url) {
    const json = { stream_url: m3u8Url };
    fs.writeFileSync("stream.json", JSON.stringify(json, null, 2));
    console.log("Saved to stream.json");
  } else {
    console.log("No .m3u8 URL found.");
  }

  await browser.close();
})();