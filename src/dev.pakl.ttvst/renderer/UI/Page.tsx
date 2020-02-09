import * as React from 'react';
import { FontIcon } from 'office-ui-fabric-react/lib-commonjs/Icon';
import PageComponent from './Main/PageComponent';

class Page {

	private _name: string;
	private _pageComponent: PageComponent = null;
	private _openWhenReady: boolean = false;
	
	constructor(name: string) {
		this._name = name
		this.createRef = this.createRef.bind(this);
	}

	get name(): string {
		return this._name
	}

	get localizedName(): string {
		return this._name
	}

	get icon(): React.ReactElement {
		return <FontIcon iconName="BorderDash" />;
	}

	get showInViewsList(): boolean {
		return true
	}

	open() {
		if(this._pageComponent !== null) {
			this._pageComponent.open();
		} else {
			this._openWhenReady = true;
		}
	}

	close() {
		if(this._pageComponent !== null) {
			this._pageComponent.close();
		}
	}

	private content(): React.SFCElement<any> | React.SFCElement<any>[] {
		return (
			<span>Hello World!</span>
		);
	}

	private createRef(page: PageComponent) {
		this._pageComponent = page;
		if(this._openWhenReady) {
			this._pageComponent.open();
		}
	}

	/**
	 * We recommend not to overwrite this function. Overwrite content() instead!
	 */
	render(): React.ReactElement<PageComponent> {
		return (
			<PageComponent key={this.name} ref={this.createRef}>
				{this.content()}
			</PageComponent>
		);
	}

}
export = Page;