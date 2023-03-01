/* eslint-disable */
const path = require('path');

module.exports = {
  target: 'node',
  entry: path.resolve(__dirname, 'example/index.ts'),
  output: {
    path: path.resolve(__dirname, 'dist/script'),
    filename: 'make-report.js',
    library: {
      type: 'commonjs',
    },
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },

  optimization: {
    minimize: false,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
        },
        exclude: /node_modules/,
      },
      {
        test: /\.(png|jpe?g|gif)$/i,
        use: [
          {
            loader: 'url-loader',
            options: {
              name: '[name].[ext]',
            },
          },
        ],
      },
    ],
  },
};
