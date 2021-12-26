<script>
  import d3 from '../utils/d3-import';
  import { onMount } from 'svelte';
  import { tooltipConfigStore } from '../store';

  let tooltipConfig = {
    show: false,
    html: 'null',
    left: 0,
    top: 0,
    width: 80,
    maxWidth: 80,
    fontSize: '14px',
    tryHeight: false,
    orientation: 's'
  };
  let style = '';
  let tooltip = null;

  const updateStyle = () => {
    if (tooltipConfig.width === 0) {
      style = `left: ${tooltipConfig.left}px; top: ${tooltipConfig.top}px;
        max-width: ${tooltipConfig.maxWidth}px;
        font-size: ${tooltipConfig.fontSize}`;
    } else {
      style = `left: ${tooltipConfig.left}px; top: ${tooltipConfig.top}px;
        width: ${tooltipConfig.width}px; max-width: ${tooltipConfig.maxWidth}px;
        font-size: ${tooltipConfig.fontSize}`;
    }
  };

  tooltipConfigStore.subscribe(value => {
    if (value === null) {
      return;
    }

    if (value.show) {
      // Modify the position based on the orientation
      if (tooltipConfig.orientation === 'n') {
        value.top += 8;
      } else if (tooltipConfig.orientation === 's') {
        value.top -= 8;
      }
      tooltipConfig = value;
    } else {
      tooltipConfig = value;
    }

    updateStyle();
  });

</script>

<style lang="scss">
  .tooltip {
    position: absolute;
    color: hsl(0, 0%, 95%);
    background-color: black;
    padding: 2px 6px 4px 6px;
    border-radius: 4px;
    opacity: 1;
    z-index: 20;
    visibility: visible;
    transition: opacity 150ms, visibility 150ms;
    display: flex;
    justify-content: center;
    box-sizing: border-box;
    pointer-events: none;
    text-align: center;

    &.hidden {
      visibility: hidden;
    }
  }

  .arrow-up {
    position: absolute;
    top: -7px;
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-bottom: 10px solid black;
  }

  .arrow-down {
    position: absolute;
    bottom: -17px;
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-bottom: 10px solid transparent;
    border-top: 10px solid black;
  }
</style>

<div class="tooltip" style={style} bind:this={tooltip} class:hidden={!tooltipConfig.show}>
  <div class:arrow-up={tooltipConfig.orientation === 'n'}
    class:arrow-down={tooltipConfig.orientation === 's'}
  ></div>
  {@html tooltipConfig.html}
</div>