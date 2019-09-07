if(typeof(Tool) !== 'undefined') {
	Tool.once('load', () => {
		let menuCollapses = document.querySelectorAll('.menu-collapse')
		menuCollapses.forEach((link) => {
			link.onclick = () => {
				link.parentElement.parentElement.parentElement.classList.toggle('collapsed')
			}
		})

		document.querySelector('body').addEventListener('click', (e) => {
			if(!e.target.classList.contains('menu-collapse') && !e.target.parentElement.classList.contains('menu-collapse')) {
				menuCollapses.forEach((link) => { link.parentElement.parentElement.parentElement.classList.add('collapsed') })
			}
		})

		let menus = document.querySelectorAll('.side-nav')
		menus.forEach((menu) => {
			let menulinks = menu.querySelectorAll('a')
			menulinks.forEach((link) => {
				if(typeof(link.dataset.submenu) == 'string') {
					link.addEventListener('click', () => {
						document.querySelector('#'+link.dataset.submenu).classList.toggle('open')
					})
				}
			})
		})

		let submenus = document.querySelectorAll('.side-nav ul.submenu')
		submenus.forEach((menu) => {
			let menulinks = menu.querySelectorAll('a')
			menulinks.forEach((link) => {
				link.addEventListener('click', () => {
					menu.classList.remove('open')
				})
			})
		})
	})
}

const refreshTileColors = () => {
	let metroTiles = document.querySelectorAll('.metro-tile')
	let ct = new ColorThief()
	metroTiles.forEach((tile) => {
		let tileImage = tile.querySelector('img')
		if(tileImage != null && tileImage.complete) {
			let color = ct.getColor(tileImage, 8)
			tile.querySelector('.face-bottom').style.backgroundColor = 'rgb(' + color.join(',') + ')'
		} else if(tileImage != null && !tileImage.complete) {
			tileImage.onload = () => {
				let color = ct.getColor(tileImage, 8)
				tile.querySelector('.face-bottom').style.backgroundColor = 'rgb(' + color.join(',') + ')'
			}
		}
	})
}


let style_metro_less = fs.readFileSync(path.join(app.getAppPath(), 'res', 'style', 'metro.less'), {encoding: 'utf8'})
let style_ui_lesss = fs.readFileSync(path.join(app.getAppPath(), 'res', 'style', 'ui.less'), {encoding: 'utf8'})
async function renderLess(event, newColor) {
	console.log('[CSS] Rendering less to css')
	style_metro_less = style_metro_less.replace(/@accentColor: darken\(#([0-9A-F]{6})/i, '@accentColor: darken(#' + newColor.substr(0, 6))
	style_ui_lesss = style_ui_lesss.replace(/@accentColor: #([0-9A-F]{6});/i, '@accentColor: #' + newColor.substr(0, 6) + ';')
	let style_css = (await less.render(style_metro_less)).css
	style_css += (await less.render(style_ui_lesss)).css

	document.querySelector('#metro-style').innerHTML = style_css
}

renderLess(null, systemPreferences.getAccentColor())

console.log('[CSS] Listening for accent-color-changed event')
systemPreferences.on('accent-color-changed', renderLess)
window.addEventListener('beforeunload', () => {
	console.log('[CSS] Removing accent-color-changed event listener')
	systemPreferences.removeListener('accent-color-changed', renderLess)
})