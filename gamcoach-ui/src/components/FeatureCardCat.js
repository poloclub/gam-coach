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

  thumb.focus();
  state.dragging = true;

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

    // Restore the opacity
    d3.select(component)
      .select('.svg-hist')
      .select('.x-label-group')
      .transition('restore')
      .duration(200)
      .style('opacity', 1);

    state.dragging = false;
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
    .on('mousedown', e => mouseDownHandler(e, component, state))
    .on('mouseenter', () => {
      // Cancel the previous opacity -> 1 callback if it was set
      if (state.tickOpacityTimeout !== null) {
        clearTimeout(state.tickOpacityTimeout);
        state.tickOpacityTimeout = null;
      }

      // Dehighlight the x labels
      d3.select(component)
        .select('.svg-hist')
        .select('.x-label-group')
        .interrupt('restore')
        .style('opacity', 0.3);
    })
    .on('mouseleave', () => {
      if (state.dragging) return;

      // Restore the opacity
      d3.select(component)
        .select('.svg-hist')
        .select('.x-label-group')
        .transition('restore')
        .duration(200)
        .style('opacity', 1);
    });
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
  syncBars(component, state);

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
 * When user hover a bar, we should the x label in tooltip. If the bar has a
 * special value (cur value/ original value/ coach value), we also call out
 * the annotation.
 * @param {event} e Event
 * @param {object} d Datum
 * @param {element} component Component
 * @param {object} state Current states
 */
const barMouseEnterHandler = (e, d, component, state) => {
  e.preventDefault();
  e.stopPropagation();

  if (state.dragging) return;

  // Cancel the previous opacity -> 1 callback if it was set
  if (state.tickOpacityTimeout !== null) {
    clearTimeout(state.tickOpacityTimeout);
    state.tickOpacityTimeout = null;
  }

  // Trigger hover on the x label element
  d3.select(component)
    .select(`#track-label-${d.edge}`)
    .classed('hover', true);

  d3.select(component)
    .select('.svg-hist')
    .select('.x-label-group')
    .interrupt('restore')
    .style('opacity', 0.3);
};

/**
 * Revoke the hovering effect.
 * @param {event} e Event
 * @param {object} d Datum
 * @param {element} component Component
 * @param {object} state Current states
 */
const barMouseLeaveHandler = (e, d, component, state) => {
  e.preventDefault();
  e.stopPropagation();

  if (state.dragging) return;

  // Stop the hovering on the x label element
  d3.select(component)
    .select(`#track-label-${d.edge}`)
    .classed('hover', false);

  state.tickOpacityTimeout = setTimeout(() => {
    d3.select(component)
      .select('.svg-hist')
      .select('.x-label-group')
      .transition('restore')
      .duration(200)
      .style('opacity', 1);
  }, 300);
};

