import d3 from '../../utils/d3-import';
import { config } from '../../config';

const colors = config.colors;

export class ScorePanel {
  width = 200;
  height = 40;
  rectHeight = 13;
  rectRadius = 6;

  curValue = 0.6;
  minThreshold = 0.5;
  maxThreshold = 0.5;

  padding = {
    top: 5,
    bottom: 8,
    right: 1,
    left: 1
  };

  /** @type {HTMLElement} */
  component;
  xScale;

  constructor(component) {
    this.component = component;

    // Initialize scales
    this.xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([0, this.width - this.padding.right - this.padding.left]);
  }

  initSVG = () => {
    // Set the SVG height to fit its container

    const svg = d3.select(this.component)
      .select('.score-svg')
      .attr('height', this.height)
      .attr('width', this.width);

    const content = svg.append('g')
      .attr('class', 'content')
      .attr('transform', `translate(${this.padding.left},
        ${this.padding.top})`);

    const contentWidth = this.width - this.padding.right - this.padding.left;
    const contentHeight = this.height - this.padding.top - this.padding.bottom;

    const botLayer = content.append('g')
      .attr('class', 'bot-layer');

    const midLayer = content.append('g')
      .attr('class', 'mid-layer');

    const topLayer = content.append('g')
      .attr('class', 'top-layer');

    // Draw the bottom score bar
    const botRect = midLayer.append('rect')
      .attr('class', 'back-rect')
      .attr('y', contentHeight - this.rectHeight)
      .attr('width', contentWidth)
      .attr('height', this.rectHeight)
      .attr('rx', this.rectRadius)
      .attr('ry', this.rectRadius);

    // Draw the top score bar
    // Prepare for a clip path
    const clip = content.append('clipPath')
      .attr('id', 'score-bar-clip');

    clip.node()
      .appendChild(
        botRect.clone()
          .classed('back-rect', false)
          .node()
      );

    // Draw the top rect
    topLayer.append('rect')
      .attr('class', 'top-rect')
      .attr('y', contentHeight - this.rectHeight)
      .attr('width', this.xScale(this.curValue))
      .attr('height', this.rectHeight)
      .attr('clip-path', 'url(#score-bar-clip)');

    // Draw the bottom lines
    // botLayer.append('rect')

  };

}
