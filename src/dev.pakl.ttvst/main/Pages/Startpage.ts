import { ipcMain } from 'electron';
import TTVSTMain from '../TTVSTMain';
import IpcEventEmitter from '../Util/IpcEventEmitter';
import Login from '../Util/Login';

declare var TTVST: TTVSTMain;


class Startpage extends IpcEventEmitter {

	lastStatus: string = 'offline';

	constructor() {
		super();

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
			console.log('[TMI] > ' + msg);
		});
		TTVST.tmi.on('outgoing', (msg) => {
			console.log('[TMI] < ' + msg);
		})

	}

	async onLogin(): Promise<string> {
		try {
			return await Login.instance().login();
		} catch(e) {
			//TODO:write down errors
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
			console.error(e);
		}
		return null;
	}

	async onGetUser(event: Electron.IpcMainInvokeEvent) {
		try {
			let user = await TTVST.helix.getUsers();
			return user;
		} catch(e) {
			console.error(e);
		}
		return null;
	}

	onConnectTMI(event: Electron.IpcMainEvent) {
		TTVST.tmi.connect();
	}

	onTMIReady() {
		this.emit('tmi.statusUpdate', 'ready');
		this.lastStatus = 'ready';
		if(TTVST.helix.token.length > 0 && TTVST.helix.userobj !== null) {
			TTVST.tmi.auth(TTVST.helix.userobj.login, TTVST.helix.token);
		}
	}

	onTMIRegistered() {
		this.emit('tmi.statusUpdate', 'registered');
		this.lastStatus = 'registered';
		TTVST.tmi.join(TTVST.helix.userobj.login);
	}

	onTMIAuthFail() {
		this.emit('tmi.statusUpdate', 'auth-failed');
		this.lastStatus = 'auth-failed';
	}

	onTMIClose(had_error: boolean) {
		if(had_error) {
			this.emit('tmi.statusUpdate', 'closed-due-to-error');
		} else if(this.lastStatus !== 'auth-failed') {
			this.emit('tmi.statusUpdate', 'closed');
		}
	}

}

export = Startpage;