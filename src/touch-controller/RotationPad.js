import * as utils from './utils.js'


class RotationPad {
    container
    padElement
    region
    handle
    eventRepeatTimeout
    regionData = {}
    handleData = {}
    mouseDown = false
    mouseStopped = false

    constructor(container) {
        this.container = container
        this.padElement = document.createElement('div')
        this.padElement.id = 'rotation-pad'
        this.padElement.classList.add('rotation-pad')
        this.region = document.createElement('div')
        this.region.classList.add('region')
        this.handle = document.createElement('div')
        this.handle.classList.add('handle')
        this.handle.id = 'rotation-handle'
        this.region.appendChild(this.handle)
        this.padElement.append(this.region)
        this.container.append(this.padElement)

        // Aligning pad:
        let canvas = container.getElementsByTagName('canvas')[0]
        this.alignAndConfigPad(canvas)

        // events
        window.addEventListener('resize', () => { this.alignAndConfigPad(canvas) })

        // Mouse events:
        this.padElement.addEventListener('mousedown', (event) => {
            this.mouseDown = true
            this.handle.style.opacity = 1.0
            this.update(event.pageX, event.pageY)
        })

        this.padElement.addEventListener('mouseup', () => {
            this.mouseDown = false
            this.resetHandlePosition()
        })

        this.padElement.addEventListener('mousemove', (event) => {
            if (!this.mouseDown)
                return
            this.update(event.pageX, event.pageY)
        })

        //Touch events:
        utils.set_handlers('rotation-pad', this.touchHandler, this)

        this.resetHandlePosition()
    }

    touchHandler(ev) {
        switch (ev.type) {
            case 'touchstart':
                this.mouseDown = true
                this.handle.style.opacity = 1.0

                for (var i = 0; i < ev.touches.length; i++) {
                    if (ev.touches[i].target.id == 'rotation-handle' || ev.touches[i].target.parentElement.id == 'rotation-pad') {
                        this.update(ev.touches[i].pageX, ev.touches[i].pageY)
                        return
                    }
                }
                break;
            case 'touchmove':
                if (!this.mouseDown)
                    return
                for (var i = 0; i < ev.touches.length; i++) {
                    if (ev.touches[i].target.id == 'rotation-handle' || ev.touches[i].target.parentElement.id == 'rotation-pad') {
                        this.update(ev.touches[i].pageX, ev.touches[i].pageY)
                        return
                    }
                }
                break;
            case 'touchcancel':
            case 'touchend':
                this.mouseDown = false
                this.resetHandlePosition()
                break;
        }
    }

    alignAndConfigPad(canvas) {
        this.padElement.style.top = canvas.height + this.container.getBoundingClientRect().top
            - this.region.offsetHeight - 10 + 'px'
        this.padElement.style.left = canvas.offsetWidth - this.region.offsetWidth - 20 + 'px'

        this.regionData.width = this.region.offsetWidth
        this.regionData.height = this.region.offsetHeight
        this.regionData.position = {
            top: this.region.offsetTop,
            left: this.region.offsetLeft
        }
        this.regionData.offset = utils.getOffset(this.region)
        this.regionData.radius = this.regionData.width / 2
        this.regionData.centerX = this.regionData.position.left + this.regionData.radius
        this.regionData.centerY = this.regionData.position.top + this.regionData.radius

        this.handleData.width = this.handle.offsetWidth
        this.handleData.height = this.handle.offsetHeight
        this.handleData.radius = this.handleData.width / 2

        this.regionData.radius = this.regionData.width / 2 - this.handleData.radius
    }

    update(pageX, pageY) {
        let newLeft = (pageX - this.regionData.offset.left)
        let newTop = (pageY - this.regionData.offset.top)

        // If handle reaches the pad boundaries.
        let distance = Math.pow(this.regionData.centerX - newLeft, 2) + Math.pow(this.regionData.centerY - newTop, 2)
        if (distance > Math.pow(this.regionData.radius, 2)) {
            let angle = Math.atan2((newTop - this.regionData.centerY), (newLeft - this.regionData.centerX))
            newLeft = (Math.cos(angle) * this.regionData.radius) + this.regionData.centerX
            newTop = (Math.sin(angle) * this.regionData.radius) + this.regionData.centerY
        }
        newTop = Math.round(newTop * 10) / 10
        newLeft = Math.round(newLeft * 10) / 10

        this.handle.style.top = newTop - this.handleData.radius + 'px'
        this.handle.style.left = newLeft - this.handleData.radius + 'px'
        // console.log(newTop , newLeft)

        // Providing event and data for handling camera movement.
        var deltaX = this.regionData.centerX - parseInt(newLeft)
        var deltaY = this.regionData.centerY - parseInt(newTop)
        // Normalize x,y between -2 to 2 range.
        deltaX = -2 + (2 + 2) * (deltaX - (-this.regionData.radius)) / (this.regionData.radius - (-this.regionData.radius))
        deltaY = -2 + (2 + 2) * (deltaY - (-this.regionData.radius)) / (this.regionData.radius - (-this.regionData.radius))
        deltaX = -1 * Math.round(deltaX * 10) / 10
        deltaY = -1 * Math.round(deltaY * 10) / 10
        // console.log(deltaX, deltaY)
        this.sendEvent(deltaX, deltaY)
    }

    sendEvent(dx, dy) {
        if (this.eventRepeatTimeout) {
            clearTimeout(this.eventRepeatTimeout)
        }

        if (!this.mouseDown) {
            clearTimeout(this.eventRepeatTimeout)
            return
        }

        this.eventRepeatTimeout = setTimeout(() => {
            this.sendEvent(dx, dy)
        }, 5)

        let picthEvent = new CustomEvent('YawPitch', {
            bubbles: false,
            detail: {
                'deltaX': dx,
                'deltaY': dy
            }
        })
        this.padElement.dispatchEvent(picthEvent)
    }

    resetHandlePosition() {
        this.handle.style.top = this.regionData.centerY - this.handleData.radius + 'px'
        this.handle.style.left = this.regionData.centerX - this.handleData.radius + 'px'
        this.handle.style.opacity = 0.1
    }
}


export default RotationPad
