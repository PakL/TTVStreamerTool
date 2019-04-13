/**
 * This is a helper class that manages the resize feature in the cockpit
 * 
 * @class ResizeDragger
 */
class ResizeDragger {

	/**
	 * @param {HTMLElement} mainContainer The main container that all elements are in and that the elements are sized to.
	 * @param {HTMLElement} dragger The element that is being dragged to define the new size.
	 * @param {HTMLElement} resizeElement The element that is being resized.
	 * @param {HTMLElement[]} spaceMaker Elements that must be resized to make space for the resizeElement.
	 */
	constructor(mainContainer, dragger, resizeElement, spaceMaker)
	{
		this.mainContainer = mainContainer
		this.dragger = dragger
		this.resizeElement = resizeElement
		this.spaceMaker = spaceMaker

		this.dragDirection = 'h'
		this.active = false
		this.currentX = 0
		this.currentY = 0

		this.movementX = 0
		this.movementY = 0

		const self = this
		this._dragStartListener = (e) => { self.dragStart(e) }
		this._dragEndListener = (e) => { self.dragEnd(e) }
		this._dragListener = (e) => { self.drag(e) }
		this._dClickListener = (e) => { cockpitResizeReset() }
		this.mainContainer.addEventListener('mousedown', this._dragStartListener)
		this.mainContainer.addEventListener('mouseup', this._dragEndListener)
		this.mainContainer.addEventListener('mousemove', this._dragListener)
		this.dragger.addEventListener('dblclick', this._dClickListener)
	}

	dragStart(e) {
		this.currentX = e.clientX;
		this.currentY = e.clientY;

		this.movementX = 0
		this.movementY = 0
	
		if (e.target === this.dragger) {
			this.active = true

			if(getComputedStyle(this.dragger).cursor == 'col-resize') {
				this.dragDirection = 'h'
			} else {
				this.dragDirection = 'v'
			}

			let videoPlayer = document.querySelector('#stream_video webview')
			if(videoPlayer !== null) videoPlayer.style.visibility = 'hidden'
			this.dragger.classList.add('active')
		}
	}

	dragEnd(e) {
		if(!this.active) return

		this.dragger.classList.remove('active')
		this.active = false;
		
		let videoPlayer = document.querySelector('#stream_video webview')
		if(videoPlayer !== null) videoPlayer.style.visibility = 'visible'

		if(this.dragDirection == 'h') {
			this.dragEndHorizontal(e)
		} else if(this.dragDirection == 'v') {
			this.dragEndVertical(e)
		}
	}
	
	dragEndHorizontal(e) {
		// Do not resize a column under 30 pixel width
		if((parseFloat(getComputedStyle(this.resizeElement).width) + this.movementX) < 30) {
			this.movementX = 30 - parseFloat(getComputedStyle(this.resizeElement).width)
		}

		// Do not resize beyond a point where spacemakers can no longer give space
		for(let i = 0; i < this.spaceMaker.length; i++) {
			if(getComputedStyle(this.spaceMaker[i]).visibility != 'visible' || getComputedStyle(this.spaceMaker[i]).display == 'none') continue

			if((parseFloat(getComputedStyle(this.spaceMaker[i]).width) - this.movementX) < 30) {
				this.movementX = (30 - parseFloat(getComputedStyle(this.spaceMaker[i]).width)) * -1
			}
		}

		let left = this.toPercent(parseFloat(getComputedStyle(this.resizeElement).left) - this.movementX)
		let width = this.toPercent(parseFloat(getComputedStyle(this.resizeElement).width) + this.movementX)

		this.resizeElement.style.width = width + '%'
		this.resizeElement.style.left = left + '%'
		this.dragger.style.left = left + '%'

		for(let i = 0; i < this.spaceMaker.length; i++) {
			let width = this.toPercent(parseFloat(getComputedStyle(this.spaceMaker[i]).width) - this.movementX)
			this.spaceMaker[i].style.width = width + '%'
		}
	}

	dragEndVertical(e) {
		// Do not resize a column under 30 pixel height
		if((parseFloat(getComputedStyle(this.resizeElement).height) + this.movementY) < 30) {
			this.movementY = 30 - parseFloat(getComputedStyle(this.resizeElement).height)
		}

		// Do not resize beyond a point where spacemakers can no longer give space
		for(let i = 0; i < this.spaceMaker.length; i++) {
			if(getComputedStyle(this.spaceMaker[i]).visibility != 'visible' || getComputedStyle(this.spaceMaker[i]).display == 'none') continue

			if((parseFloat(getComputedStyle(this.spaceMaker[i]).height) - this.movementY) < 30) {
				this.movementY = (30 - parseFloat(getComputedStyle(this.spaceMaker[i]).height)) * -1
			}
		}

		let top = this.toPercent(parseFloat(getComputedStyle(this.resizeElement).top)-65 - this.movementY, true)
		let height = this.toPercent(parseFloat(getComputedStyle(this.resizeElement).height) + this.movementY, true)

		this.resizeElement.style.height = height + '%'
		this.resizeElement.style.top = 'calc(' + top + '% + 65px)'
		this.dragger.style.top = 'calc(' + top + '% + 65px)'

		for(let i = 0; i < this.spaceMaker.length; i++) {
			let height = this.toPercent(parseFloat(getComputedStyle(this.spaceMaker[i]).height) - this.movementY, true)
			this.spaceMaker[i].style.height = height + '%'
		}
	}
	
