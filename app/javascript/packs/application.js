import $ from 'jquery'

window.$ = $
window.jQuery = $

window.SCP.componentsToRender = []
window.SCP.renderComponentFromRails = function(targetId, componentName, args) {
  if (window.SCP.renderComponent) {
    window.SCP.renderComponent(targetId, componentName, args)
  } else {
    window.SCP.componentsToRender.push({
      targetId, componentName, args
    })
  }
}
