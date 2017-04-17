<overlayhotkeys>
	<div ref="hotkeysdisabledwarning"></div>
	<hotkey each={ hotkey in hotkeys } no-reorder hotkey={ hotkey }></hotkey>
	<button ref="addhotkey" onclick={ addahotkey }></button>
	<button ref="savehotkeys" onclick={ savehotkeys }></button>

	<style>
		overlayhotkeys > div {
			color: red;
		}
	</style>

	<script>
		const self = this
		this.localstorage = null
		this.hotkeys = []

		loadHotkeys() {
			self.hotkeys = []
			if(typeof(this.opts.localstorage) != 'undefined') {
				this.localstorage = this.opts.localstorage
				let h = this.localstorage.getItem('overlay_hotkeys')
				if(h != null) {
					try {
						self.hotkeys = JSON.parse(h)
					} catch(e) {
					}
				}
			}
			self.update()
		}

		this.on('mount', () => {
			self.loadHotkeys()
			self.refs.addhotkey.innerText = i18n.__('Add hotkey')
			self.refs.savehotkeys.innerText = i18n.__('Save hotkeys')
			self.refs.hotkeysdisabledwarning.innerText = i18n.__('Hotkeys are currently disabled. Save hotkeys to reenable them.')
			renewOverlayHotkeys()
			self.refs.hotkeysdisabledwarning.style.display = 'none'
		})

		changes() {
			disableOverlayHotkeys()
			self.refs.hotkeysdisabledwarning.style.display = 'block'
		}
		addahotkey() {
			self.hotkeys.push({ accelerator: '', cmd: '' })
			self.update()
			self.changes()
		}
		savehotkeys() {
			renewOverlayHotkeys()
			self.loadHotkeys()
			self.refs.hotkeysdisabledwarning.style.display = 'none'
		}

	</script>
</overlayhotkeys>