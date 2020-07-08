import fs from 'fs';
import originalFs from 'original-fs';
import Path from 'path';
import { app, ipcMain } from 'electron';
import { spawn } from 'child_process';
import compareVersions from 'compare-versions';
import winston from 'winston';
import TTVSTMain from '../TTVSTMain';
import { IAddon, AddonFlag } from './AddonsTypes';
import got from 'got';

declare var logger: winston.Logger;
declare var TTVST: TTVSTMain;

export default class Addons {

	installedAddons: Array<IAddon> = [];
	availableAddons: Array<IAddon> = [];

	static snippedIndex: number = 0;
	static batchLines: { [addonid: string] : Array<string> } = {};

	constructor() {
		this.checkForAddons(Path.join('.', 'addons'));
		this.checkForAddons(Path.join('.', 'resources'));

		this.loadAddons = this.loadAddons.bind(this);
		this.loadResporitory = this.loadResporitory.bind(this);
		this.loadError = this.loadError.bind(this);
		this.languageError = this.languageError.bind(this);

		this.onUpdate = this.onUpdate.bind(this);
		this.onUninstall = this.onUninstall.bind(this);
		this.onInstall = this.onInstall.bind(this);
		this.onRestart = this.onRestart.bind(this);

		ipcMain.on('Addons.loadInstalled', this.loadAddons);
		ipcMain.on('Addons.loadRepository', this.loadResporitory);
		ipcMain.on('Addons.loadError', this.loadError);
		ipcMain.on('Addons.languageError', this.languageError);

		ipcMain.on('Addons.update', this.onUpdate);
		ipcMain.on('Addons.uninstall', this.onUninstall);
		ipcMain.on('Addons.install', this.onInstall);
		ipcMain.on('Addons.restart', this.onRestart);
	}

	checkForAddons(directory: string): Promise<void> {
		logger.info(`[Addons] Checking ${directory} for addons`);
		return new Promise((resolve) => {
			fs.readdir(directory, async (err: NodeJS.ErrnoException, files: string[]) => {
				if(err === null) {
					for(let i = 0; i < files.length; i++) {
						let p = Path.join(directory, files[i]);
						await new Promise((re) => {
							fs.stat(p, async (e: NodeJS.ErrnoException, stats: fs.Stats) => {
								if(e === null) {
									if(stats.isDirectory()) {
										await this.checkAddon(p);
									}
								}
								re();
							});
						});
					}
				} else {
					logger.info(`[Addons] Directory ${directory} could not be read`);
					logger.verbose(err);
				}
				resolve();
			})
		});
	}

	checkAddon(path: string): Promise<void> {
		const self = this;
		return new Promise((resolve) => {
			let packagePath = Path.join(path, 'package.json');
			fs.readFile(packagePath, { encoding: 'utf8' }, (err: NodeJS.ErrnoException, data: string) => {
				if(err === null) {
					try {
						let packageJson = JSON.parse(data);
						if(
							typeof(packageJson.addonid) === 'string' &&
							typeof(packageJson.name) === 'string' &&
							typeof(packageJson.version) === 'string' &&
							typeof(packageJson.description) === 'string' &&
							typeof(packageJson.author) === 'object' &&
							typeof(packageJson.toolversion) === 'string' &&
							(typeof(packageJson.main) === 'string' || typeof(packageJson.renderer) === 'string')
						) {
							if(compareVersions(packageJson.toolversion, app.getVersion()) >= 0 && !this.addonInstalled(packageJson.addonid)) {
								self.installedAddons.push(Object.assign(packageJson, { path, flags: ['compatible'], loaderror: '', updateAvaiable: '' }));
							} else {
								self.installedAddons.push(Object.assign(packageJson, { path, flags: [], loaderror: 'Addon is not compatible with the current version of TTVStreamerTool', updateAvaiable: '' }));
							}
						} else {
							logger.debug(`[Addons] Addon package.json at ${packagePath} missing fields`);
						}
					} catch(e) {
						logger.debug(`[Addons] Addon package.json at ${packagePath} could not be loaded`);
						logger.debug(e);
					}
				} else {
					logger.debug(`[Addons] Could not read ${packagePath}`);
					logger.debug(err);
				}
				resolve();
			});
		});
	}

	addonInstalled(addonid: string): boolean {
		for(let i = 0; i < this.installedAddons.length; i++) {
			if(this.installedAddons[i].addonid === addonid) {
				return true;
			}
		}
		return false;
	}

