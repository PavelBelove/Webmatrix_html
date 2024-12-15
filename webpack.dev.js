const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  output: {
    filename: '[name].bundle.js',
  },
  devServer: {
    static: './dist',
    hot: true,
    open: true,
    port: 9000,
    historyApiFallback: true,
    client: {
      overlay: true,
    },
  },
  optimization: {
    runtimeChunk: 'single',
  },
});
