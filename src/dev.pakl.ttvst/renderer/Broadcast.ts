import { EventEmitter } from 'events'
import { ipcRenderer } from 'electron'

let _instance: Broadcast = null

interface IipcSubscriptions {
	[senderId: number]: Array<string>
}

class Broadcast extends EventEmitter {

	static get instance(): Broadcast {
		if(_instance === null) {
			_instance = new Broadcast();
		}
		return _instance;
	}

	private ipcSubscriptions: IipcSubscriptions = {}

	constructor() {
		super()

		const self = this
		ipcRenderer.on('broadcast.on', (event: Electron.IpcRendererEvent, channel: string) => {
			if(typeof(self.ipcSubscriptions[event.senderId]) === 'undefined') {
				self.ipcSubscriptions[event.senderId] = [];
			}

			if(self.ipcSubscriptions[event.senderId].indexOf(channel) < 0) {
				self.ipcSubscriptions[event.senderId].push(channel);
			}
		});

		ipcRenderer.on('broadcast.off', (event: Electron.IpcRendererEvent, channel: string) => {
			if(typeof(self.ipcSubscriptions[event.senderId]) !== 'undefined') {
				let index = self.ipcSubscriptions[event.senderId].indexOf(channel);
				if(index >= 0) {
					self.ipcSubscriptions[event.senderId].splice(index, 1);
				}
			}
		});

		ipcRenderer.on('broadcast', (event: Electron.IpcRendererEvent, channel: string, ...args: any[]) => {
			self.emitIpc(channel, ...args);
		});
	}


	emit(event: string | symbol, ...args: any[]): boolean {
		let r = super.emit(event, ...args);

		if(typeof(event) !== 'string') return r;

		for(let sender of Object.keys(this.ipcSubscriptions)) {
			let senderId = parseInt(sender);
			if(this.ipcSubscriptions[senderId].indexOf(event) < 0) continue;
			if(senderId > 0) {
				ipcRenderer.sendTo(senderId, 'broadcast', event, ...args);
				r = true;
			} else {
				ipcRenderer.send('broadcast', event, ...args);
				r = true;
			}
		}
		return r;
	}

	emitIpc(event: string, ...args: any[]): boolean {
		return super.emit(event, ...args);
	}

	on(event: string | symbol, listener: (...args: any[]) => void): this {
		super.on(event, listener);
		if(typeof(event) === 'string' && !event.startsWith('broadcast.')) {
			ipcRenderer.send('broadcast.on', event);
		}
		return this;
	}

	once(event: string | symbol, listener: (...args: any[]) => void): this {
		super.once(event, listener);
		if(typeof(event) === 'string' && !event.startsWith('broadcast.')) {
			ipcRenderer.send('broadcast.on', event);
		}
		return this;
	}

	off(event: string | symbol, listener: (...args: any[]) => void): this {
		super.once(event, listener);
		if(typeof(event) === 'string' && !event.startsWith('broadcast.')) {
			ipcRenderer.send('broadcast.off', event);
		}
		return this;
	}

}

export = Broadcast;