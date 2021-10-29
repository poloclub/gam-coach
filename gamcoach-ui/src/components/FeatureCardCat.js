import d3 from '../utils/d3-import';
import { config } from '../config';

let colors = config.colors;

/**
 * Helper function to show the annotation.
 */
const showAnnotation = (component, state, type) => {
  if (state.showingAnnotation !== null) { return; }

  d3.select(component)
    .selectAll('.annotation-name')
    .classed('show', false);

  d3.select(component)
    .selectAll(`.annotation-${type}`)
    .classed('show', true);

  state.showingAnnotation = type;
};

/**
 * Helper function to hide the annotation.
 */
const hideAnnotation = (component, state, type) => {
  if (state.showingAnnotation !== type) { return; }

  d3.select(component)
    .selectAll('.annotation-name')
    .classed('show', true);

  d3.select(component)
    .selectAll(`.annotation-${type}`)
    .classed('show', false);

  state.showingAnnotation = null;
};

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

  let localHideAnnotation = () => { };
  // if (thumb.id.includes('middle')) {
  //   showAnnotation(component, state, 'user');
  //   localHideAnnotation = () => hideAnnotation(component, state, 'user');
  // } else {
  //   showAnnotation(component, state, 'range');
  //   localHideAnnotation = () => hideAnnotation(component, state, 'range');
  // }

  const mouseMoveHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const deltaX = e.pageX - track.getBoundingClientRect().x;

    // Figure out which level the current x is closest to
    let newValue = state.feature.curValue;
    let minDistance = Infinity;

    state.xCenters.forEach((x, i) => {
      // Level starts at 1
      if (i > 0) {
        let curDistance = Math.abs(deltaX - x);

        if (curDistance < minDistance) {
          minDistance = curDistance;
          newValue = i;
        }
      }
    });

    moveThumb(component, state, newValue);
  };

  const mouseUpHandler = () => {
    document.removeEventListener('mousemove', mouseMoveHandler);
    document.removeEventListener('mouseup', mouseUpHandler);
    document.body.style.cursor = 'default';
    thumb.blur();
    localHideAnnotation();
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

  // Move the curValue thumb to the original value
  moveThumb(component, state, state.feature.originalValue);

  // Register the interaction handler
  d3.select(component)
    .select('#slider-level-thumb')
    .on('mousedown', e => mouseDownHandler(e, component, state));
};

/**
 * Move the specified thumb to the given value on the slider.
 * @param{number} value The target value to move the thumb to (histEdge value).
 */
export const moveThumb = (component, state, value) => {

  if (state.xCenters.length === 0) { return; }

  // Save the current value to the HTML element
  const thumb = d3.select(component)
    .select('#slider-level-thumb')
    .attr('data-curValue', value);

  // Compute the position to move the thumb to
  const thumbBBox = thumb.node().getBoundingClientRect();

  let xPos = state.xCenters[value];

  // Need to offset the xPos based on the thumb type
  // Also register different values based on the thumb type

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
  // if (state.histSVG !== null) {
  //   state.densityUserMark.attr(
  //     'transform', `translate(${state.tickXScale(value)}, 0)`
  //   );

  //   // Update annotation position
  //   let labelLeft = state.densityUserMark.select('line').node()
  //     .getBoundingClientRect().x - state.annotationUserXOffset;

  //   // Handle out of bounds
  //   if (labelLeft < 0) {
  //     state.annotationUser.classed('no-triangle', true);
  //     labelLeft = 0;
  //   } else {

  //     if (labelLeft > state.annotationUserXBound) {
  //       state.annotationUser.classed('no-triangle', true);
  //       labelLeft = state.annotationUserXBound;
  //     } else {
  //       state.annotationUser.classed('no-triangle', false);
  //     }
  //   }

  //   state.annotationUser.style('left', `${labelLeft}px`);
  // }

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
    .select('#slider-level-thumb')
    .select('.thumb-label span')
    .text(state.feature.labelEncoder[state.feature.curValue]);
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
  const histHeight = 90;
  const tickHeight = 40;
  const vGap = 15;
  const height = histHeight + tickHeight + vGap;

  state.histSVG = d3.select(component)
    .select('.svg-hist')
    .attr('width', width)
    .attr('height', height);

  // Offset the range thumb to align with the track
  const thumbWidth = 8;

  const padding = {
    top: 35,
    left: thumbWidth,
    right: thumbWidth,
    bottom: 0,
    histTop: 2,
    hBar: 1
  };

  const totalWidth = width - padding.left - padding.right;

  // Draw a bounding box for this density plot
  state.histSVG.append('g')
    .attr('class', 'border')
    .attr('transform', `translate(${0}, ${padding.top})`)
    .append('rect')
    .attr('width', totalWidth + 2 * thumbWidth)
    .attr('height', histHeight - padding.top)
    .style('fill', 'none')
    .style('stroke', colors['gray-200']);

  // Add density plot
  let histGroupBot = state.histSVG.append('g')
    .attr('class', 'hist-group hist-group-bot')
    .attr('transform', `translate(${thumbWidth}, ${padding.top})`);

  let histGroupTop = state.histSVG.append('g')
    .attr('class', 'hist-group hist-group-top')
    .attr('transform', `translate(${thumbWidth}, ${padding.top})`);

  let tickGroup = state.histSVG.append('g')
    .attr('class', 'tick-group')
    .attr('transform', `translate(${thumbWidth}, ${histHeight + vGap})`);

  // The top layer to show vertical marks
  let markGroup = state.histSVG.append('g')
    .attr('class', 'mark-group')
    .attr('transform', `translate(${thumbWidth}, ${padding.top})`);

  // Compute the frequency of each level
  const totalSampleNum = state.feature.histCount.reduce((a, b) => a + b);
  let curData = state.feature.histEdge.map((d, i) => ({
    edge: state.feature.histEdge[i],
    label: state.feature.labelEncoder[state.feature.histEdge[i]],
    count: state.feature.histCount[i],
    density: state.feature.histCount[i] / totalSampleNum,
  }));

  // Create the axis scales
  // histEdge, histCount, histDensity
  let xScale = d3.scaleBand()
    .domain(curData.map(d => d.edge))
    .paddingInner(0.2)
    .range([0, width - padding.left - padding.right]);

  const yLow = histHeight - padding.bottom - padding.top;

  let yScale = d3.scaleLinear()
    .domain([0, d3.max(curData, d => d.density)])
    .range([yLow, padding.histTop]);

  // Draw the background bar (some levels might have very low density)
  let levelBars = histGroupBot.selectAll('rect.level-bar')
    .data(curData)
    .join('rect')
    .attr('class', 'level-bar')
    .attr('x', d => xScale(d.edge))
    .attr('y', padding.histTop)
    .attr('width', xScale.bandwidth())
    .attr('height',yLow - padding.histTop);

  // Draw the density histogram
  let densityBars = histGroupTop.selectAll('rect.density-bar')
    .data(curData)
    .join('rect')
    .attr('class', 'density-bar')
    .attr('x', d => xScale(d.edge) + padding.hBar)
    .attr('y', d => yScale(d.density))
    .attr('width', xScale.bandwidth() - 2 * padding.hBar)
    .attr('height', d => yLow - yScale(d.density));

  // Export the x center values for each bar
  let xValues = [];

  densityBars.each((d, i, g) => {
    let bbox = d3.select(g[i]).node().getBoundingClientRect();
    let curX = bbox.x + bbox.width / 2;
    xValues.push(curX);
  });

  return xValues;
};
