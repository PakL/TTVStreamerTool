<raw>
	<script>
		export default {
			onMounted() {
				this.root.innerHTML = this.props.content
				this.refresh()
			},
	
			refresh() {
				var links = this.root.querySelectorAll('a')
				for(var i = 0; i < links.length; i++) {
					if(typeof(this.props.linkcolor) == 'string' && this.props.linkcolor.length > 0) {
						links[i].style.color = this.props.linkcolor
					}
					links[i].onclick = function(e) {
						e.preventDefault()
						openLinkExternal(this.href)
					}
				}
			},

			onUpdated() {
				this.root.innerHTML = this.props.content
				this.refresh()
			}
		}
	</script>
</raw>