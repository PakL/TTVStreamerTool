import { EventEmitter } from 'events'
import { ipcMain, webContents } from 'electron'
import { resolve } from 'dns';
import { exec } from 'child_process';
import winston from 'winston';

declare var logger: winston.Logger;
let _instance: BroadcastMain = null

export type IBroadcastArgumentType = 'number' | 'string' | 'boolean' | 'file' | 'list' | 'assoc';
export interface IBroadcastArgument {
	label: string;
	description: string;
	type: IBroadcastArgumentType;
}

export interface IBroadcastTrigger {
	label: string;
	addon: string;
	description: string;
	channel: string;
	arguments: Array<IBroadcastArgument>;
}

export interface IBroadcastAction {
	label: string;
	addon: string;
	description: string;
	channel: string;
	parameters: Array<IBroadcastArgument>;
	result?: IBroadcastArgument;
}

export interface IBroadcastFilter {
	label?: string;
	addon?: string;
	channel?: string;
}


class BroadcastMain extends EventEmitter {

	private static _triggers: Array<IBroadcastTrigger> = [];
	private static _actions: Array<IBroadcastAction> = [];

	static registerTrigger(trigger: IBroadcastTrigger) {
		if(BroadcastMain.hasTrigger(trigger.channel) < 0) {
			BroadcastMain._triggers.push(trigger);
		}
	}

	static removeTrigger(channel: string) {
		let index = BroadcastMain.hasTrigger(channel);
		if(index >= 0) {
			BroadcastMain._triggers.splice(index, 1);
		}
	}

	static hasTrigger(channel: string) {
		for(let i = 0; i < BroadcastMain._triggers.length; i++) {
			if(BroadcastMain._triggers[i].channel.toLocaleLowerCase() === channel.toLocaleLowerCase()) {
				return i;
			}
		}
		return -1;
	}

	static getTrigger(where: IBroadcastFilter = {}): Array<IBroadcastTrigger> {
		if(typeof(where.label) !== 'string' && typeof(where.addon) !== 'string' && typeof(where.channel) !== 'string') {
			return BroadcastMain._triggers;
		}

		let result = [];
		for(let i = 0; i < BroadcastMain._triggers.length; i++) {
			let add = false;
			if(typeof(where.label) === 'string' && BroadcastMain._triggers[i].label.toLocaleLowerCase() === where.label.toLocaleLowerCase()) add = true;
			if(typeof(where.addon) === 'string' && BroadcastMain._triggers[i].addon.toLocaleLowerCase() === where.addon.toLocaleLowerCase()) add = true;
			if(typeof(where.channel) === 'string' && BroadcastMain._triggers[i].channel.toLocaleLowerCase() === where.channel.toLocaleLowerCase()) add = true;

			if(add) result.push(BroadcastMain._triggers[i]);
		}
		return result;
	}

	static argumentsToObject(channel: string, ...args: Array<any>): { [key: string]: any } {
		let result: { [key: string]: any } = {};
		let triggers = this.getTrigger({ channel });
		if(triggers.length > 0) {
			let trigger = triggers[0];
			for(let i = 0; i < trigger.arguments.length; i++) {
				if(i < args.length) {
					result[trigger.arguments[i].label] = args[i];
				}
			}
		}
		return result;
	}

	static registerAction(action: IBroadcastAction) {
		if(BroadcastMain.hasAction(action.channel) < 0) {
			BroadcastMain._actions.push(action);
		}
	}

	static removeAction(channel: string) {
		let index = BroadcastMain.hasAction(channel);
		if(index >= 0) {
			BroadcastMain._actions.splice(index, 1);
		}
	}

	static hasAction(channel: string) {
		for(let i = 0; i < BroadcastMain._actions.length; i++) {
			if(BroadcastMain._actions[i].channel.toLocaleLowerCase() === channel.toLocaleLowerCase()) {
				return i;
			}
		}
		return -1;
	}

