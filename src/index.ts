import puppeteer, { Browser, Page, PuppeteerLaunchOptions } from "puppeteer";
import { Command } from "commander"
import fs from "fs"
import { exec } from "child_process"

const downloadLesson = async (link: string, authToken: string) => {
  try {
    const launchOptions: PuppeteerLaunchOptions = {
      headless: true,
    }

    const browser: Browser = await puppeteer.launch(launchOptions);
    const page: Page = await browser.newPage();
    await page.setCookie({
      name: "cademi_auth_604",
      domain: "membros.escoladehistoriadaigreja.com.br",
      path: "/",
      httpOnly: true,
      priority: "Medium",
      value: authToken
    })

    await page.goto(link, { waitUntil: "networkidle2" });
    await page.goto(link, { waitUntil: "networkidle2" });

    fs.mkdirSync(`./curso/${await page.title()}/`, { recursive: true })
    const filePath = `./curso/${await page.title()}/`
    const client = await page.createCDPSession()
    await client.send("Page.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: filePath
    })
    await client.detach()

    fs.mkdirSync(`${filePath}/materiais/`)
    const attachments = await page.$$eval('.article-attach', el => el.map(x => x.href))
    attachments.forEach(async (a) => {
      console.log(`Downloading: ${a}`)
      await new Promise<void>(r => {
        let process = exec(`aria2c "${a}" --dir "${filePath}/materiais" --referer "${link}"`)
        process.on("close", () => r())
      })
      console.log("Download finished")

    })

    const pageSources = await page.$$eval("source", el => el.map(x => x.src))
    pageSources.forEach(async (s) => {
      console.log(`Downloading: ${s}`)
      await new Promise<void>(r => {
        let process = exec(`yt-dlp "${s}" --referer "${link}" -P "${filePath}"`)
        process.on("close", () => r())
      })
      console.log("Download finished")
    })


    const videoIframeElement = await page.$("iframe")

    const videoIframeLink = await page.$$eval("iframe", el => el.map(x => x.src))
    videoIframeLink?.forEach(async (s) => {
      if (s.includes("wistia")) {

        console.log(`Downloading: ${s}`)
        await new Promise<void>(r => {
          let process = exec(`yt-dlp "${s}" --referer "${link}" -P "${filePath}"`)
          process.on("close", () => r())
        })
        console.log("Download finished")
      }
    })


    const videoIframe = await videoIframeElement?.contentFrame()
    const videoSources = await videoIframe?.$$eval("source", el => el.map(x => x.src))
    videoSources?.forEach(async (s) => {
      console.log(`Downloading: ${s}`)
      await new Promise<void>(r => {
        let process = exec(`yt-dlp "${s}" --referer "${link}" -P "${filePath}"`)
        process.on("close", () => r())
      })
      console.log("Download finished")
    })

    await browser.close()
  } catch (e) {
    console.log("Erro:", e);
    return e;
  }
};

const app = new Command()

app
  .version('1.0.0', '-v, --version')
  .usage('[OPTIONS]...')
  .requiredOption('-t, --token <value>', 'The auth token to be used in the website')
  .requiredOption('-l, --link <value>', 'The website link')
  .parse(process.argv);


const options = app.opts();

await downloadLesson(options.link, options.token)

