# svelte-free-transform

A freely user-transformable container component for Svelte.

Wraps arbitrary content in a frame for users to drag, resize and rotate via handles or multi-touch gestures.

[Try out a demo!](https://svelte.dev/repl/528b834fb07f4d1ea5de986e6c728efc?version=3.38.2)

## Installation

```bash
npm install --save svelte-free-transform
```


## Usage

Wrap any components or markup in a `<FreeTransform />` element. The container element should be _positioned_.

Set an initial position using the `position` prop.

```html
<script>
  import FreeTransform from 'svelte-free-transform';

</script>

<div class="transform-area">
  <FreeTransform
    position={{
      x: 0,
      y: 0,
      w: 100,
      h: 100,
      r: 0
    }}
    handleMode="resize"
    rotatorEnabled
    rotatorBar
  >
    <content />
    <!-- override corner handle  (optional)-->
    <div slot="handle" />
    <!-- override rotation handle  (optional)-->
    <div slot="rotator" />
  </FreeTransform>
</div>

<style>
  .transform-area {
    position: relative;
  }
</style>
```

We can also wrap the `<FreeTransform />` element in another div (for example, if we want to apply Svelte animations), and instead transform that wrapper element:

```html
<script>
  import FreeTransform from 'svelte-free-transform';

</script>

<div class="transform-area">
  <div
    bind:this={wrapper}
    style={myPosition.style}
  >
    <FreeTransform
      bind:position={myPosition}
      target={wrapper}
      handleMode="resize"
      rotatorEnabled
      rotatorBar
    >
      <content />
    </FreeTransform>
  </div>
</div>

<style>
  .transform-area {
    position: relative;
  }
</style>
```


## Props

**Prop** | **Type** | **Possible Values** | **Default**
---|---|---|---
position | `{x, y, w, h, r, style }`| x, y, w, h = position, width and height in pixels. r = rotation in radians. style = css inline style string representing the applied transform | `{ x: 0, y: 0, w: 100, h: 100, r: 0 }`
target | DOM Element | the element to transform | this element
container | DOM Element | nearest positioned ancestor of the target element | immediate parent of the target element
handleMode | String | 'resize' or 'rotate' | 'resize'
rotatorEnabled | Boolean |  Show a separate handle for rotation? | `false`
rotatorBar | Boolean |  Draw a line from the rotation handle to the frame? | `false`
lockAspect | Boolean | Keep a fixed aspect ratio?  | `false`
lockTouchResize | Boolean | Allow resizing via multitouch gesture?  | `false`

## Styling

Style the frame border by overriding the --frameBorder CSS variable:



```html
<style>
  .transform-area {
    --frameBorder: 1px solid lime;
  }
</style>
```


## License

[MIT](LICENSE)
