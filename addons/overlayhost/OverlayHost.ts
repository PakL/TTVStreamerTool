import fs from 'fs';
import util from 'util';
import http from 'http';
import url from 'url';
import Path from 'path';
import winston from 'winston';
import ws from 'ws';
import process from 'process';

import fontList from 'font-list';

import TTVSTMain from '../../dist/dev.pakl.ttvst/main/TTVSTMain';

import { ipcMain, Notification } from 'electron';
import { setInterval } from 'timers';

declare var logger: winston.Logger;
declare var TTVST: TTVSTMain;
const { Settings, BroadcastMain, iconpath } = TTVST;

let disconnectedButtons = [{ icon: 'PlugConnected', action: 'app.ttvst.overlayhost.listen', title: 'Connect' }];
let connectedButtons = [{ icon: 'PlugDisconnected', action: 'app.ttvst.overlayhost.close', title: 'Disconnect' }];

const fsstat = util.promisify(fs.stat);
const fsopen = util.promisify(fs.open);
const fsread = util.promisify(fs.read);

class FileHandleHandler {

	static fileHandles: { [filepath: string]: number } = {};
	static lastAccess: { [filepath: string]: number } = {};

	static closingTimer: NodeJS.Timeout = null;

	static async prepareFile(path: string): Promise<fs.Stats|false> {
		path = path.toLowerCase();
		try {
			let stat = await fsstat(path);
			await FileHandleHandler.getHandle(path);
			return stat;
		} catch(e) {
			logger.error(e);
			return false;
		}
	}

	static async getHandle(path: string): Promise<number|false> {
		path = path.toLowerCase();
		FileHandleHandler.lastAccess[path] = new Date().getTime();

		if(typeof(FileHandleHandler.fileHandles[path]) === 'number') {
			return FileHandleHandler.fileHandles[path];
		}
		try {
			logger.verbose('[Overlay][HTTP] Opening file handle for ' + path);
			let handle = await fsopen(path, 'r');
			FileHandleHandler.fileHandles[path] = handle;
			return handle;
		} catch(e) {
			logger.error(e);
			return false;
		}
	}

	static async getChunk(path: string, position: number, length: number): Promise<Buffer> {
		let handle = await FileHandleHandler.getHandle(path);
		if(handle !== false) {
			try {
				FileHandleHandler.lastAccess[path] = new Date().getTime();
				logger.verbose('[Overlay][HTTP] Reading a chunk of ' + path + ':' + position + '-' + (position+length));
				let result = await fsread(handle, Buffer.alloc(length), 0, length, position);
				if(result.bytesRead < length) {
					let rBuffer = Buffer.alloc(result.bytesRead);
					result.buffer.copy(rBuffer, 0, 0, result.bytesRead);
					result.buffer = rBuffer;
				}
				return result.buffer;
			} catch(e) {
				logger.error(e);
				return null;
			}
		} else {
			return null;
		}
	}

	static pipeFileToResponse(path: string, response: http.ServerResponse, request: http.IncomingMessage, start: number = 0, end: number = Infinity): Promise<void> {
		return new Promise(async (resolve) => {
			path = path.toLowerCase();
			let fd = await FileHandleHandler.getHandle(path);
			if(fd !== false) {
				FileHandleHandler.lastAccess[path] = new Date().getTime();
				logger.verbose('[Overlay][HTTP] Piping a chunk of ' + path + ':' + start + '-' + end);
				let pipestream = fs.createReadStream(path, { fd, start, end, autoClose: false })
					.on('data', () => {
						FileHandleHandler.lastAccess[path] = new Date().getTime();
					})
					.on('end', () => {
						logger.verbose('[Overlay][HTTP] Piping of ' + path + ':' + start + '-' + end + ' done');
						resolve();
					})
					.on('error', (e) => {
						logger.error(e);
					});
				pipestream.pipe(response);
				request.on('aborted', () => {
					logger.verbose('[Overlay][HTTP] Request was aborted in the middle of piping ' + path + ':' + start + '-' + end);
					pipestream.unpipe(response);
					response.end();
				})
			}
		})
	}

