# 題檔即練

匯入或載入 JSON／ZIP 題庫，將文字與程式碼轉成互動練習。支援多科目、單選、多選、是非、填答、問答、錯題本、收藏、成績統計與本機備份。

## 題目格式

題目 `question`、選項 `options` 的值及 `explanation` 均可使用 Markdown，例如 `**重點**`、清單、行內程式碼 `print()`，以及三個反引號包住的 Java／Python 程式碼區塊。`contentBlocks` 亦支援 `text`、`markdown`、`code` 文字區塊；本版本不使用圖片。

```json
{
  "subject": "Python 基礎",
  "subjectId": "python-basics",
  "chapter_1": [
    {
      "id": "q1",
      "type": "single",
      "question": "閱讀程式碼：\n\n```python\nprint(1 + 2)\n```",
      "options": {"A": "`3`", "B": "`12`"},
      "answer": "A",
      "explanation": "`+` 會對整數進行加法。"
    }
  ]
}
```

## GitHub Pages

將本目錄所有檔案上傳新儲存庫的 `main` 分支根目錄，使用 Settings → Pages → Deploy from a branch → `main` / `(root)`。網站包含公開 Java 練習題庫，其他科目可由使用者匯入。



## 操作方式

新增科目與更新題庫都在「題庫設定 → 新增科目／題庫管理」操作。匯入新 subjectId 會建立另一科，匯入相同 subjectId 會更新原題庫；上方科目下拉選單切換科目，並提供「返回首頁」。本版不含 Google Drive 同步與 OAuth。

若線上仍顯示 Google Drive，請確認 GitHub 儲存庫的 `js/googleSync.js` 已刪除、舊版 `index.html`/`js/app.js` 已替換，並強制重新整理網站（Ctrl+F5）。


## 題目呈現原則

一般文字與選項維持自然文字排版，不強制使用 Markdown 樣式；需要的程式碼可用程式碼文字區塊保留縮排。教材圖片若能無損以文字、Markdown 表格、公式或程式碼呈現，優先改為可閱讀文字；無法忠實替代的圖像不應猜測或刪改題意。


## 內建公開題庫與系統色彩

預載 Java 期中考、嵌入式系統期中考、工作研究與人因工程。首次進站取得三份 JSON，已有使用者匯入的同 ID 題庫不會被覆蓋；作答紀錄仍依科目分開儲存。

深色／淺色顏色依照裝置的 `prefers-color-scheme` 自動切換；無需設定或儲存主題偏好。

使用 GitHub Pages `Deploy from a branch → main → /(root)`；所有檔案放在儲存庫根目錄。


## 刪除與檢視

練習結算預設檢視全部題目，可以切換只看錯題。題庫設定可以選擇單一科目或全部本機題庫，須二次確認才會刪除；只移除本機題庫，不刪除學習紀錄，亦不會刪除 GitHub 上的公開 JSON。內建題庫刪除後不會自動恢復，需重新匯入。清除記錄只作用於目前科目；不再提供一鍵清空整個 origin localStorage 的危險操作。


### 專注答題模式

開始練習後自動收起左側導覽列，讓題目集中顯示；完成結算與查看詳解時仍維持專注版面。按「返回首頁」後恢復導覽列。
