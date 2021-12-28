import d3 from '../../utils/d3-import';
import { Logger } from '../../utils/logger';
import { config } from '../../config/config';
import { round } from '../../utils/utils';
import { Writable } from 'svelte/store';
import '../../typedef';
import { Plan } from '../coach/Coach';
import { sigmoid } from '../../ebm/ebm';

const formatter = d3.format(',.2~f');

export class ScorePanel {
  width;
  height = 30;
  rectHeight = 8;
  rectRadius = 5;
  lineWidth = 2;
  planLabel;

  tooltipConfig;
  tooltipConfigStore;
  mouseoverTimeout;

  /** @type {Plan} */
  plan = null;
  unsubscribes = [];

  curValue = 0;
  originalValue = 0;
  minThreshold = 0;
  maxThreshold = 0;

  svg = null;
  svgInitialized = false;

  padding = {
    top: 1,
    bottom: 8,
    right: 8,
    left: 5
  };

  /** @type {HTMLElement} */
  component;
  xScale;

  /**
   * Initialize the score panel
   * @param {HTMLElement} component
   * @param {number} scoreWidth
   * @param {object} planLabel
   * @param {Writable<Plan>} planStore
   * @param {(newValue: boolean) => void} updateInRange
   * @param {Logger | null} logger
   */
  constructor(
    component,
    scoreWidth,
    planLabel,
    planStore,
    tooltipConfigStore,
    updateInRange,
    logger
  ) {
    this.component = component;
    this.planLabel = planLabel;
    this.updateInRange = updateInRange;
    /** @type {Logger} */
    this.logger = logger;

    // Subscribe to the plan store
    this.unsubscribes.push(
      planStore.subscribe((value) => {
        this.plan = value;
        this.planUpdated();
      })
    );

    // Subscribe to the tooltip store
    this.unsubscribes.push(
      tooltipConfigStore.subscribe((value) => {
        this.tooltipConfig = value;
      })
    );
    this.tooltipConfigStore = tooltipConfigStore;

    // To figure out the svg width, we need to consider the width of the text
    this.width = scoreWidth - planLabel.textWidth - 1;

    // Initialize scales and thresholds
    if (planLabel.isRegression) {
      // TODO
    } else {
      // If it is a classifier, then the bar range is from 0 to 1
      this.xScale = d3
        .scaleLinear()
        .domain([0, 1])
        .range([0, this.width - this.padding.right - this.padding.left]);

      this.minThreshold = 0.5;
      this.maxThreshold = 0.5;
      this.originalValue = sigmoid(this.plan.originalScore);
      this.curValue = sigmoid(this.plan.ebmLocal.predScore);
    }
  }

  /**
   * Update the graph based on the new score
   */
  planUpdated() {
    this.curValue = sigmoid(this.plan.ebmLocal.predScore);

    if (this.svgInitialized) {
      const widthTransition = d3
        .transition('width')
        .duration(this.planLabel.isRegression ? 0 : 200)
        .ease(d3.easeLinear);

      this.svg
        .select('.top-rect')
        .classed('in-range', this.isInRange)
        .transition(widthTransition)
        .attr('width', this.xScale(this.curValue));

      // Update isInRange from the score panel svelte
      this.updateInRange(this.isInRange);
    }
  }

  destroy() {
    if (this.svg !== null) {
      this.svg.selectAll('*').remove();
    }
    this.unsubscribes.forEach((d) => d());
  }

  /** @type {boolean} */
  get isInRange() {
    // Binary classification
    if (this.minThreshold === this.maxThreshold) {
      return this.curValue >= this.minThreshold;
    } else {
      // Regression
      return (
        this.curValue >= this.minThreshold && this.curValue <= this.maxThreshold
      );
    }
  }

  /**
   * Handler for mouse enter event
   * @param {MouseEvent} e
   * @param {string} message
   * @param {number} width
   * @param {number} yOffset
   * @param {string} direction
   */
  mouseenterHandler(e, message, width, yOffset, direction) {
    e.preventDefault();
    e.stopPropagation();

    // Log the interaction
    const eventName = 'annotation shown';
    let elementName = 'score annotation original';

    if (message.includes('current')) {
      elementName = 'score annotation current';
    }

    if (message.includes('needed')) {
      elementName = 'score annotation threshold';
    }

    this.logger?.addLog({
      eventName,
      elementName
    });

    const node = e.currentTarget;
    this.mouseoverTimeout = setTimeout(() => {
      const position = node.getBoundingClientRect();
      const curWidth = position.width;
      const tooltipCenterX = position.x + curWidth / 2;
      const tooltipCenterY = position.y - yOffset;
      this.tooltipConfig.html = `
        <div class='tooltip-content' style='display: flex; flex-direction:
          column; justify-content: center;'>
          ${message}
        </div>
      `;
      this.tooltipConfig.width = width;
      this.tooltipConfig.maxWidth = width;
      this.tooltipConfig.left = tooltipCenterX - this.tooltipConfig.width / 2;
      this.tooltipConfig.top = tooltipCenterY;
      this.tooltipConfig.fontSize = '0.8rem';
      this.tooltipConfig.show = true;
      this.tooltipConfig.orientation = direction;
      this.tooltipConfigStore.set(this.tooltipConfig);
    }, 200);
  }

