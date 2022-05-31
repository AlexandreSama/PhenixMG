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
const log = require('electron-log');

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = "info"

const notifier = require('node-notifier');
const path = require('path');

log.info('App starting...');
let mainWindow;
let MSResult;
let paths = [
    app.getPath('appData') + '\\Phenix\\', 
    app.getPath('appData') + '\\Phenix\\mods\\', 
    app.getPath('appData') + '\\Phenix\\java\\'
]
let responseUpdate

/**
 * It takes a string as an argument and logs it to the console.
 * @param text - The text to be displayed in the status bar.
 */
function sendStatusToWindow(text) {
    log.info(text);
}

/**
 * We create a new BrowserWindow object, which is a new window, and we load the main.html file into it.
 */
function createWindow () {

  mainWindow = new BrowserWindow({
    width: 1800, 
    height: 1200, 
    webPreferences: {
        contextIsolation: false, 
        nodeIntegration: true
        },
    icon: __dirname + '/logo.ico'
    }); // on définit une taille pour notre fenêtre

  mainWindow.loadURL(`file://${__dirname}/views/login.html`); // on doit charger un chemin absolu

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/* Checking for updates and notifying the user. */
app.on('ready', function() {
    createWindow()
    autoUpdater.checkForUpdatesAndNotify()
});

/* A function that is called when all windows are closed. */
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
});

/* A function that is called when the user clicks on the app icon in the dock. */
app.on('activate', () => {
    if (mainWindow === null) {
      createWindow();
    }
});

/* Listening for an update-not-available event and then sending a message to the window. */
autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow('Checking for update...');
})

/* Listening for an update-not-available event and then sending a message to the window. */
autoUpdater.on('update-not-available', (info) => {
    sendStatusToWindow('Update not available.');
})

/* A listener for the autoUpdater. It listens for an error and then sends the error to the window. */
autoUpdater.on('error', (err) => {
    sendStatusToWindow('Error in auto-updater. ' + err);
})

/* Showing a notification to the user when an update is available. */
autoUpdater.on('update-available', () => {
    sendStatusToWindow('Update available.');
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

/* Listening for an update-downloaded event and then sending a message to the window. */
autoUpdater.on('update-downloaded', () => {
    sendStatusToWindow('Update Téléchargé !')
    sendStatusToWindow(responseUpdate)
    if(responseUpdate == "oui"){
        autoUpdater.quitAndInstall(true)
    }
})

/* A function that is called when the user clicks on the login button. */
ipcMain.on('loginMS', (event, data) => {
    msmc.fastLaunch('raw', (update) => {

    }).then(result => {
        if (msmc.errorCheck(result)) {
            console.log(result.reason)
            return;
        }
        MSResult = result
        console.log('testas')
        console.log(paths[0] + 'infos.json') 
        fs.readFile(paths[0] + 'infos.json', (err, data) => {
            if(data == undefined){
                mainWindow.loadURL(`file://${__dirname}/../src/views/main.html`)
                mainWindow.webContents.once('dom-ready', () => {
                    mainWindow.webContents.send('loginSuccessWithoutRam', (result.profile))
                });
            }else{
                let datas = JSON.parse(data)
                mainWindow.loadURL(`file://${__dirname}/../src/views/main.html`)
                mainWindow.webContents.once('dom-ready', () => {
                    mainWindow.webContents.send('loginSuccessWithRam', [result.profile, datas.ram])
                })
            }
        })
    })

    checkLauncherPaths(paths[0], paths[2], paths[1], event)
})

/* Saving the ram to a file. */
ipcMain.on('saveRam', (event, data) => {
    let ram = data + "G"
    writeRamToFile(ram, paths[0] + 'infos.json')
})

/* Listening for the playMC event from the renderer process. */
ipcMain.on('playMC', (event, data) => {
    fs.readFile(paths[0] + 'infos.json', (err, data) => {
        let ram = JSON.parse(data)
        console.log(ram.ram)
        launchMC(ram.ram, MSResult, paths[0], paths[1], paths[2], event)
    })
})