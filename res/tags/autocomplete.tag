<autocomplete>
	<ul>
		<li each={ sugg in suggestions }>{ sugg.display }</li>
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
		export default {
			onBeforeMount() {
				this.suggestions = []
				this.selectedindex = 0

				this.parentInput = null
				this.position = 'above'
				this.finddata = function() { return [] }
				this.replacedata = function(){}
				this.makeAccessible()
			},

			onMounted() {
				this.root.style.display = 'none'
				if(typeof(this.props.callback) == 'function') {
					this.props.callback()
				}
			},
			onUpdated() {
				this.setVisible()
			},

			setParentInput(inputelement, position, finddata, replacedata) {
				this.parentInput = inputelement
				this.position = position
				if(typeof(finddata) == 'function')
					this.finddata = finddata
				else
					this.finddata = function() { return [] }
				if(typeof(replacedata) == 'function')
					this.replacedata = replacedata
				else
					this.replacedata = function() {}



				if(this.parentInput != null) {
					const self = this
					this.parentInput.addEventListener('keyup', (e) => {
						if([13].indexOf(e.which) < 0) {
							self.typed(e)
						}
					})
					this.parentInput.addEventListener('keydown', (e) => {
						if(e.which == 38 || e.which == 40) e.preventDefault()
						if(e.which == 9) { // keycode 9 == TAB
							e.preventDefault()
							self.complete(e)
						}
					})
				}
			},

			setVisible() {
				var parentRect = this.parentInput.getBoundingClientRect()
				var thisRect = this.root.getBoundingClientRect()
				if(this.position == 'above') {
					this.root.style.left = parentRect.left + 'px'
					this.root.style.bottom = (window.innerHeight - parentRect.top) + 'px'
				} else if(this.position == 'below') {
					this.root.style.left = parentRect.left + 'px'
					this.root.style.top = (parentRect.top + parentRect.height) + 'px'
				}
				if(this.suggestions.length > 0) {
					this.root.style.display = 'block'
					var points = this.root.querySelectorAll('ul > li')
					if(points.length > this.selectedindex) {
						for(var i = 0; i < points.length; i++) {
							points[i].classList.remove('selected')
							if(i == this.selectedindex) {
								points[i].classList.add('selected')
							}
						}
					}
				} else {
					this.root.style.display = 'none'
				}
			},

			setSuggestions(suggestions) {
				this.suggestions = suggestions
				this.selectedindex = this.suggestions.length-1
				if(this.position == 'below') this.selectedindex = 0
				this.update()
			},

			typed(e) {
				if(e.which == 38) { // keycode 38 == UP
					e.preventDefault()
					this.selectedindex--
					if(this.selectedindex < 0)
						this.selectedindex = 0
					this.setVisible()
				} else if(e.which == 40) { // keycode 40 == DOWN
					e.preventDefault()
					this.selectedindex++
					if(this.selectedindex >= this.suggestions.length)
						this.selectedindex = this.suggestions.length-1
					this.setVisible()
				} else if(e.which == 9) { // keycode 9 == TAB
					e.preventDefault()
					this.setSuggestions([])
				} else {
					var el = e.target
					this.suggestions = this.finddata(el.value)
					this.selectedindex = this.suggestions.length-1
					if(this.position == 'below') this.selectedindex = 0
					this.update()
				}
			},

			complete(e) {
				var el = e.target
				if(this.suggestions.length > 0) {
					e.preventDefault()
					this.replacedata(el, this.suggestions[this.selectedindex])
				}
			}
		}
	</script>
</autocomplete>