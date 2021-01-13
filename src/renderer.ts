var exports: any = {"__esModule": true};

const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '..', 'node_modules'));

const TTVST = new (require('../dist/dev.pakl.ttvst/renderer/TTVST'))();
Object.assign(global, { TTVST });
TTVST.init();