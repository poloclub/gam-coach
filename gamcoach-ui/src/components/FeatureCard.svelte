<script>
  import d3 from '../utils/d3-import';
  import { onMount } from 'svelte';
  import { tooltipConfigStore } from '../store';

  import rightArrowIcon from '../img/icon-right-arrow.svg';
  import rangeThumbLeftIcon from '../img/icon-range-thumb-left.svg';
  import rangeThumbRightIcon from '../img/icon-range-thumb-right.svg';
  import rangeThumbMiddleIcon from '../img/icon-range-thumb-middle.svg';

  // Constants
  const tickHeights = {
    default: 6,
    original: 20,
    user: 20,
    coach: 20,
  };

  // Binding variables, which will be initialized after window is loaded
  let component = null;
  let tickSVG = null;
  let tickXScale = null;

  let feature = {
    name: 'FICO Score',
    featureName: 'fico_score',
    valueMin: 600,
    valueMax: 800,
    requiresInt: true,
    originalValue: 728,
    curValue: 728,
    coachValue: 755,
  };

  feature.curMin = feature.valueMin;
  feature.curMax = feature.valueMax;

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

    d3.select(component)
      .selectAll('.svg-icon.icon-range-thumb-middle')
      .html(preProcessSVG(rangeThumbMiddleIcon));
  };

  /**
   * Handling the mousedown event for thumbs on the slider.
   * @param e Event
   */
  const mouseDownHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();

    let thumb = e.target;
    if (!thumb.id.includes('thumb')) { return; }

    let track = thumb.parentNode;
    let trackWidth = track.getBoundingClientRect().width;
    thumb.focus();

    const mouseMoveHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const deltaX = e.pageX - track.getBoundingClientRect().x;
      let newValue;

      // Handle integer value if it is required
      if (feature.requiresInt) {
        newValue = feature.valueMin + parseInt((feature.valueMax - feature.valueMin) * deltaX / trackWidth);
      } else {
        newValue = feature.valueMin + parseFloat((feature.valueMax - feature.valueMin) * deltaX / trackWidth);
      }

      // console.log(newValue);
      moveThumb(thumb.id, newValue);
    };

    const mouseUpHandler = () => {
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
      document.body.style.cursor = 'default';
      thumb.blur();
    };

    // Listen to mouse move on the whole page (users can drag outside of the
    // thumb, track, or even GAM Coach!)
    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
    document.body.style.cursor = 'grabbing';
  };

  /**
   * Initialize the slider.
   */
  const initSlider = () => {
    const leftThumbID = 'slider-left-thumb';
    const rightThumbID = 'slider-right-thumb';
    const middleThumbID = 'slider-middle-thumb';

    // Move two range thumbs to the left and right ends
    moveThumb(leftThumbID, feature.valueMin);
    moveThumb(rightThumbID, feature.valueMax);

    // Register event listeners
    d3.select(component)
      .select(`#${leftThumbID}`)
      .on('mousedown', mouseDownHandler);

    d3.select(component)
      .select(`#${rightThumbID}`)
      .on('mousedown', mouseDownHandler);

    // Move the curValue thumb to the original value
    moveThumb(middleThumbID, feature.originalValue);

    d3.select(component)
      .select(`#${middleThumbID}`)
      .on('mousedown', mouseDownHandler);

    syncRangeTrack();
  };

  /**
   * Move the specified thumb to the given value on the slider.
   * @param{string} thumbID The ID of the thumb element.
   * @param{number} value The target value to move the thumb to.
   */
  const moveThumb = (thumbID, value) => {
    // Make sure we are only moving within the range of the feature value
    if (value > feature.valueMax) {
      value = feature.valueMax;
    }

    if (value < feature.valueMin) {
      value = feature.valueMin;
    }

    // Special rules based on the thumb type
    switch(thumbID) {
    case 'slider-left-thumb':
      if (value > feature.curMax) {
        value = feature.curMax;
      }
      break;

    case 'slider-right-thumb':
      if (value < feature.curMin) {
        value = feature.curMin;
      }
      break;

    case 'slider-middle-thumb':
      // if (value > feature.curMax) {
      //   value = feature.curMax;
      // }
      // if (value < feature.curMin) {
      //   value = feature.curMin;
      // }
      break;

    default:
      console.warn('Unknown thumb type in moveThumb()');
      break;
    }

    // Save the current value to the HTML element
    const thumb = d3.select(component)
      .select(`#${thumbID}`)
      .attr('data-curValue', value);

    // Compute the position to move the thumb to
    const thumbBBox = thumb.node().getBoundingClientRect();
    const trackBBox = thumb.node().parentNode.getBoundingClientRect();

    let xPos = (value - feature.valueMin) / (feature.valueMax - feature.valueMin)
      * trackBBox.width;

    // Need to offset the xPos based on the thumb type
    // Also register different values based on the thumb type
    switch(thumbID) {
    case 'slider-left-thumb':
      xPos -= thumbBBox.width;
      feature.curMin = value;
      syncTicks();
      syncRangeTrack();
      break;

    case 'slider-right-thumb':
      feature.curMax = value;
      syncTicks();
      syncRangeTrack();
      break;

    case 'slider-middle-thumb':
      xPos -= thumbBBox.width / 2;
      feature.curValue = value;

      // Update the color for middle thumb
      if (feature.curValue === feature.originalValue) {
        thumb.classed('user', false);
        thumb.classed('coach', false);
      } else if (feature.curValue === feature.coachValue) {
        thumb.classed('user', false);
        thumb.classed('coach', true);
      } else {
        thumb.classed('user', true);
        thumb.classed('coach', false);
      }

      // Move the user tick mark
      if (tickSVG !== null) {
        tickSVG.select('.user-mark')
          .attr('transform', `translate(${tickXScale(value)}, 0)`);
      }

      break;

    default:
      console.warn('Unknown thumb type in moveThumb()');
      break;
    }

    thumb.style('left', `${xPos}px`);
  };

  /**
   * Sync up ticks with the current min & max range
   */
  const syncTicks = () => {
    if (tickSVG === null) {
      return;
    }

    tickSVG.select('g.tick-group')
      .selectAll('g.tick')
      .filter(d => d >= feature.curMin && d <= feature.curMax)
      // .classed('in-range', true)
      .classed('out-range', false);

    tickSVG.select('g.tick-group')
      .selectAll('g.tick')
      .filter(d => d < feature.curMin || d > feature.curMax)
      // .classed('in-range', false)
      .classed('out-range', true);

    if (feature.curMax === feature.curMin) {
      tickSVG.select('g.tick-group')
        .selectAll('g.tick')
        // .classed('in-range', false)
        .classed('out-range', true);
    }
  };

  /**
   * Sync the background range track with teh current min & max range
   */
  const syncRangeTrack = () => {
    let leftThumb = d3.select(component)
      .select('#slider-left-thumb');

    let rightThumb = d3.select(component)
      .select('#slider-right-thumb');

    let thumbWidth = leftThumb.node().getBoundingClientRect().width;
    let leftThumbLeft = parseFloat(leftThumb.style('left'));
    let rightThumbLeft = parseFloat(rightThumb.style('left'));
    let rangeWidth = rightThumbLeft - leftThumbLeft;

    d3.select(component)
      .select('.track .range-track')
      .style('left', `${leftThumbLeft + thumbWidth}px`)
      .style('width', `${rangeWidth}px`);
  };

  /**
   * Initialize position ticks and the original value tick.
   */
  const initTicks = () => {

    // Use the parent size to initialize the SVG size
    let parentDiv = d3.select(component)
      .select('.feature-ticks');
    let parentBBox = parentDiv.node().getBoundingClientRect();

    const width = parentBBox.width;
    const height = parentBBox.height;

    tickSVG = d3.select(component)
      .select('.svg-ticks')
      .attr('width', width)
      .attr('height', height);

    // Offset the range thumb to align with the track
    const thumbWidth = d3.select(component)
      .select('#slider-left-thumb')
      .node()
      .offsetWidth;

    const padding = {
      top: 8,
      left: thumbWidth,
      right: thumbWidth,
      bottom: 0
    };

    // Add ticks
    const tickTotalWidth = width - padding.left - padding.right;

    let tickGroup = tickSVG.append('g')
      .attr('class', 'tick-group')
      .attr('transform', `translate(${thumbWidth}, ${padding.top})`);

    tickXScale = d3.scaleLinear()
      .domain([feature.valueMin, feature.valueMax])
      .range([0, tickTotalWidth]);

    let tickCount = 30;
    let tickArray = [];
    for (let i = 0; i <= tickCount; i++) {
      tickArray.push(feature.valueMin + (feature.valueMax - feature.valueMin) * i / tickCount);
    }

    tickGroup.selectAll('g.tick')
      .data(tickArray)
      .join('g')
      .attr('class', 'tick')
      .attr('transform', d => `translate(${tickXScale(d)}, 0)`)
      .append('line')
      .attr('y2', tickHeights.default);

    // Initialize the style
    syncTicks();

    // Add annotations to the user value
    tickGroup.append('g')
      .attr('class', 'user-mark')
      .attr('transform', `translate(${tickXScale(feature.originalValue)}, 0)`)
      .append('line')
      .attr('y2', tickHeights.user);

    // Add annotations to the original value
    tickGroup.append('g')
      .attr('class', 'original-mark')
      .attr('transform', `translate(${tickXScale(feature.originalValue)}, 0)`)
      .append('line')
      .attr('y2', tickHeights.original);

  };

  /**
   * Move the target tick to the specified value.
   * @param name Name of the tick ('user' or 'coach')
   * @param value Value of the tick
   */
  const moveTick = (name, value) => {
    if (name !== 'user' && name !== 'coach') {
      console.warn('Unknown tick name in moveTick()');
      return;
    }

    if (tickSVG === null) {
      return;
    }

    let tickGroup = tickSVG.select('.tick-group');

    tickGroup.selectAll(`g.${name}-mark`)
      .data([1])
      .join('g')
      .attr('class', `${name}-mark`)
      .attr('transform', `translate(${tickXScale(value)}, 0)`)
      .append('line')
      .attr('y2', tickHeights[name]);
  };

  /**
   * Init the states of different elements. Some functions require bbox,
   * which is only accurate after content is loaded
   */
  const windowContentLoadedHandler = () => {
    // Init the slider
    initSlider();

    // Draw ticks in the svg below the slider
    initTicks();

    // TEMP: add the coach mark
    moveTick('coach', feature.coachValue);
  };

  onMount(() => {
    // Bind the SVG icons on mount
    bindInlineSVG(component);

    d3.select(window)
      .on('load', windowContentLoadedHandler);

  });

