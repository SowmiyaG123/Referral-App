const path = require('path');

module.exports = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias, // <--- keep existing aliases
      '@': path.resolve(__dirname, 'app'),
      '@components': path.resolve(__dirname, 'app/components'),
      '@hooks': path.resolve(__dirname, 'app/hooks'),
      '@lib': path.resolve(__dirname, 'app/lib'),
      '@context': path.resolve(__dirname, 'app/context')
    };
    return config;
  },
};
