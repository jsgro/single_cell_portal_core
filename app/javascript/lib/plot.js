import Plotly from 'plotly.js-dist'

/**
 * Wrapper for Plotly, to enable tests
 *
 * Having this function in a separate module is needed for mocking in related
 * test (study-violin-plot.test.js), due to (1) and buggy workaround (2).
 *
 * 1) SVG path getTotalLength method is undefined in jsdom library used by Jest
 *    Details: https://github.com/jsdom/jsdom/issues/1330
 *
 * 2) jest.mock() does not work when module name has ".js" in it
 *    Details: https://github.com/facebook/jest/issues/6420
 */
export {Plotly};

// default title font settings for axis titles in plotly
export const titleFont = {
    family: 'Helvetica Neue',
    size: 16,
    color: '#333'
};

// default label font settings for colorbar titles in plotly
export const labelFont = {
    family: 'Helvetica Neue',
    size: 12,
    color: '#333'
};

export const lineColor = 'rgb(40, 40, 40)';

/**
 * TODO: Remove this in favor of Plotly export above.

 * Wrapper for Plotly.newPlot, to enable tests
 *
 * Having this function in a separate module is needed for mocking in related
 * test (study-violin-plot.test.js), due to (1) and buggy workaround (2).
 *
 * 1) SVG path getTotalLength method is undefined in jsdom library used by Jest
 *    Details: https://github.com/jsdom/jsdom/issues/1330
 *
 * 2) jest.mock() does not work when module name has ".js" in it
 *    Details: https://github.com/facebook/jest/issues/6420
 */
export function plot(graphElementId, data, layout) {
  Plotly.newPlot(
    graphElementId,
    data,
    layout
  )
}
