<autocomplete>
	<ul>
		<li each={ suggestions }>{ display }</li>
	</ul>

	<style>
		autocomplete {
			display: block;
			position: absolute;
			background: #303030;
			color: #d3d3d3;
			box-shadow: 0 3px 5px rgba(0,0,0, 0.5);
			z-index: 99;
		}
		autocomplete > ul {
			list-style: none;
			margin: 0;
			padding: 0;
		}
		autocomplete > ul > li {
			display: block;
			padding: 5px;
			border-bottom: 1px solid #000000;
		}
		autocomplete > ul > li.selected {
			color: #303030;
			background: #d3d3d3;
		}
	</style>

	<script>
		const self = this


		this.suggestions = []
		this.selectedindex = 0

		this.parentInput = null
		this.position = 'above'
		this.finddata = function() { return [] }
		this.replacedata = function(){}

		this.on('mount', () => {
			self.root.style.display = 'none'
			if(typeof(self.opts.callback) == 'function') {
				self.opts.callback()
			}
		})
		this.on('updated', () => {
			self.setVisible()
		})

		setParentInput(inputelement, position, finddata, replacedata) {
			self.parentInput = inputelement
			self.position = position
			if(typeof(finddata) == 'function')
				self.finddata = finddata
			else
				self.finddata = function() { return [] }
			if(typeof(replacedata) == 'function')
				self.replacedata = replacedata
			else
				self.replacedata = function() {}



			if(self.parentInput != null) {

				self.parentInput.addEventListener('keyup', (e) => {
					if([13].indexOf(e.which) < 0) {
						self.typed(e)
					}
				})
				self.parentInput.addEventListener('keydown', (e) => {
					if(e.which == 38 || e.which == 40) e.preventDefault()
					if(e.which == 9) { // keycode 9 == TAB
						e.preventDefault()
						self.complete(e)
					}
				})
			}
		}

		setVisible() {
			var parentRect = self.parentInput.getBoundingClientRect()
			var parentRelative = self.parentInput.parentNode
			var cs = window.getComputedStyle(parentRelative)
			while(cs.getPropertyValue('position') != 'relative' && parentRelative.tagName.toUpperCase() != 'BODY') {
				parentRelative = parentRelative.parentNode
				cs = window.getComputedStyle(parentRelative)
			}

			var viewport = parentRelative.getBoundingClientRect()
			if(self.position == 'above') {
				self.root.style.left = (parentRect.left - viewport.left) + 'px'
				console.log(viewport.height, parentRect.top)
				self.root.style.bottom = (viewport.height - parentRect.top) + 'px'
			} else if(self.position == 'below') {
				self.root.style.left = (parentRect.left - viewport.left) + 'px'
				self.root.style.top = (parentRect.bottom - viewport.top) + 'px'
			}
			if(self.suggestions.length > 0) {
				self.root.style.display = 'block'
				var points = self.root.querySelectorAll('ul > li')
				if(points.length > self.selectedindex) {
					for(var i = 0; i < points.length; i++) {
						points[i].classList.remove('selected')
						if(i == self.selectedindex) {
							points[i].classList.add('selected')
						}
					}
				}
			} else {
				self.root.style.display = 'none'
			}
		}

		setSuggestions(suggestions) {
			self.suggestions = suggestions
			self.selectedindex = self.suggestions.length-1
			if(self.position == 'below') self.selectedindex = 0
			self.update()
		}

		typed(e) {
			if(e.which == 38) { // keycode 38 == UP
				e.preventDefault()
				self.selectedindex--
				if(self.selectedindex < 0)
					self.selectedindex = 0
				self.setVisible()
			} else if(e.which == 40) { // keycode 40 == DOWN
				e.preventDefault()
				self.selectedindex++
				if(self.selectedindex >= self.suggestions.length)
					self.selectedindex = self.suggestions.length-1
				self.setVisible()
			} else if(e.which == 9) { // keycode 9 == TAB
				e.preventDefault()
				self.setSuggestions([])
			} else {
				var el = e.target
				self.suggestions = self.finddata(el.value)
				self.selectedindex = self.suggestions.length-1
				if(self.position == 'below') self.selectedindex = 0
				self.update()
			}
		}

		complete(e) {
			var el = e.target
			if(self.suggestions.length > 0) {
				e.preventDefault()
				self.replacedata(el, self.suggestions[self.selectedindex])
			}
		}
	</script>
</autocomplete>