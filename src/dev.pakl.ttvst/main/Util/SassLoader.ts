import * as sass from 'sass';
import { readFile } from 'fs';
import { join } from 'path';
import { systemPreferences } from 'electron';

import * as Color from '../../renderer/UI/ColorFunctions';
import winston from 'winston';

declare var logger: winston.Logger;
let cssCache: string;

const includePaths = [
	join(__dirname, '../../../../res/style/'),
	join(__dirname, '../../../../node_modules/sass-yiq/src/sass/')
];

export async function renderCSS() {
	if(process.env.NODE_ENV !== 'development' && typeof(cssCache) === 'string') {
		return cssCache;
	}

	try {
		cssCache = await new Promise((res, rej) => {
			readFile(join(includePaths[0], 'main.scss'), { encoding: 'utf8' }, (err, data) => {
				if(err) {
					rej(err);
				} else {
					let accentColor = systemPreferences.getAccentColor().substr(0, 6);
					let fontColor = '000000';
					if(Color.hexToLuma(accentColor) < 0.5) {
						fontColor = 'ffffff';
					}

					data= data
							.replace(/\$accentColor: #([0-9a-f]{6});/, `$accentColor: #${accentColor};`)
							.replace(/\$fontColorOnAccent: #([0-9a-f]{6});/, `$fontColorOnAccent: #${fontColor};`);

					sass.render({
						data,
						includePaths,
						outputStyle: 'compressed'
					}, (err, result) => {
						if(err) {
							rej(err);
						} else {
							res(result.css.toString());
						}
					})
				}
			});
		});
	} catch(e) {
		logger.error(e);
		cssCache = '';
	}
	return cssCache;
}