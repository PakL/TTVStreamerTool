import * as React from 'react';
import { FontIcon } from 'office-ui-fabric-react/lib-commonjs/Icon';

class Page {

	private _name: string;
	
	constructor(name: string) {
		this._name = name
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

	open() {}

	close() {}



}
export = Page;