import d3 from '../../utils/d3-import';
import { Logger } from '../../utils/logger';
import { round } from '../../utils/utils';
import { config } from '../../config/config';

const colors = config.colors;
const formatter = d3.format(',.2~f');

/**
 * Helper function to show the annotation.
 */
const showAnnotation = (component, state, type) => {
  if (state.showingAnnotation !== null) {
    return;
  }

  // Log the interaction
  /** @type {Logger} */
  const logger = state.logger;
  logger?.addLog({
    eventName: `[${state.feature.featureName}] annotation shown`,
    elementName: `annotation ${type}`
  });

  d3.select(component).selectAll('.annotation-name').classed('show', false);

  d3.select(component).selectAll(`.annotation-${type}`).classed('show', true);

  state.showingAnnotation = type;
};

/**
 * Helper function to hide the annotation.
 */
const hideAnnotation = (component, state, type) => {
  if (state.showingAnnotation !== type) {
    return;
  }

  d3.select(component).selectAll('.annotation-name').classed('show', true);

  d3.select(component).selectAll(`.annotation-${type}`).classed('show', false);

  state.showingAnnotation = null;
};

/**
 * Handling the mousedown event for thumbs on the slider.
 * @param e Event
 */
const mouseDownHandler = (e, component, state) => {
  e.preventDefault();
  e.stopPropagation();

  const thumb = e.target;
  if (!thumb.id.includes('thumb')) {
    return;
  }

  const track = thumb.parentNode;
  const trackWidth = track.getBoundingClientRect().width;
  thumb.focus();

  // Logging the value change
  let eventName = `[${state.feature.featureName}] range changed`;
  let valueName = 'range';
  let oldValueValue = state.featurePtr.acceptableRange;

  if (thumb.id.includes('middle')) {
    eventName = `[${state.feature.featureName}] value changed`;
    valueName = 'curValue';
    oldValueValue = state.feature.curValue;
  }

  let localHideAnnotation = () => {};
  if (thumb.id.includes('middle')) {
    showAnnotation(component, state, 'user');
    localHideAnnotation = () => hideAnnotation(component, state, 'user');
  } else {
    showAnnotation(component, state, 'range');
    localHideAnnotation = () => hideAnnotation(component, state, 'range');
  }

  const mouseMoveHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const deltaX = e.pageX - track.getBoundingClientRect().x;
    let newValue;

    // Handle integer value if it is required
    if (state.feature.requiresInt && state.feature.transform === null) {
      newValue =
        state.feature.valueMin +
        round(
          ((state.feature.valueMax - state.feature.valueMin) * deltaX) /
            trackWidth,
          0
        );
    } else {
      newValue =
        state.feature.valueMin +
        ((state.feature.valueMax - state.feature.valueMin) * deltaX) /
          trackWidth;
    }

    moveThumb(component, state, thumb.id, newValue);
  };

  const mouseUpHandler = () => {
    document.removeEventListener('mousemove', mouseMoveHandler);
    document.removeEventListener('mouseup', mouseUpHandler);
    document.body.style.cursor = 'default';
    thumb.blur();
    localHideAnnotation();

    // Log the interaction
    let newValueValue = state.featurePtr.acceptableRange;
    if (thumb.id.includes('middle')) {
      newValueValue = state.feature.curValue;
    }

    /** @type {Logger} */
    const logger = state.logger;
    logger?.addLog({
      eventName,
      elementName: 'slider',
      valueName,
      oldValue: oldValueValue,
      newValue: newValueValue
    });
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
  moveThumb(component, state, leftThumbID, state.feature.curMin);
  moveThumb(component, state, rightThumbID, state.feature.curMax);

  // Register event listeners
  d3.select(component)
    .select(`#${leftThumbID}`)
    .on('mousedown', (e) => mouseDownHandler(e, component, state));

  d3.select(component)
    .select(`#${rightThumbID}`)
    .on('mousedown', (e) => mouseDownHandler(e, component, state));

  // Move the curValue thumb to the coach value
  moveThumb(component, state, middleThumbID, state.feature.coachValue);

  d3.select(component)
    .select(`#${middleThumbID}`)
    .on('mousedown', (e) => mouseDownHandler(e, component, state));

  syncRangeTrack(component, state);
};