const syncBars = (component, state) => {
  // Iterate all level bars and check if they match the special values one-by-one
  let bars = d3.select(component)
    .select('.svg-hist')
    .select('g.hist-group')
    .selectAll('.bar');

  bars.each((d, i, g) => {
    let curBar = d3.select(g[i]);

    curBar.classed('selected', state.feature.searchValues.includes(d.edge))
      .classed('user', d.edge === state.feature.curValue)
      .classed('original', d.edge === state.feature.originalValue)
      .classed('coach', d.edge === state.feature.coachValue);
  });
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
  const height = 145;
  let histHeight = 56;
  const minHistHeight = 35;
  let vGap = 27;

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

  // Add density plot groups
  let histGroup = state.histSVG.append('g')
    .attr('class', 'hist-group')
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
    .padding(0.25)
    .range([0, width - padding.left - padding.right]);

  // First figure out whether we should put the x label vertically or horizontally
  // Compare the max label width with the bandwidth + innerPadding
  const maxAvailWidth = xScale.bandwidth() + xScale.step() * xScale.paddingInner();

  let tempGroup = state.histSVG.append('g')
    .attr('class', 'temp-group x-label')
    .style('visibility', 'hidden');

  let maxLabelWidth = -1;
  curData.forEach(d => {
    let curLabel = tempGroup.append('text')
      .text(d.label);
    let bbox = curLabel.node().getBoundingClientRect();
    if (bbox.width > maxLabelWidth) maxLabelWidth = bbox.width;
  });

  let isVertical = maxLabelWidth > maxAvailWidth;

  // Need to re-layout the plot if we are using vertical layout
  if (isVertical) {
    // Resize the histogram plot
    histHeight = Math.max(height - padding.top - maxLabelWidth - vGap, minHistHeight);

    // Need to update the CSS as well
    d3.select(component)
      .select('.feature-slider')
      .style('top', `${40 + padding.top + histHeight + 2}px`);

    const maxVerticalLabelHeight = height - padding.top - histHeight - vGap;

    // Trim the label and add '...' for vertical layout
    curData.forEach(d => {
      let curLabelText = d.label;
      let curLabel = tempGroup.append('text')
        .text(curLabelText);
      let bbox = curLabel.node().getBoundingClientRect();
      if (bbox.width > maxLabelWidth) maxLabelWidth = bbox.width;

      if (bbox.width > maxVerticalLabelHeight) {
        const resizeLabel = () => {
          curLabelText = curLabelText.slice(0, -1);
          curLabel.text(curLabelText.concat('...'));
          bbox = curLabel.node().getBoundingClientRect();

          // Recursive call to keep trimming the label until it fits
          if (bbox.width > maxVerticalLabelHeight) resizeLabel();
        };

        resizeLabel();

        // Now the text label is trimmed
        d.trimmedLabel = curLabelText.concat('...');
      } else {
        d.trimmedLabel = curLabelText;
      }
    });
  }

  // Draw a bounding box for this density plot
  state.histSVG.append('g')
    .attr('class', 'border')
    .attr('transform', `translate(${0}, ${padding.top})`)
    .lower()
    .append('rect')
    .attr('width', totalWidth + 2 * thumbWidth)
    .attr('height', histHeight)
    .style('fill', 'none')
    .style('stroke', colors['gray-200']);

  const yLow = padding.top + histHeight - padding.bottom - padding.top;
  let yScale = d3.scaleLinear()
    .domain([0, d3.max(curData, d => d.density)])
    .range([yLow, padding.histTop]);

  // Draw the background bar (some levels might have very low density, so we
  // need a uni-height bar in the back)
  let barGroups = histGroup.selectAll('g.bar')
    .data(curData)
    .join('g')
    .attr('class', 'bar')
    .attr('transform', d => `translate(${xScale(d.edge)}, ${padding.histTop})`)
    .on('mouseenter', (e, d) => barMouseEnterHandler(e, d, component, state))
    .on('mouseleave', (e, d) => barMouseLeaveHandler(e, d, component, state));

  barGroups.append('rect')
    .attr('class', 'back-bar')
    .attr('width', xScale.bandwidth())
    .attr('height', yLow - padding.histTop);

  // Draw the density histogram
  let densityBars = barGroups.append('rect')
    .attr('class', 'density-bar')
    .attr('x', padding.hBar)
    .attr('y', d => yScale(d.density) - padding.histTop + padding.hBar)
    .attr('width', xScale.bandwidth() - 2 * padding.hBar)
    .attr('height', d => yLow - yScale(d.density) - 2 * padding.hBar);

  barGroups.append('rect')
    .attr('class', 'level-bar')
    .attr('id', d => `level-bar-${d.edge}`)
    .attr('width', xScale.bandwidth())
    .attr('height', yLow - padding.histTop);

  // Draw the labels on the x-axis
  let xLabelGroup = histGroup.append('g')
    .attr('class', 'x-label-group');

  xLabelGroup.selectAll('g.x-label')
    .data(curData)
    .join('g')
    .attr('class', 'x-label')
    .attr('transform', d => `translate(${xScale(d.edge) + xScale.bandwidth() * 5 / 10}, ${histHeight + vGap})`)
    .append('text')
    .style('text-anchor', isVertical ? 'end' : 'middle')
    .style('dominant-baseline', 'middle')
    .attr('transform', isVertical ? `rotate(${-90} 0 0)` : 'translate(0, 10)')
    .text(d => isVertical ? d.trimmedLabel : d.label);

  // Highlight bars with special values (original, user, and coach)
  syncBars(component, state);

  // --- Final ---
  // Export the x center values for each bar
  let xValues = [];

  densityBars.each((d, i, g) => {
    let bbox = d3.select(g[i]).node().getBoundingClientRect();
    let curX = bbox.x + bbox.width / 2;
    xValues.push(curX);
  });

  return xValues;
};