  mouseleaveHandler() {
    clearTimeout(this.mouseoverTimeout);
    this.mouseoverTimeout = null;
    this.tooltipConfig.show = false;
    this.tooltipConfigStore.set(this.tooltipConfig);
  }

  initSVG = () => {
    // Set the SVG height to fit its container
    this.svg = d3
      .select(this.component)
      .select('.score-svg')
      .attr('height', this.height)
      .attr('width', this.width)
      .attr('viewBox', `0 0 ${this.width} ${this.height}`)
      .attr('preserveAspectRatio', 'none');

    const content = this.svg
      .append('g')
      .attr('class', 'content')
      .attr(
        'transform',
        `translate(${this.padding.left},
        ${this.padding.top})`
      );

    const contentWidth = this.width - this.padding.right - this.padding.left;
    const contentHeight = this.height - this.padding.top - this.padding.bottom;

    const botLayer = content.append('g').attr('class', 'bot-layer');
    const midLayer = content.append('g').attr('class', 'mid-layer');
    const topLayer = content.append('g').attr('class', 'top-layer');

    // Draw the bottom score bar
    const botRect = botLayer
      .append('rect')
      .attr('class', 'back-rect')
      .attr('y', contentHeight - this.rectHeight)
      .attr('width', contentWidth)
      .attr('height', this.rectHeight)
      .attr('rx', this.rectRadius)
      .attr('ry', this.rectRadius);

    // Draw the top score bar
    // Prepare for a clip path
    const clip = content
      .append('clipPath')
      .attr('id', `score-bar-clip-${this.planLabel.planIndex}`);

    clip.node().appendChild(botRect.clone().classed('back-rect', false).node());

    // Draw the top rect
    midLayer
      .append('rect')
      .attr('class', 'top-rect')
      .attr('y', contentHeight - this.rectHeight)
      .attr('width', this.xScale(this.curValue))
      .attr('height', this.rectHeight)
      .attr('clip-path', `url(#score-bar-clip-${this.planLabel.planIndex})`)
      .classed('in-range', this.isInRange)
      .on('mouseenter', (e) =>
        this.mouseenterHandler(
          e,
          `Your current score ${formatter(this.curValue)}`,
          125,
          -10,
          'n'
        )
      )
      .on('mouseleave', () => this.mouseleaveHandler());

    // Draw the bottom lines
    topLayer
      .append('rect')
      .attr('class', 'original-value')
      .attr('x', this.xScale(this.originalValue) - this.lineWidth / 2)
      .attr('width', this.lineWidth)
      .attr('y', 5)
      .attr('height', contentHeight - 5)
      .on('mouseenter', (e) =>
        this.mouseenterHandler(
          e,
          `Your original score ${formatter(this.originalValue)}`,
          130,
          15,
          's'
        )
      )
      .on('mouseleave', () => this.mouseleaveHandler());

    topLayer
      .append('rect')
      .attr('class', 'max-threshold')
      .attr('x', this.xScale(this.maxThreshold) - this.lineWidth / 2)
      .attr('width', this.lineWidth)
      .attr('height', contentHeight)
      .on('mouseenter', (e) =>
        this.mouseenterHandler(
          e,
          `Score needed to obtain your desired decision <br> <= ${formatter(
            this.maxThreshold
          )}`,
          170,
          0,
          's'
        )
      )
      .on('mouseleave', () => this.mouseleaveHandler());

    topLayer
      .append('rect')
      .attr('class', 'min-threshold')
      .attr('x', this.xScale(this.minThreshold) - this.lineWidth / 2)
      .attr('width', this.lineWidth)
      .attr('height', contentHeight)
      .on('mouseenter', (e) =>
        this.mouseenterHandler(
          e,
          `Score needed to obtain your desired decision <br> >= ${formatter(
            this.minThreshold
          )}`,
          170,
          20,
          's'
        )
      )
      .on('mouseleave', () => this.mouseleaveHandler());

    this.svgInitialized = true;
  };
}
