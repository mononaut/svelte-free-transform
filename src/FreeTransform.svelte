<script>
/*
  A freely user-transformable wrapper component.

  Size, position and rotation can be adjusted via handles or multi-touch gesture.
  Place content in the default slot.
  Handles can be overridden via the "handle" and "rotator" slots.

  The immediate parent must be a positioned element
  (i.e. styled with "position: relative/absolute/fixed/etc").
*/

import vector from './vector.js'

// props
export let position = { x: 0, y: 0, w: 100, h: 100, r: 0 }
export let rotatorEnabled = false // Show a separate handle for rotation
export let rotatorBar = false // Draw a line from the rotator handle to the frame
export let handleMode = 'resize' // 'resize' or 'rotate'. Controls corner handle behaviour
export let lockAspect = false // Is the aspect ratio fixed?
export let lockTouchResize = false // Can the size be changed by multitouch gestures?

// the position at the start of each gesture
// transformations are calculated relative to this
let startPosition = {
  x: null,
  y: null,
  w: null,
  h: null,
  r: null
}

// DOMRects of the component and parent element
let parentBounds, bounds
// Map of active pointers
const pointers = {}
// Number of active pointers
let pointerCount = 0
// References to DOM elements
let element, wrapper, handleTR, handleTL, handleBR, handleBL, rotatorHandle


function isDragging (pointer) {
  return pointer && pointer.target && pointer.target.type === 'body' && pointerCount === 1
}
function isRotating (pointer) {
  return pointer && pointer.target && (pointer.target.type === 'rotate' || (pointer.target.type === 'handle' && handleMode === 'rotate'))
}
function isResizing (pointer) {
  return pointer && pointer.target && pointer.target.type === 'handle'
}
function isFreeTransforming (pointer) {
  return pointer && pointer.target && pointer.target.type !== 'handle' && pointerCount > 1
}

const stylePropMap = {
  x: 'left',
  y: 'top',
  w: 'width',
  h: 'height'
}

// Convert position to a CSS style string
function stylePosition (pos) {
  return ['x', 'y', 'w', 'h'].map(prop => {
    if (pos[prop] != null) return `${stylePropMap[prop]}: ${pos[prop]}px; `
    else return ''
  }).join(' ') + `; transform: rotate(${pos.r}rad)`
}

// Calculate the changes required for a resize gesture:
// Scales the width and height of the component such that the same points in
// component-space lie under the pointer and anchor point before and after the
// transformation.
// Does not preserve aspect ratio.
function calcResizeTransform (pointer, anchor) {
  const rotation = startPosition.r
  const origin = bounds.center
  const topLeft = vector.sub(origin, { x: (startPosition.w / 2), y: (startPosition.h / 2) })
  const unrotatedEnd = vector.rotate(pointer.end, -rotation, anchor)
  const width = unrotatedEnd.x - anchor.x
  const height = unrotatedEnd.y - anchor.y
  const newOrigin = vector.add(topLeft, { x: Math.abs(width / 2), y: Math.abs(height / 2) })
  const unrotatedAnchor = vector.add(newOrigin, { x: -(width / 2), y: -(height / 2) })
  const newAnchor = vector.rotate(unrotatedAnchor, rotation, newOrigin)

  const translate = vector.sub(anchor, newAnchor)
  return { width, height, translate }
}

// Calculate the changes required for a free transform gesture:
// Given two pointers, the component is scaled, rotated and translated
// such that the same points in component-space lie under the pointers
// before and after the transformation\
//
// Preserves aspect ratio.
//
// pointerB may be given as a single coord, instead of a { start, end } map,
// allowing operations like 'rotate about the center' or 'resize from a corner'
// to be performed using the same transform logic
//
// noRotate=true locks the current component rotation
// noScale=true locks the current component width and height
function calcFreeTransform (pointerA, pointerB, origin, noRotate, noScale) {
  // Handle the case where pointerB is a static point
  const pointerBStart = pointerB.start ? pointerB.start : pointerB
  const pointerBEnd = pointerB.end ? pointerB.end : pointerB

  const startAB = vector.sub(pointerBStart, pointerA.start)
  const endAB = vector.sub(pointerBEnd, pointerA.end)
  const scale = vector.length(endAB) / vector.length(startAB)
  const rotate = noRotate ? 0 : vector.direction(startAB) - vector.direction(endAB)

  const center = vector.add(vector.rotate(vector.scale(vector.sub(origin, pointerBStart), scale), rotate, { x: 0, y: 0 }), pointerBEnd)
  const translate = vector.sub(center, origin)
  return { scale: (noScale ? 1 : scale), rotate, translate, center }
}

