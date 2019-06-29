<settingsset>
	<fieldset>
		<legend ref="title"><span ref="togglebutton">➕</span> { title }</legend>

		<setting each="{ sett in settings }" data="{ sett }"></setting>
	</fieldset>

	<style>
		settingsset.collapsed > fieldset > * {
			display: none;
		}
		settingsset.collapsed > fieldset > legend {
			display: initial;
		}
		settingsset > fieldset > legend {
			cursor: pointer;
		}
	</style>

	<script>
		export default {
			onBeforeMount() {
				this.visible = false
				this.title = this.props.title
				this.settings = this.props.settings
				this.makeAccessible()
			},

			onMounted() {
				this.refs = {
					title: this.$('[ref=title]'),
					togglebutton: this.$('[ref=togglebutton]')
				}
				this.refresh()
			},

			onUpdated() {
				this.refresh()
			},

			refresh() {
				if(this.title.length > 0) {
					this.refs.title.onclick = this.toggle
					this.refs.title.style.display = 'initial'
					if(this.visible) {
						this.root.classList.remove('collapsed')
						this.refs.togglebutton.innerHTML = '➖'
					} else {
						this.root.classList.add('collapsed')
						this.refs.togglebutton.innerHTML = '➕'
					}
				} else {
					this.refs.title.style.display = 'none'
				}
			},

			clear() {
				this.settings = []
				this.update()
			},

			addSetting(options) {
				this.settings.push(options)
				this.update()
			},

			toggle() {
				this.visible = !this.visible
				this.refresh()
			}
		}
	</script>
</settingsset>