	static cleanupHandlers(forceAll: boolean = false) {
		let keys: string[] = Object.keys(FileHandleHandler.lastAccess);

		for(let i = 0; i < keys.length; i++) {
			if(forceAll || FileHandleHandler.lastAccess[keys[i]] < (new Date().getTime() - 180000)) {
				logger.verbose('[Overlay][HTTP] Closing handle for ' + keys[i]);
				if(forceAll) {
					try {
						fs.closeSync(FileHandleHandler.fileHandles[keys[i]]);
					} catch(e){}
				} else {
					fs.close(FileHandleHandler.fileHandles[keys[i]], () => {});
				}
				delete FileHandleHandler.lastAccess[keys[i]];
				delete FileHandleHandler.fileHandles[keys[i]];
			}
		}
	}

	static startTimer() {
		if(FileHandleHandler.closingTimer === null) {
			FileHandleHandler.closingTimer = setInterval(FileHandleHandler.cleanupHandlers, 10000);
		}
	}

}

process.on('exit', () => {
	clearInterval(FileHandleHandler.closingTimer);
	FileHandleHandler.cleanupHandlers(true);
});
FileHandleHandler.startTimer();

class OverlayHost {

	overlayport: number = 8090;
	overlayres: string = 'res/overlays';

	mimeTypes: { [fe: string]: string } = {
		'.html': 'text/html',
		'.htm': 'text/html',
		'.png': 'image/png',
		'.apng': 'image/png',
		'.jpg': 'image/jpeg',
		'.jpeg': 'image/jpeg',
		'.gif': 'image/gif',
		'.webp': 'image/webp',
		'.css': 'text/css',
		'.js': 'application/javascript',
		'.json': 'application/json',
		'.wav': 'audio/wav',
		'.mp3': 'audio/mpeg',
		'.m4a': 'audio/m4a',
		'.ogg': 'audio/ogg',
		'.mp4': 'video/mp4',
		'.webm': 'video/webm'
	};

	overlayserver: http.Server = null;
	overlaywebsocket: ws.Server = null;
	lastwssocketid: number = 0;
	broadcastwslistener: { [channel: string] : Array<ws> } = {};
	broadcastlistener: { [channel: string] : (...args: Array<any>) => void } = {};
	socketlocations: Array<{ socket: ws, location: string }> = [];

	constructor() {
		this.onHttpRequest = this.onHttpRequest.bind(this);
		this.onError = this.onError.bind(this);
		this.onListening = this.onListening.bind(this);
		this.onClose = this.onClose.bind(this);

		this.startListen = this.startListen.bind(this);
		this.close = this.close.bind(this);
		this.onGetStatus = this.onGetStatus.bind(this);

		this.onWSConnection = this.onWSConnection.bind(this);
		this.onWSMessage = this.onWSMessage.bind(this);

		this.onGetVolume = this.onGetVolume.bind(this);
		this.onSetVolume = this.onSetVolume.bind(this);
		this.onGetPlaylist = this.onGetPlaylist.bind(this);
		this.onSetPlaylist = this.onSetPlaylist.bind(this);
		this.onSkipTrack = this.onSkipTrack.bind(this);

		this.onAddTime = this.onAddTime.bind(this);
		this.onSetTime = this.onSetTime.bind(this);

		this.startListen();

		ipcMain.handle('overlayhost.font-list', () => fontList.getFonts());

		ipcMain.on('app.ttvst.overlayhost.listen', this.startListen);
		ipcMain.on('app.ttvst.overlayhost.close', this.close);

		BroadcastMain.instance.on('app.ttvst.overlay.start', this.startListen);
		BroadcastMain.instance.on('app.ttvst.overlay.stop', this.close);
		BroadcastMain.instance.on('app.ttvst.overlay.getStatus', this.onGetStatus);

		BroadcastMain.instance.on('app.ttvst.overlay.music.getVolume', this.onGetVolume);
		BroadcastMain.instance.on('app.ttvst.overlay.music.setVolume', this.onSetVolume);
		BroadcastMain.instance.on('app.ttvst.overlay.music.getPlaylist', this.onGetPlaylist);
		BroadcastMain.instance.on('app.ttvst.overlay.music.setPlaylist', this.onSetPlaylist);
		BroadcastMain.instance.on('app.ttvst.overlay.music.skipTrack', this.onSkipTrack);

		BroadcastMain.instance.on('app.ttvst.timer.addTime', this.onAddTime);
		BroadcastMain.instance.on('app.ttvst.timer.setTime', this.onSetTime);
	}

