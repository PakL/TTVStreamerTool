<overlayhotkeys>
	<div ref="hotkeysdisabledwarning"></div>
	<hotkey each={ hotkey in hotkeys } no-reorder hotkey={ hotkey } parent={ this }></hotkey>
	<hr>
	<button ref="addhotkey"></button>
	<button ref="savehotkeys"></button>

	<style>
		overlayhotkeys > div {
			color: red;
		}
	</style>

	<script>
		export default {
			onBeforeMount() {
				this.hotkeys = []
				this.disabled = true
				this.makeAccessible()
			},

			onMounted() {
				this.refs = {
					hotkeysdisabledwarning: this.$('[ref=hotkeysdisabledwarning]'),
					addhotkey: this.$('[ref=addhotkey]'),
					savehotkeys: this.$('[ref=savehotkeys]')
				}

				this.loadHotkeys()
				this.refs.addhotkey.innerText = Tool.i18n.__('Add hotkey')
				this.refs.savehotkeys.innerText = Tool.i18n.__('Save hotkeys')
				this.refs.hotkeysdisabledwarning.innerText = Tool.i18n.__('Hotkeys are currently disabled. Save hotkeys to reenable them.')
				Tool.overlays.renewOverlayHotkeys()
				this.refs.hotkeysdisabledwarning.style.display = 'none'
				this.disabled = false

				const self = this
				this.refs.addhotkey.onclick = () => { self.addahotkey() }
				this.refs.savehotkeys.onclick = () => { self.savehotkeys() }
			},

			loadHotkeys() {
				this.hotkeys = []
				this.update()
				this.hotkeys = Tool.settings.getJSON('overlay_hotkeys', [])
				this.update()
			},

			changes() {
				if(!this.disabled) {
					Tool.overlays.disableOverlayHotkeys()
					this.refs.hotkeysdisabledwarning.style.display = 'block'
					this.disabled = true
				}
			},
			addahotkey() {
				this.hotkeys.push({ accelerator: '', cmd: '' })
				this.update()
				this.changes()
			},
			savehotkeys() {
				Tool.overlays.renewOverlayHotkeys()
				this.loadHotkeys()
				this.refs.hotkeysdisabledwarning.style.display = 'none'
				this.disabled = false
			}
		}
	</script>
</overlayhotkeys>