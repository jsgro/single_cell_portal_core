const { environment } = require('@rails/webpacker')

environment.loaders.delete('nodeModules')

// Set the max parallelization for the minification pipeline
// See https://github.com/webpack-contrib/terser-webpack-plugin/issues/143#issuecomment-573954013
//      for a description of the issue
// See https://github.com/rails/webpacker/issues/2131 for discussion on how the configuration
//      is applied through webpacker
if (environment.config.optimization) {
  environment.config.optimization.minimizer.find(m => m.constructor.name === 'TerserPlugin').options.terserOptions.parallel = 4
  environment.config.optimization.minimizer.find(m => m.constructor.name === 'TerserPlugin').options.parallel = 4
}

/**
 * Fixes following error seen upon running `bin/webpack-dev-server`
 * ValidationError: Invalid options object. PostCSS Loader has been initialized using an options object that does not match the API schema.
 *
 * From https://github.com/rails/webpacker/issues/2784#issuecomment-737003955
 * by way of https://candland.net/2021/upgrading-rails-webpacker-tailwindcss/
 */
function hotfixPostcssLoaderConfig(subloader) {
  const subloaderName = subloader.loader
  if (subloaderName === 'postcss-loader') {
    if (subloader.options.postcssOptions) {
      console.log(
        '\x1b[31m%s\x1b[0m',
        'Remove postcssOptions workaround in config/webpack/environment.js'
      )
    } else {
      subloader.options.postcssOptions = subloader.options.config
      delete subloader.options.config
    }
  }
}

environment.loaders.keys().forEach(loaderName => {
  const loader = environment.loaders.get(loaderName)
  loader.use.forEach(hotfixPostcssLoaderConfig)
})

module.exports = environment
