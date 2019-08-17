riot.install((component) => {
	// patch the onBeforeMount to create slots in runtime
	component.fixSlots = () => {
		const html = component.root.innerHTML
		
		if (html) {
			// empty the component html
			component.root.innerHTML = ''
			
			// define the initial slots in runtime
			Object.defineProperty(component, 'slots', {
				value: [ 
					// extend the component default slots
					...(component.slots || []), 
					...[{
						// more info about expressions handling here 
						// https://github.com/riot/dom-bindings
						id: 'default',
						html
					}]
				],
				enumerable: false,
				writable: false,
				configurable: true,
			})
		}
	}
	
	return component
})