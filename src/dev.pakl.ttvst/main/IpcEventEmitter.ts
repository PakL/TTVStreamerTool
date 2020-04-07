import { EventEmitter } from 'events';
import { ipcMain } from 'electron';
import TTVSTMain from './TTVSTMain';

declare var TTVST: TTVSTMain;

interface IIpcEventListener {
	frame: Electron.WebContents;
	trigger: string;
	callback: (...args: any[]) => void;
}

export default class IpcEventEmitter extends EventEmitter {

	private _listeners: Array<IIpcEventListener> = [];
	private _activeFrames: Array<Electron.WebContents> = [];

	constructor() {
		super();

		this.ipcOn = this.ipcOn.bind(this);
		ipcMain.on(this.constructor.name + '.on', this.ipcOn);
	}

	private ipcOn(event: Electron.IpcMainEvent, trigger: string) {
		console.log(event.sender.id, trigger);
		if(this.hasListener(trigger, event.sender)) return;

		let frame = event.sender
		let callback = function(...args: any[]) {
			for(let i = 0; i < args.length; i++) {
				if(typeof(args[i]) === 'object') {
					try {
						args[i] = JSON.parse(JSON.stringify(args[i]));
					} catch(e) {
						args[i] = null;
					}
				} else if(typeof(args[i]) === 'function') {
					args[i] = null;
				}
			}
			frame.send(`${this.constructor.name}.${trigger}`, ...args);
		}
		this._listeners.push({ frame, trigger, callback });
		this.on(trigger, callback);

		if(this._activeFrames.indexOf(frame) < 0) {
			frame.once('destroyed', () => { this.clearoutFrame(frame); });
			this._activeFrames.push(frame);
		}
	}

	private clearoutFrame(frame: Electron.WebContents) {
		let _newListeners: Array<IIpcEventListener> = [];
		for(let i = 0; i < this._listeners.length; i++) {
			if(frame === this._listeners[i].frame) {
				this.off(this._listeners[i].trigger, this._listeners[i].callback);
				continue;
			}
			_newListeners.push(this._listeners[i]);
		}
		this._listeners = _newListeners;
		
		let fi = this._activeFrames.indexOf(frame);
		if(fi >= 0) {
			this._activeFrames.splice(fi, 1);
		}
	}

	private hasListener(trigger: string, frame: Electron.WebContents): boolean {
		for(let i = 0; i < this._listeners.length; i++) {
			if(
				frame !== this._listeners[i].frame ||
				this._listeners[i].trigger !== trigger
			) {
				continue;
			}
			return true;
		}
		return false;
	}

	private getListener(trigger?: string, frame?: Electron.WebContents): Array<IIpcEventListener> {
		let r: Array<IIpcEventListener> = [];

		for(let i = 0; i < this._listeners.length; i++) {
			if(
				(typeof(frame) !== 'undefined' && frame !== this._listeners[i].frame) ||
				(typeof(trigger) !== 'undefined' && trigger !== this._listeners[i].trigger)
			) {
				continue;
			}
			r.push(this._listeners[i]);
		}

		return r;
	}

}