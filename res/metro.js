Tool.on('load', () => {
	let menuCollapses = document.querySelectorAll('.menu-collapse')
	menuCollapses.forEach((link) => {
		link.onclick = () => {
			link.parentElement.parentElement.parentElement.classList.toggle('collapsed')
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

const refreshTileColors = () => {
	let metroTiles = document.querySelectorAll('.metro-tile')
	let ct = new ColorThief()
	metroTiles.forEach((tile) => {
		let tileImage = tile.querySelector('img')
		if(tileImage != null && tileImage.complete) {
			let color = ct.getColor(tileImage, 8)
			tile.style.backgroundColor = 'rgb(' + color.join(',') + ')'
		} else if(tileImage != null && !tileImage.complete) {
			tileImage.onload = () => {
				let color = ct.getColor(tileImage, 8)
				tile.style.backgroundColor = 'rgb(' + color.join(',') + ')'
			}
		}
	})
}


let style_metro_sass = fs.readFileSync(path.join(__dirname, 'res', 'metro.scss'), {encoding: 'utf8'})
let style_ui_sass = fs.readFileSync(path.join(__dirname, 'res', 'ui.scss'), {encoding: 'utf8'})
const renderSass = function(event, newColor) {
	style_metro_sass = style_metro_sass.replace(/\$accentColor: #([0-9A-F]{6});/i, '$accentColor: #' + newColor.substr(0, 6) + ';')
	style_ui_sass = style_ui_sass.replace(/\$accentColor: #([0-9A-F]{6});/i, '$accentColor: #' + newColor.substr(0, 6) + ';')
	style_css = sass.renderSync({ data: style_metro_sass, outputStyle: 'compressed' }).css + sass.renderSync({ data: style_ui_sass, outputStyle: 'compressed' }).css
	document.querySelector('#metro-style').innerHTML = style_css
}

renderSass(null, systemPreferences.getAccentColor())

systemPreferences.removeAllListeners('accent-color-changed')
systemPreferences.on('accent-color-changed', renderSass)