	drag(e) {
		if(this.active) {
			e.preventDefault()
				
			let moveX = this.currentX - e.clientX
			let moveY = this.currentY - e.clientY
			this.currentX = e.clientX
			this.currentY = e.clientY

			this.movementX = this.movementX + moveX
			this.movementY = this.movementY + moveY
	
			if(this.dragDirection == 'h') {
				let left = this.toPercent(parseFloat(getComputedStyle(this.dragger).left) - moveX)
				this.dragger.style.left = left + '%'
			} else if(this.dragDirection == 'v') {
				let top = this.toPercent(parseFloat(getComputedStyle(this.dragger).top)-65 - moveY, true)
				this.dragger.style.top = 'calc(' + top + '% + 65px)'
			}
		}
	}

	/**
	 * 
	 * @param {number} value 
	 * @param {boolean} [height]
	 */
	toPercent(value, height) {
		if(typeof(height) !== 'boolean') height = false
		let containerSize = parseFloat(height ? getComputedStyle(this.mainContainer).height : getComputedStyle(this.mainContainer).width)
		return (100 / containerSize * value)
	}

	reset() {
		this.resizeElement.style.width = ''
		this.resizeElement.style.left = ''
		this.resizeElement.style.height = ''
		this.resizeElement.style.top = ''
		this.dragger.style.left = ''
		this.dragger.style.top = ''
		for(let i = 0; i < this.spaceMaker.length; i++) {
			this.spaceMaker[i].style.width = ''
			this.spaceMaker[i].style.height = ''
		}
	}

	cleanup() {
		this.mainContainer.removeEventListener('mousedown', this._dragStartListener)
		this.mainContainer.removeEventListener('mouseup', this._dragEndListener)
		this.mainContainer.removeEventListener('mousemove', this._dragListener)
		this.dragger.removeEventListener('dblclick', this._dClickListener)
	}
}

let cockpitResizeDragger = []

function cockpitResizeReset()
{
	for(let i = 0; i < cockpitResizeDragger.length; i++) {
		cockpitResizeDragger[i].reset()
	}
}

function cockpitResetCleanup()
{
	cockpitResizeReset()
	for(let i = 0; i < cockpitResizeDragger.length; i++) {
		cockpitResizeDragger[i].cleanup()
	}
	cockpitResizeDragger = []
}

function cockpitResizeInit()
{
	let mainContainer = document.querySelector("#content_cockpit")

	let spaceMakerChoice = [
		[
			document.querySelector('#stream_video')
		],
		[
			document.querySelector('#chat_column'),
			document.querySelector('#stream_video'),
			document.querySelector('#cockpit_chat_resize')
		],
		[
			document.querySelector('#chat_column'),
		],
		[
			document.querySelector('#chat_users_column')
		]
	]


	cockpitResizeDragger = []

	if(mainContainer.classList.contains('showPlayer')) {
		cockpitResizeDragger.push(new ResizeDragger(
			mainContainer,
			document.querySelector("#cockpit_chat_resize"),
			document.querySelector('#chat_column'),
			spaceMakerChoice[0]
		))
		if(Tool.settings.showViewerList) {
			cockpitResizeDragger.push(new ResizeDragger(
				mainContainer,
				document.querySelector("#cockpit_viewers_resize"),
				document.querySelector('#chat_users_column'),
				(Tool.settings.showActionStream ? spaceMakerChoice[1] : spaceMakerChoice[2])
			))
		}
		if(Tool.settings.showActionStream) {
			cockpitResizeDragger.push(new ResizeDragger(
				mainContainer,
				document.querySelector("#cockpit_action_resize"),
				document.querySelector('#cockpit_action_stream'),
				(Tool.settings.showViewerList ? spaceMakerChoice[3] : spaceMakerChoice[2])
			))
		}
	} else {
		if(Tool.settings.showViewerList) {
			cockpitResizeDragger.push(new ResizeDragger(
				mainContainer,
				document.querySelector("#cockpit_viewers_resize"),
				document.querySelector('#chat_users_column'),
				spaceMakerChoice[1]
			))
		}
		if(Tool.settings.showActionStream) {
			cockpitResizeDragger.push(new ResizeDragger(
				mainContainer,
				document.querySelector("#cockpit_action_resize"),
				document.querySelector('#cockpit_action_stream'),
				(Tool.settings.showViewerList ? spaceMakerChoice[3] : spaceMakerChoice[1])
			))
		}
	}
}
