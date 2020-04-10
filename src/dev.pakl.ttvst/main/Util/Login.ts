import * as http from 'http';
import { BrowserWindow } from 'electron';

import TTVSTMain from '../TTVSTMain';

declare var TTVST: TTVSTMain;

interface ILoginImplicitFlowHash {
	access_token: string;
	state: string;
}

class Login {

	private static _inst: Login = null;

	static instance() {
		if(Login._inst === null) {
			Login._inst = new Login();
		}
		return Login._inst;
	}


	private returnServer: http.Server = null;
	private currentPortIndex: number = -1;
	get possiblePorts(): Array<number> { return [8321, 8322, 8323]; }

	private authWindow: BrowserWindow = null;

	private loginResolve: (token: string) => void = null;
	private loginReject: (msg: string) => void = null;

	constructor() {
		this.loginResolver = this.loginResolver.bind(this);

		this.onReturnRequest = this.onReturnRequest.bind(this);
		this.onReturnError = this.onReturnError.bind(this);
		this.onReturnListening = this.onReturnListening.bind(this);

		this.onAuthTitleChange = this.onAuthTitleChange.bind(this);
		this.onAuthClosed = this.onAuthClosed.bind(this);
	}

	login(): Promise<string> {
		return new Promise(this.loginResolver);
	}

	private loginResolver(resolve: (token: string) => void, reject: (msg: string) => void) {
		if(this.loginResolve !== null) {
			reject('Already logging in');
			return;
		}
		this.loginResolve = resolve;
		this.loginReject = reject;

		this.returnServer = http.createServer(this.onReturnRequest);
		this.returnServer.on('error', this.onReturnError);
		this.returnServer.on('listening', this.onReturnListening);

		this.currentPortIndex = 0;
		this.returnServer.listen(this.possiblePorts[this.currentPortIndex], '127.0.0.1');
	}

	private loginFinished() {
		this.loginResolve = null;
		this.loginReject = null;
		if(this.returnServer !== null) {
			this.returnServer.close();
			this.returnServer = null;
		}
		if(this.authWindow !== null) {
			this.authWindow.close();
		}
	}

	private onReturnError(error: NodeJS.ErrnoException) {
		if(error.code == 'EADDRINUSE') {
			if(this.currentPortIndex < this.possiblePorts.length-1) {
				this.currentPortIndex++;
				this.returnServer.listen(this.possiblePorts[this.currentPortIndex], '127.0.0.1');
			} else {
				this.loginReject('All possible ports already in use');
				this.loginFinished();
			}
		} else if(this.loginReject !== null) {
			this.loginReject(error.message);
			this.loginFinished();
		}
	}

	private onReturnListening() {
		let url = TTVST.helix.getAuthImplicitGrantFlowUrl(`http://localhost:${this.possiblePorts[this.currentPortIndex]}/`);
		this.authWindow = new BrowserWindow({
			width: 400,
			height: 500,
			show: false,
			icon: __dirname + '/../res/icon.ico',
			modal: true,
			autoHideMenuBar: true,
			webPreferences: { nodeIntegration: false, webviewTag: false, partition: 'persist:twitch' }
		});
		this.authWindow.loadURL(url);
		this.authWindow.on('page-title-updated', this.onAuthTitleChange);
		this.authWindow.show();
		this.authWindow.on('closed', this.onAuthClosed)
	}

	private onReturnRequest(request: http.IncomingMessage, response: http.ServerResponse) {
		let body = Buffer.from('<!DOCTYPE html>\n<html><head><meta charset="utf-8"><title>OAUTH RESPONSE</title><style>html,body{background:#000;color:#555;}</style></head><body>This should only be visible for a second...</body></html>');
		response.writeHead(200, {
			'Content-Length': body.length,
			'Content-Type': 'text/html; charset=utf-8'
		});
		response.end(body);
	}


	private parseHash(hash: string): ILoginImplicitFlowHash {
		let hashargs = hash.split('&');
		let hashObj: ILoginImplicitFlowHash = { access_token: null, state: null };
		for(let i = 0; i < hashargs.length; i++) {
			let kv = hashargs[i].split('=', 2);
			let k = kv[0];
			let v = decodeURIComponent(kv[1]);
			if(k === 'access_token' || k === 'state') {
				hashObj[k] = v
			}
		}
		return hashObj;
	}

	private onAuthTitleChange(event: Electron.Event, title: string) {
		if(title == 'OAUTH RESPONSE') {
			let url = this.authWindow.webContents.getURL()

			let hashindex = url.lastIndexOf('#');
			if(hashindex > 0) {
				let hashstr = url.substring(hashindex+1);
				let hash = this.parseHash(hashstr);
				
				if(hash.access_token !== null && hash.state !== null) {
					if(TTVST.helix.verifyState(hash.state)) {
						this.loginResolve(hash.access_token);
						this.loginFinished();
					} else {
						this.loginReject('Invalid server response');
						this.loginFinished();
					}
				} else {
					this.loginReject('Canceled by user');
					this.loginFinished();
				}
			} else {
				this.loginReject('Canceled by user');
				this.loginFinished();
			}
		}
	}

	private onAuthClosed() {
		this.authWindow = null

		if(this.loginResolve !== null) {
			this.loginReject('Canceled by user');
			this.loginFinished();
		}
	}

}

export = Login;