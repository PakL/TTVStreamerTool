import React from 'react';

class UIPageComponent extends React.Component {

	pageRef: React.RefObject<HTMLDivElement>;

	constructor(props: Readonly<{}>) {
		super(props);

		this.pageRef = React.createRef();
	}

	render() {
		return (
			<div ref={this.pageRef}></div>
		);
	}

}
export = UIPageComponent;