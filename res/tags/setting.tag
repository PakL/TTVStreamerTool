<setting>

	<style>
		setting {
			display: block;
		}
		setting > label {
			margin: 20px 0 !important;
		}
		
		setting:nth-child(2) > label {
			margin-top: 0 !important;
		}
		setting:last-child > label {
			margin-bottom: 0 !important;
		}
	</style>
	<script>
		const self = this
		this.setting = opts.data
		//console.log(opts)

		create() {

			let options = self.setting
			let options_default = {
				setting: '',
				default: null,
				type: '',
				label: '',

				description: '',
				selection: {},
				onchange: null,
				onclick: null
			}
			if(typeof(options) == 'object') {
				options = Object.assign(options_default, options)
			} else {
				options = options_default
			}

			if(options.type == 'separator') {
				self.root.innerHTML = ''
				self.root.appendChild(document.createElement('hr'))
				return
			}

			let labelElement = document.createElement('label')
			let inputElement = null
			if(options.type == 'select') {
				inputElement = document.createElement('select')
				for(let index in options.selection) {
					if(!options.selection.hasOwnProperty(index)) continue

					let optionElement = document.createElement('option')
					optionElement.value = index
					optionElement.innerText = options.selection[index]
					if(Tool.settings.getString(options.setting) == index) {
						optionElement.setAttribute('selected', true)
					}
					inputElement.appendChild(optionElement)
				}
			} else if(options.type == 'button') {
				inputElement = document.createElement('button')
				inputElement.innerText = options.label
				if(typeof(options.onclick) !== 'function') {
					return
				}
				inputElement.addEventListener('click', options.onclick)
			} else {
				inputElement = document.createElement('input')
				inputElement.setAttribute('type', options.type)
				if(options.type == 'checkbox') {
					if(Tool.settings.getBoolean(options.setting, (typeof(options.default) !== 'boolean' ? false : options.default))) {
						inputElement.setAttribute('checked', Tool.settings.getBoolean(options.setting))
					}
				} else if(options.type == 'range' || options.type == 'number') {
					inputElement.value = parseFloat(Tool.settings.getString(options.setting, (typeof(options.default) === 'number' ? options.default : '')))
					if(typeof(options.min) === 'number') inputElement.setAttribute('min', options.min)
					if(typeof(options.max) === 'number') inputElement.setAttribute('max', options.max)
					if(typeof(options.step) === 'number') inputElement.setAttribute('step', options.step)
				} else {
					inputElement.value = Tool.settings.getString(options.setting, (typeof(options.default) === 'string' ? options.default : ''))
				}
				if(typeof(options.readonly) === 'boolean') {
					inputElement.setAttribute('readonly', 'readonly')
				}
			}

			if(typeof(options.attrid) === 'string') {
				inputElement.setAttribute('id', options.attrid)
			}
			inputElement.dataset.setting = options.setting

			if(typeof(options.onchange) === 'function') {
				inputElement.addEventListener('change', options.onchange)
			}
			if(typeof(options.setting) === 'string' && options.setting.length > 0) {
				inputElement.addEventListener('change', () => {
					if(options.type == 'checkbox') {
						Tool.settings.setBoolean(options.setting, inputElement.checked)
					} else {
						Tool.settings.setString(options.setting, inputElement.value)
					}
				})
			}

			let descriptionElement = null
			if(options.description.length > 0) {
				descriptionElement = document.createElement('small')
				descriptionElement.innerText = options.description
			}

			if(options.type == 'checkbox') {
				labelElement.classList.add('win10-switch')
				labelElement.appendChild(inputElement)
				labelElement.appendChild(document.createTextNode(options.label))
				if(descriptionElement != null) {
					labelElement.appendChild(document.createElement('br'))
					labelElement.appendChild(descriptionElement)
				}
			} else if(options.type == 'button') {
				labelElement.appendChild(inputElement)
				if(descriptionElement != null) {
					labelElement.appendChild(document.createElement('br'))
					labelElement.appendChild(descriptionElement)
				}
			} else {
				labelElement.appendChild(document.createTextNode(options.label))
				labelElement.appendChild(inputElement)
				if(descriptionElement != null) {
					labelElement.appendChild(descriptionElement)
				}
			}

			self.root.innerHTML = ''
			self.root.appendChild(labelElement)
		}

		
		this.on('mount', self.create)
		this.on('updated', self.create)
	</script>
</setting>