var exports: any = {"__esModule": true};
const TTVST = new (require('../dist/dev.pakl.ttvst/renderer/TTVST'))();
Object.assign(global, { TTVST });
TTVST.init();