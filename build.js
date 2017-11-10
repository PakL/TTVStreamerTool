const electronInstaller = require('electron-winstaller')
const fs = require('fs')

const packageJson = JSON.parse(fs.readFileSync('package.json', {'encoding': 'utf8'}))

console.log('Creating Windows installer...')


let result = electronInstaller.createWindowsInstaller({
	appDirectory: './build',
	outputDirectory: './dist',
	name: "ttvst",
	exe: 'TTVStreamerTool.exe',
	loadingGif: 'res/hourglass_install.gif',
	iconUrl: 'https://dl.pohlarsystem.de/ttvst/icon.ico',
	setupIcon: 'res/icon.ico',
	noMsi: true,
	
	authors: packageJson.author.name,
	owners: packageJson.author.name,
	description: packageJson.description,
	version: packageJson.version,
	title: "TTVStreamerTool"
})

result.then(() => {
	console.log('Done')
}, (e) => {
	console.log(e.message)
})