const { ipcMain } = require('electron');
const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const msmc = require('msmc')
const fs = require('fs');
const { writeRamToFile, launchMC, checkLauncherPaths } = require('./utils/functions');
const {
    autoUpdater
} = require('electron-updater');
const logger = require("electron-log")
logger.transports.file.level = "info"
const notifier = require('node-notifier');

let mainWindow;
let MSResult;
let paths = [
    app.getPath('appData') + '\\Phenix\\', 
    app.getPath('appData') + '\\Phenix\\mods\\', 
    app.getPath('appData') + '\\Phenix\\java\\'
]
let responseUpdate

function createWindow () {

  mainWindow = new BrowserWindow({width: 1800, height: 1200, webPreferences: {contextIsolation: false, nodeIntegration: true}}); // on définit une taille pour notre fenêtre

  mainWindow.loadURL(`file://${__dirname}/views/main.html`); // on doit charger un chemin absolu

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.once('ready-to-show', () => {
      autoUpdater.checkForUpdates().then(resp => {
          resp.updateInfo.version
      })
  })
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
      createWindow();
    }
});

ipcMain.on('app_version', (event) => {
    event.sender.send('app_version', {
      version: app.getVersion()
    });
});

autoUpdater.on('update-available', () => {
    console.log('Update !')
    notifier.notify({
        title: 'Mise a jour est disponible !',
        message: 'Une mise a jour est disponible ! Voulez-vous la télécharger et l\'installer ?',
        actions: ['Oui', 'Non'],
        wait: true
    },
    function (err, response, metadata) {
        responseUpdate = response
    })
})

autoUpdater.on('update-downloaded', () => {
    if(responseUpdate == "oui"){
        autoUpdater.quitAndInstall()
    }
})

ipcMain.on('restart_app', () => {
    autoUpdater.quitAndInstall()
})

ipcMain.on('loginMS', (event, data) => {
    msmc.fastLaunch('raw', (update) => {

    }).then(result => {
        if (msmc.errorCheck(result)) {
            console.log(result.reason)
            return;
        }
        MSResult = result
        console.log('testas')
        mainWindow.webContents.send('loginSuccess', (result.profile))
    })

    checkLauncherPaths(paths[0], paths[2], paths[1], event)
})

ipcMain.on('saveRam', (event, data) => {
    let ram = data + "G"
    writeRamToFile(ram, paths[0] + 'infos.json')
    // let ram = {
    //     "ram": data.ram
    // }

    // let data = JSON.stringify(ram)
    // fs.writeFileSync(paths[0] + 'infos.json', data)
})

ipcMain.on('playMC', (event, data) => {
    fs.readFile(paths[0] + 'infos.json', (err, data) => {
        let ram = JSON.parse(data)
        console.log(ram.ram)
        launchMC(ram.ram, MSResult, paths[0], paths[1], paths[2], event)
    })
})