// Retrieve a DOMRect from the supplied element
// and extend with x, y, and center fields
function getFullBounds (element) {
  const elementBounds = element.getBoundingClientRect()
  elementBounds.x = elementBounds.left
  elementBounds.y = elementBounds.top
  elementBounds.center = {
    x: (elementBounds.left + elementBounds.right) / 2,
    y: (elementBounds.top + elementBounds.bottom) / 2
  }
  return elementBounds
}

// Apply a partial drag gesture
// Simple translation of the component by the same distance as the pointer
function doDrag (pointer) {
  position.y = startPosition.y + (pointer.end.y - pointer.start.y)
  position.x = startPosition.x + (pointer.end.x - pointer.start.x)
}

// Calculate and apply a partial resize gesture
// Resizes the width/height of a component relative to an anchor point
function doResize (pointer, anchor) {
  const transform = calcResizeTransform(pointer, anchor, bounds.center)

  position.x = startPosition.x + transform.translate.x
  position.y = startPosition.y + transform.translate.y
  position.w = Math.abs(transform.width)
  position.h = Math.abs(transform.height)
}

// Calculate and apply a partial free transform gesture
function doFreeTransform (pointerA, pointerB, noRotate, noScale) {
  const transform = calcFreeTransform(pointerA, pointerB, bounds.center, noRotate, noScale)
  position.w = startPosition.w * transform.scale
  position.h = startPosition.h * transform.scale

  const tlToOrigin = vector.sub(bounds.center, startPosition)
  const tlvec = vector.add(vector.add(tlToOrigin, transform.translate), { x: -(position.w / 2), y: -(position.h / 2) })
  position.x = startPosition.x + tlvec.x - parentBounds.left
  position.y = startPosition.y + tlvec.y - parentBounds.top
  position.r = startPosition.r + transform.rotate
}

// Get the target of a given pointer event
function getPointerTarget (evt) {
  if (handleTR.contains(evt.target)) {
    return { type: 'handle', top: true, right: true }
  }
  else if (handleTL.contains(evt.target)) {
    return { type: 'handle', top: true, left: true }
  }
  else if (handleBR.contains(evt.target)) {
    return { type: 'handle', bottom: true, right: true }
  }
  else if (handleBL.contains(evt.target)) {
    return { type: 'handle', bottom: true, left: true }
  }
  else if (rotatorHandle && rotatorHandle.contains(evt.target)) {
    return { type: 'rotate' }
  }
  else return { type: 'body' }
}

function pointerDown (evt) {
  let target = getPointerTarget(evt)
  let pointer = pointers[evt.pointerId]

  // Add the pointer to active pointers map
  if (!pointer) {
    pointerCount++
    pointer = {
      id: evt.pointerId,
      priority: pointerCount - 1,
      start: {
        x: evt.pageX,
        y: evt.pageY
      },
      end: {
        x: evt.pageX,
        y: evt.pageY
      },
      target
    }
    pointers[evt.pointerId] = pointer
  } else { // or update, if it's already there
    pointer.end.x = evt.pageX
    pointer.end.y = evt.pageY
    pointer.target = target
  }

  // If the pointer is enabled (one of the first two active pointers)
  if (pointer.priority < 2) {
    bounds = getFullBounds(wrapper)
    parentBounds = getFullBounds(element.parentNode)

    // There's another active enabled pointer
    if (pointerCount > 1) {
      // Starting a new multitouch gesture
      Object.values(pointers).forEach(pointer => {
        if (pointer.id !== pointer)
        pointer.start.x = pointer.end.x
        pointer.start.y = pointer.end.y
      })
    }

    // Record the current component state as the gesture starting state
    startPosition.x = position.x
    startPosition.y = position.y
    startPosition.w = position.w
    startPosition.h = position.h
    startPosition.r = position.r

    // If the pointer is dragging a corner handle, record the position of the
    // opposite corner (to anchor resizing events)
    if (target.type === 'handle') {
      let oppositeHandle
      if (target.top) {
        if (target.right) oppositeHandle = handleBL
        else oppositeHandle = handleBR
      } else {
        if (target.right) oppositeHandle = handleTL
        else oppositeHandle = handleTR
      }
      // handles are centered on the corresponding corner of the component frame
      // so we can quickly find the frame corner by calculating the center
      // of the on-screen bounds of the handle element
      // (easier than messing with trigonometry when the component is rotated)
      const oppositeHandleBounds = oppositeHandle.getBoundingClientRect()
      const oppositeCorner = {
        x: (oppositeHandleBounds.left + oppositeHandleBounds.right) / 2,
        y: (oppositeHandleBounds.top + oppositeHandleBounds.bottom) / 2
      }
      pointers.anchor = oppositeCorner
    } else {
      delete pointers.anchor
    }
  }
}

