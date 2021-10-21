<script>
  import d3 from '../utils/d3-import';
  import { onMount } from 'svelte';
  import { tooltipConfigStore } from '../store';

  import rightArrowIcon from '../img/icon-right-arrow.svg';
  import rangeThumbLeftIcon from '../img/icon-range-thumb-left.svg';
  import rangeThumbRightIcon from '../img/icon-range-thumb-right.svg';

  const preProcessSVG = (svgString) => {
    return svgString.replaceAll('black', 'currentcolor')
      .replaceAll('fill:none', 'fill:currentcolor')
      .replaceAll('stroke:none', 'fill:currentcolor');
  };

  /**
   * Dynamically bind SVG files as inline SVG strings in this component
   */
  export const bindInlineSVG = (component) => {
    d3.select(component)
      .selectAll('.svg-icon.icon-right-arrow')
      .html(preProcessSVG(rightArrowIcon));

    d3.select(component)
      .selectAll('.svg-icon.icon-range-thumb-left')
      .html(preProcessSVG(rangeThumbLeftIcon));

    d3.select(component)
      .selectAll('.svg-icon.icon-range-thumb-right')
      .html(preProcessSVG(rangeThumbRightIcon));
  };

  let component = null;

  let feature = {
    name: 'FICO Score',
    featureName: 'fico_score',
    valueMin: 600,
    valueMax: 800
  };

  /**
   * Handling the mousedown event for thumbs on the slider.
   * @param e Event
   */
  const mouseDownHandler = (e) => {
    const mouseMoveHandler = (e) => {

    };

    const mouseUpHandler = (e) => {

    };
  };

  /**
   * Initialize the slider.
   */
  const initSlider = () => {
    const leftThumbID = 'slider-left-thumb';
    const rightThumbID = 'slider-right-thumb';

    // Move two range thumbs to the left and right ends
    moveThumb(leftThumbID, feature.valueMin);
    moveThumb(rightThumbID, feature.valueMax);

    // Register event listeners
    d3.select(component)
      .select(`#${leftThumbID}`)
      .on('mousedown', mouseDownHandler);

  };

  /**
   * Move the specified thumb to the given value on the slider.
   * @param{string} thumbId The ID of the thumb element.
   * @param{number} value The target value to move the thumb to.
   */
  const moveThumb = (thumbId, value) => {
    // Make sure we are only moving within the range of the feature value
    if (value > feature.valueMax) {
      value = feature.valueMax;
    }

    if (value < feature.valueMin) {
      value = feature.valueMin;
    }

    // Save the current value to the HTML element
    const thumb = d3.select(component)
      .select(`#${thumbId}`)
      .attr('data-curValue', value);

    // Compute the position to move the thumb to
    const thumbBBox = thumb.node().getBoundingClientRect();
    const trackBBox = thumb.node().parentNode.getBoundingClientRect();

    let xPos = (value - feature.valueMin) / (feature.valueMax - feature.valueMin)
      * trackBBox.width;

    // Need to offset the xPos based on the thumb type
    if (thumbId.includes('right')) {
      xPos -= thumbBBox.width;
    }

    console.log(thumbBBox, trackBBox);

    thumb.style('left', `${xPos}px`);

    console.log(thumb);
  };

  onMount(() => {
    // Bind the SVG icons on mount
    bindInlineSVG(component);

    // Init the slider
    initSlider();
  });

</script>

<style lang="scss">
  @import '../define';
  @use 'sass:math';

  .feature-card {
    display: flex;
    flex-direction: column;
    height: 200px;
    width: 300px;
    border-radius: 10px;
    padding: 0.5em 0.8em;
    box-shadow: $shadow-border-light;
    background: white;
  }

  .feature-header {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }

  .values {
    display: flex;
    flex-direction: row;
    align-items: center;

    .value-change {
      font-size: 0.8em;
      padding: 0px 14px 8px 5px;
      margin: -5px 0 0 0;
      color: $green-600;
    }
  }

  .feature-arrow {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 0 5px;

    .svg-icon {
      color: $coolGray-800;
      :global(svg) {
        width: 10px;
        height: 5px;
      }
    }
  }

  .svg-icon {
    color: $coolGray-800;
    fill: $coolGray-800;
    display: flex;

    :global(svg) {
      width: 1em;
      height: 1em;
    }
  }

  .arrow-right {
    box-sizing: border-box;
    position: relative;
    display: block;
    width: 100%;
    height: 5px;

    &::after,&::before {
      content: "";
      display: block;
      box-sizing: border-box;
      position: absolute;
      right: 3px;
    }

    &::after {
      width: 8px;
      height: 8px;
      border-top: 2px solid $gray-400;
      border-right: 2px solid $gray-400;
      transform: rotate(45deg);
      bottom: 7px;
    }

    &::before {
      width: calc(100% - 4px);
      height: 2px;
      bottom: 10px;
      background: $gray-400;
    }
  }

  .feature-hist {
    border: 1px solid $gray-200;
    margin: 0 0 10px 0;
    height: 80px;
  }

  .feature-slider {

    .track {
      width: 100%;
      background-color: $gray-200;
      position: relative;
      height: 4px;
    }

    .svg-icon.thumb {
      position: absolute;
      padding: 0;
      margin: 0px;
      top: -4px;

      color: $orange-400;
      fill: $orange-400;
      cursor: grab;

      :global(svg) {
        width: 8px;
        height: unset;
      }

      $base-circle-radius: 5px;

      &::before {
        content: '';
        display: inline-block;
        position: absolute;
        width: $base-circle-radius;
        height: $base-circle-radius;
        border-radius: 50%;
        background: currentColor;
        opacity: 0.2;
        // Center the background circle
        left: 50%;
        top: 50%;
        margin-top: -($base-circle-radius / 2);
        margin-left: -($base-circle-radius / 2);
        transition: transform 300ms ease-in-out;
      }
    }

    .svg-icon.thumb:hover {
      &::before {
        transform: scale(6);
      }
    }

    .svg-icon.thumb:focus {
      &::before {
        transform: scale(8);
      }
    }

  }

</style>

<div class='feature-card' bind:this={component}>

  <div class='feature-header'>
    <span class='feature-name'>
      FICO Score
    </span>

    <div class='values'>
      <span class='value-old'>
        728
      </span>

      <div class='feature-arrow'>
        <span class='value-change'>
          +20.55
        </span>

        <div class='arrow-right'></div>
      </div>

      <span class='value-new'>
        800
      </span>
    </div>

  </div>

  <div class='feature-hist'>

  </div>

  <div class='feature-slider'>

    <div class='track'>
      <div id='slider-left-thumb'
        class='svg-icon icon-range-thumb-left thumb'>
      </div>

      <div id='slider-right-thumb'
        class='svg-icon icon-range-thumb-right thumb'>
      </div>

    </div>

  </div>

</div>