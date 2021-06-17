process.env.NODE_ENV = process.env.NODE_ENV || 'staging'

const environment = require('./environment')
// we copy over the NODE_ENV to a property called VIEW_ENV, which is used in user-facing JS
// this allows this property to easily be toggled here for development, without impacting build steps
process.env.VIEW_ENV = process.env.NODE_ENV
module.exports = environment.toWebpackConfig()
