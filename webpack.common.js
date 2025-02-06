const HtmlBundlerPlugin = require('html-bundler-webpack-plugin');
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

module.exports = {
  entry: {
    index: './src/index.html',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'babel-loader',
      },
      {
        test: /\.css$/,
        use: ['css-loader'],
      },
    ],
  },
  plugins: [
    new HtmlBundlerPlugin({
      js: {
        inline: true,
      },
      css: {
        inline: true,
      },
      minify: {
        html: true,
        css: true,
        js: true,
      },
    }),
  ],
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          format: {
            comments: false,
          },
          compress: {
            drop_console: false, // Оставляем console.log для отладки
          },
        },
        extractComments: false,
      }),
      new CssMinimizerPlugin(),
    ],
    // Отключаем разделение на чанки
    splitChunks: false,
    // Отключаем runtime
    runtimeChunk: false,
  },
};
