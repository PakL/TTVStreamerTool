import _ttvst from '../TTVST';

declare var TTVST: _ttvst;

class Page {

	private _name: string;
	private _root: HTMLDivElement;
	
	constructor(name: string) {
		this._name = name
	}

	get name(): string {
		return this._name
	}

	get localizedName(): string {
		return TTVST.i18n.__(this._name)
	}

	get icon(): string {
		return 'BorderDash';
	}

	get showInViewsList(): boolean {
		return true
	}

	content(): HTMLElement {
		return null;
	}

	open() {
	}

	close() {
		
	}

	set root(element: HTMLDivElement) {
		if(element instanceof HTMLDivElement) {
			this._root = element;
			this._root.innerHTML = '';
			let content = this.content();
			if(content !== null) {
				this._root.appendChild(content);
			}
		}
	}

	get root() {
		return this._root;
	}



}
export = Page;