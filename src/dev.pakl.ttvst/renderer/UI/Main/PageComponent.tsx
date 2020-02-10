import React from 'react';
interface IUIPageState {
	visible: boolean;
}

class PageComponent extends React.Component {

	state: Readonly<IUIPageState>;

	constructor(props: Readonly<{}>) {
		super(props);

		this.state = { visible: false };
	}

	render() {

		return (
			<div style={{display:(this.state.visible ? undefined : 'none')}}>{this.props.children}</div>
		);
	}

	open() {
		this.setState({ visible: true });
	}

	close() {
		this.setState({ visible: false });
	}

}
export = PageComponent;