	async loadAddons() {
		for(let i = 0; i < this.installedAddons.length; i++) {
			let addon = this.installedAddons[i];
			if(this.hasFlag(addon, 'loaded') || !this.hasFlag(addon, 'compatible')) {
				this.checkForRendererStuff(addon);
				continue;
			}
			if(typeof(addon.path) === 'string') {
				if(typeof(addon.main) === 'string') {
					try {
						let modpath = Path.relative(__dirname, Path.join(process.cwd(), addon.path, addon.main.substring(0, addon.main.lastIndexOf('.')))).replace(new RegExp('\\'+Path.sep, 'g'), '/');
						require(modpath);
						this.setFlag(this.installedAddons[i].addonid, 'loaded');

						this.checkForRendererStuff(addon);
					} catch(e) {
						logger.error(`[Addons] Addon (main) at ${addon.path} could not be loaded`);
						logger.error(e);
						this.removeFlag(this.installedAddons[i].addonid, 'compatible');
						this.installedAddons[i].loaderror = 'Addon loader on main thread failed';
					}
				} else if(typeof(addon.renderer) === 'string') {
					TTVST.mainWindow.ipcSend('Addons.load', addon.path, addon.renderer.substring(0, addon.renderer.lastIndexOf('.')));
				}
			}
		}

		let newAvailable: Array<IAddon> = [];
		for(let i = 0; i < this.availableAddons.length; i++) {
			if(!this.addonInstalled(this.availableAddons[i].addonid)) {
				newAvailable.push(this.availableAddons[i]);
			}
		}
		this.availableAddons = newAvailable;

		this.sendAddonUpdate();
	}

	checkForRendererStuff(addon: IAddon) {
		fs.exists(Path.join(process.cwd(), addon.path, 'language.json'), (exists) => {
			if(exists) {
				TTVST.mainWindow.ipcSend('Addons.language', addon.path);
			}

			if(typeof(addon.renderer) === 'string') {
				TTVST.mainWindow.ipcSend('Addons.load', addon.path, addon.renderer.substring(0, addon.renderer.lastIndexOf('.')));
			}
		});
	}

	loadError(event: Electron.IpcMainEvent, addonpath: string, error: { code: string, message: string, stack: string }) {
		for(let i = 0; i < this.installedAddons.length; i++) {
			if(this.installedAddons[i].path === addonpath) {
				this.removeFlag(this.installedAddons[i].addonid, 'loaded');
				this.installedAddons[i].loaderror = 'Addon loader on renderer thread failed';
				this.setFlag(this.installedAddons[i].addonid, 'compatible');
				logger.error(`[Addons] Addon (renderer) at ${addonpath} could not be loaded`);
				logger.error(error);
				break;
			}
		}
	}

	languageError(event: Electron.IpcMainEvent, addonpath: string, error: { code: string, message: string, stack: string }) {
		logger.error(`[Addons] Addon language packat ${addonpath} could not be loaded`);
		logger.error(error);
	}

	async loadResporitory(event: Electron.IpcMainEvent, url: string) {
		if(!url.startsWith('https://')) return;
		try {
			logger.info(`[Addons] Load addons at repository ${url}`);
			let response = await got(url, { responseType: 'json', timeout: 10000 });
			if(response.statusCode == 200) {
				let body = response.body;
				if(Array.isArray(body)) {
					for(let i = 0; i < body.length; i++) {
						let pack = body[i];
						if(
							typeof(pack.addonid) === 'string' &&
							typeof(pack.name) === 'string' &&
							typeof(pack.version) === 'string' &&
							typeof(pack.description) === 'string' &&
							typeof(pack.author) === 'object' &&
							typeof(pack.toolversion) === 'string' &&
							typeof(pack.download) === 'string'
						) {
							let compatible: boolean = compareVersions(pack.toolversion, app.getVersion()) >= 0;
							Object.assign(pack, { flags: compatible ? ['compatible'] : [] });
							this.overwriteAddon(pack);
						} else {
							logger.debug(`[Addons] Addon description missing fields at repository ${url} (${i})`);
						}
					}
				} else {
					logger.error(`[Addons] Repository at ${url} responded with an invalid format`);
				}
			} else {
				logger.error(`[Addons] Repository at ${url} responded with a status code ${response.statusCode}`);
			}
		} catch(e) {
			logger.error(`[Addons] Something went wrong while loading repository at ${url}`);
			logger.error(e);
		}
		
		this.sendAddonUpdate();
	}

