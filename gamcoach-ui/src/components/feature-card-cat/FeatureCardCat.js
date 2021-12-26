import d3 from '../../utils/d3-import';
import { Logger } from '../../utils/logger';
import { config } from '../../config/config';
import { tick } from 'svelte';
import '../../typedef';

const colors = config.colors;

/**
 * When users hover over any bar, we change the helper message.
 * @param {object} state Current states
 */
const barGroupMouseEnterHandler = (state) => {
  if (state.dragging) return;

  state.helperMessage = `Click to Mark
    <span class="orange">Acceptable</span> Values`;
  state.stateUpdated();
};

/**
 * Revoke the hovering effect.
 * @param {object} state Current states
 */
const barGroupMouseLeaveHandler = (state) => {
  if (state.dragging) return;

  state.helperMessage = state.helperMessageDefault;
  state.stateUpdated();
};

/**
 * When user hover a bar, we should the x label in tooltip. If the bar has a
 * special value (cur value/ original value/ coach value), we also call out
 * the annotation.
 * @param {event} e Event
 * @param {object} d Datum
 * @param {HTMLElement} component Component
 * @param {object} state Current states
 */
const barMouseEnterHandler = (e, d, component, state) => {
  e.preventDefault();
  e.stopPropagation();

  if (state.dragging) return;

  // Log the interaction
  /** @type {Logger} */
  const logger = state.logger;
  logger?.addLog({
    eventName: `[${state.feature.featureName}] annotation shown`,
    elementName: 'annotation bar'
  });

  // Cancel the previous opacity -> 1 callback if it was set
  if (state.tickOpacityTimeout !== null) {
    clearTimeout(state.tickOpacityTimeout);
    state.tickOpacityTimeout = null;
  }

  // Trigger hover on the x label element
  d3.select(component).select(`#track-label-${d.edge}`).classed('hover', true);

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
 * @param {HTMLElement} component Component
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

const barClickedHandler = (e, d, component, state) => {
  e.preventDefault();
  e.stopPropagation();

  const oldRange = Array.from(state.feature.searchValues);

  // Deselect the bar if it has been selected
  if (state.feature.searchValues.has(d.edge)) {
    state.feature.searchValues.delete(d.edge);
  } else {
    state.feature.searchValues.add(d.edge);
  }

  const newRange = Array.from(state.feature.searchValues);

  // Log the interaction
  /** @type {Logger} */
  const logger = state.logger;
  logger?.addLog({
    eventName: `[${state.feature.featureName}] range changed`,
    elementName: 'bar',
    valueName: 'range',
    oldValue: oldRange,
    newValue: newRange
  });

  syncBars(component, state);
  syncFeature(state);
};

/**
 * When users hover over any text, we change the helper message.
 * @param {object} state Current states
 */
const textGroupMouseEnterHandler = (state) => {
  if (state.dragging) return;

  // Log the interaction
  /** @type {Logger} */
  const logger = state.logger;
  logger?.addLog({
    eventName: `[${state.feature.featureName}] annotation shown`,
    elementName: 'annotation text'
  });

  state.helperMessage = `Click to Try a
    <span class="blue">Different Value</span>`;
  state.stateUpdated();
};

/**
 * Revoke the hovering effect.
 * @param {object} state Current states
 */
const textGroupMouseLeaveHandler = (state) => {
  if (state.dragging) return;

  state.helperMessage = state.helperMessageDefault;
  state.stateUpdated();
};

/**
 * When users hover over a text, we display a helper message to tell users to
 * click a text to try out hypothetical value. If the value is a special value,
 * then we show annotation for the special value.
 * @param {event} e Event
 * @param {object} d Datum
 * @param {HTMLElement} component Component
 * @param {object} state Current states
 */
const textMouseEnterHandler = (e, d, component, state) => {
  e.preventDefault();
  e.stopPropagation();

  if (state.dragging) return;

  // Trigger hover on the x label element
  d3.select(component)
    .select('.svg-hist')
    .select('.y-label-group')
    .select(`.y-label-${d.edge}`)
    .select('.text-background')
    .classed('hover', true);

  // Change annotation if the current text label has a special value
  if (d.edge === state.feature.originalValue) {
    state.helperMessage =
      '<span class="gray-inverse">Your Original Value</span>';
    state.stateUpdated();
  } else if (d.edge === state.feature.curValue) {
    state.helperMessage = `<span class="blue-inverse">
      Your Hypothetical Value</span>`;
    state.stateUpdated();
  } else if (d.edge === state.feature.coachValue) {
    state.helperMessage = `<span class="green-inverse">
      GAM Coach Suggestion</span>`;
    state.stateUpdated();
  }
};

/**
 * Revoke the hovering effect.
 * @param {event} e Event
 * @param {object} d Datum
 * @param {HTMLElement} component Component
 * @param {object} state Current states
 */
const textMouseLeaveHandler = (e, d, component, state) => {
  e.preventDefault();
  e.stopPropagation();

  if (state.dragging) return;

  // Stop the hovering on the x label element
  d3.select(component)
    .select('.svg-hist')
    .select('.y-label-group')
    .select(`.y-label-${d.edge}`)
    .select('.text-background')
    .classed('hover', false);

  // Change back the helper message if necessary
  if (d.edge === state.feature.originalValue ||
    d.edge === state.feature.curValue ||
    d.edge === state.feature.coachValue)
  {
    state.helperMessage = `Click to Try a
      <span class="blue">Different Value</span>`;
    state.stateUpdated();
  }
};

/**
 * Select the current bar as the current value.
 * @param {*} e Event
 * @param {*} d Datum
 * @param {*} component Component
 * @param {*} state Current state
 */
const textClickedHandler = (e, d, component, state) => {
  e.preventDefault();
  e.stopPropagation();

  // Log the interaction
  /** @type {Logger} */
  const logger = state.logger;
  logger?.addLog({
    eventName: `[${state.feature.featureName}] value changed`,
    elementName: 'bar',
    valueName: 'curValue',
    oldValue: state.feature.labelEncoder[state.feature.curValue],
    newValue: state.feature.labelEncoder[d.edge]
  });

  state.feature.curValue = d.edge;
  state.stateUpdated('value');

  const yLabelGroup = d3.select(component)
    .select('.svg-hist')
    .select('.y-label-group');

  const yLabel = yLabelGroup.select(`.y-label-${d.edge}`);

  // Change the user class on the y labels
  yLabelGroup.selectAll('.y-label').classed('user', false);

  if (state.feature.curValue !== state.feature.originalValue &&
    state.feature.curValue !== state.feature.coachValue
  ) {
    yLabel.classed('user', true);
  }

  // Change the user class on the bars
  const bars = d3.select(component)
    .select('.svg-hist g.hist-group')
    .selectAll('.bar');

  bars.classed('user', false);
  bars.filter(
    d => d.edge === state.feature.curValue &&
    d.edge !== state.feature.coachValue &&
    d.edge !== state.feature.originalValue
  )
    .classed('user', true);
};

/**
 * Iterate all level bars and y-label texts and then style them based on
 * on their values
 */
export const syncBars = (component, state) => {
  // Iterate all level bars and check if they match the special values
  // one-by-one
  const bars = d3.select(component)
    .select('.svg-hist')
    .select('g.hist-group')
    .selectAll('.bar');

  bars.each((d, i, g) => {
    const curBar = d3.select(g[i]);

    curBar.classed('selected', state.feature.searchValues.has(d.edge))
      .classed('user', d.edge === state.feature.curValue)
      .classed('original', d.edge === state.feature.originalValue)
      .classed('coach', d.edge === state.feature.coachValue);
  });

  // Iterate through all y-label texts
  const yLabels = d3.select(component)
    .select('.svg-hist')
    .select('g.y-label-group')
    .selectAll('.y-label');

  yLabels.each((d, i, g) => {
    const label = d3.select(g[i]);

    label.classed('selected', state.feature.searchValues.has(d.edge))
      .classed('user', d.edge === state.feature.curValue)
      .classed('original', d.edge === state.feature.originalValue)
      .classed('coach', d.edge === state.feature.coachValue);
  });
};

const syncFeature = (state) => {
  // Update the feature for selections
  // Feature's `acceptableRange` is null if all are selected
  if (state.feature.searchValues.size !== state.feature.histEdge.length) {
    state.featurePtr.acceptableRange = Array.from(state.feature.searchValues);
  } else {
    state.featurePtr.acceptableRange = null;
  }

  if(state.featurePtr.difficulty === 'neutral' &&
    state.featurePtr.acceptableRange === null
  ) {
    state.featurePtr.isConstrained = false;
  } else {
    state.featurePtr.isConstrained = true;
  }

  state.featureUpdated('constraint');
};

/**
 * Initialize the SVG size so we can do animation for the card collapsing
 * @param {HTMLElement} component
 * @param {object} state
 */
export const initHistSize = (component, state) => {
  // Offset the range thumb to align with the track
  const padding = {
    top: 35,
    left: 2,
    right: 0,
    histTopBottom: 8,
    histRight: 6,
    textHGap: 8,
    barHGap: 0
  };

  const rectHeight = 20;
  const rectPadding = 5;
  const edgeCount = state.feature.histEdge.length;
  const histHeight =
    edgeCount * rectHeight +
    (edgeCount - 1) * rectPadding +
    2 * padding.histTopBottom;
  const height = histHeight + padding.top;

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

  // Use the parent size to initialize the SVG size
  const parentDiv = d3.select(component)
    .select('.feature-hist');
  // @ts-ignore
  const parentBBox = parentDiv.node().getBoundingClientRect();

  // Offset the range thumb to align with the track
  const padding = {
    top: 35,
    left: 2,
    right: 0,
    histTopBottom: 8,
    histRight: 6,
    textHGap: 8,
    barHGap: 0
  };

  const width = parentBBox.width;

  const rectHeight = 20;
  const rectPadding = 5;
  const edgeCount = state.feature.histEdge.length;
  const histHeight = edgeCount * rectHeight + (edgeCount - 1) * rectPadding +
    2 * padding.histTopBottom;
  const height = histHeight + padding.top;

  state.histSVG = d3.select(component)
    .select('.svg-hist')
    .attr('width', width)
    .attr('height', height);

  // Add density plot groups
  const histGroup = state.histSVG.append('g')
    .attr('class', 'hist-group')
    .attr('transform', `translate(${padding.left}, ${padding.top})`);

  // Compute the frequency of each level
  const totalSampleNum = state.feature.histCount.reduce((a, b) => a + b);
  const curData = state.feature.histEdge.map((d, i) => ({
    edge: state.feature.histEdge[i],
    label: state.feature.description.levelDescription[
      state.feature.histEdge[i]].displayName,
    count: state.feature.histCount[i],
    density: state.feature.histCount[i] / totalSampleNum,
  }));

  // curData[2].label = 'South Africa Vaccine Rate Change';
  const tempGroup = state.histSVG.append('g')
    .attr('class', 'temp-group y-label')
    .style('visibility', 'hidden');

  const maxLabelWidth = 170;
  let longestLabelWidth = -1;

  // Need to shorten some labels if they are too long
  // Trim the label and add '...' for vertical layout
  curData.forEach(d => {
    let curLabelText = d.label;
    const curLabel = tempGroup.append('text')
      .text(curLabelText);
    let bbox = curLabel.node().getBoundingClientRect();

    if (bbox.width > maxLabelWidth) {
      const resizeLabel = () => {
        curLabelText = curLabelText.slice(0, -1);
        curLabel.text(curLabelText.concat('...'));
        bbox = curLabel.node().getBoundingClientRect();

        // Recursive call to keep trimming the label until it fits
        if (bbox.width > maxLabelWidth) resizeLabel();
      };

      resizeLabel();

      // Now the text label is trimmed
      d.trimmedLabel = curLabelText.concat('...');
    } else {
      d.trimmedLabel = curLabelText;
    }

    bbox = curLabel.node().getBoundingClientRect();
    if (bbox.width > longestLabelWidth) {
      longestLabelWidth = bbox.width;
    }
  });

  // Draw a bounding box for this density plot
  const rectWidth = width - padding.left - padding.right - longestLabelWidth
    - padding.histRight - padding.textHGap - padding.barHGap;

  state.histSVG.append('g')
    .attr('class', 'border')
    .attr('transform', `translate(
      ${padding.left + longestLabelWidth + padding.textHGap},
      ${padding.top + 1})`)
    .lower()
    .append('rect')
    .attr('width', rectWidth + padding.barHGap + padding.histRight)
    .attr('height', histHeight - 2)
    .style('fill', 'white')
    .style('stroke', colors['gray-200']);

  const xScale = d3.scaleLinear()
    // @ts-ignore
    .domain([0, d3.max(curData, d => d.density)])
    .range([0, rectWidth]);

  // Draw the bars
  const barGroup = histGroup.append('g')
    .attr('class', 'bar-group')
    .on('mouseenter', () => barGroupMouseEnterHandler(state))
    .on('mouseleave', () => barGroupMouseLeaveHandler(state));

  const barGroups = barGroup.selectAll('g.bar')
    .data(curData)
    .join('g')
    .attr('class', 'bar')
    .attr('transform', (d, i) => `translate(
      ${longestLabelWidth + padding.textHGap + padding.barHGap},
      ${i * (rectHeight + rectPadding) + padding.histTopBottom})`)
    .on('mouseenter', (e, d) => barMouseEnterHandler(e, d, component, state))
    .on('mouseleave', (e, d) => barMouseLeaveHandler(e, d, component, state))
    .on('click', (e, d) => barClickedHandler(e, d, component, state));

  // Draw the back-background bar to better listen to mouse events
  barGroups.append('rect')
    .attr('class', 'back-back-bar')
    .attr('y', -rectPadding / 2)
    .attr('width', rectWidth)
    .attr('height', rectHeight + rectPadding)
    .style('fill', 'hsla(0, 0%, 100%, 0)');

  // Draw the background bar (some levels might have very low density, so we
  // need a uni-height bar in the back)
  const backBars = barGroups.append('rect')
    .attr('class', 'back-bar')
    .attr('width', rectWidth)
    .attr('height', rectHeight);

  // Draw the density histogram
  barGroups.append('rect')
    .attr('class', 'density-bar')
    .attr('width', d => xScale(d.density))
    .attr('height', rectHeight);

  // Draw the selection level bars
  barGroups.append('rect')
    .attr('class', 'level-bar')
    .attr('id', d => `level-bar-${d.edge}`)
    .attr('width', rectWidth)
    .attr('height', rectHeight);

  // Draw the labels on the y-axis
  const yLabelGroup = histGroup.append('g')
    .attr('class', 'y-label-group')
    .on('mouseenter', () => textGroupMouseEnterHandler(state))
    .on('mouseleave', () => textGroupMouseLeaveHandler(state));

  // Add a back-background rect behind the background behind the text so that
  // we can listen to the mouseenter events without interruption
  yLabelGroup.append('rect')
    .attr('y', padding.histTopBottom)
    .attr('width', longestLabelWidth + 5)
    .attr('height', curData.length * rectHeight +
      (curData.length - 1) * rectPadding)
    .style('fill', 'hsla(0, 0%, 100%, 0');

  const yLabels = yLabelGroup.selectAll('g.y-label')
    .data(curData)
    .join('g')
    .attr('class', d => `y-label y-label-${d.edge}`)
    .attr('transform', (d, i) => `translate(${longestLabelWidth}
      ${i * (rectHeight + rectPadding) + padding.histTopBottom})`
    )
    .on('mouseenter', (e, d) => textMouseEnterHandler(e, d, component, state))
    .on('mouseleave', (e, d) => textMouseLeaveHandler(e, d, component, state))
    .on('click', (e, d) => textClickedHandler(e, d, component, state));

  // Add a background rect behind the text so we can better listen to mouse
  // events
  yLabels.append('rect')
    .attr('class', 'text-background')
    .attr('x', -longestLabelWidth - 2)
    .attr('y', -rectPadding / 2)
    .attr('width', longestLabelWidth + 5)
    .attr('height', rectHeight + rectPadding)
    .attr('rx', 1)
    .attr('ry', 1);

  // Add texts
  yLabels.append('text')
    .style('text-anchor', 'end')
    .style('dominant-baseline', 'middle')
    .attr('transform', 'translate(0, 10)')
    .text(d => d.trimmedLabel);

  // Highlight bars with special values (original, user, and coach)
  syncBars(component, state);

  // --- Final ---
  // Export the x center values for each bar
  const xValues = [];

  backBars.each((d, i, g) => {
    const bbox = d3.select(g[i]).node().getBoundingClientRect();
    const curX = bbox.x + bbox.width / 2;
    xValues.push(curX);
  });

  return xValues;
};

/**
 * Handler for mouse enter event on the card title
 * @param {MouseEvent} e mouse event
 * @param {any} tooltipConfig tooltip config
 * @param {any} tooltipConfigStore tooltip config store
 * @param {string} message tooltip message to show
 */
export const titleMouseenterHandler = async (
  e,
  tooltipConfig,
  tooltipConfigStore,
  message
) => {

  const node = e.currentTarget;

  tooltipConfig.mouseoverTimeout = setTimeout(async () => {
    // Test the width of the title
    tooltipConfig.width = 0;
    tooltipConfig.maxWidth = 200;
    tooltipConfig.orientation = 's';
    tooltipConfig.show = false;
    tooltipConfig.fontSize = '0.8rem';
    tooltipConfig.html = `
    <div class='tooltip-content' style='display: flex; flex-direction:
      column; justify-content: center;'>
      ${message}
    </div>
  `;
    tooltipConfigStore.set(tooltipConfig);

    await tick();

    const tooltip = d3.select('.tooltip').node();
    const bbox = tooltip.getBoundingClientRect();

    const position = node.getBoundingClientRect();
    const curWidth = position.width;

    const tooltipCenterX = position.x + curWidth / 2;
    const tooltipCenterY = position.y - bbox.height + 3;

    tooltipConfig.width = 0;
    tooltipConfig.maxWidth = 200;
    tooltipConfig.left = tooltipCenterX - bbox.width / 2;
    tooltipConfig.top = tooltipCenterY;
    tooltipConfig.fontSize = '0.8rem';
    tooltipConfig.show = true;
    tooltipConfig.orientation = 's';
    tooltipConfigStore.set(tooltipConfig);
  }, 400);
};

/**
 * Handler for mouse leave event on the card title
 * @param {MouseEvent} e mouse event
 * @param {any} tooltipConfig tooltip config
 * @param {any} tooltipConfigStore tooltip config store
 */
export const titleMouseleaveHandler = (
  e,
  tooltipConfig,
  tooltipConfigStore
) => {
  clearTimeout(tooltipConfig.mouseoverTimeout);
  tooltipConfig.mouseoverTimeout = null;
  tooltipConfig.show = false;
  tooltipConfigStore.set(tooltipConfig);
};
