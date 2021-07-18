const OverlayPage = require('./OverlayPage');

TTVST.ui.addPage(new OverlayPage());
TTVST.Broadcast.instance.emit('app.ttvst.overlay.ready');