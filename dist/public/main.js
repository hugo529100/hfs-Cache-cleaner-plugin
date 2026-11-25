(function cacheCleanerPlugin() {
  const TOAST_DELAY = 2000;
  let isShowingToasts = false;
  let toastQueue = [];
  
  // 使用類來管理狀態
  class CacheCleanerManager {
    constructor() {
      this.observer = null;
      this.init();
    }

    init() {
      this.setupObserver();
      this.initialCheck();
    }

    setupObserver() {
      this.observer = new MutationObserver(() => {
        this.checkAndInsertButtons();
      });

      this.observer.observe(document.body, { 
        childList: true, 
        subtree: true 
      });
    }

    initialCheck() {
      setTimeout(() => {
        this.checkAndInsertButtons();
      }, 1000);
    }

    checkAndInsertButtons() {
      this.insertUserPanelButton();
    }

    insertUserPanelButton() {
      const userPanelDialog = this.findUserPanelDialog();
      const buttonExists = !!document.querySelector('#cache-cleaner-user-button');
      
      if (userPanelDialog && !buttonExists) {
        this.createUserPanelButton(userPanelDialog);
      }
    }

    findUserPanelDialog() {
      const dialogs = document.querySelectorAll('div[role="dialog"][aria-modal="true"].dialog');
      
      for (const dialog of dialogs) {
        const hasUserPanel = dialog.querySelector('#user-panel');
        const hasDialogTitle = dialog.querySelector('.dialog-title');
        const titleText = hasDialogTitle?.textContent?.trim();
        
        if (hasUserPanel && titleText === 'User panel') {
          return dialog;
        }
      }
      
      return null;
    }

    createUserPanelButton(userPanelDialog) {
      if (!userPanelDialog) return;

      const oldButton = document.querySelector('#cache-cleaner-user-button');
      if (oldButton) oldButton.remove();

      const userPanel = userPanelDialog.querySelector('#user-panel');
      if (!userPanel) return;

      const divider = document.createElement('div');
      divider.className = 'cache-cleaner-divider';
      
      const cleanButton = this.createCleanButton('cache-cleaner-user-button');
      divider.appendChild(cleanButton);
      
      Object.assign(divider.style, {
        display: 'block',
        width: '100%'
      });
      
      userPanel.appendChild(divider);
    }

    createCleanButton(id) {
      const button = document.createElement('button');
      button.id = id;
      button.className = 'cache-cleaner-button';
      button.textContent = 'Clear Cache & Storage';
      
      button.addEventListener('click', async () => {
        button.disabled = true;
        button.textContent = 'Cleaning...';
        
        try {
          const results = {
            indexedDB: await this.cleanIndexedDB(),
            blobURLs: this.cleanBlobURLs(),
            cacheStorage: await this.cleanCacheStorage(),
            localStorage: this.cleanLocalStorage(),
            sessionStorage: this.cleanSessionStorage(),
            cookies: this.cleanCookies(),
            serviceWorkers: await this.cleanServiceWorkers(),
            fileSystem: await this.cleanFileSystem(),
            pageSettings: this.resetPageSettings()
          };
          
          const cleanedCount = Object.values(results).filter(Boolean).length;
          
          if (cleanedCount === 0) {
            addToToastQueue('No caches were cleaned', 'info');
          } else {
            addToToastQueue(`Cleaned ${cleanedCount} types of storage`, 'success');
          }
          
          // 添加頁面重載選項
          setTimeout(() => {
            if (confirm('Cache cleaned! Reload page to apply changes?')) {
              window.location.reload();
            }
          }, 1000);
          
        } catch (error) {
          console.error('Cache cleaning failed:', error);
          addToToastQueue('Cache cleaning failed: ' + error.message, 'error');
        } finally {
          setTimeout(() => {
            button.disabled = false;
            button.textContent = 'Clear Cache & Storage';
          }, 1000);
        }
      });
      
      return button;
    }

    // 清理 IndexedDB
    async cleanIndexedDB() {
      if (!window.indexedDB) return false;
      
      try {
        const databases = await window.indexedDB.databases();
        const deletions = databases.map(db => {
          if (!db.name) return Promise.resolve(false);
          
          return new Promise((resolve) => {
            const request = indexedDB.deleteDatabase(db.name);
            request.onsuccess = () => resolve(true);
            request.onerror = () => resolve(false);
          });
        });
        
        const results = await Promise.all(deletions);
        const successCount = results.filter(Boolean).length;
        
        if (successCount > 0) {
          addToToastQueue(`Cleaned ${successCount} IndexedDB databases`, 'success');
        }
        
        return successCount > 0;
      } catch (error) {
        console.error('Failed to clean IndexedDB:', error);
        return false;
      }
    }

    // 清理 Blob URLs
    cleanBlobURLs() {
      try {
        let count = 0;
        document.querySelectorAll('img, video, audio, a, iframe').forEach(element => {
          const url = element.src || element.href;
          if (url && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
            if (element.src) element.src = '';
            if (element.href) element.href = '';
            count++;
          }
        });
        
        if (window.blobURLs) {
          count += window.blobURLs.length;
          window.blobURLs.forEach(url => URL.revokeObjectURL(url));
          window.blobURLs = [];
        }
        
        if (count > 0) {
          addToToastQueue(`Cleaned ${count} Blob URLs`, 'success');
        }
        
        return count > 0;
      } catch (error) {
        console.error('Failed to clean Blob URLs:', error);
        return false;
      }
    }

    // 清理 Cache Storage
    async cleanCacheStorage() {
      if (!('caches' in window)) return false;
      
      try {
        const cacheNames = await caches.keys();
        let cleanedCount = 0;
        
        for (const name of cacheNames) {
          const deleted = await caches.delete(name);
          if (deleted) cleanedCount++;
        }
        
        if (cleanedCount > 0) {
          addToToastQueue(`Cleaned ${cleanedCount} caches`, 'success');
        }
        
        return cleanedCount > 0;
      } catch (error) {
        console.error('Failed to clean Cache Storage:', error);
        return false;
      }
    }

    // 新增：清理 LocalStorage
    cleanLocalStorage() {
      try {
        if (!window.localStorage) return false;
        
        const itemCount = localStorage.length;
        if (itemCount > 0) {
          localStorage.clear();
          addToToastQueue(`Cleared ${itemCount} localStorage items`, 'success');
          return true;
        }
        return false;
      } catch (error) {
        console.error('Failed to clean localStorage:', error);
        return false;
      }
    }

    // 新增：清理 SessionStorage
    cleanSessionStorage() {
      try {
        if (!window.sessionStorage) return false;
        
        const itemCount = sessionStorage.length;
        if (itemCount > 0) {
          sessionStorage.clear();
          addToToastQueue(`Cleared ${itemCount} sessionStorage items`, 'success');
          return true;
        }
        return false;
      } catch (error) {
        console.error('Failed to clean sessionStorage:', error);
        return false;
      }
    }

    // 新增：清理 Cookies
    cleanCookies() {
      try {
        if (!document.cookie) return false;
        
        const cookies = document.cookie.split(';');
        let cleanedCount = 0;
        
        cookies.forEach(cookie => {
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          if (name) {
            document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
            cleanedCount++;
          }
        });
        
        if (cleanedCount > 0) {
          addToToastQueue(`Cleaned ${cleanedCount} cookies`, 'success');
        }
        
        return cleanedCount > 0;
      } catch (error) {
        console.error('Failed to clean cookies:', error);
        return false;
      }
    }

    // 新增：清理 Service Workers
    async cleanServiceWorkers() {
      if (!('serviceWorker' in navigator)) return false;
      
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        let cleanedCount = 0;
        
        for (const registration of registrations) {
          await registration.unregister();
          cleanedCount++;
        }
        
        if (cleanedCount > 0) {
          addToToastQueue(`Unregistered ${cleanedCount} service workers`, 'success');
        }
        
        return cleanedCount > 0;
      } catch (error) {
        console.error('Failed to clean service workers:', error);
        return false;
      }
    }

    // 新增：清理 File System API
    async cleanFileSystem() {
      if (!('webkitRequestFileSystem' in window || 'requestFileSystem' in window)) return false;
      
      return new Promise((resolve) => {
        try {
          const requestFS = window.requestFileSystem || window.webkitRequestFileSystem;
          if (!requestFS) {
            resolve(false);
            return;
          }
          
          requestFS(window.TEMPORARY, 0, 
            (fs) => {
              fs.root.removeRecursively(() => {
                addToToastQueue('Cleaned file system', 'success');
                resolve(true);
              }, () => resolve(false));
            },
            () => resolve(false)
          );
        } catch (error) {
          console.error('Failed to clean file system:', error);
          resolve(false);
        }
      });
    }

    // 新增：重置頁面設置
    resetPageSettings() {
      try {
        let resetCount = 0;
        
        // 重置視圖設置
        if (window.viewSettings) {
          window.viewSettings = {};
          resetCount++;
        }
        
        // 重置主題設置
        if (document.documentElement.hasAttribute('data-theme')) {
          document.documentElement.removeAttribute('data-theme');
          resetCount++;
        }
        
        // 清除可能存在的設置元素
        document.querySelectorAll('[data-storage-setting]').forEach(el => {
          el.removeAttribute('data-storage-setting');
          resetCount++;
        });
        
        // 清除 URL 中的設置參數（但不刷新頁面）
        if (window.history && window.history.replaceState) {
          const url = new URL(window.location.href);
          const paramsToRemove = ['view', 'sort', 'theme', 'layout'];
          let changed = false;
          
          paramsToRemove.forEach(param => {
            if (url.searchParams.has(param)) {
              url.searchParams.delete(param);
              changed = true;
            }
          });
          
          if (changed) {
            window.history.replaceState({}, '', url.toString());
            resetCount++;
          }
        }
        
        if (resetCount > 0) {
          addToToastQueue(`Reset ${resetCount} page settings`, 'success');
        }
        
        return resetCount > 0;
      } catch (error) {
        console.error('Failed to reset page settings:', error);
        return false;
      }
    }

    destroy() {
      if (this.observer) {
        this.observer.disconnect();
      }
    }
  }

  // Toast 通知系統
  const showToast = (message, type = 'success') => {
    if (typeof HFS !== 'undefined' && HFS.toast) {
      HFS.toast(message, type);
    } else {
      console.log(`${type.toUpperCase()}: ${message}`);
    }
  };

  const processToastQueue = async () => {
    if (isShowingToasts || toastQueue.length === 0) return;
    
    isShowingToasts = true;
    while (toastQueue.length > 0) {
      const [message, type] = toastQueue.shift();
      showToast(message, type);
      await new Promise(resolve => setTimeout(resolve, TOAST_DELAY));
    }
    isShowingToasts = false;
  };

  const addToToastQueue = (message, type) => {
    toastQueue.push([message, type]);
    processToastQueue();
  };

  // 初始化插件
  let cacheCleanerManager;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      cacheCleanerManager = new CacheCleanerManager();
    });
  } else {
    cacheCleanerManager = new CacheCleanerManager();
  }

  window.cacheCleanerManager = cacheCleanerManager;
})();