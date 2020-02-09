import React from 'react';

interface IUIPageState {
	visible: boolean;
}

class PageComponent extends React.Component {

	pageRef: React.RefObject<HTMLDivElement>;

	state: Readonly<IUIPageState>;

	constructor(props: Readonly<{}>) {
		super(props);

		this.pageRef = React.createRef();
		this.state = { visible: false };
	}

	render() {

		return (
			<div ref={this.pageRef} style={{display:(this.state.visible ? undefined : 'none')}}>{this.props.children}</div>
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