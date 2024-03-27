import * as THREE from 'three'
import RotationPad from './RotationPad.js'
import MovementPad from './MovementPad.js'

class TouchControls {
    rotationPad
    movementPad
    container
    enabled = true

    constructor(container) {
        this.container = container

        // Creating rotation pad
        this.rotationPad = new RotationPad(container)
        this.rotationPad.padElement.addEventListener('YawPitch', (event) => {
            //console.log(event)
            this.container.dispatchEvent(new CustomEvent('YawPitch', { detail: event.detail }))
        })

        // Creating movement pad
        this.movementPad = new MovementPad(container)
        this.movementPad.padElement.addEventListener('move', (event) => {
            //console.log(event)
            this.container.dispatchEvent(new CustomEvent('move', { detail: event.detail }))
        })
        this.movementPad.padElement.addEventListener('stopMove', (event) => {
            //console.log(event)
            this.container.dispatchEvent(new CustomEvent('stopMove', { detail: { x: event.detail } }))
        })

        this.container.addEventListener('contextmenu', (event) => { event.preventDefault() })
    }
}


export default TouchControls
