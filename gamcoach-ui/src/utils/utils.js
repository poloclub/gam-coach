import d3 from './d3-import';

/**
 * Pre-process the svg string to replace fill, stroke, color settings
 * @param {string} svgString
 * @returns {string}
 */
const preProcessSVG = (svgString) => {
  return svgString
    .replaceAll('black', 'currentcolor')
    .replaceAll('fill:none', 'fill:currentcolor')
    .replaceAll('stroke:none', 'fill:currentcolor');
};

/**
 * Dynamically bind SVG files as inline SVG strings in this component
 * @param {HTMLElement} component Current component
 * @param {object[]} iconList A list of icon mappings (class => icon string)
 */
export const bindInlineSVG = (component, iconList) => {
  iconList.forEach((d) => {
    d3.select(component)
      .selectAll(`.svg-icon.${d.class}`)
      .each((_, i, g) => {
        const ele = d3.select(g[i]);
        let html = ele.html();
        html = html.concat(' ', preProcessSVG(d.svg));
        ele.html(html);
      });
  });
};