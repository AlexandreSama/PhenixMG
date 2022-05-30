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

/**
 * It takes a ram object and a root folder, and writes the ram object to the root folder.
 * @param ram - The ram object
 * @param rootFolder - The folder where the file is located
 */
async function writeRamToFile(ram, rootFolder) {
    let json = {
        "ram": ram
    }

    let data = JSON.stringify(json)
    fs.writeFileSync(rootFolder, data)
}

/**
 * It checks if the folders exist, if they don't, it creates them.
 * @param rootFolder - C:\Users\User\AppData\Roaming\.minecraft
 * @param javaFolder -
 * C:\Users\User\AppData\Roaming\.minecraft\versions\1.12.2\1.12.2-forge1.12.2-14.23.5.2847-universal.jar
 * @param modsFolder - C:\Users\User\AppData\Roaming\.minecraft\mods
 * @param event - The event that was sent from the renderer process.
 */
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

/**
 * It checks if the folder is empty, if it is, it downloads a zip file, extracts it, and deletes the
 * zip file.
 * @param javaFolder - The folder where the java files will be downloaded
 * @param event - The event object that was passed to the listener.
 */
async function checkJava(javaFolder, event) {
    const files = fs.readdirSync(javaFolder)
    if (files.length == 0) {
        const downloadJava = new Downloader({
            url: "http://193.168.146.71/phenixmg/asset/java.zip",
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

/**
 * It checks if the file forge.jar exists in the rootFolder, if it doesn't, it downloads it.
 * @param rootFolder - The folder where the file is located
 * @param event - The event object is automatically passed to the callback function and contains the
 * following properties:
 */
async function checkForge(rootFolder, event) {

    fs.readFile(rootFolder + 'forge.jar', async (err, file) => {
        if (err) {
            const downloadForge = new Downloader({
                url: "http://193.168.146.71/phenixmg/asset/forge.jar",
                directory: rootFolder
            })
        
            await downloadForge.download()
        
            event.sender.send('forgeDownloaded', ('Forge téléchargé avec succés'))
        } else {
            event.sender.send('forgeAlreadyDownload')
        }
    })
}

/**
 * It checks if there are mods on the server that are not on the client, if so, it downloads them.
 * @param modsFolder - The folder where the mods are stored
 * @param event - The event object that was passed to the main process.
 * @returns a promise.
 */
async function checkMods(modsFolder, event) {
    await axios.get('http://193.168.146.71:4588/').then(async response => {

        let modsRemote = response.data
        let folderMods = []
        let i = 0

        let modFolder = fs.readdirSync(modsFolder)
        modFolder.forEach(file => {
            folderMods.push(file)
        })

        let difference = modsRemote.filter(x => !folderMods.includes(x));

        if (difference.length >= 1) {
            console.log('Différence')

            let numberMods = difference.length
            for await (const element of difference) {
                if(element != "memory_repo"){
                    const downloadMissedMods = new Downloader({
                        url: "http://193.168.146.71/phenixmg/asset/mods/" + element,
                        directory: modsFolder,
                        maxAttempts: 3
                    })
                    console.log(element)
                    await downloadMissedMods.download()
                    i++
                    event.sender.send('MissedModsDownload', {
                        numberMods
                    })
                }
            };
        }
    })

    return true
}

/**
 * It launches the game.
 * @param result - The result of the login function
 * @param rootFolder - The folder where the game will be installed
 * @param javaFolder - The path to the java folder
 * @param ram - The amount of ram you want to allocate to the game.
 * @param event - The event that is sent from the renderer process
 */
async function launchGame(result, rootFolder, javaFolder, ram, event) {
    let opts
    if(ram){
        opts = {
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
    }else{
        opts = {
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
                max: "8G",
                min: "4G"
            }
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

/**
 * It checks if Forge is installed, if it is, it checks if Java is installed, if it is, it checks if
 * the mods are installed, if they are, it launches the game.
 * @param ram - The amount of ram the user wants to allocate to the game
 * @param result - The path to the .jar file
 * @param rootFolder - The folder where the Minecraft.exe is located
 * @param modsFolder - The folder where the mods are located
 * @param javaFolder - The folder where the java executable is located
 * @param event - The event that is emitted from the main process
 */
async function launchMC(ram, result, rootFolder, modsFolder, javaFolder, event) {

    await checkForge(rootFolder, event).then(async () => {
        console.log('Forge Checked !')
        await checkJava(javaFolder, event).then(async () => {
            console.log('Java Checked !')
            await checkMods(modsFolder, event).then(response => {
                if(response == true){
                    console.log('Mods Checked !')
                    launchGame(result, rootFolder, javaFolder, ram, event)
                }
            })
        })
    })
}

module.exports = {
    writeRamToFile,
    launchMC,
    checkLauncherPaths,
    checkForge,
    checkJava
}