const updateRangeAnnotation = (component, state) => {
  if (state.histSVG === null) {
    return;
  }

  const rangeTrackBBox = d3
    .select(component)
    .select('.range-track')
    .node()
    //@ts-ignore
    .getBoundingClientRect();

  let labelLeft =
    rangeTrackBBox.x + rangeTrackBBox.width / 2 - state.annotationRangeXOffset;

  // Handle out of bounds
  if (labelLeft < 0) {
    state.annotationRange.classed('no-triangle', true);
    labelLeft = 0;
  } else {
    if (labelLeft > state.annotationRangeXBound) {
      state.annotationRange.classed('no-triangle', true);
      labelLeft = state.annotationRangeXBound;
    } else {
      state.annotationRange.classed('no-triangle', false);
    }
  }

  state.annotationRange.style('left', `${labelLeft}px`);
};

/**
 * Move the specified thumb to the given value on the slider.
 * @param{string} thumbID The ID of the thumb element.
 * @param{number} value The target value to move the thumb to.
 */
export const moveThumb = (component, state, thumbID, value) => {
  let stateChangeKey = null;

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
  const thumb = d3
    .select(component)
    .select(`#${thumbID}`)
    .attr('data-curValue', value);

  // Compute the position to move the thumb to
  //@ts-ignore
  const thumbBBox = thumb.node().getBoundingClientRect();
  //@ts-ignore
  const trackBBox = thumb.node().parentNode.getBoundingClientRect();

  let xPos =
    ((value - state.feature.valueMin) /
      (state.feature.valueMax - state.feature.valueMin)) *
    trackBBox.width;

  // Need to offset the xPos based on the thumb type
  // Also register different values based on the thumb type
  switch (thumbID) {
    case 'slider-left-thumb':
      xPos -= thumbBBox.width;
      state.feature.curMin = value;
      syncTicks(state);
      syncRangeTrack(component, state);
      updateRangeAnnotation(component, state);
      syncFeature(state);
      break;

    case 'slider-right-thumb':
      state.feature.curMax = value;
      syncTicks(state);
      syncRangeTrack(component, state);
      updateRangeAnnotation(component, state);
      syncFeature(state);
      break;

    case 'slider-middle-thumb':
      xPos -= thumbBBox.width / 2;
      state.feature.curValue = value;
      stateChangeKey = 'value';

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
          'transform',
          `translate(${state.tickXScale(value)}, 0)`
        );

        // Update annotation position
        let labelLeft =
          state.densityUserMark.select('line').node().getBoundingClientRect()
            .x - state.annotationUserXOffset;

        // Handle out of bounds
        if (labelLeft < 0) {
          state.annotationUser.classed('no-triangle', true);
          labelLeft = 0;
        } else {
          if (labelLeft > state.annotationUserXBound) {
            state.annotationUser.classed('no-triangle', true);
            labelLeft = state.annotationUserXBound;
          } else {
            state.annotationUser.classed('no-triangle', false);
          }
        }

        state.annotationUser.style('left', `${labelLeft}px`);
      }

      break;

    default:
      console.warn('Unknown thumb type in moveThumb()');
      break;
  }

  syncTooltips(component, state);
  thumb.style('left', `${xPos}px`);
  state.stateUpdated(stateChangeKey);
};

/**
 * Sync up ticks with the current min & max range
 */
const syncTicks = (state) => {
  if (state.histSVG === null) {
    return;
  }

  state.histSVG
    .select('g.tick-top-group')
    .selectAll('g.tick')
    .filter((d) => d >= state.feature.curMin && d <= state.feature.curMax)
    .classed('out-range', false);

  state.histSVG
    .select('g.tick-top-group')
    .selectAll('g.tick')
    .filter((d) => d < state.feature.curMin || d > state.feature.curMax)
    .classed('out-range', true);

  if (state.feature.curMax === state.feature.curMin) {
    state.histSVG
      .select('g.tick-top-group')
      .selectAll('g.tick')
      .classed('out-range', true);
  }
};

const syncTooltips = (component, state) => {
  d3.select(component)
    .select('#slider-left-thumb')
    .select('.thumb-label span')
    .text(formatter(state.feature.transformFunc(state.feature.curMin)));

  d3.select(component)
    .select('#slider-right-thumb')
    .select('.thumb-label span')
    .text(formatter(state.feature.transformFunc(state.feature.curMax)));

  d3.select(component)
    .select('#slider-middle-thumb')
    .select('.thumb-label span')
    .text(formatter(state.feature.transformFunc(state.feature.curValue)));
};

/**
 * Sync the background range track with teh current min & max range
 */
