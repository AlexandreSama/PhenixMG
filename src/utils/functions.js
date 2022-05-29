const { getMCLC } = require("msmc")
const fs = require('fs')
const {
    Client,
    Authenticator
} = require('minecraft-launcher-core');
const launcher = new Client();
const AdmZip = require("adm-zip");
const Downloader = require("nodejs-file-downloader");
const { Axios, default: axios } = require("axios");
const path = require("path");

async function writeRamToFile(ram, rootFolder) {
    let json = {
        "ram": ram
    }

    let data = JSON.stringify(json)
    fs.writeFileSync(rootFolder, data)
}

async function checkLauncherPaths(rootFolder, javaFolder, modsFolder, event) {
    const arrayPath = [rootFolder, modsFolder, javaFolder]

    arrayPath.forEach(element => {
        if (!fs.existsSync(element)) {
            fs.mkdir(element, (err) => {
                if (err) {
                    event.sender.send('error', err)
                }

            })
        }
    })
    event.sender.send('finishFile')
}

async function checkJava(javaFolder, event) {
    const files = fs.readdirSync(javaFolder)
    if (files.length == 0) {
        const downloadJava = new Downloader({
            url: "http://localhost/asset/java.zip",
            directory: javaFolder
        })
    
        await downloadJava.download()
    
        const zip = new AdmZip(javaFolder + 'java.zip')
    
        zip.extractAllTo(javaFolder, true)
    
        fs.unlinkSync(javaFolder + 'java.zip')
    
        event.sender.send('javaDownloaded', ('Java téléchargé avec succés'))
    } else {
        event.sender.send('javaAlreadyDownloaded')
    }
}

async function checkForge(rootFolder, event) {

    fs.readFile(rootFolder + 'forge.jar', async (err, file) => {
        if (err) {
            const downloadForge = new Downloader({
                url: "http://localhost/asset/forge.jar",
                directory: rootFolder
            })
        
            await downloadForge.download()
        
            event.sender.send('forgeDownloaded', ('Forge téléchargé avec succés'))
        } else {
            event.sender.send('forgeAlreadyDownload')
        }
    })
}

async function checkMods(modsFolder, event) {
    axios.get('http://localhost:4588/').then(async response => {

        let modsRemote = response.data
        let folderMods = []
        let i = 0

        fs.readdirSync(modsFolder).forEach(file => {
            folderMods.push(file)
        })

        let difference = modsRemote.filter(x => !folderMods.includes(x));

        if (difference.length >= 1) {

            let numberMods = difference.length
            for await (const element of difference) {
                const downloadMissedMods = new Downloader({
                    url: "http://localhost/asset/mods/" + element,
                    directory: modsFolder,
                    maxAttempts: 3
                })

                await downloadMissedMods.download()
                i++
                event.sender.send('MissedModsDownload', {
                    numberMods
                })
            };

        }
    })
}
async function launchMC(ram, result, rootFolder, modsFolder, javaFolder, event) {

    await checkForge(rootFolder, event)
    await checkJava(javaFolder, event)
    await checkMods(modsFolder, event)
    let opts = {
        clientPackage: null,
        authorization: getMCLC().getAuth(result),
        root: rootFolder,
        forge: rootFolder + 'forge.jar',
        javaPath: path.join(javaFolder + 'bin\\java.exe') ,
        version: {
            number: "1.12.2",
            type: "release"
        },
        memory: {
            max: ram,
            min: "4G"
        }
    }
    console.log("Starting!")
    launcher.launch(opts);

    launcher.on('progress', (e) => {
        console.log(e)
        let type = e.type
        let task = e.task
        let total = e.total
        event.sender.send('dataDownload', ({
            type,
            task,
            total
        }))
        console.log(e)
    })

    launcher.on('debug', (e) => console.log(e));
    launcher.on('data', (e) => console.log(e));
}

module.exports = {
    writeRamToFile,
    launchMC,
    checkLauncherPaths,
    checkForge,
    checkJava
}