import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { NavBarComponent } from './NavBarComponent'

export class UI {

	constructor() {
		let navbar = <NavBarComponent />

		ReactDOM.render(navbar, document.querySelector('#wrapper'))
	}

}