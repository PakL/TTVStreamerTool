const Broadcast = require('../../dist/dev.pakl.ttvst/renderer/Broadcast');
const OverlayPage = require('./OverlayPage');

TTVST.ui.addPage(new OverlayPage());
Broadcast.instance.emit('app.ttvst.overlay.ready');