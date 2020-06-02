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
		if(!r) return r;

		if(typeof(event) !== 'string') return;

		for(let sender of Object.keys(this.ipcSubscriptions)) {
			let senderId = parseInt(sender);
			if(this.ipcSubscriptions[senderId].indexOf(event) < 0) continue;
			if(senderId > 0) {
				ipcRenderer.sendTo(senderId, 'broadcast', event, ...args);
			} else {
				ipcRenderer.send('broadcast', event, ...args);
			}
		}
		
	}

	emitIpc(event: string, ...args: any[]): boolean {
		return super.emit(event, ...args);
	}

}

export = Broadcast;