	async startListen() {
		if(this.overlayserver === null || !this.overlayserver.listening) {
			this.overlayport = parseInt(await Settings.getString('overlayhost.global.port', '8090'));

			TTVST.startpage.broadcastStatus({ key: 'app.ttvst.overlay', icon: 'ArrangeBringForward', status: 'error', title: 'Overlay Server', info: 'Server not running yet.', buttons: [] });
			BroadcastMain.instance.emit('app.ttvst.overlay.statuschange', false);

			this.overlayserver = http.createServer(this.onHttpRequest);
			this.overlayserver.on('error', this.onError);
			this.overlayserver.on('listening', this.onListening);
			this.overlayserver.on('close', this.onClose);

			this.overlaywebsocket = new ws.Server({ server: this.overlayserver });
			this.overlaywebsocket.on('connection', this.onWSConnection)

			this.overlayserver.listen(this.overlayport);
		}
	}

	close() {
		if(this.overlayserver !== null && this.overlayserver.listening) {
			this.overlaywebsocket.close();
			this.overlayserver.close();

			this.overlaywebsocket = null;
			this.overlayserver = null;
			this.lastwssocketid = 0;
		}
	}

	private onGetStatus(executeId: string) {
		BroadcastMain.instance.executeRespond(executeId, (this.overlayserver !== null && this.overlayserver.listening));
	}

	private onError(error: NodeJS.ErrnoException) {
		if(error.code === 'EADDRINUSE') {
			TTVST.startpage.broadcastStatus({ key: 'app.ttvst.overlay', status: 'error', info: 'Server could not be started. The network port {{port}} is already in use.', infoValues: { port: this.overlayport }, buttons: disconnectedButtons });
			BroadcastMain.instance.emit('app.ttvst.overlay.statuschange', false);
		} else {
			TTVST.startpage.broadcastStatus({ key: 'app.ttvst.overlay', status: 'error', info: 'Server encountered an error. See more details in the error log.', buttons: disconnectedButtons });
			BroadcastMain.instance.emit('app.ttvst.overlay.statuschange', false);
			logger.error('[Overlay] Server encountered an error');
			logger.error(error);
		}
	}

	private onListening() {
		logger.info(`[Overlay] Host is now listening on port ${this.overlayport}`);
		TTVST.startpage.broadcastStatus({ key: 'app.ttvst.overlay', status: 'good', info: 'Server is running and listening on port {{port}}.', infoValues: { port: this.overlayport }, buttons: connectedButtons });
		BroadcastMain.instance.emit('app.ttvst.overlay.statuschange', true);
	}

