import Path from 'path';
import { app } from 'electron';
import fs from 'fs';
import { spawn } from 'child_process';

export default {
	checkForSFX() {
		try {
			fs.accessSync('build.exe', fs.constants.R_OK);
			return true;
		} catch(e) {}
		return false;
	},

	startExtracting() {
		let execArgv = process.execArgv.map(a => a.replace(/"/g, '""'));
		let batchPath = Path.join(app.getPath('temp'), 'addons.bat');
		let batch = '@echo off\r\n:LOOP\r\ndel "TTVStreamerTool.exe"\r\nIF EXIST "TTVStreamerTool.exe" (\r\ntimeout /T 1 /Nobreak >nul\r\nGOTO LOOP\r\n)\r\ndel *.dll /Q\r\nstart /b /wait build.exe -o".\" -y\r\ndel build.exe\r\nstart "" "' + process.execPath + '"' + (execArgv.length > 0 ? ' "' + execArgv.join('" "') + '"' : '') + '\r\nexit'
		fs.writeFile(batchPath, batch, (err: NodeJS.ErrnoException) => {
			if(err === null) {
				spawn('resources\\elevate -c "'+batchPath+'"', { cwd: process.cwd(), env: process.env, shell: true, detached: true, windowsHide: false });
				app.quit();
			}
		});
	}
}