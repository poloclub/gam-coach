import d3 from '../../utils/d3-import';
import { config } from '../../config';

const colors = config.colors;

export class ScorePanel {
  width;
  height = 30;
  rectHeight = 8;
  rectRadius = 5;
  lineWidth = 2;
  plan;

  curValue = 0.62;
  originalValue = 0.4;
  minThreshold = 0.5;
  maxThreshold = 0.5;

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
   * @param {object} plan
   */
  constructor(component, scoreWidth, plan) {
    this.component = component;
    // this.width = scoreWidth - 50;
    this.plan = plan;

    // To figure out the svg width, we need to consider the width of the text
    this.width = scoreWidth - plan.textWidth - 5;

    // Initialize scales
    this.xScale = d3
      .scaleLinear()
      .domain([0, 1])
      .range([0, this.width - this.padding.right - this.padding.left]);
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

  initSVG = () => {
    // Set the SVG height to fit its container
    const svg = d3
      .select(this.component)
      .select('.score-svg')
      .attr('height', this.height)
      .attr('width', this.width)
      .attr('viewBox', `0 0 ${this.width} ${this.height}`)
      .attr('preserveAspectRatio', 'none');

    const content = svg
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
    const clip = content.append('clipPath')
      .attr('id', `score-bar-clip-${this.plan.planIndex}`);

    clip.node().appendChild(botRect.clone().classed('back-rect', false).node());

    // Draw the top rect
    midLayer
      .append('rect')
      .attr('class', 'top-rect')
      .attr('y', contentHeight - this.rectHeight)
      .attr('width', this.xScale(this.curValue))
      .attr('height', this.rectHeight)
      .attr('clip-path', `url(#score-bar-clip-${this.plan.planIndex})`)
      .classed('in-range', this.isInRange)
      .append('title')
      .text('Current score to make the decision');

    // Draw the bottom lines
    topLayer
      .append('rect')
      .attr('class', 'original-value')
      .attr('x', this.xScale(this.originalValue) - this.lineWidth / 2)
      .attr('width', this.lineWidth)
      .attr('y', 5)
      .attr('height', contentHeight - 5)
      .append('title')
      .text('Your original score');

    topLayer
      .append('rect')
      .attr('class', 'min-threshold')
      .attr('x', this.xScale(this.minThreshold) - this.lineWidth / 2)
      .attr('width', this.lineWidth)
      .attr('height', contentHeight)
      .append('title')
      .text('Threshold to obtain your desired decision');

    topLayer
      .append('rect')
      .attr('class', 'max-threshold')
      .attr('x', this.xScale(this.maxThreshold) - this.lineWidth / 2)
      .attr('width', this.lineWidth)
      .attr('height', contentHeight)
      .append('title')
      .text('Threshold to obtain your desired decision');
  };
}
