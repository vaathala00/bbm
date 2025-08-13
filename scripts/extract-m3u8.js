const puppeteer = require("puppeteer");
const fs = require("fs");

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const client = await page.target().createCDPSession();
  await client.send('Network.enable');

  let m3u8Url = null;

  const waitForM3U8 = new Promise((resolve) => {
    client.on('Network.responseReceived', async (params) => {
      const { url } = params.response;
      if (url.includes(".m3u8") && !m3u8Url) {
        m3u8Url = url;
        console.log("Found stream:", url);
        resolve();
      }
    });
  });

  await page.goto("https://bigbosslive.com/live/", {
    waitUntil: "networkidle2",
    timeout: 60000,
  });

  await Promise.race([
    waitForM3U8,
    page.waitForTimeout(15000)
  ]);

  await browser.close();

  if (m3u8Url) {
    if (!fs.existsSync("extracted")) {
      fs.mkdirSync("extracted");
    }
    fs.writeFileSync("extracted/stream.json", JSON.stringify({ url: m3u8Url }, null, 2));
    console.log("Saved stream URL to extracted/stream.json");
  } else {
    console.error("No .m3u8 link found.");
    process.exit(1);
  }
})();
