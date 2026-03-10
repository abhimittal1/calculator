/**
 * Manual Jest mock for react-native-charts-wrapper.
 * Renders plain View elements so tests don't need native MPAndroidChart bindings.
 */
const React = require('react');
const { View } = require('react-native');

const LineChart = jest.fn(_props => React.createElement(View, { testID: 'LineChart' }));

const BarChart = jest.fn(_props => React.createElement(View, { testID: 'BarChart' }));

const PieChart = jest.fn(_props => React.createElement(View, { testID: 'PieChart' }));

const processColor = jest.fn(color => color);

module.exports = { LineChart, BarChart, PieChart, processColor };
