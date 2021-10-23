<script>
  import d3 from '../utils/d3-import';
  import { onMount } from 'svelte';
  import { tooltipConfigStore } from '../store';

  import rightArrowIcon from '../img/icon-right-arrow.svg';
  import rangeThumbLeftIcon from '../img/icon-range-thumb-left.svg';
  import rangeThumbRightIcon from '../img/icon-range-thumb-right.svg';
  import rangeThumbMiddleIcon from '../img/icon-range-thumb-middle.svg';

  export let featureInfo = null;
  export let requiresInt = false;
  export let originalValue = null;

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
  let windowLoaded = false;

  let feature = {
    name: '',
    featureName: '',
    valueMin: 0,
    valueMax: 0,
    requiresInt: false,
    originalValue: 0,
    curValue: 0,
    coachValue: 0,
    curMin: 0,
    curMax: 0,
  };

  let tooltipConfig = null;
  tooltipConfigStore.subscribe(value => {
    tooltipConfig = value;
  });

  const preProcessSVG = (svgString) => {
    return svgString.replaceAll('black', 'currentcolor')
      .replaceAll('fill:none', 'fill:currentcolor')
      .replaceAll('stroke:none', 'fill:currentcolor');
  };

  /**
   * Dynamically bind SVG files as inline SVG strings in this component
   */
  export const bindInlineSVG = (component) => {
    const iconList = [
      { class: 'icon-right-arrow', svg: rightArrowIcon },
      { class: 'icon-range-thumb-left', svg: rangeThumbLeftIcon },
      { class: 'icon-range-thumb-right', svg: rangeThumbRightIcon },
      { class: 'icon-range-thumb-middle', svg: rangeThumbMiddleIcon },
    ];

    iconList.forEach(d => {
      d3.select(component)
        .selectAll(`.svg-icon.${d.class}`)
        .each((_, i, g) => {
          let ele = d3.select(g[i]);
          let html = ele.html();
          html = html.concat(' ', preProcessSVG(d.svg));
          ele.html(html);
        });
    });
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

    syncTooltips();
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

  const syncTooltips = () => {
    d3.select(component)
      .select('#slider-left-thumb')
      .select('.thumb-label span')
      .text(feature.curMin);

    d3.select(component)
      .select('#slider-right-thumb')
      .select('.thumb-label span')
      .text(feature.curMax);

    d3.select(component)
      .select('#slider-middle-thumb')
      .select('.thumb-label span')
      .text(feature.curValue);
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
  const initFeatureCard = () => {
    // Initialize the feature data from the prop
    feature = {
      // TODO: Export a feature description name in the model extract function from
      // python
      name: 'FICO Score',
      featureName: featureInfo.name,
      valueMin: featureInfo.binEdge[0],
      valueMax: featureInfo.binEdge[featureInfo.binEdge.length - 1],
      requiresInt: requiresInt,
      originalValue: originalValue,
      curValue: originalValue,
      coachValue: 755,
      curMin: featureInfo.binEdge[0],
      curMax: featureInfo.binEdge[featureInfo.binEdge.length - 1],
    };

    if (requiresInt) {
      feature.valueMin = Math.floor(feature.valueMin);
      feature.curMin = Math.floor(feature.curMin);
      feature.valueMax = Math.ceil(feature.valueMax);
      feature.curMax = Math.ceil(feature.curMax);
    }

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
      .on('load', () => {windowLoaded = true;});
  });

  $: featureInfo && windowLoaded && initFeatureCard();

</script>

<style lang="scss">
  @import './FeatureCard.scss';
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
        <div class='thumb-label thumb-label-left'>
          <span class='thumb-label-span'>{feature.curMin}</span>
        </div>
      </div>

      <div id='slider-right-thumb'
        tabindex='-1'
        class='svg-icon icon-range-thumb-right thumb'>
        <div class='thumb-label thumb-label-right'>
          <span class='thumb-label-span'>{feature.curMax}</span>
        </div>
      </div>

      <div id='slider-middle-thumb'
        tabindex='-1'
        class='svg-icon icon-range-thumb-middle thumb'>
        <div class='thumb-label thumb-label-middle'>
          <span class='thumb-label-span'>{feature.curValue}</span>
        </div>
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
