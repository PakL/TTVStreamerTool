---
layout: post
title:  6.5. Overlay Host
date:   2021-05-19 09:40:00 +0200
author: PakL
---
The overlay host creates a HTTP host for you to use as overlays in (SL)OBS. It's backed up with websockets to make
overlays interactable.
It also enables you to call TTVST actions via Webhooks. This is a perfect solution for a Stream Deck without the use of
hotkeys.

Upon installing the addon you will notice a new entry in the navigation bar. This is the place for any overlay settings.
Additional overlay addons will place their settings here. You can change the port, that the HTTP server will listen on.
This will be `8090` by default. Please make sure to update your already set up overlays when you change this.
You can also change the default font face and color that the overlays should use. Its usage depends on the overlay,
though. You can also specify a font border with and color for better readability on potentially multicolored surfaces.
You may also need to add potential file sources from your PC here. This is a security/privacy feature to not expose
private files to the network by accident, depending on your firewall/network/security setup. Only files from addons and
the specified folders can be requested via the HTTP addon.

The overlay addon comes with a music overlay that plays a YouTube playlist and a countdown overlay. You can control both
through their settings menu or via TTVST actions.

<nav class="mt-4">
	<ul class="pagination justify-content-center">
		<li class="page-item"><a class="bg-dark page-link" href="06-04-file-access.html">« 6.4. File Access</a></li>
		<li class="page-item"><a class="bg-dark page-link" href="index.html">Back to index</a></li>
		<li class="page-item"><a class="bg-dark page-link" href="06-06-gif-overlay.html">6.6. GIF Overlay »</a></li>
	</ul>
</nav>