export const syncRangeTrack = (component, state) => {
  const leftThumb = d3.select(component).select('#slider-left-thumb');

  const rightThumb = d3.select(component).select('#slider-right-thumb');

  //@ts-ignore
  const thumbWidth = leftThumb.node().getBoundingClientRect().width;
  const leftThumbLeft = parseFloat(leftThumb.style('left'));
  const rightThumbLeft = parseFloat(rightThumb.style('left'));
  const rangeWidth = rightThumbLeft - leftThumbLeft;

  d3.select(component)
    .select('.track .range-track')
    .style('left', `${leftThumbLeft + thumbWidth}px`)
    .style('width', `${rangeWidth}px`);

  // Move the clip in the density plot
  if (state.densityClip !== null) {
    state.densityClip
      .attr('x', state.tickXScale(state.feature.curMin))
      .attr(
        'width',
        state.tickXScale(state.feature.curMax) -
          state.tickXScale(state.feature.curMin)
      );
  }
};

const syncFeature = (state) => {
  // Update the feature for range selections
  // Feature's `acceptableRange` is null if all are selected
  if (
    state.feature.curMin !== state.feature.valueMin ||
    state.feature.curMax !== state.feature.valueMax
  ) {
    state.featurePtr.acceptableRange = [
      state.feature.curMin,
      state.feature.curMax
    ];
  } else {
    state.featurePtr.acceptableRange = null;
  }

  if (
    state.featurePtr.difficulty === 'neutral' &&
    state.featurePtr.acceptableRange === null
  ) {
    state.featurePtr.isConstrained = false;
  } else {
    state.featurePtr.isConstrained = true;
  }

  state.featureUpdated('constraint');
};

export const initHistSize = (component, state) => {
  const histHeight = 90;
  const tickHeight = 30;
  const vGap = 15;
  const height = histHeight + tickHeight + vGap;

  state.histSVG = d3
    .select(component)
    .select('.svg-hist')
    .attr('width', 0)
    .attr('height', height);
};

/**
 * Initialize the density plot.
 */
