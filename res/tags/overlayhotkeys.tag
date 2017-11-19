<overlayhotkeys>
	<div ref="hotkeysdisabledwarning"></div>
	<hotkey each={ hotkey in hotkeys } no-reorder hotkey={ hotkey }></hotkey>
	<hr>
	<button ref="addhotkey" onclick={ addahotkey }></button>
	<button ref="savehotkeys" onclick={ savehotkeys }></button>

	<style>
		overlayhotkeys > div {
			color: red;
		}
	</style>

	<script>
		const self = this
		this.hotkeys = []

		loadHotkeys() {
			self.hotkeys = []
			self.hotkeys = Tool.settings.getJSON('overlay_hotkeys', [])
			self.update()
		}

		this.on('mount', () => {
			self.loadHotkeys()
			self.refs.addhotkey.innerText = Tool.i18n.__('Add hotkey')
			self.refs.savehotkeys.innerText = Tool.i18n.__('Save hotkeys')
			self.refs.hotkeysdisabledwarning.innerText = Tool.i18n.__('Hotkeys are currently disabled. Save hotkeys to reenable them.')
			Tool.overlays.renewOverlayHotkeys()
			self.refs.hotkeysdisabledwarning.style.display = 'none'
		})

		changes() {
			Tool.overlays.disableOverlayHotkeys()
			self.refs.hotkeysdisabledwarning.style.display = 'block'
		}
		addahotkey() {
			self.hotkeys.push({ accelerator: '', cmd: '' })
			self.update()
			self.changes()
		}
		savehotkeys() {
			Tool.overlays.renewOverlayHotkeys()
			self.loadHotkeys()
			self.refs.hotkeysdisabledwarning.style.display = 'none'
		}

	</script>
</overlayhotkeys>