	private async onHttpRequest(request: http.IncomingMessage, response: http.ServerResponse) {
		logger.verbose(`[Overlay][HTTP] > ${request.method} ${request.url}`);

		let u = url.parse(request.url);

		let filename = u.pathname;
		if(filename.length > 0) filename = filename.substr(1);

		let i = filename.lastIndexOf('.');
		let fileEnding = filename.substr(i).toLowerCase();
		let allowed = (Object.keys(this.mimeTypes).indexOf(fileEnding) >= 0);
		let access = false;

		if(filename.startsWith('send/') || filename === 'send') {
			if(request.method.toLowerCase() === 'head') {
				logger.verbose('[Overlay][HTTP] < 405, Content-Length: 0');
				response.writeHead(405, { 'Allow': 'GET, POST', 'Content-Length': 0 });
				response.end();
				return;
			}

			let channel = filename.substr(5);
			let action = BroadcastMain.getAction({ channel });
			if(action.length > 0) {
				let query: { [key: string]: string } = {};

				let args = [];

				if(u.query !== null) {
					let qs = u.query.split('&');
					for(let i = 0; i < qs.length; i++) {
						let [key, value] = qs[i].split('=', 2);
						key = decodeURIComponent(key);
						value = decodeURIComponent(value);
						query[key] = value;
					}

					args = BroadcastMain.objectToParameters(channel, query);
				}

				if(typeof(action[0].result) !== 'undefined') {
					let result = await BroadcastMain.instance.execute(channel, ...args);
					let resultString: string = '';
					if(typeof(result) !== 'string') {
						resultString = JSON.stringify(result);
					} else {
						resultString = result;
					}
					logger.verbose(`[Overlay][HTTP] < 200, Content-Length: ${Buffer.from(resultString).byteLength}`);
					response.writeHead(200, { 'Content-type': 'text/plain; charset=utf-8', 'Content-Length': Buffer.from(resultString).byteLength });
					response.end(resultString);
				} else {
					BroadcastMain.instance.execute(channel, ...args);
					logger.verbose('[Overlay][HTTP] < 200, Content-Length: 0');
					response.writeHead(200, { 'Content-Length': 0 });
					response.end();
				}
			} else {
				logger.verbose('[Overlay][HTTP] < 404, Content-Length: 0');
				response.writeHead(404, { 'Content-Length': 0 });
				response.end();
			}
		} else if(filename.startsWith('fs/') || filename === 'fs') {
			if(request.method.toLowerCase() !== 'head' && request.method.toLowerCase() !== 'get') {
				logger.verbose('[Overlay][HTTP] < 405, Content-Length: 0');
				response.writeHead(405, { 'Allow': 'HEAD, GET', 'Content-Length': 0 });
				response.end();
				return;
			}

			let fsFile = decodeURIComponent(u.query).replace(/\//g, '\\');

			let fsAllowed: boolean = false;

			let allowedSources: string[] = await Settings.getJSON('overlayhost.global.allowedsources', []);
			for(let i = 0; i < allowedSources.length; i++) {
				if(fsFile.toLowerCase().startsWith(allowedSources[i].toLowerCase())) {
					fsAllowed = true;
					break;
				}
			}

			let i = fsFile.lastIndexOf('.');
			let fsfileEnding = fsFile.substr(i).toLowerCase();
			fsAllowed = fsAllowed && (Object.keys(this.mimeTypes).indexOf(fsfileEnding) >= 0);

			if(!fsAllowed) {
				new Promise<void>(async (res) => {
					let notifFilename = fsFile;
					if(notifFilename.length > 50) {
						notifFilename = notifFilename.substring(0, 3) + '…' + notifFilename.substring(notifFilename.length-45);
					}
					let n = new Notification({
						title: 'TTVStreamerTool',
						body: await TTVST.i18n.__('Access to {{afile}} was denied. Check allowed file sources in the Overlay addon settings.', {afile: notifFilename}),
						icon: iconpath,
						silent: false
					});
					n.show();
					res();
				});


				logger.verbose('[Overlay][HTTP] < 403, Content-Length: 0');
				response.writeHead(403, { 'Content-Length': 0 });
				response.end();
				return;
			} else {
				let stat = await FileHandleHandler.prepareFile(fsFile);
				if(stat === false) {
					logger.verbose('[Overlay][HTTP] < 404, Content-Length: 0');
					response.writeHead(404, { 'Content-Length': 0 });
					response.end();
				} else {
					let fsmime = this.mimeTypes[fsfileEnding];
					if(request.method.toLowerCase() === 'head') {
						logger.verbose('[Overlay][HTTP] < 200, Content-Length: 0');
						response.writeHead(200, { 'Accept-Ranges': 'bytes', 'Content-Length': stat.size, 'Content-Type': fsmime });
						response.end();
					} else {
						if(typeof(request.headers.range) === 'string') {
							let range = request.headers.range.toLowerCase();
							if(range.startsWith('bytes=')) {
								range = range.substr(6);
								let rangeParts = range.split(',');
								let partsAbsolute: Array<{l:number,r:number,length:number}> = [];

								let issuesFound: boolean = false;

								for(let r of rangeParts) {
									let [left, right] = r.trim().split('-', 2);

									let leftN = -1;
									let rightN = -1;

									if(left.length > 0) {
										leftN = parseInt(left);
										if(isNaN(leftN)) {
											issuesFound = true;
											break;
										}
									}
									if(right.length > 0) {
										rightN = parseInt(right);
										if(isNaN(rightN)) {
											issuesFound = true;
											break;
										}
									}
									
									if(leftN < 0 && rightN > -1) {
										leftN = stat.size-rightN;
										rightN = stat.size;
									}
									if(rightN < 0 && leftN > -1) {
										rightN = stat.size-1;
									}

									let length = (rightN+1) - leftN;
									if(length <= 0) {
										issuesFound = true;
										break;
									}

									partsAbsolute.push({l:leftN,r:rightN,length});
								}

								if(issuesFound) {
									logger.verbose(`[Overlay][HTTP] < 416, Content-Length: 0`);
									response.writeHead(416, { 'Content-Length': '0' });
									response.end();
								} else {
									if(partsAbsolute.length == 1) {
										logger.verbose(`[Overlay][HTTP] < 206, Content-Length: ${partsAbsolute[0].length}`);
										response.writeHead(206, { 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${partsAbsolute[0].l}-${partsAbsolute[0].r}/${stat.size}`, 'Content-Length': (partsAbsolute[0].length), 'Content-Type': fsmime });
										FileHandleHandler.pipeFileToResponse(fsFile, response, request, partsAbsolute[0].l, partsAbsolute[0].r);
									} else if(partsAbsolute.length > 1) {
										let boundary = `[[${new Date().getTime()}-${Path.basename(fsFile)}]]--`
										let multipartHeaders = [];
										let contentLength = 0;
										for(let i = 0; i < partsAbsolute.length; i++) {
											let partHeader = (i > 0 ? '\r\n' : '') + '--' + boundary + '\r\nContent-Type: ' + fsmime + `\r\nContent-Range: bytes ${partsAbsolute[i].l}-${partsAbsolute[i].r}/${stat.size}\r\n\r\n`;
											let partHeaderBuffer = Buffer.from(partHeader);
											multipartHeaders.push(partHeaderBuffer);
											contentLength += (partsAbsolute[i].length) + partHeaderBuffer.byteLength;
										}

										logger.verbose(`[Overlay][HTTP] < 206, Content-Length: ${contentLength}`);
										response.writeHead(206, { 'Accept-Ranges': 'bytes', 'Content-Length': contentLength, 'Content-Type': `multipart/byteranges; boundary=${boundary}` });
										
										for(let i = 0; i < partsAbsolute.length; i++) {
											response.write(multipartHeaders[i]);
											await FileHandleHandler.pipeFileToResponse(fsFile, response, request, partsAbsolute[0].l, partsAbsolute[0].r);
										}
										response.end();
									} else {
										logger.verbose(`[Overlay][HTTP] < 404, Content-Length: 0`);
										response.writeHead(404, { 'Content-Length': '0' });
										response.end();
									}
								}
								return;
							}
						}

						logger.verbose(`[Overlay][HTTP] < 200, Content-Length: ${stat.size}`);
						response.writeHead(200, { 'Accept-Ranges': 'bytes', 'Content-Length': stat.size, 'Content-Type': fsmime });
						await FileHandleHandler.pipeFileToResponse(fsFile, response, request, 0, Infinity);
					}
				}
			}
		} else if(allowed) {
			if(request.method.toLowerCase() !== 'head' && request.method.toLowerCase() !== 'get') {
				logger.verbose('[Overlay][HTTP] < 405, Content-Length: 0');
				response.writeHead(405, { 'Allow': 'HEAD, GET', 'Content-Length': 0 });
				response.end();
				return;
			}

			if(filename == 'font.css') {
				this.respondFontCss(response, (request.method.toLowerCase() === 'head'));
				return;
			}


			let filePath = await this.findFileInFolder('resources', filename);
			if(filePath === null) {
				filePath = await this.findFileInFolder('addons', filename);
			}

			if(filePath !== null) {
				logger.verbose(`[Overlay] Found file at ${filePath}`);

				let mime = this.mimeTypes[fileEnding];

				let fileContent : Buffer = null;
				try {
					fileContent = await this.readFileAsync(filePath);
				} catch(e) {
					logger.verbose('[Overlay][HTTP] < 500, Content-Length: 0');
					response.writeHead(500, { 'Content-Length': 0 });
					response.end();
					return;
				}
				/*
				if(mime.startsWith('text/') || mime.startsWith('application/')) {
					let fileContentText = fileContent.toString('utf8');
					fileContent = Buffer.from(fileContentText);
				}*/

				response.writeHead(200, { 'Content-Length': fileContent.byteLength, 'Content-Type': mime });
				if(request.method.toLowerCase() === 'head') {
					logger.verbose(`[Overlay][HTTP] < 200, Content-Length: 0`);
					response.end();
				} else {
					logger.verbose(`[Overlay][HTTP] < 200, Content-Length: ${fileContent.byteLength}`);
					response.end(fileContent);
				}
			} else {
				logger.verbose('[Overlay][HTTP] < 404, Content-Length: 0');
				response.writeHead(404, { 'Content-Length': 0 });
				response.end();
			}
		} else {
			logger.verbose('[Overlay][HTTP] < 403, Content-Length: 0');
			response.writeHead(403, { 'Content-Length': 0 });
			response.end();
		}
	}

	private async respondFontCss(response: http.ServerResponse, headerOnly: boolean) {
		let fileContent : Buffer = null;
		try {
			fileContent = await this.readFileAsync(Path.join(__dirname, 'overlays', 'font.css'));
		
			let fileContentText = fileContent.toString('utf8');

			fileContentText = fileContentText.replace(/\{FONT\}/g, await Settings.getString('overlayhost.global.font', 'Segoe UI'));
			fileContentText = fileContentText.replace(/\{FONT_COLOR\}/g, await Settings.getString('overlayhost.global.fontcolor', '#ffffff'));
			fileContentText = fileContentText.replace(/\{BORDER_THICK\}/g, await Settings.getString('overlayhost.global.borderthick', '2'));
			fileContentText = fileContentText.replace(/\{BORDER_COLOR\}/g, await Settings.getString('overlayhost.global.bordercolor', '#000000'));

			fileContent = Buffer.from(fileContentText);
		} catch(e) {
			logger.verbose('[Overlay][HTTP] < 500, Content-Length: 0');
			response.writeHead(500, { 'Content-Length': 0 });
			response.end();
			return;
		}
		
		response.writeHead(200, { 'Content-Length': fileContent.byteLength, 'Content-Type': 'text/css' });
		if(headerOnly) {
			logger.verbose(`[Overlay][HTTP] < 200, Content-Length: 0`);
			response.end();
		} else {
			logger.verbose(`[Overlay][HTTP] < 200, Content-Length: ${fileContent.byteLength}`);
			response.end(fileContent);
		}
	}

	readFileAsync(path: string): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			fs.readFile(path, (err: NodeJS.ErrnoException, data: Buffer) => {
				if(err === null) {
					resolve(data);
				} else {
					reject();
					logger.error(`[Overlay] Failed to read file at ${path}`);
					logger.error(err);
				}
			})
		})
	}

	findFileInFolder(folder: string, requestPath: string): Promise<string> {
		return new Promise((resolve) => {
			fs.readdir(folder, async (err: NodeJS.ErrnoException, files: Array<string>) => {
				if(err === null) {
					for(let i = 0; i < files.length; i++) {
						let p = await this.findFile(Path.join(folder, files[i]), requestPath);
						if(p !== null) {
							resolve(p);
							return;
						}
					}
					resolve(null);
				} else {
					resolve(null);
				}
			});
		});
	}

	findFile(addonPath: string, requestPath: string): Promise<string> {
		return new Promise((resolve) => {
			let fullPath = Path.normalize(Path.join(addonPath, 'overlays', requestPath));
			fs.exists(fullPath, (exists: boolean) => {
				if(exists) {
					resolve(fullPath);
				} else {
					resolve(null);
				}
			});
			return null;
		});
	}

	private onClose() {
		logger.info(`[Overlay] Server closed`);
		TTVST.startpage.broadcastStatus({ key: 'app.ttvst.overlay', status: 'error', info: 'Server was stopped.', buttons: disconnectedButtons });
		BroadcastMain.instance.emit('app.ttvst.overlay.statuschange', false);
		
		this.lastwssocketid = 0;
	}

	private onWSConnection(socket: ws) {
		socket.on('message', ((data: ws.Data) => { this.onWSMessage(socket, data) }).bind(this));
		socket.on('close', (() => { this.cleanupBroadcastwslistener(); }).bind(this));
		
		this.lastwssocketid++;
		logger.info(`[Overlay] New websocket connection`);
	}

	private async onWSMessage(socket: ws, data: ws.Data) {
		let dataStr = data.toString();
		let broadcastData: any = null;
		try {
			broadcastData = JSON.parse(dataStr);
		} catch(e) {
			logger.info(`[Overlay] Websocket client sent an invalid message`);
			logger.verbose(dataStr);
			return;
		}
			
		if(typeof(broadcastData.action) === 'string' && typeof(broadcastData.channel) === 'string') {
			if(broadcastData.action === 'action' && typeof(broadcastData.parameters) === 'object') {
				let actions = BroadcastMain.getAction({ channel: broadcastData.channel });
				if(actions.length >= 1) {
					logger.verbose(`[Overlay] Websocket client executes action ${broadcastData.channel}`);
					let params = BroadcastMain.objectToParameters(broadcastData.channel, broadcastData.parameters);
					try {
						let response = await BroadcastMain.instance.execute(broadcastData.channel, ...params);
						if(typeof(response) !== 'undefined' && typeof(broadcastData.ref) === 'string') {
							socket.send(JSON.stringify({ channel: ':response', data: response, ref: broadcastData.ref }));
						} else if(typeof(broadcastData.ref) === 'string') {
							socket.send(JSON.stringify({ channel: ':response', data: null, ref: broadcastData.ref, error: 'No response' }));
						}
					} catch(e) {
						if(typeof(broadcastData.ref) === 'string') {
							socket.send(JSON.stringify({ channel: ':response', data: null, ref: broadcastData.ref, error: e.message }));
						}
					}
				} else {
					logger.info(`[Overlay] Websocket client tried to execute unknown action ${broadcastData.channel}`);
				}
			} else if(broadcastData.action === 'listen') {
				let channel = broadcastData.channel;
				let triggers = BroadcastMain.getTrigger({ channel });
				if(triggers.length >= 1) {
					if(typeof(this.broadcastwslistener[channel]) === 'undefined') {
						this.broadcastwslistener[channel] = [];
						this.broadcastlistener[channel] = this.onBroadcastTrigger(channel);
						BroadcastMain.instance.on(channel, this.broadcastlistener[channel]);
					}
					this.broadcastwslistener[channel].push(socket);
				} else {
					logger.info(`[Overlay] Websocket client tried to listen to unknown channel ${broadcastData.channel}`);
				}
			}
		} else if(typeof(broadcastData.action) === 'string') {
			if(broadcastData.action === 'loaded') {
				let u = new url.URL(broadcastData.location);
				let pname = u.pathname.toLowerCase();
				this.socketlocations.push({ socket, location: pname });
				BroadcastMain.instance.emit('app.ttvst.overlay.interactiveloaded', pname);
			}
		} else {
			logger.info(`[Overlay] Websocket client sent an incomprehensible message`);
			logger.verbose(dataStr);
		}
	}

	private onBroadcastTrigger(channel: string): (...args: Array<any>) => void {
		return ((...args: Array<any>) => {
			let sockets = this.broadcastwslistener[channel];
			if(sockets.length > 0) {
				this.overlaywebsocket.clients.forEach((socket) => {
					if(sockets.includes(socket)) {
						if(socket.readyState === ws.OPEN) {
							socket.send(JSON.stringify({ channel, data: BroadcastMain.argumentsToObject(channel, ...args) }));
						}
					}
				});
			}
		}).bind(this);
	}

	private cleanupBroadcastwslistener() {
		logger.info(`[Overlay] Cleaning up websocket client references`);
		let channels = Object.keys(this.broadcastwslistener);
		for(let i = 0; i < channels.length; i++) {
			let sockets = this.broadcastwslistener[channels[i]];
			let newSockets = [];
			for(let j = 0; j < sockets.length; j++) {
				if(sockets[j].readyState !== ws.CLOSING && sockets[j].readyState !== ws.CLOSED) {
					newSockets.push(sockets[j]);
				}
			}
			this.broadcastwslistener[channels[i]] = newSockets;
		}

		let newSocketlocations: Array<{ socket: ws, location: string }> = [];
		let locationsRemoved: Array<string> = [];
		for(let i = 0; i < this.socketlocations.length; i++) {
			if(this.socketlocations[i].socket.readyState !== ws.CLOSING && this.socketlocations[i].socket.readyState !== ws.CLOSED) {
				newSocketlocations.push(this.socketlocations[i]);
			} else {
				locationsRemoved.push(this.socketlocations[i].location);
			}
		}
		this.socketlocations = newSocketlocations;
		for(let i = 0; i < locationsRemoved.length; i++) {
			BroadcastMain.instance.emit('app.ttvst.overlay.interactivedisconnected', locationsRemoved[i]);
		}
	}


	private async onGetVolume(executeId: string) {
		const volume = parseFloat(await Settings.getString('overlay_music_volume', '50'));
		BroadcastMain.instance.executeRespond(executeId, volume);
	}

	private async onSetVolume(volume: number, ease: boolean) {
		if(volume < 0) volume = 0;
		if(volume > 100) volume = 100;
		await Settings.setString('overlay_music_volume', volume.toString());

		BroadcastMain.instance.emit('app.ttvst.overlay.music.volumechange', volume, ease);
	}

	private async onGetPlaylist(executeId: string) {
		const playlistid = await Settings.getString('overlay_music_playlist', 'PLRBp0Fe2Gpglq-J-Hv0p-y0wk3lQk570u');
		BroadcastMain.instance.executeRespond(executeId, playlistid);
	}

	private async onSetPlaylist(playlistid: string) {
		await Settings.setString('overlay_music_playlist', playlistid);
		BroadcastMain.instance.emit('app.ttvst.overlay.music.playlistchange', playlistid);
	}

	private onSkipTrack() {
		BroadcastMain.instance.emit('app.ttvst.overlay.music.skipsongrequest');
	}

	private onAddTime(hours: number, minutes: number, seconds: number) {
		BroadcastMain.instance.emit('app.ttvst.timer.add', hours, minutes, seconds);
	}

	private onSetTime(time: string, date: string) {
		BroadcastMain.instance.emit('app.ttvst.timer.set', time, date);
	}

}

export = OverlayHost;