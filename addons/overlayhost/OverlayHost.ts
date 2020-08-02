import fs from 'fs';
import http from 'http';
import url from 'url';
import Path from 'path';
import winston from 'winston';
import ws from 'ws';

import TTVSTMain from '../../dist/dev.pakl.ttvst/main/TTVSTMain';
import BroadcastMain from '../../dist/dev.pakl.ttvst/main/BroadcastMain';
import * as Settings from '../../dist/dev.pakl.ttvst/main/Util/Settings';

import { ipcMain } from 'electron';

declare var logger: winston.Logger;
declare var TTVST: TTVSTMain;

let disconnectedButtons = [{ icon: 'PlugConnected', action: 'app.ttvst.overlayhost.listen', title: 'Connect' }];
let connectedButtons = [{ icon: 'PlugDisconnected', action: 'app.ttvst.overlayhost.close', title: 'Disconnect' }];
class OverlayHost {

	overlayport: number = 8090;
	overlayres: string = 'res/overlays';

	mimeTypes: { [fe: string]: string } = {
		'.html': 'text/html',
		'.htm': 'text/html',
		'.png': 'image/png',
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

		this.onGetVolume = this.onGetVolume.bind(this)
		this.onSetVolume = this.onSetVolume.bind(this)
		this.onGetPlaylist = this.onGetPlaylist.bind(this)
		this.onSetPlaylist = this.onSetPlaylist.bind(this)
		this.onSkipTrack = this.onSkipTrack.bind(this)

		this.startListen();

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
	}

	startListen() {
		if(this.overlayserver === null || !this.overlayserver.listening) {
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

	onGetStatus(executeId: string) {
		BroadcastMain.instance.executeRespond(executeId, (this.overlayserver !== null && this.overlayserver.listening));
	}

	onError(error: NodeJS.ErrnoException) {
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

	onListening() {
		logger.info(`[Overlay] Host is now listening on port ${this.overlayport}`);
		TTVST.startpage.broadcastStatus({ key: 'app.ttvst.overlay', status: 'good', info: 'Server is running and listening on port {{port}}.', infoValues: { port: this.overlayport }, buttons: connectedButtons });
		BroadcastMain.instance.emit('app.ttvst.overlay.statuschange', true);
	}

	async onHttpRequest(request: http.IncomingMessage, response: http.ServerResponse) {
		logger.verbose(`[Overlay][HTTP] > ${request.method} ${request.url}`);

		let u = url.parse(request.url);

		let filename = u.pathname;
		if(filename.length > 0) filename = filename.substr(1);

		let i = filename.lastIndexOf('.');
		let fileEnding = filename.substr(i).toLowerCase();
		let allowed = (Object.keys(this.mimeTypes).indexOf(fileEnding) >= 0);
		let access = false;

		if(filename === 'send') {
			BroadcastMain.instance.emit(u.query);
		} else if(allowed) {
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

				logger.verbose(`[Overlay][HTTP] < 200, Content-Length: ${fileContent.byteLength}`);
				response.writeHead(200, { 'Content-Length': fileContent.byteLength, 'Content-Type': mime });
				response.end(fileContent);
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

	onClose() {
		logger.info(`[Overlay] Server closed`);
		TTVST.startpage.broadcastStatus({ key: 'app.ttvst.overlay', status: 'error', info: 'Server was stopped.', buttons: disconnectedButtons });
		BroadcastMain.instance.emit('app.ttvst.overlay.statuschange', false);
		
		this.lastwssocketid = 0;
	}

	onWSConnection(socket: ws) {
		socket.on('message', ((data: ws.Data) => { this.onWSMessage(socket, data) }).bind(this));
		this.lastwssocketid++;
		logger.info(`[Overlay] New websocket connection`);
	}

	async onWSMessage(socket: ws, data: ws.Data) {
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
		} else {
			logger.info(`[Overlay] Websocket client sent an incomprehensible message`);
			logger.verbose(dataStr);
		}
	}

	onBroadcastTrigger(channel: string): (...args: Array<any>) => void {
		return ((...args: Array<any>) => {
			let sockets = this.broadcastwslistener[channel];
			this.overlaywebsocket.clients.forEach((socket) => {
				if(sockets.includes(socket)) {
					if(socket.readyState === ws.OPEN) {
						socket.send(JSON.stringify({ channel, data: BroadcastMain.argumentsToObject(channel, ...args) }));
					}
				}
			});
		}).bind(this);
	}


	async onGetVolume(executeId: string) {
		const volume = parseFloat(await Settings.getString('overlay_music_volume', '50'));
		BroadcastMain.instance.executeRespond(executeId, volume);
	}

	async onSetVolume(volume: number, ease: boolean) {
		if(volume < 0) volume = 0;
		if(volume > 100) volume = 100;
		await Settings.setString('overlay_music_volume', volume.toString());

		BroadcastMain.instance.emit('app.ttvst.overlay.music.volumechange', volume, ease);
	}

	async onGetPlaylist(executeId: string) {
		const playlistid = await Settings.getString('overlay_music_playlist', 'UU_aEa8K-EOJ3D6gOs7HcyNg');
		BroadcastMain.instance.executeRespond(executeId, playlistid);
	}

	async onSetPlaylist(playlistid: string) {
		await Settings.setString('overlay_music_volume', playlistid);
		BroadcastMain.instance.emit('app.ttvst.overlay.music.playlistchange', playlistid);
	}

	onSkipTrack() {
		BroadcastMain.instance.emit('app.ttvst.overlay.music.skipsongrequest');
	}



}

export = OverlayHost;