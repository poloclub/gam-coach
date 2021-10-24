import d3 from '../utils/d3-import';
import { config } from '../config';

let colors = config.colors;

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

  syncRangeTrack(component, state);
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
    syncRangeTrack(component, state);
    break;

  case 'slider-right-thumb':
    state.feature.curMax = value;
    syncTicks(state);
    syncRangeTrack(component, state);
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

    // Move the user tick mark on the density plot
    if (state.histSVG !== null) {
      state.densityUserMark.attr(
        'transform', `translate(${state.tickXScale(value)}, 0)`
      );
    }

    break;

  default:
    console.warn('Unknown thumb type in moveThumb()');
    break;
  }

  syncTooltips(component, state);
  thumb.style('left', `${xPos}px`);
  state.stateUpdated();
};

/**
 * Sync up ticks with the current min & max range
 */
const syncTicks = (state) => {
  if (state.histSVG === null) {
    return;
  }

  state.histSVG.select('g.tick-top-group')
    .selectAll('g.tick')
    .filter(d => d >= state.feature.curMin && d <= state.feature.curMax)
    .classed('out-range', false);

  state.histSVG.select('g.tick-top-group')
    .selectAll('g.tick')
    .filter(d => d < state.feature.curMin || d > state.feature.curMax)
    .classed('out-range', true);

  if (state.feature.curMax === state.feature.curMin) {
    state.histSVG.select('g.tick-top-group')
      .selectAll('g.tick')
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
const syncRangeTrack = (component, state) => {
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

  // Move the clip in the density plot
  if (state.densityClip !== null) {
    state.densityClip
      .attr('x', state.tickXScale(state.feature.curMin))
      .attr('width', state.tickXScale(state.feature.curMax) - state.tickXScale(state.feature.curMin));
  }
};

/**
 * Initialize the density plot.
 */
export const initHist = (component, state) => {
  console.log(state.feature);

  // Use the parent size to initialize the SVG size
  let parentDiv = d3.select(component)
    .select('.feature-hist');
  let parentBBox = parentDiv.node().getBoundingClientRect();

  const width = parentBBox.width;
  const histHeight = 80;
  const tickHeight = 30;
  const vGap = 15;
  const height = histHeight + tickHeight + vGap;

  state.histSVG = d3.select(component)
    .select('.svg-hist')
    .attr('width', width)
    .attr('height', height);

  // Offset the range thumb to align with the track
  const thumbWidth = d3.select(component)
    .select('#slider-left-thumb')
    .node()
    .offsetWidth;

  const padding = {
    top: 25,
    left: thumbWidth,
    right: thumbWidth,
    bottom: 0
  };

  const totalWidth = width - padding.left - padding.right;

  // Draw a bounding box for this density plot
  state.histSVG.append('g')
    .attr('class', 'border')
    .attr('transform', `translate(${0}, ${0})`)
    .append('rect')
    .attr('width', totalWidth + 2 * thumbWidth)
    .attr('height', histHeight)
    .style('fill', 'none')
    .style('stroke', colors['gray-200']);

  // Add density plot
  let histGroup = state.histSVG.append('g')
    .attr('class', 'hist-group')
    .attr('transform', `translate(${thumbWidth}, ${padding.top})`);

  let tickGroup = state.histSVG.append('g')
    .attr('class', 'tick-group')
    .attr('transform', `translate(${thumbWidth}, ${histHeight + vGap})`);

  // The top layer to show vertical marks
  let markGroup = state.histSVG.append('g')
    .attr('class', 'mark-group')
    .attr('transform', `translate(${thumbWidth}, ${padding.top})`);

  // Compute the frequency
  const totalSampleNum = state.feature.histCount.reduce((a, b) => a + b);
  let curDensity = state.feature.histCount.map((d, i) => [state.feature.histEdge[i], d / totalSampleNum]);
  curDensity.unshift([state.feature.histEdge[0], 0]);
  curDensity.push([state.feature.histEdge[state.feature.histEdge.length - 1], 0]);

  // Create the axis scales
  state.tickXScale = d3.scaleLinear()
    .domain([state.feature.valueMin, state.feature.valueMax])
    .range([0, totalWidth]);

  let yScale = d3.scaleLinear()
    .domain([0, d3.max(curDensity, d => d[1])])
    .range([histHeight - padding.bottom - padding.top, 0]);

  let curve = d3.line()
    .curve(d3.curveMonotoneX)
    .x(d => state.tickXScale(d[0]))
    .y(d => yScale(d[1]));

  // Draw the area curve
  let underArea = histGroup.append('path')
    .attr('class', 'area-path')
    .datum(curDensity)
    .attr('d', curve);

  let upperArea = underArea.clone(true)
    .classed('selected', true);

  // Create a clip path
  state.densityClip = histGroup.append('clipPath')
    .attr('id', `${state.feature.id}-area-clip`)
    .append('rect')
    .attr('x', state.tickXScale(state.feature.curMin))
    .attr('width', state.tickXScale(state.feature.curMax) - state.tickXScale(state.feature.curMin))
    .attr('height', histHeight);

  upperArea.attr('clip-path', `url(#${state.feature.id}-area-clip)`);

  // Add vertical marks on the plot
  state.densityOriginalMark = markGroup.append('g')
    .attr('class', 'mark density-original-mark')
    .attr('transform',
      `translate(${state.tickXScale(state.feature.originalValue)}, ${0})`
    );

  state.densityOriginalMark.append('line')
    .attr('y2', histHeight - padding.top + vGap + state.tickHeights.original)
    .clone(true)
    .style('stroke-width', 3)
    .style('stroke', 'white')
    .style('stroke-dasharray', '0')
    .lower();

  state.densityUserMark = markGroup.append('g')
    .attr('class', 'mark density-user-mark')
    .attr('transform',
      `translate(${state.tickXScale(state.feature.curValue)}, ${0})`
    );

  state.densityUserMark.append('line')
    .attr('y2', histHeight - padding.top + vGap + state.tickHeights.original)
    .clone(true)
    .style('stroke-width', 3)
    .style('stroke', 'white')
    .style('stroke-dasharray', '0')
    .lower();

  state.densityCoachMark = markGroup.append('g')
    .attr('class', 'mark density-coach-mark')
    .attr('transform',
      `translate(${state.tickXScale(state.feature.coachValue)}, ${0})`
    );

  state.densityCoachMark.append('line')
    .attr('y2', histHeight - padding.top + vGap + state.tickHeights.original)
    .clone(true)
    .style('stroke-width', 3)
    .style('stroke', 'white')
    .style('stroke-dasharray', '0')
    .lower();

  // Initialize the ticks below the slider
  let tickBackGroup = tickGroup.append('g')
    .attr('class', 'tick-back-group');

  let tickTopGroup = tickGroup.append('g')
    .attr('class', 'tick-top-group');

  let tickCount = 30;
  let tickArray = [];
  for (let i = 0; i <= tickCount; i++) {
    tickArray.push(state.feature.valueMin + (state.feature.valueMax - state.feature.valueMin) * i / tickCount);
  }

  tickTopGroup.selectAll('g.tick')
    .data(tickArray)
    .join('g')
    .attr('class', 'tick')
    .attr('transform', d => `translate(${state.tickXScale(d)}, 0)`)
    .append('line')
    .attr('y2', state.tickHeights.default);

  // Initialize the style
  syncTicks(state);

  // Add labels for the min and max value
  tickBackGroup.append('text')
    .attr('class', 'label-min-value')
    .attr('x', -4)
    .attr('y', state.tickHeights.default * 2.2)
    .style('text-anchor', 'start')
    .style('dominant-baseline', 'hanging')
    .style('font-size', '0.9em')
    .style('fill', colors['gray-400'])
    .text(d3.format('.2~f')(state.feature.valueMin));

  tickBackGroup.append('text')
    .attr('class', 'label-max-value')
    .attr('x', totalWidth + 4)
    .attr('y', state.tickHeights.default * 2.2)
    .style('text-anchor', 'end')
    .style('dominant-baseline', 'hanging')
    .style('font-size', '0.9em')
    .style('fill', colors['gray-400'])
    .text(d3.format('.2~f')(state.feature.valueMax));
};
