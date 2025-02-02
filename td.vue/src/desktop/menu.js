'use strict';

import { app, dialog } from 'electron';
import path from 'path';
import { log } from './logger.js';
import { mainWindow } from './desktop.js';

const isMacOS = process.platform === 'darwin';

const { shell } = require('electron');
const fs = require('fs');

// access the i18n message strings
import ell from '@/i18n/el.js';
import eng from '@/i18n/en.js';
import spa from '@/i18n/es.js';
import deu from '@/i18n/de.js';
import fra from '@/i18n/fr.js';
import hin from '@/i18n/hi.js';
import por from '@/i18n/pt.js';
import rus from '@/i18n/ru.js';
import ukr from '@/i18n/uk.js';
import zho from '@/i18n/zh.js';

const messages = { deu, ell, eng, spa, fra, hin, por, rus, ukr, zho };
var language = 'eng';

const model = {
    fileDirectory: '',
    filePath: '',
    isOpen: false
};

function getMenuTemplate () {
    return [
        ...(isMacOS ? [{ role: 'appMenu' }] : []),
        {
            label: messages[language].desktop.file.heading,
            submenu: [
                {
                    label: messages[language].desktop.file.open,
                    click () {
                        openModel();
                    }
                },
                {
                    role: 'recentdocuments',
                    submenu: [
                        { role: 'clearrecentdocuments' }
                    ]
                },
                {
                    label: messages[language].desktop.file.save,
                    click () {
                        saveModel();
                    }
                },
                {
                    label: messages[language].desktop.file.saveAs,
                    click () {
                        saveModelAs();
                    }
                },
                {
                    label: messages[language].desktop.file.new,
                    click () {
                        newModel();
                    }
                },
                {
                    label: messages[language].desktop.file.close,
                    click () {
                        closeModel();
                    }
                },
                { type: 'separator' },
                { role: 'close' }
            ]
        },
        { role: 'editMenu' },
        { role: 'viewMenu' },
        { role: 'windowMenu' },
        {
            label: messages[language].desktop.help.heading,
            submenu: [
                {
                    label: messages[language].desktop.help.docs,
                    click: async () => {
                        await shell.openExternal('https://www.threatdragon.com/docs/');
                    }
                },
                {
                    label: messages[language].desktop.help.visit,
                    click: async () => {
                        await shell.openExternal('https://owasp.org/www-project-threat-dragon/');
                    }
                },
                {
                    label: messages[language].desktop.help.sheets,
                    click: async () => {
                        await shell.openExternal('https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html');
                    }
                },
                { type: 'separator' },
                {
                    label: messages[language].desktop.help.github,
                    click: async () => {
                        await shell.openExternal('https://github.com/owasp/threat-dragon/');
                    }
                },
                {
                    label: messages[language].desktop.help.submit,
                    click: async () => {
                        await shell.openExternal('https://github.com/owasp/threat-dragon/issues/new/choose/');
                    }
                },
                {
                    label: messages[language].desktop.help.check,
                    click: async () => {
                        await shell.openExternal('https://github.com/OWASP/threat-dragon/releases/');
                    }
                },
                { type: 'separator' },
                { role: 'about' }
            ]
        }
    ];
}

