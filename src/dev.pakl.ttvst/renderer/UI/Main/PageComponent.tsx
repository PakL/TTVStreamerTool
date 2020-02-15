import React from 'react';
interface IPageState {
	visible: boolean;
}

interface IPageProps {
	contentRender: () => React.SFCElement<any> | React.SFCElement<any>[];
}

class PageComponent extends React.Component {

	state: Readonly<IPageState>;
	props: Readonly<IPageProps>;

	constructor(props: Readonly<IPageProps>) {
		super(props);

		this.state = { visible: false };
	}

	render() {
		return (
			<div style={{display:(this.state.visible ? undefined : 'none')}}>{this.props.contentRender()}</div>
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