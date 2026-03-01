const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  entry: {
    'service-worker': './src/background/service-worker.ts',
    'content-script': './src/content/content-script.ts',
    'sidebar': './src/sidebar/sidebar-entry.tsx'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css'
    }),
    new CopyPlugin({
      patterns: [
        { from: 'public/manifest.json', to: 'manifest.json' },
        { from: 'public/icons', to: 'icons' },
        { from: 'src/content/content-styles.css', to: 'content-styles.css' }
      ]
    }),
    new HtmlWebpackPlugin({
      template: './src/sidebar/sidebar-index.html',
      filename: 'sidebar.html',
      chunks: ['sidebar']
    })
  ],
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    alias: {
      '@glossarly/shared': path.resolve(
        __dirname,
        '../../packages/shared/src'
      )
    }
  },
  externals: {
    chrome: 'chrome'
  }
};
