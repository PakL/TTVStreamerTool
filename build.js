const electronInstaller = require('electron-winstaller')
const fs = require('fs')
const { spawnSync } = require('child_process');

const packageJson = JSON.parse(fs.readFileSync('package.json', {'encoding': 'utf8'}))

//spawnSync('.\\node_modules\\electron-winstaller\\vendor\\rcedit', ['.\\build\\TTVStreamerTool.exe', '--set-product-version', packageJson.version])

console.log('Creating Windows installer...')


let result = electronInstaller.createWindowsInstaller({
	appDirectory: './build',
	outputDirectory: './dist',
	name: "ttvst",
	exe: 'TTVStreamerTool.exe',
	loadingGif: 'res/install.gif',
	iconUrl: 'https://update.ttvst.app/icon.ico',
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