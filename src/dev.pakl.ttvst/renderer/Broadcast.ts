import { EventEmitter } from 'events'
import { ipcRenderer } from 'electron'
import { IBroadcastFilter, IBroadcastTrigger, IBroadcastAction } from '../main/BroadcastMain';

let _instance: Broadcast = null

class Broadcast extends EventEmitter {

	static getTrigger(where: IBroadcastFilter = {}): Array<IBroadcastTrigger> {
		let triggers: Array<IBroadcastTrigger> = ipcRenderer.sendSync('broadcast.getTrigger', where);
		return triggers;
	}

	static getAction(where: IBroadcastFilter = {}): Array<IBroadcastAction> {
		let actions: Array<IBroadcastAction> = ipcRenderer.sendSync('broadcast.getAction', where);
		return actions;
	}

	static get instance(): Broadcast {
		if(_instance === null) {
			_instance = new Broadcast();
		}
		return _instance;
	}

	constructor() {
		super();

		this.setMaxListeners(100);

		const self = this

		ipcRenderer.on('broadcast', (event: Electron.IpcRendererEvent, channel: string, ...args: any[]) => {
			self.emitIpc(channel, ...args);
		});

		ipcRenderer.on('broadcast.execute', (event: Electron.IpcRendererEvent, channel: string, ...args: any[]) => {
			let listener = self.listeners(channel);
			for(let i = 0; i < listener.length; i++) {
				listener[i](...args);
			}
		});

		ipcRenderer.on('broadcast.response', (event: Electron.IpcRendererEvent, executeId: string, result: any) => {
			self.emitIpc(`broadcast.response.${executeId}`, result);
		});
	}


	emit(event: string | symbol, ...args: any[]): boolean {
		let r = super.emit(event, ...args);

		if(typeof(event) !== 'string') return r;

		ipcRenderer.send('broadcast', event, ...args);
		return true;
	}

	emitIpc(event: string, ...args: any[]): boolean {
		return super.emit(event, ...args);
	}

	execute(channel: string, ...args: any[]): Promise<any|void> {
		const self = this;
		return new Promise<any>((resolve, reject) => {
			let actions = Broadcast.getAction({ channel });
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
				ipcRenderer.send('broadcast.execute', channel, ...args);
			} else {
				reject(new Error('Unknown action channel'));
			}
		});
	}

	executeRespond(executeId: string, result: any) {
		this.emitIpc(`broadcast.response.${executeId}`, result);
		ipcRenderer.send('broadcast.response', executeId, result);
	}

}

export = Broadcast;