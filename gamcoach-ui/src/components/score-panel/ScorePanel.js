import d3 from '../../utils/d3-import';
import { config } from '../../config';

const width = 200;
const height = 40;
const colors = config.colors;

const padding = {
  top: 5,
  bottom: 5,
  right: 1,
  left: 1
};

export const initScoreSVG = (component) => {
  // Set the SVG height to fit its container

  const svg = d3.select(component)
    .select('.score-svg')
    .attr('height', height)
    .attr('width', width);

  const content = svg.append('g')
    .attr('class', 'content')
    .attr('transform', `translate(${padding.left}, ${padding.top})`);

  // Add a temp border
  content.append('rect')
    .attr('width', width - padding.right - padding.left)
    .attr('height', height - padding.top - padding.bottom)
    .style('stroke', colors['gray-400'])
    .style('fill', 'none');
};