function pointerMove (evt) {
  let pointer = pointers[evt.pointerId]
  // Ignore unless pointer is enabled (one of the first two active pointers)
  if (pointer && pointer.priority < 2) {
    // update the on-screen position
    pointer.end.x = evt.pageX
    pointer.end.y = evt.pageY

    // Perform different transformations depending which part of the component is
    // being dragged/manipulated
    if (isDragging(pointer)) doDrag(pointer)
    else if (isRotating(pointer)) doFreeTransform(pointer, bounds.center, false, true)
    else if (isResizing(pointer) && !lockAspect) doResize(pointer, pointers.anchor)
    else if (isResizing(pointer) && lockAspect) doFreeTransform(pointer, pointers.anchor, true)
    else if (isFreeTransforming(pointer)) {
      let multitouch = pointerCount > 1
      let pointerB
      if (multitouch) {
        pointerB = Object.values(pointers).find(p => {
          return p.id !== pointer.id
        })
      } else if (pointers.anchor) {
        pointerB = pointers.anchor
      } else {
        pointerB = bounds.center
      }
      doFreeTransform(pointer, pointerB, false, (multitouch && lockTouchResize))
    }
  }
}

// Clean up after a pointer is removed and the gesture is ended
function pointerUp (evt) {
  let removedPriority = Infinity
  if (pointers[evt.pointerId]) {
    pointerCount--
    removedPriority = pointers[evt.pointerId].priority
  }
  // remove the pointer from the active pointers map
  delete pointers[evt.pointerId]
  // If there are still some other active pointers
  if (pointerCount) {
    // Reset the startPosition to start a new gesture
    startPosition.y = position.y
    startPosition.x = position.x
    startPosition.w = position.w
    startPosition.h = position.h
    startPosition.r = position.r
    // update the enabled pointer priority queue
    // and reset the pointer start positions for a new gesture
    Object.values(pointers).forEach(pointer => {
      if (pointer.id) {
        if (pointer.priority > removedPriority) pointer.priority--
        pointer.start.x = pointer.end.x
        pointer.start.y = pointer.end.y
      }
    })
  }
}
</script>

<svelte:window
  on:pointermove={pointerMove}
  on:pointerup={pointerUp}
/>

<div
  class="free-transform"
  style="
    {stylePosition(position)}
  "
  on:pointerdown={pointerDown}
  bind:this={element}
>
  <div class="frame" bind:this={wrapper}>
    <div class="handle corner top right" bind:this={handleTR}><slot name="handle"><div class="handle-shape" /></slot></div>
    <div class="handle corner bottom right" bind:this={handleBR}><slot name="handle"><div class="handle-shape" /></slot></div>
    <div class="handle corner bottom left" bind:this={handleBL}><slot name="handle"><div class="handle-shape" /></slot></div>
    <div class="handle corner top left" bind:this={handleTL}><slot name="handle"><div class="handle-shape" /></slot></div>
    {#if rotatorEnabled }
      <div class="handle rotator" bind:this={rotatorHandle}>
        <slot name="rotator"><div class="handle-shape" /></slot>
        {#if rotatorBar }<div class="rotator-bar" />{/if}
      </div>
    {/if}
  </div>
  <div class="contents">
    <slot />
  </div>
</div>

<style>
  :global(html) {
    --frameBorder: solid 1px cyan;
  }

  .free-transform {
    position: absolute;
    transform-origin: center;
    touch-action: none;
  }

  .contents {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
  }

  .frame {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    cursor: move;

    border: var(--frameBorder);
  }

  .handle {
    position: absolute;
    user-select: none;
    touch-action: none;
    cursor: grab;
  }

  .handle:active {
    cursor: grabbing;
  }

  .handle-shape {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: white;
    border: var(--frameBorder);
  }

  .handle.top {
    top: 0px;
  }
  .handle.right {
    right: 0px;
  }
  .handle.bottom {
    bottom: 0px;
  }
  .handle.left {
    left: 0px;
  }
  .handle.top.left {
    transform: translate(-50%,-50%) rotate(-45deg);
  }
  .handle.top.right {
    transform: translate(50%,-50%) rotate(45deg);
  }
  .handle.bottom.left {
    transform: translate(-50%,50%) rotate(-135deg);
  }
  .handle.bottom.right {
    transform: translate(50%,50%) rotate(135deg);
  }

  .handle.rotator {
    left: 50%;
    top: -30px;
  }

  .rotator-bar {
    position: absolute;
    top: 100%;
    right: 50%;
    width: 1px;
    height: calc(30px - 100%);
    border-right: var(--frameBorder);
  }
</style>
