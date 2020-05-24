import * as fs from 'fs';
import * as http from 'http';



class OverlayHost {

	overlayport: number = 8090;
	overlayres: string = 'res/overlays';

	mimeTypes: {
		'.html': 'text/html',
		'.htm': 'text/html',
		'.png': 'image/png',
		'.jpg': 'image/jpeg',
		'.jpeg': 'image/jpeg',
		'.gif': 'image/gif',
		'.css': 'text/css',
		'.js': 'application/javascript',
		'.json': 'application/json',
		'.wav': 'audio/wav',
		'.mp3': 'audio/mpeg',
		'.m4a': 'audio/m4a'
	}

	constructor() {

	}

}

export = OverlayHost;