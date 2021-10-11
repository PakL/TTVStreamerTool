import { ipcMain } from 'electron';
import TTVSTMain from '../TTVSTMain';

declare var TTVST: TTVSTMain;

const createRequestId = () => {
	let hrtime = process.hrtime();
	return hrtime[0].toString(16) + '-' + hrtime[1].toString(16);
}
export function __(text: string, values?: { [key: string]: string|number }): Promise<string> {
	if(typeof(TTVST) === 'undefined' || TTVST.mainWindow === null || TTVST.mainWindow.window === null) return Promise.resolve(text);
	return new Promise((resolve) => {
		let rid = createRequestId();
		ipcMain.once(`i18n.${rid}.${text}`, (event, value: string) => {
			resolve(value);
		});
		TTVST.mainWindow.ipcSend('i18n', rid, text, values);
	});
}