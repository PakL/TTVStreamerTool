import { EventEmitter } from 'events'
import { ipcMain, webContents } from 'electron'

let _instance: BroadcastMain = null

interface IipcSubscriptions {
	[senderId: number]: Array<string>
}

export interface IBroadcastArgument {
	label: string;
	description: string;
	type: 'number' | 'string' | 'boolean' | 'file' | 'list' | '';
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

	static hasTrigger(channel: string) {
		for(let i = 0; i < BroadcastMain._triggers.length; i++) {
			if(BroadcastMain._triggers[i].channel === channel) {
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
			if(typeof(where.label) === 'string' && BroadcastMain._triggers[i].label.toLowerCase().indexOf(where.label.toLowerCase()) >= 0) add = true;
			if(typeof(where.addon) === 'string' && BroadcastMain._triggers[i].addon.toLowerCase().indexOf(where.addon.toLowerCase()) >= 0) add = true;
			if(typeof(where.channel) === 'string' && BroadcastMain._triggers[i].channel.toLowerCase().indexOf(where.channel.toLowerCase()) >= 0) add = true;

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
				if(i > args.length) {
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

	static hasAction(channel: string) {
		for(let i = 0; i < BroadcastMain._actions.length; i++) {
			if(BroadcastMain._actions[i].channel === channel) {
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
			if(typeof(where.label) === 'string' && BroadcastMain._actions[i].label.toLowerCase().indexOf(where.label.toLowerCase()) >= 0) add = true;
			if(typeof(where.addon) === 'string' && BroadcastMain._actions[i].addon.toLowerCase().indexOf(where.addon.toLowerCase()) >= 0) add = true;
			if(typeof(where.channel) === 'string' && BroadcastMain._actions[i].channel.toLowerCase().indexOf(where.channel.toLowerCase()) >= 0) add = true;

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
				result.push(obj[action.parameters[i].label]);
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

	private ipcSubscriptions: IipcSubscriptions = {}

	constructor() {
		super()

		this.cleanupSubscriptions = this.cleanupSubscriptions.bind(this);

		const self = this
		ipcMain.on('broadcast.on', (event: Electron.IpcMainEvent, channel: string) => {
			if(typeof(self.ipcSubscriptions[event.sender.id]) === 'undefined') {
				self.ipcSubscriptions[event.sender.id] = [];
				event.sender.once('crashed', self.cleanupSubscriptions);
				event.sender.once('destroyed', self.cleanupSubscriptions);
			}

			if(self.ipcSubscriptions[event.sender.id].indexOf(channel) < 0) {
				self.ipcSubscriptions[event.sender.id].push(channel);
			}

			self.emit('broadcast.on', channel);
		});

		ipcMain.on('broadcast.off', (event: Electron.IpcMainEvent, channel: string) => {
			if(typeof(self.ipcSubscriptions[event.sender.id]) !== 'undefined') {
				let index = self.ipcSubscriptions[event.sender.id].indexOf(channel);
				if(index >= 0) {
					self.ipcSubscriptions[event.sender.id].splice(index, 1);
				}
			}
		});

		ipcMain.on('broadcast', (event: Electron.IpcMainEvent, channel: string, ...args: any[]) => {
			self.emitIpc(channel, ...args);
		});
	}

	private broadcastToAll(channel: string, event: string, ...args: any[]) {
		let r = false;
		let allContents = webContents.getAllWebContents()
		for(let i = 0; i < allContents.length; i++) {
			if(typeof(this.ipcSubscriptions[allContents[i].id]) !== 'undefined') {
				if(this.ipcSubscriptions[allContents[i].id].indexOf(event) >= 0) {
					allContents[i].send(channel, event, ...args);
					r = true;
				}
			}
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


	cleanupSubscriptions() {
		let allContents = webContents.getAllWebContents()
		let keepContent = []
		for(let i = 0; i < allContents.length; i++) {
			if(!allContents[i].isDestroyed() && !allContents[i].isCrashed()) {
				keepContent.push(allContents[i].id);
			}
		}

		for(let contentId of Object.keys(this.ipcSubscriptions)) {
			if(keepContent.indexOf(parseInt(contentId)) < 0) {
				delete this.ipcSubscriptions[parseInt(contentId)];
			}
		}
	}

	on(event: string | symbol, listener: (...args: any[]) => void): this {
		super.on(event, listener);
		if(typeof(event) === 'string' && !event.startsWith('broadcast.')) {
			this.broadcastToAll('broadcast.on', event);
		}
		return this;
	}

	once(event: string | symbol, listener: (...args: any[]) => void): this {
		super.once(event, listener);
		if(typeof(event) === 'string' && !event.startsWith('broadcast.')) {
			this.broadcastToAll('broadcast.on', event);
		}
		return this;
	}

	off(event: string | symbol, listener: (...args: any[]) => void): this {
		super.once(event, listener);
		if(typeof(event) === 'string' && !event.startsWith('broadcast.')) {
			this.broadcastToAll('broadcast.off', event);
		}
		return this;
	}

}

ipcMain.on('broadcast.getTrigger', (e: Electron.IpcMainEvent, filter: IBroadcastFilter) => {
	e.returnValue = BroadcastMain.getTrigger(filter);
});
ipcMain.on('broadcast.getAction', (e: Electron.IpcMainEvent, filter: IBroadcastFilter) => {
	e.returnValue = BroadcastMain.getAction(filter);
});

export default BroadcastMain;