export const initHist = (component, state) => {
  // console.log(state.feature);

  // Use the parent size to initialize the SVG size
  const parentDiv = d3.select(component).select('.feature-hist');
  //@ts-ignore
  const parentBBox = parentDiv.node().getBoundingClientRect();

  const width = parentBBox.width;
  const histHeight = 90;
  const tickHeight = 30;
  const vGap = 15;
  const height = histHeight + tickHeight + vGap;

  state.histSVG = d3
    .select(component)
    .select('.svg-hist')
    .attr('width', width)
    .attr('height', height);

  // Offset the range thumb to align with the track
  const thumbWidth =
    //@ts-ignore
    d3.select(component).select('#slider-left-thumb').node().offsetWidth;

  const padding = {
    top: 35,
    left: thumbWidth,
    right: thumbWidth,
    bottom: 0,
    histTop: 2
  };

  const totalWidth = width - padding.left - padding.right;

  // Draw a bounding box for this density plot
  state.histSVG
    .append('g')
    .attr('class', 'border')
    .attr('transform', `translate(${0}, ${padding.top})`)
    .append('rect')
    .attr('width', totalWidth + 2 * thumbWidth)
    .attr('height', histHeight - padding.top)
    .style('fill', 'none')
    .style('stroke', colors['gray-200']);

  // Add density plot
  const histGroup = state.histSVG
    .append('g')
    .attr('class', 'hist-group')
    .attr('transform', `translate(${thumbWidth}, ${padding.top})`);

  const tickGroup = state.histSVG
    .append('g')
    .attr('class', 'tick-group')
    .attr('transform', `translate(${thumbWidth}, ${histHeight + vGap})`);

  // The top layer to show vertical marks
  const markGroup = state.histSVG
    .append('g')
    .attr('class', 'mark-group')
    .attr('transform', `translate(${thumbWidth}, ${padding.top})`);

  // Compute the frequency
  const totalSampleNum = state.feature.histCount.reduce((a, b) => a + b);
  const curDensity = state.feature.histCount.map((d, i) => [
    state.feature.histEdge[i],
    d / totalSampleNum
  ]);
  curDensity.unshift([state.feature.histEdge[0], 0]);
  curDensity.push([
    state.feature.histEdge[state.feature.histEdge.length - 1],
    0
  ]);

  // Create the axis scales
  state.tickXScale = d3
    .scaleLinear()
    .domain([state.feature.valueMin, state.feature.valueMax])
    .range([0, totalWidth]);

  const yScale = d3
    .scaleLinear()
    //@ts-ignore
    .domain([0, d3.max(curDensity, (d) => d[1])])
    .range([histHeight - padding.bottom - padding.top, padding.histTop]);

  const curve = d3
    .line()
    .curve(d3.curveBasis)
    .x((d) => state.tickXScale(d[0]))
    .y((d) => yScale(d[1]));

  // Draw the area curve
  const underArea = histGroup
    .append('path')
    .attr('class', 'area-path')
    .datum(curDensity)
    .attr('d', curve);

  const upperArea = underArea.clone(true).classed('selected', true);

  // Create a clip path
  state.densityClip = histGroup
    .append('clipPath')
    .attr('id', `${state.feature.id}-area-clip`)
    .append('rect')
    .attr('x', state.tickXScale(state.feature.curMin))
    .attr(
      'width',
      state.tickXScale(state.feature.curMax) -
        state.tickXScale(state.feature.curMin)
    )
    .attr('height', histHeight);

  upperArea.attr('clip-path', `url(#${state.feature.id}-area-clip)`);

  // Add vertical marks on the plot
  // const lineHeight = histHeight - padding.top + vGap +
  //   state.tickHeights.original;
  const lineHeight = histHeight - padding.top;

  // --- User ---
  state.densityUserMark = markGroup
    .append('g')
    .attr('class', 'mark density-user-mark')
    .attr(
      'transform',
      `translate(${state.tickXScale(state.feature.curValue)}, ${0})`
    )
    .on('mouseenter', () => showAnnotation(component, state, 'user'))
    .on('mouseleave', () => hideAnnotation(component, state, 'user'));

  // Add an invisible region to make it easier to hover over
  state.densityUserMark
    .append('rect')
    .attr('class', '.hover-place')
    .attr('x', -2)
    .attr('width', 4)
    .attr('height', lineHeight)
    .style('fill', 'hsla(0, 100%, 100%, 0)')
    .lower();

  // Add the line and a second white line at the background to highlight it
  state.densityUserMark
    .append('line')
    .attr('y2', lineHeight)
    .clone(true)
    .style('stroke-width', 3)
    .style('stroke', 'white')
    .style('stroke-dasharray', '0')
    .lower();

  // --- Coach ---
  state.densityCoachMark = markGroup
    .append('g')
    .attr('class', 'mark density-coach-mark')
    .attr(
      'transform',
      `translate(${state.tickXScale(state.feature.coachValue)}, ${0})`
    )
    .on('mouseenter', () => showAnnotation(component, state, 'coach'))
    .on('mouseleave', () => hideAnnotation(component, state, 'coach'));

  // Add an invisible region to make it easier to hover over
  state.densityCoachMark
    .append('rect')
    .attr('class', '.hover-place')
    .attr('x', -2)
    .attr('width', 4)
    .attr('height', lineHeight)
    .style('fill', 'hsla(0, 100%, 100%, 0)')
    .lower();

  // Add the line and a second white line at the background to highlight it
  state.densityCoachMark
    .append('line')
    .attr('y2', lineHeight)
    .clone(true)
    .style('stroke-width', 3)
    .style('stroke', 'white')
    .style('stroke-dasharray', '0')
    .lower();

  // --- Original ---
  state.densityOriginalMark = markGroup
    .append('g')
    .attr('class', 'mark density-original-mark')
    .attr(
      'transform',
      `translate(${state.tickXScale(state.feature.originalValue)}, ${0})`
    )
    .on('mouseenter', () => showAnnotation(component, state, 'original'))
    .on('mouseleave', () => hideAnnotation(component, state, 'original'));

  // Add an invisible region to make it easier to hover over
  state.densityOriginalMark
    .append('rect')
    .attr('class', '.hover-place')
    .attr('x', -2)
    .attr('width', 4)
    .attr('height', lineHeight)
    .style('fill', 'hsla(0, 100%, 100%, 0)')
    .lower();

  // Add the mark line
  state.densityOriginalMark
    .append('line')
    .attr('y2', lineHeight)
    .clone(true)
    .style('stroke-width', 3)
    .style('stroke', 'white')
    .style('stroke-dasharray', '0')
    .lower();

  // Initialize the ticks below the slider
  const tickBackGroup = tickGroup.append('g').attr('class', 'tick-back-group');

  const tickTopGroup = tickGroup.append('g').attr('class', 'tick-top-group');

  const tickCount = 30;
  const tickArray = [];
  for (let i = 0; i <= tickCount; i++) {
    tickArray.push(
      state.feature.valueMin +
        ((state.feature.valueMax - state.feature.valueMin) * i) / tickCount
    );
  }

  tickTopGroup
    .selectAll('g.tick')
    .data(tickArray)
    .join('g')
    .attr('class', 'tick')
    .attr('transform', (d) => `translate(${state.tickXScale(d)}, 0)`)
    .append('line')
    .attr('y2', state.tickHeights.default);

  // Initialize the style
  syncTicks(state);

  // Add labels for the min and max value
  tickBackGroup
    .append('text')
    .attr('class', 'label-min-value')
    .attr('x', -4)
    .attr('y', state.tickHeights.default * 2.2)
    .style('text-anchor', 'start')
    .style('dominant-baseline', 'hanging')
    .style('font-size', '0.9em')
    .style('fill', colors['gray-500'])
    .text(formatter(state.feature.transformFunc(state.feature.valueMin)));

  tickBackGroup
    .append('text')
    .attr('class', 'label-max-value')
    .attr('x', totalWidth + 4)
    .attr('y', state.tickHeights.default * 2.2)
    .style('text-anchor', 'end')
    .style('dominant-baseline', 'hanging')
    .style('font-size', '0.9em')
    .style('fill', colors['gray-500'])
    .text(formatter(state.feature.transformFunc(state.feature.valueMax)));

  // Initialize the positions for the annotation labels
  const xOffset = d3
    .select(component)
    .select('.feature-hist')
    .node()
    //@ts-ignore
    .getBoundingClientRect().x;

  const xBound = d3
    .select(component)
    .select('.feature-hist')
    .node()
    //@ts-ignore
    .getBoundingClientRect().width;

  // --- Original ---
  state.annotationOriginal = d3
    .select(component)
    .select('.annotation-original');

  let tempClone = state.annotationOriginal
    .clone(true)
    .style('visibility', 'hidden')
    .classed('show', true);
  let labelWidth = tempClone.node().getBoundingClientRect().width;
  tempClone.remove();

  let labelLeft =
    state.densityOriginalMark.select('line').node().getBoundingClientRect().x -
    xOffset -
    labelWidth / 2;

  const handleOutOfBound = (annotation, labelLeft) => {
    if (labelLeft < 0) {
      annotation.classed('no-triangle', true);
      labelLeft = 0;
    } else {
      if (labelLeft > xBound - labelWidth) {
        annotation.classed('no-triangle', true);
        labelLeft = xBound - labelWidth;
      } else {
        annotation.classed('no-triangle', false);
      }
    }

    return labelLeft;
  };

  // Handle out of bounds
  labelLeft = handleOutOfBound(state.annotationOriginal, labelLeft);

  state.annotationOriginal.style('left', `${labelLeft}px`);

  // --- User ---
  state.annotationUser = d3.select(component).select('.annotation-user');

  tempClone = state.annotationUser
    .clone(true)
    .style('visibility', 'hidden')
    .classed('show', true);
  labelWidth = tempClone.node().getBoundingClientRect().width;
  tempClone.remove();

  // Record the offset so we don't need to compute it later
  state.annotationUserXOffset = xOffset + labelWidth / 2;
  state.annotationUserXBound = xBound - labelWidth;

  labelLeft =
    state.densityUserMark.select('line').node().getBoundingClientRect().x -
    xOffset -
    labelWidth / 2;

  // Handle out of bounds
  labelLeft = handleOutOfBound(state.annotationUser, labelLeft);

  state.annotationUser.style('left', `${labelLeft}px`);

  // --- Coach ---
  state.annotationCoach = d3.select(component).select('.annotation-coach');

  tempClone = state.annotationCoach
    .clone(true)
    .style('visibility', 'hidden')
    .classed('show', true);
  labelWidth = tempClone.node().getBoundingClientRect().width;
  tempClone.remove();

  labelLeft =
    state.densityCoachMark.select('line').node().getBoundingClientRect().x -
    xOffset -
    labelWidth / 2;

  // Handle out of bounds
  labelLeft = handleOutOfBound(state.annotationCoach, labelLeft);

  state.annotationCoach.style('left', `${labelLeft}px`);

  // --- Range ---
  state.annotationRange = d3.select(component).select('.annotation-range');

  tempClone = state.annotationRange
    .clone(true)
    .style('visibility', 'hidden')
    .classed('show', true);
  labelWidth = tempClone.node().getBoundingClientRect().width;
  tempClone.remove();

  const rangeTrackBBox = d3
    .select(component)
    .select('.range-track')
    .node()
    //@ts-ignore
    .getBoundingClientRect();

  // Record the offset so we don't need to compute it later
  state.annotationRangeXOffset = xOffset + labelWidth / 2;
  state.annotationRangeXBound = xBound - labelWidth;

  labelLeft =
    rangeTrackBBox.x + rangeTrackBBox.width / 2 - xOffset - labelWidth / 2;

  // Handle out of bounds
  labelLeft = handleOutOfBound(state.annotationRange, labelLeft);

  state.annotationRange.style('left', `${labelLeft}px`);
};