</script>

<style lang="scss">
  @import '../define';
  @use 'sass:math';

  $range-thumb-width: 8px;
  $base-circle-radius: 5px;

  .feature-card {
    display: flex;
    flex-direction: column;
    height: 200px;
    width: 300px;
    border-radius: 10px;
    padding: 8px 16px;
    box-shadow: $shadow-border-light;
    background: white;
    position: relative;
  }

  .feature-header {
    width: 100%;
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
      color: $gray-800;
      :global(svg) {
        width: 10px;
        height: 5px;
      }
    }
  }

  .svg-icon {
    color: $gray-800;
    fill: $gray-800;
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
    position: relative;
    width: 100%;
    display: flex;
    flex-direction: column;

    .track {
      width: calc(100% - #{2 * $range-thumb-width});
      background-color: $gray-200;
      position: absolute;
      left: $range-thumb-width;
      height: 4px;

      .range-track {
        position: absolute;
        height: 4px;
        background-color: $orange-100;
      }
    }

    .svg-icon.thumb {
      position: absolute;
      padding: 0;
      margin: 0px;
      top: -4px;

      color: $orange-300;
      fill: $orange-300;
      cursor: grab;

      :global(svg) {
        width: 8px;
      }

      &::before {
        content: '';
        display: inline-block;
        position: absolute;
        z-index: 1;
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
        transform: scale(0.1);
        transition: transform 300ms ease-in-out;
      }
    }

    .svg-icon.thumb:hover {
      &::before {
        transform: scale(5);
      }
    }

    .svg-icon.thumb:focus {
      cursor: grabbing;
      outline: none;

      &::before {
        transform: scale(7);
      }
    }

    .svg-icon.icon-range-thumb-middle {
      fill: $gray-400;
      color: $gray-400;
      stroke: $gray-100;
      stroke-width: 15;

      :global(svg) {
        width: 1.2em;
        height: 1.2em;
      }
    }

    :global(.svg-icon.icon-range-thumb-middle.user) {
      fill: $blue-400;
      color: $blue-400;
      stroke: $blue-100;
    }

    :global(.svg-icon.icon-range-thumb-middle.coach) {
      fill: $orange-400;
      color: $orange-400;
      stroke: $orange-100;
    }
  }

  .feature-ticks {
    // border: 1px solid $gray-200;
    margin: 0 0 10px 0;
    height: 40px;
    box-sizing: border-box;
  }

  .svg-ticks {
    :global(.tick line) {
      stroke: $orange-100;
      transform: scaleY(1.8);
      transition: transform 300ms ease-in-out;
    }

    :global(.tick.out-range line) {
      stroke: $gray-200;
      transform: scaleY(1);
    }

    :global(.original-mark line) {
      stroke-width: 2;
      stroke: $gray-600;
    }

    :global(.user-mark line) {
      stroke-width: 2;
      stroke: $blue-500;
    }

    :global(.coach-mark line) {
      stroke-width: 2;
      stroke: $orange-500;
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
        {feature.originalValue}
      </span>

      <div class='feature-arrow'>
        <span class='value-change'>
          {`${(feature.curValue - feature.originalValue) < 0 ? '' : '+'}${feature.curValue - feature.originalValue}`}
        </span>

        <div class='arrow-right'></div>
      </div>

      <span class='value-new'>
        {feature.curValue}
      </span>
    </div>

  </div>

  <div class='feature-hist'>

  </div>

  <div class='feature-slider'>

    <div class='track'>
      <div class='range-track'></div>

      <div id='slider-left-thumb'
        tabindex='-1'
        class='svg-icon icon-range-thumb-left thumb'>
      </div>

      <div id='slider-right-thumb'
        tabindex='-1'
        class='svg-icon icon-range-thumb-right thumb'>
      </div>

      <div id='slider-middle-thumb'
        tabindex='-1'
        class='svg-icon icon-range-thumb-middle thumb'>
      </div>

    </div>

  </div>

  <div class='feature-ticks'>
    <svg class='svg-ticks'></svg>
  </div>

  <div class='temp' style='margin-top: 0px; font-size: 0.5em;'>
    {feature.curMin} {feature.curMax}
  </div>

</div>
