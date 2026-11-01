/** 清除目前網站來源（origin）的所有 localStorage 項目。 */
/** 危險的舊版全站清除函式；目前 UI 不再提供此操作。 */
export function clearAllLocalStorage(storage = localStorage) {
  storage.clear();
}
