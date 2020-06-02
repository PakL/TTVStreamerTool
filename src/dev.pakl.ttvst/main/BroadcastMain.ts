import { EventEmitter } from 'events'
import { ipcMain, WebContents } from 'electron'

let _instance: BroadcastMain = null

interface IipcSubscriptions {
	[senderId: number]: Array<string>
}

class BroadcastMain extends EventEmitter {

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


	emit(event: string | symbol, ...args: any[]): boolean {
		let r = super.emit(event, ...args);
		if(!r) return r;

		if(typeof(event) !== 'string') return;

		let allContents = WebContents.getAllWebContents()
		for(let i = 0; i < allContents.length; i++) {
			if(typeof(this.ipcSubscriptions[allContents[i].id]) !== 'undefined') {
				if(this.ipcSubscriptions[allContents[i].id].indexOf(event) >= 0) {
					allContents[i].send('broadcast', event, ...args)
				}
			}
		}
		
	}

	emitIpc(event: string, ...args: any[]): boolean {
		return super.emit(event, ...args);
	}


	cleanupSubscriptions() {
		let allContents = WebContents.getAllWebContents()
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

}

export = BroadcastMain;