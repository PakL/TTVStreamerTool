import { ipcMain } from 'electron';
import TTVSTMain from '../TTVSTMain';

declare var TTVST: TTVSTMain;


class Startpage {

	constructor() {
		this.onCheckLogin = this.onCheckLogin.bind(this);
		this.onGetUser = this.onGetUser.bind(this);

		ipcMain.handle('cockpit-check-login', this.onCheckLogin);
		ipcMain.handle('cockpit-get-user', this.onGetUser);
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

	async onGetUser(event: Electron.IpcMainInvokeEvent, token?: string) {
		if(typeof(token) === 'string') {
			TTVST.helix.setAuthToken(token);
		}
		try {
			let user = await TTVST.helix.getUsers();
			return user;
		} catch(e) {
			console.error(e);
		}
		return null;
	}

}

export = Startpage;