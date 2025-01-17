module.exports = function (api) {
  api.cache(true);
  return {
     plugins: [
    ['@babel/plugin-proposal-class-properties', { loose: false }],
    ['@babel/plugin-transform-private-methods', { loose: false }],
    ['@babel/plugin-transform-private-property-in-object', { 'loose': false }]
  ],
    presets: ['babel-preset-expo'],
  };
};
