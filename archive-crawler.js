import { existsSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { JSDOM } from "jsdom"
import { setTimeout } from "timers/promises"

const archivePrefix = "https://web.archive.org/web/20210307220157/"

const baseUrl = new URL("http://german-bash.org/")

function extractDate(quoteBox) {
    const dateText = quoteBox.querySelector(".date").innerHTML

    const [date, time] = dateText.split(" ")

    return {
        fullDate: dateText,
        date,
        time,
    }
}

function extractContent(quoteBox) {
    const quoteLines = quoteBox.querySelectorAll(".quote_zeile")

    return [...quoteLines].reduce((acc, quoteLine) => {
        const quote = quoteLine.innerHTML

        const messageMatches = /^\n?&lt;(.*)&gt;\s*(.+)$/.exec(quote)
        if (messageMatches && messageMatches.length >= 2) {
            acc.push({
                type: "message",
                username: messageMatches[1],
                message: messageMatches[2],
            })
        }

        const activityMatches = /\* (\S+)\s*(.+)$/.exec(quote)
        if (activityMatches && activityMatches.length >= 2) {
            acc.push({
                type: "activity",
                username: activityMatches[1],
                activity: activityMatches[2],
            })
        }

        if (!activityMatches && !messageMatches) {
            acc.push({ type: "misc", text: quote })
        }

        return acc
    }, [])
}

async function getPage(page) {
    if (page < 1 || page > 302) {
        throw new Error("Out of bounds.")
    }

    const pageHtml = await fetch(archivePrefix + new URL(`/action/browse/page/${page}`, baseUrl)).then(res =>
        res.text(),
    )
    const pageDom = new JSDOM(pageHtml)

    const quoteBoxes = pageDom.window.document.querySelectorAll(".quotebox")

    const data = [...quoteBoxes].map(quoteBox => {
        const date = extractDate(quoteBox)
        const id = quoteBox.querySelector(".id a").innerHTML
        const content = extractContent(quoteBox)

        return { date, id, content }
    })

    return { data, raw: pageHtml }
}

async function fetchPages(start, end) {
    if (!start) {
        start = 1
    }
    if (!end) {
        end = 302
    }

    for (let page = start; page <= end; ++page) {
        const dataOutputPath = fileURLToPath(new URL(`./dump/data/page-${page}.json`, import.meta.url))
        const htmlOutputPath = fileURLToPath(new URL(`./dump/raw/page-${page}.html`, import.meta.url))

        if (existsSync(htmlOutputPath)) {
            continue
        }

        for (let waitInterval = 2; waitInterval < 100; waitInterval++) {
            console.log("Fetching page:", page)
            try {
                await getPage(page).then(({ data, raw }) => {
                    writeFileSync(dataOutputPath, JSON.stringify(data, null, 2))
                    writeFileSync(htmlOutputPath, JSON.stringify(raw, null, 2))
                })
                break
            } catch {
                const waitSeconds = waitInterval ** 2
                console.log(`Failed. Retry in ${waitSeconds}s.`)
                await setTimeout(waitSeconds * 1000)
            }
        }
        const timeout = 21_000
        console.log(`Done. Waiting ${Math.floor(timeout / 1000)}s for next page.`)
        await setTimeout(timeout)
    }
}

fetchPages(1, 302)
    .catch(err => {
        console.error(err)
        process.exit(1)
    })
    .finally(() => {
        process.exit(0)
    })
