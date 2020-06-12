import { ipcMain } from 'electron';
import TTVSTMain from '../TTVSTMain';
import Broadcast from '../BroadcastMain';
import Login from '../Util/Login';
import winston from 'winston';

declare var logger: winston.Logger;
declare var TTVST: TTVSTMain;

import { IStatusObject } from './StartpageTypes';

class Startpage {

	lastStatus: string = 'offline';
	currentStatus: IStatusObject[] = [];

	constructor() {
		this.onLogin = this.onLogin.bind(this);
		this.onLogout = this.onLogout.bind(this);

		this.onCheckLogin = this.onCheckLogin.bind(this);
		this.onGetUser = this.onGetUser.bind(this);
		this.onConnectTMI = this.onConnectTMI.bind(this);
		this.onDisconnectTMI = this.onDisconnectTMI.bind(this);

		this.onTMIReady = this.onTMIReady.bind(this);
		this.onTMIRegistered = this.onTMIRegistered.bind(this);
		this.onTMIAuthFail = this.onTMIAuthFail.bind(this);
		this.onTMIClose = this.onTMIClose.bind(this);
		
		this.repeatBroadcast = this.repeatBroadcast.bind(this);

		ipcMain.handle('cockpit.login', this.onLogin);
		ipcMain.handle('cockpit.logout', this.onLogout);

		ipcMain.handle('cockpit.check-login', this.onCheckLogin);
		ipcMain.handle('cockpit.get-user', this.onGetUser);

		this.broadcastStatus({ key: 'app.ttvst.tmi', icon: 'CannedChat', status: 'error', title: 'Twitch Messaging Interface (TMI)', info: 'Disconnected.'});
		Broadcast.instance.on('broadcast.on', this.repeatBroadcast);

		ipcMain.on('cockpit.tmi.connect', this.onConnectTMI);
		ipcMain.on('cockpit.tmi.disconnect', this.onDisconnectTMI);
		TTVST.tmi.on('ready', this.onTMIReady);
		TTVST.tmi.on('registered', this.onTMIRegistered);
		TTVST.tmi.on('auth-fail', this.onTMIAuthFail);
		TTVST.tmi.on('close', this.onTMIClose);

		TTVST.tmi.on('incoming', (msg) => {
			logger.verbose('[TMI] > ' + msg);
		});
		TTVST.tmi.on('outgoing', (msg) => {
			logger.verbose('[TMI] < ' + msg);
		})

	}

	async onLogin(): Promise<string> {
		logger.verbose('Login was requested');
		try {
			return await Login.instance().login();
		} catch(e) {
			if(typeof(e) === 'string') {
				logger.info(`Login response: ${e}`)
			} else {
				logger.error(e);
			}
			return '';
		}
	}

	async onLogout(): Promise<null> {
		logger.verbose('Logging out');
		TTVST.helix.setAuthToken(null);
		TTVST.tmi.disconnect();
		return null;
	}

	async onCheckLogin(event: Electron.IpcMainInvokeEvent, token: string) {
		logger.verbose('Validating token');
		TTVST.helix.setAuthToken(token);
		try {
			let validation = await TTVST.helix.validate();
			return validation;
		} catch(e) {
			logger.error(e);
		}
		return null;
	}

	async onGetUser(event: Electron.IpcMainInvokeEvent) {
		try {
			let user = await TTVST.helix.getUsers();
			return user;
		} catch(e) {
			logger.error(e);
		}
		return null;
	}

	onConnectTMI(event: Electron.IpcMainEvent) {
		TTVST.tmi.connect();
	}
	onDisconnectTMI(event: Electron.IpcMainEvent) {
		TTVST.tmi.disconnect();
	}

	onTMIReady() {
		this.broadcastStatus({ key: 'app.ttvst.tmi', status: 'warn', info: 'Connection established.', buttons: [{ icon: 'PlugDisconnected', action: 'cockpit.tmi.disconnect', title: 'Disconnect' }] });
		this.lastStatus = 'ready';
		if(TTVST.helix.token.length > 0 && TTVST.helix.userobj !== null) {
			TTVST.tmi.auth(TTVST.helix.userobj.login, TTVST.helix.token);
		}
	}

	onTMIRegistered() {
		this.broadcastStatus({ key: 'app.ttvst.tmi', status: 'good', info: 'Connection established and logged in.', buttons: [{ icon: 'PlugDisconnected', action: 'cockpit.tmi.disconnect', title: 'Disconnect' }] });
		this.lastStatus = 'registered';
		TTVST.tmi.join(TTVST.helix.userobj.login);
	}

	onTMIAuthFail() {
		this.broadcastStatus({ key: 'app.ttvst.tmi', status: 'warn', info: 'Connection established but login failed.', buttons: [{ icon: 'PlugDisconnected', action: 'cockpit.tmi.disconnect', title: 'Disconnect' }] });
		this.lastStatus = 'auth-failed';
	}

	onTMIClose(had_error: boolean) {
		if(had_error) {
			this.broadcastStatus({ key: 'app.ttvst.tmi', status: 'error', info: 'Connection closed due to an error.', buttons: [{ icon: 'PlugConnected', action: 'cockpit.tmi.connect', title: 'Connect' }] });
		} else if(this.lastStatus !== 'auth-failed') {
			this.broadcastStatus({ key: 'app.ttvst.tmi', status: 'error', info: 'Disconnected.', buttons: [{ icon: 'PlugConnected', action: 'cockpit.tmi.connect', title: 'Connect' }] });
		}
	}

	repeatBroadcast(channel: string) {
		if(channel !== 'cockpit.status') return;

		for(let i = 0; i < this.currentStatus.length; i++) {
			Broadcast.instance.emit('cockpit.status', this.currentStatus[i]);
		}
	}

	broadcastStatus(status: IStatusObject) {
		for(let i = 0; i < this.currentStatus.length; i++) {
			if(this.currentStatus[i].key == status.key) {
				Object.assign(this.currentStatus[i], status);
				Broadcast.instance.emit('cockpit.status', this.currentStatus[i]);
				return;
			}
		}
		this.currentStatus.push(status);
		Broadcast.instance.emit('cockpit.status', status);
	}

}

export = Startpage;