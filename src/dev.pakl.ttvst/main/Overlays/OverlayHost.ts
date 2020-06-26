import * as fs from 'fs';
import * as http from 'http';
import TTVSTMain from '../TTVSTMain';
import winston from 'winston';

declare var logger: winston.Logger;
declare var TTVST: TTVSTMain;


class OverlayHost {

	overlayport: number = 8090;
	overlayres: string = 'res/overlays';

	mimeTypes = {
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
	};

	overlayserver: http.Server = null;

	constructor() {
		this.onHttpRequest = this.onHttpRequest.bind(this);
		this.onError = this.onError.bind(this);
		this.onListening = this.onListening.bind(this);

		TTVST.startpage.broadcastStatus({ key: 'app.ttvst.overlay', icon: 'ArrangeBringForward', status: 'error', title: 'Overlay Server', info: 'Server not running yet.' })

		this.overlayserver = http.createServer(this.onHttpRequest);
		this.overlayserver.on('error', this.onError);
		this.overlayserver.on('listening', this.onListening);
	}

	onError(error: NodeJS.ErrnoException) {
		if(error.code === 'EADDRINUSE') {

		} else {

		}
	}

	onListening() {
		logger.info(`[Overlay] Host is now listening on port ${this.overlayport}`);
		
	}

	onHttpRequest(request: http.IncomingMessage, response: http.ServerResponse) {
		
	}

}

export = OverlayHost;