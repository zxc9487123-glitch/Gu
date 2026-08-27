# 使用 GitHub Actions 產生 Android APK

本專案已提供 `.github/workflows/android-debug-apk.yml`，使用 GitHub Actions 在 Ubuntu 雲端執行 Expo 預建置與 Android Gradle 建置。流程產生的是 **debug APK**，適合內部測試與直接安裝至 Android 手機；它不是 Google Play 上架用的正式簽章版本。

## 一次性設定

| 步驟 | 操作                                                                                               |
| ---- | -------------------------------------------------------------------------------------------------- |
| 1    | 在 GitHub 建立新的私有儲存庫，例如 `bookkeeping-dashboard`。若不想公開程式碼，請勿建立公開儲存庫。 |
| 2    | 將本專案推送至該儲存庫，確認 `.github/workflows/android-debug-apk.yml` 已一併提交。                |
| 3    | 打開 GitHub 儲存庫的 **Actions** 分頁，若 GitHub 首次要求授權工作流程，選擇啟用。                  |

> GitHub Free 帳戶的私有儲存庫每月包含 2,000 分鐘 GitHub-hosted runner 額度；公開儲存庫使用標準 runner 不計費。請以 GitHub 顯示的最新用量為準。[GitHub Actions 計費說明](https://docs.github.com/en/billing/concepts/product-billing/github-actions)

## 產生 APK

1. 開啟儲存庫中的 **Actions**。
2. 在左側選擇 **Build Android Debug APK**。
3. 按右上角 **Run workflow**，再確認執行。
4. 等待工作流程完成。第一次建置通常比後續建置久，因為需要下載 Android 與 Gradle 相依套件。
5. 點進成功的 workflow run，於頁面底部 **Artifacts** 下載 `bookkeeping-debug-apk-<執行編號>`。
6. 解壓縮後取得 `app-debug.apk`，傳送到 Android 手機安裝。

## Android 手機安裝

Android 裝置若提示禁止未知來源安裝，請在系統設定中僅授權目前用來開啟 APK 的檔案管理器或瀏覽器。安裝完成後，可回到系統設定撤銷該授權。由於這是 debug APK，僅應由自己或受信任的測試者安裝。

## 更新版本

每次將新程式碼推送至 GitHub 後，回到 Actions 手動執行一次 **Build Android Debug APK** 即可。工作流程只會在手動觸發時建置，避免不必要耗用分鐘數。

## 正式發布注意事項

若日後需要上架 Google Play，應另外建立 release 簽章與 Android App Bundle（AAB）流程。請將 keystore 以 GitHub Secrets 保存，不可提交至程式碼儲存庫，也不可將密碼寫進 workflow 檔案。
