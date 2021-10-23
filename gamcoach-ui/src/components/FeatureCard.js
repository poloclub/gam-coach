import d3 from '../utils/d3-import';

/**
 * Handling the mousedown event for thumbs on the slider.
 * @param e Event
 */
const mouseDownHandler = (e, component, state) => {
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
    if (state.feature.requiresInt) {
      newValue = state.feature.valueMin + parseInt((state.feature.valueMax - state.feature.valueMin) * deltaX / trackWidth);
    } else {
      newValue = state.feature.valueMin + parseFloat((state.feature.valueMax - state.feature.valueMin) * deltaX / trackWidth);
    }

    // console.log(newValue);
    moveThumb(component, state, thumb.id, newValue);
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
export const initSlider = (component, state) => {
  const leftThumbID = 'slider-left-thumb';
  const rightThumbID = 'slider-right-thumb';
  const middleThumbID = 'slider-middle-thumb';

  // Move two range thumbs to the left and right ends
  moveThumb(component, state, leftThumbID, state.feature.valueMin);
  moveThumb(component, state, rightThumbID, state.feature.valueMax);

  // Register event listeners
  d3.select(component)
    .select(`#${leftThumbID}`)
    .on('mousedown', e => mouseDownHandler(e, component, state));

  d3.select(component)
    .select(`#${rightThumbID}`)
    .on('mousedown', e => mouseDownHandler(e, component, state));

  // Move the curValue thumb to the original value
  moveThumb(component, state, middleThumbID, state.feature.originalValue);

  d3.select(component)
    .select(`#${middleThumbID}`)
    .on('mousedown', e => mouseDownHandler(e, component, state));

  syncRangeTrack(component);
};

/**
 * Move the specified thumb to the given value on the slider.
 * @param{string} thumbID The ID of the thumb element.
 * @param{number} value The target value to move the thumb to.
 */
export const moveThumb = (component, state, thumbID, value) => {
  // Make sure we are only moving within the range of the state.feature value
  if (value > state.feature.valueMax) {
    value = state.feature.valueMax;
  }

  if (value < state.feature.valueMin) {
    value = state.feature.valueMin;
  }

  // Special rules based on the thumb type
  switch (thumbID) {
  case 'slider-left-thumb':
    if (value > state.feature.curMax) {
      value = state.feature.curMax;
    }
    break;

  case 'slider-right-thumb':
    if (value < state.feature.curMin) {
      value = state.feature.curMin;
    }
    break;

  case 'slider-middle-thumb':
    // if (value > state.feature.curMax) {
    //   value = state.feature.curMax;
    // }
    // if (value < state.feature.curMin) {
    //   value = state.feature.curMin;
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

  let xPos = (value - state.feature.valueMin) / (state.feature.valueMax - state.feature.valueMin)
    * trackBBox.width;

  // Need to offset the xPos based on the thumb type
  // Also register different values based on the thumb type
  switch (thumbID) {
  case 'slider-left-thumb':
    xPos -= thumbBBox.width;
    state.feature.curMin = value;
    syncTicks(state);
    syncRangeTrack(component);
    break;

  case 'slider-right-thumb':
    state.feature.curMax = value;
    syncTicks(state);
    syncRangeTrack(component);
    break;

  case 'slider-middle-thumb':
    xPos -= thumbBBox.width / 2;
    state.feature.curValue = value;

    // Update the color for middle thumb
    if (state.feature.curValue === state.feature.originalValue) {
      thumb.classed('user', false);
      thumb.classed('coach', false);
    } else if (state.feature.curValue === state.feature.coachValue) {
      thumb.classed('user', false);
      thumb.classed('coach', true);
    } else {
      thumb.classed('user', true);
      thumb.classed('coach', false);
    }

    // Move the user tick mark
    if (state.tickSVG !== null) {
      state.tickSVG.select('.user-mark')
        .attr('transform', `translate(${state.tickXScale(value)}, 0)`);
    }

    break;

  default:
    console.warn('Unknown thumb type in moveThumb()');
    break;
  }

  syncTooltips(component, state);
  thumb.style('left', `${xPos}px`);
};

/**
 * Sync up ticks with the current min & max range
 */
const syncTicks = (state) => {
  if (state.tickSVG === null) {
    return;
  }

  state.tickSVG.select('g.tick-group')
    .selectAll('g.tick')
    .filter(d => d >= state.feature.curMin && d <= state.feature.curMax)
    // .classed('in-range', true)
    .classed('out-range', false);

  state.tickSVG.select('g.tick-group')
    .selectAll('g.tick')
    .filter(d => d < state.feature.curMin || d > state.feature.curMax)
    // .classed('in-range', false)
    .classed('out-range', true);

  if (state.feature.curMax === state.feature.curMin) {
    state.tickSVG.select('g.tick-group')
      .selectAll('g.tick')
      // .classed('in-range', false)
      .classed('out-range', true);
  }
};

const syncTooltips = (component, state) => {
  d3.select(component)
    .select('#slider-left-thumb')
    .select('.thumb-label span')
    .text(state.feature.curMin);

  d3.select(component)
    .select('#slider-right-thumb')
    .select('.thumb-label span')
    .text(state.feature.curMax);

  d3.select(component)
    .select('#slider-middle-thumb')
    .select('.thumb-label span')
    .text(state.feature.curValue);
};

/**
 * Sync the background range track with teh current min & max range
 */
const syncRangeTrack = (component) => {
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
export const initTicks = (component, state) => {

  // Use the parent size to initialize the SVG size
  let parentDiv = d3.select(component)
    .select('.feature-ticks');
  let parentBBox = parentDiv.node().getBoundingClientRect();

  const width = parentBBox.width;
  const height = parentBBox.height;

  state.tickSVG = d3.select(component)
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

  let tickGroup = state.tickSVG.append('g')
    .attr('class', 'tick-group')
    .attr('transform', `translate(${thumbWidth}, ${padding.top})`);

  state.tickXScale = d3.scaleLinear()
    .domain([state.feature.valueMin, state.feature.valueMax])
    .range([0, tickTotalWidth]);

  let tickCount = 30;
  let tickArray = [];
  for (let i = 0; i <= tickCount; i++) {
    tickArray.push(state.feature.valueMin + (state.feature.valueMax - state.feature.valueMin) * i / tickCount);
  }

  tickGroup.selectAll('g.tick')
    .data(tickArray)
    .join('g')
    .attr('class', 'tick')
    .attr('transform', d => `translate(${state.tickXScale(d)}, 0)`)
    .append('line')
    .attr('y2', state.tickHeights.default);

  // Initialize the style
  syncTicks(state);

  // Add annotations to the user value
  tickGroup.append('g')
    .attr('class', 'user-mark')
    .attr('transform', `translate(${state.tickXScale(state.feature.originalValue)}, 0)`)
    .append('line')
    .attr('y2', state.tickHeights.user);

  // Add annotations to the original value
  tickGroup.append('g')
    .attr('class', 'original-mark')
    .attr('transform', `translate(${state.tickXScale(state.feature.originalValue)}, 0)`)
    .append('line')
    .attr('y2', state.tickHeights.original);

};

/**
 * Move the target tick to the specified value.
 * @param name Name of the tick ('user' or 'coach')
 * @param value Value of the tick
 */
export const moveTick = (state, name, value) => {
  if (name !== 'user' && name !== 'coach') {
    console.warn('Unknown tick name in moveTick()');
    return;
  }

  if (state.tickSVG === null) {
    return;
  }

  let tickGroup = state.tickSVG.select('.tick-group');

  tickGroup.selectAll(`g.${name}-mark`)
    .data([1])
    .join('g')
    .attr('class', `${name}-mark`)
    .attr('transform', `translate(${state.tickXScale(value)}, 0)`)
    .append('line')
    .attr('y2', state.tickHeights[name]);
};