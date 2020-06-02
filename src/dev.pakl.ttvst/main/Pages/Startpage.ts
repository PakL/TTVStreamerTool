import { ipcMain } from 'electron';
import TTVSTMain from '../TTVSTMain';
import Broadcast from '../BroadcastMain';
import Login from '../Util/Login';
import winston from 'winston';

declare var logger: winston.Logger;
declare var TTVST: TTVSTMain;


class Startpage {

	lastStatus: string = 'offline';

	constructor() {
		this.onLogin = this.onLogin.bind(this);
		this.onLogout = this.onLogout.bind(this);

		this.onCheckLogin = this.onCheckLogin.bind(this);
		this.onGetUser = this.onGetUser.bind(this);
		this.onConnectTMI = this.onConnectTMI.bind(this);

		this.onTMIReady = this.onTMIReady.bind(this);
		this.onTMIRegistered = this.onTMIRegistered.bind(this);
		this.onTMIAuthFail = this.onTMIAuthFail.bind(this);
		this.onTMIClose = this.onTMIClose.bind(this);

		ipcMain.handle('cockpit-login', this.onLogin);
		ipcMain.handle('cockpit-logout', this.onLogout);

		ipcMain.handle('cockpit-check-login', this.onCheckLogin);
		ipcMain.handle('cockpit-get-user', this.onGetUser);

		ipcMain.on('connect-tmi', this.onConnectTMI);
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
		TTVST.helix.setAuthToken(null);
		TTVST.tmi.disconnect();
		return null;
	}

	async onCheckLogin(event: Electron.IpcMainInvokeEvent, token: string) {
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

	onTMIReady() {
		Broadcast.instance.emit('tmi.statusUpdate', 'ready');
		this.lastStatus = 'ready';
		if(TTVST.helix.token.length > 0 && TTVST.helix.userobj !== null) {
			TTVST.tmi.auth(TTVST.helix.userobj.login, TTVST.helix.token);
		}
	}

	onTMIRegistered() {
		Broadcast.instance.emit('tmi.statusUpdate', 'registered');
		this.lastStatus = 'registered';
		TTVST.tmi.join(TTVST.helix.userobj.login);
	}

	onTMIAuthFail() {
		Broadcast.instance.emit('tmi.statusUpdate', 'auth-failed');
		this.lastStatus = 'auth-failed';
	}

	onTMIClose(had_error: boolean) {
		if(had_error) {
			Broadcast.instance.emit('tmi.statusUpdate', 'closed-due-to-error');
		} else if(this.lastStatus !== 'auth-failed') {
			Broadcast.instance.emit('tmi.statusUpdate', 'closed');
		}
	}

}

export = Startpage;