	overwriteAddon(addon: IAddon) {
		for(let i = 0; i < this.installedAddons.length; i++) {
			if(this.installedAddons[i].addonid === addon.addonid) {
				if(this.installedAddons[i].version !== addon.version && this.hasFlag(addon, 'compatible')) {
					this.installedAddons[i].updateAvaiable = addon.version;
					this.installedAddons[i].download = addon.download;
					this.setFlag(this.installedAddons[i].addonid, 'updateavailable');
				}
				return;
			}
		}
		for(let i = 0; i < this.availableAddons.length; i++) {
			if(this.availableAddons[i].addonid === addon.addonid) {
				this.availableAddons[i] = addon;
				return;
			}
		}
		this.availableAddons.push(addon);
	}

	sendAddonUpdate() {
		TTVST.mainWindow.ipcSend('Addons.update', this.installedAddons.concat(this.availableAddons));
	}

	static getRetryDeleteSnippet(file: string) {
		Addons.snippedIndex++
		let index = Addons.snippedIndex.toString()
		return ':LOOP' + index + '\r\ndel "' + file + '"\r\nIF EXIST "' + file + '" (\r\ntimeout /T 1 /Nobreak >nul\r\nGOTO LOOP' + index + '\r\n)'
	}

	async onUpdate(event: Electron.IpcMainEvent, addons: Array<IAddon>) {
		for(let i = 0; i < addons.length; i++) {
			let addon = addons[i];
			if(typeof(addon.download) !== 'string' || !addon.download.startsWith('https://')) {
				TTVST.mainWindow.ipcSend('Addons.updateFailed', addon);
				continue;
			}
			try {
				this.setFlag(addon.addonid, 'updating');
				let resp = await got(addon.download, { responseType: 'buffer', timeout: 20000 })
				if(resp.statusCode === 200) {
					let sanitizedAddonName = addon.addonid.replace(/[^a-z0-9\.\-]/ig, '');
					await new Promise((res, rej) => {
						originalFs.writeFile(`resources\\${sanitizedAddonName}.part`, resp.body, (err) => {
							if(err === null) {
								res();
							} else {
								rej(err);
							}
						});
					});
					Addons.batchLines[addon.addonid] = [];
					Addons.batchLines[addon.addonid].push(Addons.getRetryDeleteSnippet(addon.path));
					Addons.batchLines[addon.addonid].push(`rename resources\\${sanitizedAddonName}.part ${sanitizedAddonName}.asar`);
					
					this.setFlag(addon.addonid, 'updateready');
				} else {
					this.setFlag(addon.addonid, 'updatefailed');
					logger.error(`[Addons] Addon download failed. Server responded with status code ${resp.statusCode}`);
				}
			} catch(e) {
				this.setFlag(addon.addonid, 'updatefailed');
				logger.error(`[Addons] Addon update failed`);
				logger.error(e);
			}
		}
	}

	async onUninstall(event: Electron.IpcMainEvent, addons: Array<IAddon>) {
		for(let i = 0; i < addons.length; i++) {
			let addon = addons[i];
			if(typeof(addon.path) !== 'string' || addon.path.length <= 0) continue;
			
			await new Promise((res) => {
				originalFs.stat(addon.path, (err: NodeJS.ErrnoException, stats: fs.Stats) => {
					if(err === null) {
						if(stats.isFile()) {
							Addons.batchLines[addon.addonid] = [Addons.getRetryDeleteSnippet(addon.path)];
							this.setFlag(addon.addonid, 'uninstallready');
						} else {
							this.setFlag(addon.addonid, 'uninstallfailed');
						}
					} else {
						this.setFlag(addon.addonid, 'uninstallfailed');
						logger.error(`[Addons] Addon uninstall failed`);
						logger.error(err);
					}
					res();
				});
			})
		}
	}

	async onInstall(event: Electron.IpcMainEvent, addons: Array<IAddon>) {
		for(let i = 0; i < addons.length; i++) {
			let addon = addons[i];
			if(typeof(addon.download) !== 'string' || !addon.download.startsWith('https://')) {
				this.setFlag(addon.addonid, 'installfailed');
				continue;
			}
			try {
				this.setFlag(addon.addonid, 'installing');
				let resp = await got(addon.download, { responseType: 'buffer', timeout: 20000 })
				if(resp.statusCode === 200) {
					let sanitizedAddonName = addon.addonid.replace(/[^a-z0-9\.\-]/ig, '');
					await new Promise((res, rej) => {
						originalFs.writeFile(`resources\\${sanitizedAddonName}.asar`, resp.body, (err) => {
							if(err === null) {
								res();
							} else {
								rej(err);
							}
						});
					});
					await this.checkAddon(`resources\\${sanitizedAddonName}.asar\\`);
				} else {
					this.setFlag(addon.addonid, 'installfailed');
					logger.error(`[Addons] Addon download failed. Server responded with status code ${resp.statusCode}`);
				}
			} catch(e) {
				this.setFlag(addon.addonid, 'installfailed');
				logger.error(`[Addons] Addon install failed`);
				logger.error(e);
			}
		}

		this.loadAddons();
	}

