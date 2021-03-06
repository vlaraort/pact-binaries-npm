const util = require('util')
const fs = require('fs')
const fetch = require("node-fetch");
const base64 = require('base-64');

const streamPipeline = util.promisify(require('stream').pipeline)
const AsyncReadFile = util.promisify(fs.readFile);
const AsyncWriteFile = util.promisify(fs.writeFile);


async function generateDist(lastReleases) {
    for (let release of lastReleases.assets) {
        const releaseUrl = release.browser_download_url;
        await downloadRelease(releaseUrl, release.name)
    }
    const releaseVersion = lastReleases.tag_name.replace('v', '');
    await updateVersion(releaseVersion)
    console.log("Success building.")
}

async function getLastReleases() {
    const url = 'https://api.github.com/repos/pact-foundation/pact-ruby-standalone/releases/latest';
    try {
        const response = await fetch(url, {
            headers: { 'Authorization': 'Basic ' + base64.encode(process.env.GH_CLIENT_ID + ":" + process.env.GH_CLIENT_SECRET) },
        });
        const json = await response.json();
        return json;
    } catch (error) {
        console.log("Error fetching releases");
    }
}

async function downloadRelease(url, name) {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`unexpected response ${response.statusText}`)
    await streamPipeline(response.body, fs.createWriteStream(`./dist/${name}`))
}

async function updateVersion(version) {
    const packagePath = './dist/package.json';
    var file_content = await AsyncReadFile(packagePath);
    var content = JSON.parse(file_content);
    content.version = version;
    await AsyncWriteFile(packagePath, JSON.stringify(content, null, 2));
    console.log("end write")
}

async function run() {
    const lastReleases = await getLastReleases();
    await generateDist(lastReleases);
}

run();
