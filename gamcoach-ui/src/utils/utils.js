import d3 from './d3-import';

/**
 * Pre-process the svg string to replace fill, stroke, color settings
 * @param {string} svgString
 * @param {string[]} resetColors A list of colors to reset to currentcolor
 * @returns {string}
 */
export const preProcessSVG = (svgString, resetColors=[]) => {
  let newString = svgString
    .replaceAll('black', 'currentcolor')
    .replaceAll('fill:none', 'fill:currentcolor')
    .replaceAll('stroke:none', 'fill:currentcolor');

  resetColors.forEach(c => {
    newString = newString.replaceAll(c, 'currentcolor');
  });

  return newString;
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

/**
 * Download a JSON file
 * @param {any} object
 * @param {HTMLElement} dlAnchorElem
 * @param {string} fileName
 */
export const downloadJSON = (
  object,
  dlAnchorElem,
  fileName = 'download.json'
) => {
  const dataStr =
    'data:text/json;charset=utf-8,' +
    encodeURIComponent(JSON.stringify(object));
  dlAnchorElem.setAttribute('href', dataStr);
  dlAnchorElem.setAttribute('download', `${fileName}`);
  dlAnchorElem.click();
};

/**
 * Download a text file
 * @param {string} textString
 * @param {HTMLElement} dlAnchorElem
 * @param {string} fileName
 */
export const downloadText = (
  textString,
  dlAnchorElem,
  fileName = 'download.json'
) => {
  const dataStr =
    'data:text/plain;charset=utf-8,' + encodeURIComponent(textString);
  dlAnchorElem.setAttribute('href', dataStr);
  dlAnchorElem.setAttribute('download', `${fileName}`);
  dlAnchorElem.click();
};
