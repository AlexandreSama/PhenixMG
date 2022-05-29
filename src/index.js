const { ipcMain } = require('electron');
const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const msmc = require('msmc')
const fs = require('fs');
const { writeRamToFile, launchMC, checkLauncherPaths } = require('./utils/functions');

let mainWindow;
let MSResult;
let paths = [
    app.getPath('appData') + '\\Phenix\\', 
    app.getPath('appData') + '\\Phenix\\mods\\', 
    app.getPath('appData') + '\\Phenix\\java\\'
]

function createWindow () {

  mainWindow = new BrowserWindow({width: 1800, height: 1200, webPreferences: {contextIsolation: false, nodeIntegration: true}}); // on définit une taille pour notre fenêtre

  mainWindow.loadURL(`file://${__dirname}/views/login.html`); // on doit charger un chemin absolu

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
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

ipcMain.on('loginMS', (event, data) => {
    msmc.fastLaunch('raw', (update) => {

    }).then(result => {
        if (msmc.errorCheck(result)) {
            console.log(result.reason)
            return;
        }
        MSResult = result
        mainWindow.loadURL(`file://${__dirname}/../src/views/troll.html`)
        mainWindow.webContents.once('dom-ready', () => {
            mainWindow.webContents.send('MSData', result.profile)
        })
    })

    checkLauncherPaths(paths[0], paths[2], paths[1], event)
})

ipcMain.on('saveRam', (event, data) => {
    writeRamToFile(data, paths[0] + 'infos.json')
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