	onRestart() {
		let execArgv = process.execArgv.map(a => a.replace(/"/g, '""'));

		let batchLines: Array<string> = [];
		for(let addonid of Object.keys(Addons.batchLines)) {
			batchLines = batchLines.concat(Addons.batchLines[addonid]);
		}

		let batch = '@echo off\r\n' + batchLines.join('\r\n') + '\r\nstart "" "' + process.execPath + '"' + (execArgv.length > 0 ? ' "' + execArgv.join('" "') + '"' : '') + '\r\nexit'
		fs.writeFile('addons.bat', batch, (err: NodeJS.ErrnoException) => {
			if(err === null) {
				spawn('start', ['addons.bat'], { cwd: process.cwd(), env: process.env, shell: true, detached: true, windowsHide: false });
				app.quit();
			} else {
				TTVST.mainWindow.ipcSend('Addons.batchFailed');
				logger.error(`[Addons] Addon batch creation failed`);
				logger.error(err);
			}
		});
	}

	setFlag(addonid: string, flag: AddonFlag, skipupdate?: boolean) {
		switch(flag) {
			case 'installing': this.removeFlag(addonid, 'installfailed', true); break;
			case 'installfailed': this.removeFlag(addonid, 'installing', true); break;
			
			case 'updating': this.removeFlag(addonid, ['updateready','updatefailed','uninstallready','uninstallfailed'], true); break;
			case 'updateready': this.removeFlag(addonid, ['updating','updatefailed','uninstallready','uninstallfailed'], true); break;
			case 'updatefailed': this.removeFlag(addonid, ['updateready','updating','uninstallready','uninstallfailed'], true); break;
			
			case 'uninstallready': this.removeFlag(addonid, ['uninstallfailed','updateready','updatefailed'], true); break;
			case 'uninstallfailed': this.removeFlag(addonid, ['uninstallready','updateready','updatefailed'], true); break;

			case 'loaded': this.removeFlag(addonid, ['installing','installfailed','updating','updateready','updatefailed','uninstallready','uninstallfailed'], true); break;
		}

		for(let i = 0; i < this.installedAddons.length; i++) {
			if(this.installedAddons[i].addonid === addonid) {
				if(typeof(this.installedAddons[i].flags) === 'undefined') {
					this.installedAddons[i].flags = [];
				}
				if(!this.hasFlag(this.installedAddons[i], flag)) {
					this.installedAddons[i].flags.push(flag);
				}
				break;
			}
		}

		for(let i = 0; i < this.availableAddons.length; i++) {
			if(this.availableAddons[i].addonid === addonid) {
				if(typeof(this.availableAddons[i].flags) === 'undefined') {
					this.availableAddons[i].flags = [];
				}
				if(!this.hasFlag(this.availableAddons[i], flag)) {
					this.availableAddons[i].flags.push(flag);
				}
				break;
			}
		}

		if(typeof(skipupdate) !== 'boolean' || !skipupdate) {
			this.sendAddonUpdate();
		}
	}

	removeFlag(addonid: string, flags: AddonFlag | Array<AddonFlag>, skipupdate?: boolean) {
		if(!Array.isArray(flags)) {
			flags = [flags];
		}

		for(let i = 0; i < this.installedAddons.length; i++) {
			if(this.installedAddons[i].addonid === addonid) {
				if(typeof(this.installedAddons[i].flags) === 'undefined') {
					break;
				}
				this.installedAddons[i].flags = this.installedAddons[i].flags.filter(f => flags.indexOf(f) < 0);
				break;
			}
		}

		for(let i = 0; i < this.availableAddons.length; i++) {
			if(this.availableAddons[i].addonid === addonid) {
				if(typeof(this.availableAddons[i].flags) === 'undefined') {
					break;
				}
				this.availableAddons[i].flags = this.availableAddons[i].flags.filter(f => flags.indexOf(f) < 0);
				break;
			}
		}

		if(typeof(skipupdate) !== 'boolean' || !skipupdate) {
			this.sendAddonUpdate();
		}
	}

	hasFlag(addon: IAddon, flag: AddonFlag) {
		if(typeof(addon.flags) === 'undefined') return false;
		if(addon.flags.indexOf(flag) >= 0) {
			return true;
		}
		return false;
	}

}