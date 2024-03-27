export const PI_2 = Math.PI / 2

export function getOffset(el) {
    // returns the offset of an element relative to the document
    const rect = el.getBoundingClientRect()
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop

    return {
        top: rect.top + scrollTop,
        left: rect.left + scrollLeft
    }
}


// Touch Point cache
var tpCache = new Array();

function start_handler(ev, update) {
    // If the user makes simultaneious touches, the browser will fire a
    // separate touchstart event for each touch point. Thus if there are
    // three simultaneous touches, the first touchstart event will have
    // targetTouches length of one, the second event will have a length
    // of two, and so on.
    ev.preventDefault();
    // Cache the touch points for later processing of 2-touch pinch/zoom
    if (ev.targetTouches.length == 2) {
        for (var i = 0; i < ev.targetTouches.length; i++) {
            tpCache.push(ev.targetTouches[i]);
        }
    }
    update.call(this, ev);
}

function move_handler(ev, update) {
    // Note: if the user makes more than one "simultaneous" touches, most browsers
    // fire at least one touchmove event and some will fire several touchmoves.
    // Consequently, an application might want to "ignore" some touchmoves.
    //
    // This function sets the target element's outline to "dashed" to visualy
    // indicate the target received a move event.
    //
    ev.preventDefault();
    if (!(ev.touches.length == 2 && ev.targetTouches.length == 2))
        update.call(this, ev);

}

function end_handler(ev, update) {
    ev.preventDefault();
    update.call(this, ev);
}

export function set_handlers(name, update, ctx) {
    // Install event handlers for the given element
    var el = document.getElementById(name);
    el.ontouchstart = (ev) => start_handler.call(ctx, ev, update);
    el.ontouchmove = (ev) => move_handler.call(ctx, ev, update);
    // Use same handler for touchcancel and touchend
    el.ontouchcancel = (ev) => end_handler.call(ctx, ev, update);
    el.ontouchend = (ev) => end_handler.call(ctx, ev, update);
}