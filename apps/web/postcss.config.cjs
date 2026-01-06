module.exports = {
  plugins: [
  require('postcss-preset-mantine')({ autoRem: true }),
  require('postcss-simple-vars')(),
  ],
};