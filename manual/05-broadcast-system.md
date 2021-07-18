---
layout: post
title:  5. Broadcast System
date:   2021-03-25 16:30:00 +0100
author: PakL
---
Before we delve into addons, which will make TTVST actually productive, I should take some time to talk about the
broadcasting system that is the foundation for communication between addons or addon components. Addons can register
either "Actions", "Triggers" or both in this broadcasting system. Actions and triggers will both be broadcasted to all
addons or addon components that will listen to them.

### Actions
Actions can be executed on demand and come with an optional set of parameters.

For example: You can send a message to your channel with an action.

### Triggers
Triggers can be used to execute something when a specific event happens. Triggers come with an options set of arguments.

For example: You can let a chatbot flow execute when someone writes something in your channel.

<nav class="mt-4">
	<ul class="pagination justify-content-center">
		<li class="page-item"><a class="bg-dark page-link" href="04-errors.html">« 4. Errors</a></li>
		<li class="page-item"><a class="bg-dark page-link" href="index.html">Back to index</a></li>
		<li class="page-item"><a class="bg-dark page-link" href="06-addons.html">6. Addons »</a></li>
	</ul>
</nav>