// Open file system dialog and read file contents into model
function openModel () {
    if (model.isOpen === true) {
        log.debug('Checking that the existing model is not modified');
        log.warn('TODO check from renderer that existing open file is not modified');
    }
    dialog.showOpenDialog({
        title: messages[language].desktop.file.open,
        properties: ['openFile'],
        filters: [
            { name: 'Threat Model', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    }).then(result => {
        if (result.canceled === false) {
            model.filePath = result.filePaths[0];
            log.debug(messages[language].desktop.file.open + ': ' + model.filePath);
            fs.readFile(model.filePath, (err, data) => {
                if (!err) {
                    mainWindow.webContents.send('open-model', path.basename(model.filePath), JSON.parse(data));
                    model.isOpen = true;
                    addRecent(model.filePath);
                } else {
                    log.warn(messages[language].threatmodel.errors.open + ': ' + err);
                    model.isOpen = false;
                }
            });
        } else {
            log.debug(messages[language].desktop.file.open + ' canceled');
        }
    }).catch(err => {
        log.warn(messages[language].threatmodel.errors.open + ': ' + err);
        model.isOpen = false;
    });
}

// prompt the renderer for the model data
function saveModel () {
    log.debug(messages[language].desktop.file.save + ': ' + 'prompt renderer for model data');
    mainWindow.webContents.send('save-model', path.basename(model.filePath));
}

function saveModelAs () {
    log.debug(messages[language].desktop.file.saveAs + ': ' + 'clear location, prompt renderer for model data');
    model.filePath = '';
    mainWindow.webContents.send('save-model', path.basename(model.filePath));
}

// Open saveAs file system dialog and write contents to new file location
function saveModelDataAs (modelData, fileName) {
    let newName = 'new-model.json';
    if (fileName) {
        newName = fileName;
    }
    var dialogOptions = {
        title: messages[language].desktop.file.saveAs,
        defaultPath: path.join(model.fileDirectory, newName),
        filters: [{ name: 'Threat Model', extensions: ['json'] }, { name: 'All Files', extensions: ['*'] }]
    };

    dialog.showSaveDialog(dialogOptions).then(result => {
        if (result.canceled === false) {
            model.filePath = result.filePath;
            model.isOpen = true;
            log.debug(messages[language].desktop.file.saveAs + ': ' + model.filePath);
            addRecent(model.filePath);
            saveModelData(modelData);
        } else {
            log.debug(messages[language].desktop.file.saveAs + ' canceled');
        }
    }).catch(err => {
        log.error(messages[language].desktop.file.saveAs + ': ' + messages[language].threatmodel.errors.save + ': ' + err);
        model.isOpen = false;
    });
}

// open a new model
function newModel () {
    let newName = 'new-model.json';
    log.debug(messages[language].desktop.file.new + ': ' + newName);
    // prompt the renderer to open a new model
    mainWindow.webContents.send('new-model', newName);
    modelOpened();
}

// close the model
function closeModel () {
    log.debug(messages[language].desktop.file.close + ': ' + model.filePath);
    // prompt the renderer to close the model
    mainWindow.webContents.send('close-model', path.basename(model.filePath));
    modelClosed();
}

// Add the file to the recent list, updating default directory
function addRecent (filePath) {
    // add the file name to the recent file list
    app.addRecentDocument(filePath);
    model.fileDirectory = path.dirname(filePath);
    // When a file is requested from the recent documents menu
    // the open-file event of app module will be emitted for it
}

// the renderer has requested to save the model with a filename
const modelSaved = (modelData, fileName) => {
    // if the filePath is empty then this is the first time a save has been requested
    if (!model.filePath || model.filePath === '') {
        saveModelDataAs(modelData, fileName);
    } else {
        saveModelData(modelData);
    }
};

// save the threat model
function saveModelData (modelData) {
    if (model.isOpen === true) {
        fs.writeFile(model.filePath, JSON.stringify(modelData, undefined, 2), (err) => {
            if (err) {
                log.error(messages[language].threatmodel.errors.save + ': ' + err);
            } else {
                log.debug(messages[language].threatmodel.saved + ': ' + model.filePath);
            }
        });
    } else {
        // quietly ignore
        log.debug(messages[language].desktop.file.save + ': ignored empty file');
    }
}

// clear out the model, either by menu or by renderer request
const modelClosed = () => {
    model.filePath = '';
    model.isOpen = false;
};

// the renderer has opened a new model
const modelOpened = () => {
    // for security reasons the renderer can not provide the full path
    // so wait for a save before filling in the file path
    model.filePath = '';
    model.isOpen = true;
};

const setLocale = (locale) => {
    language = locale;
};

export default {
    getMenuTemplate,
    modelClosed,
    modelOpened,
    modelSaved,
    setLocale
};
