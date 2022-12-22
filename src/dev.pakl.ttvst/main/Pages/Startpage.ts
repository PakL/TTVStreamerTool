import { ipcMain } from 'electron';
import TTVSTMain from '../TTVSTMain';
import Broadcast from '../BroadcastMain';
import Login from '../Util/Login';
import winston from 'winston';

import * as T from '../Twitch/APIHelixTypes';

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
		this.onConnectEventsub = this.onConnectEventsub.bind(this);
		this.onDisconnectEventsub = this.onDisconnectEventsub.bind(this);

		this.onTMIReady = this.onTMIReady.bind(this);
		this.onTMIRegistered = this.onTMIRegistered.bind(this);
		this.onTMIAuthFail = this.onTMIAuthFail.bind(this);
		this.onTMIClose = this.onTMIClose.bind(this);
		this.onEventsubConnecting = this.onEventsubConnecting.bind(this);
		this.onEventsubConnected = this.onEventsubConnected.bind(this);
		this.onEventsubWelcome = this.onEventsubWelcome.bind(this);
		//this.onEventsubListening = this.onEventsubListening.bind(this);
		this.onEventsubClosed = this.onEventsubClosed.bind(this);
		
		this.repeatBroadcast = this.repeatBroadcast.bind(this);

		ipcMain.handle('cockpit.login', this.onLogin);
		ipcMain.handle('cockpit.logout', this.onLogout);

		ipcMain.handle('cockpit.check-login', this.onCheckLogin);
		ipcMain.handle('cockpit.get-user', this.onGetUser);

		this.broadcastStatus({ key: 'app.ttvst.update', icon: 'Starburst', status: 'error', title: 'TTVStreamertool Update', info: 'Checking for updates...', buttons: []});
		this.broadcastStatus({ key: 'app.ttvst.tmi', icon: 'CannedChat', status: 'error', title: 'Twitch Messaging Interface (TMI)', info: 'Disconnected.', buttons: [{ icon: 'PlugConnected', action: 'cockpit.tmi.connect', title: 'Connect' }]});
		this.broadcastStatus({ key: 'app.ttvst.eventsub', icon: 'Glimmer', status: 'error', title: 'EventSub (Twitch Events)', info: 'Disconnected.', buttons: [{ icon: 'PlugConnected', action: 'cockpit.eventsub.connect', title: 'Connect' }]});
		Broadcast.instance.on('startpage-ready', this.repeatBroadcast);

		ipcMain.on('cockpit.tmi.connect', this.onConnectTMI);
		ipcMain.on('cockpit.tmi.disconnect', this.onDisconnectTMI);
		TTVST.tmi.on('ready', this.onTMIReady);
		TTVST.tmi.on('registered', this.onTMIRegistered);
		TTVST.tmi.on('auth-fail', this.onTMIAuthFail);
		TTVST.tmi.on('close', this.onTMIClose);

		ipcMain.on('cockpit.eventsub.connect', this.onConnectEventsub);
		ipcMain.on('cockpit.eventsub.disconnect', this.onDisconnectEventsub);
		TTVST.eventsub.on('connecting', this.onEventsubConnecting);
		TTVST.eventsub.on('connected', this.onEventsubConnected);
		TTVST.eventsub.on('welcome', this.onEventsubWelcome)
		TTVST.eventsub.on('closed', this.onEventsubClosed);

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
			let login = await Login.instance().login();
			await TTVST.Settings.setJSON('ttvst.global.scope', TTVST.helix.scope);
			return login;
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
		TTVST.eventsub.disconnect();
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
			TTVST.Settings.setString('ttvst.lastloginusername', user.data[0].login);
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
		TTVST.eventsub.connect();
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

	onConnectEventsub() {
		/*if(TTVST.helix.token.length > 0 && TTVST.helix.userobj !== null) {
			TTVST.eventsub.setupTopicsForChannel(TTVST.helix.userobj.id);
			TTVST.eventsub.setAuthToken(TTVST.helix.token);
		}*/
		TTVST.eventsub.connect();
	}
	onDisconnectEventsub() {
		TTVST.eventsub.disconnect();
	}

	onEventsubConnecting(){
		this.broadcastStatus({ key: 'app.ttvst.eventsub', status: 'warn', info: 'Connecting', buttons: [] });
	}
	onEventsubConnected(){
		this.broadcastStatus({ key: 'app.ttvst.eventsub', status: 'warn', info: 'Connection established.', buttons: [] });
	}
	/*onEventsubListening(){
		this.broadcastStatus({ key: 'app.ttvst.eventsub', status: 'good', info: 'Connection established and listening.', buttons: [{ icon: 'PlugDisconnected', action: 'cockpit.eventsub.disconnect', title: 'Disconnect' }] });
	}*/
	async onEventsubWelcome(session_id: string) {
		this.broadcastStatus({ key: 'app.ttvst.eventsub', status: 'warn', info: 'Subscribing to events', buttons: [] });

		let broadcaster_user_id = TTVST.helix.userid;
		let transport: T.IAPIHelixEventsubSubscriptionTransport = { method: 'websocket', session_id };
		await TTVST.helix.createEventsubSubscription('channel.follow', '1', { broadcaster_user_id }, transport);
		/*await TTVST.helix.createEventsubSubscription('channel.subscribe', '1', { broadcaster_user_id }, transport);
		await TTVST.helix.createEventsubSubscription('channel.subscription.gift', '1', { broadcaster_user_id }, transport);
		await TTVST.helix.createEventsubSubscription('channel.subscription.message', '1', { broadcaster_user_id }, transport);*/
		await TTVST.helix.createEventsubSubscription('channel.channel_points_custom_reward_redemption.add', '1', { broadcaster_user_id }, transport);

		this.broadcastStatus({ key: 'app.ttvst.eventsub', status: 'good', info: 'Connection established and listening.', buttons: [{ icon: 'PlugDisconnected', action: 'cockpit.eventsub.disconnect', title: 'Disconnect' }] });
	}
	onEventsubClosed(error: string) {
		if(error.length > 0) {
			this.broadcastStatus({ key: 'app.ttvst.eventsub', status: 'error', info: 'Connection closed due to an error: {{error}}', infoValues: { error }, buttons: [{ icon: 'PlugConnected', action: 'cockpit.eventsub.connect', title: 'Connect' }] });
		} else {
			this.broadcastStatus({ key: 'app.ttvst.eventsub', status: 'error', info: 'Disconnected.', buttons: [{ icon: 'PlugConnected', action: 'cockpit.eventsub.connect', title: 'Connect' }] });
		}
	}


	repeatBroadcast() {
		for(let i = 0; i < this.currentStatus.length; i++) {
			Broadcast.instance.emit('cockpit.status', this.currentStatus[i]);
		}
	}

	broadcastStatus(status: IStatusObject) {
		for(let i = 0; i < this.currentStatus.length; i++) {
			if(this.currentStatus[i].key == status.key) {
				Object.assign(this.currentStatus[i], status);
				Broadcast.instance.emit('cockpit.status', this.currentStatus[i]);
				if(this.currentStatus[i].status === 'remove') {
					this.currentStatus.splice(i, 1);
				}
				return;
			}
		}
		this.currentStatus.push(status);
		Broadcast.instance.emit('cockpit.status', status);
	}

}

export = Startpage;