	static getAction(where: IBroadcastFilter = {}): Array<IBroadcastAction> {
		if(typeof(where.label) !== 'string' && typeof(where.addon) !== 'string' && typeof(where.channel) !== 'string') {
			return BroadcastMain._actions;
		}

		let result = [];
		for(let i = 0; i < BroadcastMain._actions.length; i++) {
			let add = false;
			if(typeof(where.label) === 'string' && BroadcastMain._actions[i].label.toLocaleLowerCase() === where.label.toLocaleLowerCase()) add = true;
			if(typeof(where.addon) === 'string' && BroadcastMain._actions[i].addon.toLocaleLowerCase() === where.addon.toLocaleLowerCase()) add = true;
			if(typeof(where.channel) === 'string' && BroadcastMain._actions[i].channel.toLocaleLowerCase() === where.channel.toLocaleLowerCase()) add = true;

			if(add) result.push(BroadcastMain._actions[i]);
		}
		return result;
	}

	static objectToParameters(channel: string, obj: { [key: string]: any }): Array<any> {
		let result: Array<any> = [];
		let actions = this.getAction({ channel });
		if(actions.length > 0) {
			let action = actions[0];
			for(let i = 0; i < action.parameters.length; i++) {
				let v: any = obj[action.parameters[i].label];
				if(typeof(v) === 'string') {
					if(action.parameters[i].type === 'number') {
						v = parseFloat(v);
					} else if(action.parameters[i].type === 'boolean') {
						v = (v === 'true' || v === '1');
					} else if(action.parameters[i].type === 'list' || action.parameters[i].type === 'assoc') {
						v = JSON.parse(v);
					}
				}
				result.push(v);
			}
		}
		return result;
	}

	static get instance(): BroadcastMain {
		if(_instance === null) {
			_instance = new BroadcastMain();
		}
		return _instance;
	}

	constructor() {
		super();

		this.setMaxListeners(100);

		const self = this

		ipcMain.on('broadcast', (event: Electron.IpcMainEvent, channel: string, ...args: any[]) => {
			self.emitIpc(channel, ...args);
		});

		ipcMain.on('broadcast.execute', (event: Electron.IpcMainEvent, channel: string, ...args: any[]) => {
			let listener = self.listeners(channel);
			for(let i = 0; i < listener.length; i++) {
				listener[i](...args);
			}
		});

		ipcMain.on('broadcast.response', (event: Electron.IpcMainEvent, executeId: string, result: any) => {
			self.emitIpc(`broadcast.response.${executeId}`, result);
		});

	}

	private broadcastToAll(channel: string, event: string, ...args: any[]) {
		let r = false;
		let allContents = webContents.getAllWebContents()
		for(let i = 0; i < allContents.length; i++) {
			allContents[i].send(channel, event, ...args);
			r = true;
		}
		return r;
	}

	emit(event: string | symbol, ...args: any[]): boolean {
		let r = super.emit(event, ...args);
		if(typeof(event) !== 'string') return r;

		r = this.broadcastToAll('broadcast', event, ...args) || r;
		return r;
	}

	emitIpc(event: string, ...args: any[]): boolean {
		return super.emit(event, ...args);
	}

	execute(channel: string, ...args: any[]): Promise<any|void> {
		const self = this;
		return new Promise<any>((resolve, reject) => {
			let actions = BroadcastMain.getAction({ channel });
			if(actions.length >= 1) {
				let action = actions[0];
				if(typeof(action.result) !== 'undefined') {
					let hrtime = process.hrtime();
					let executeId = hrtime[0].toString(16) + '-' + hrtime[1].toString(16);
					args.unshift(executeId);

					let waiting = true;
					this.once(`broadcast.response.${executeId}`, (result: any) => {
						if(!waiting) return;
						waiting = false;
						resolve(result);
					});
					setTimeout(() => {
						if(!waiting) return;
						waiting = false;
						reject(new Error('Execution timed out'));
					}, 10000);
				} else {
					resolve();
				}
				self.emitIpc(channel, ...args);
				self.broadcastToAll('broadcast.execute', channel, ...args);
			} else {
				reject(new Error('Unknown action channel'));
			}
		});
	}

	executeRespond(executeId: string, result: any) {
		this.emitIpc(`broadcast.response.${executeId}`, result);
		this.broadcastToAll('broadcast.response', executeId, result);
	}

}

ipcMain.on('broadcast.getTrigger', (e: Electron.IpcMainEvent, filter: IBroadcastFilter) => {
	e.returnValue = BroadcastMain.getTrigger(filter);
});
ipcMain.on('broadcast.getAction', (e: Electron.IpcMainEvent, filter: IBroadcastFilter) => {
	e.returnValue = BroadcastMain.getAction(filter);
});

export default BroadcastMain;