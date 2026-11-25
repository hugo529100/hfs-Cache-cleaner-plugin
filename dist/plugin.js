exports.description = "Adds a cache cleaner button to user panel to clear IndexedDB, Blob URLs and Cache Storage"
exports.version = 3  // 版本号升级
exports.apiRequired = 1
exports.frontend_js = 'main.js'
exports.frontend_css = 'style.css'
exports.repo = "hugo529100/hfs-Cache-cleaner-plugin"

exports.init = (api) => {
  return {
    // 这里可以添加后端通知前端的逻辑（如果需要）
  }
}