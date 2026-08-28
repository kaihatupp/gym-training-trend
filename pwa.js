if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js")
      .then((registration) => {
        // GitHub Pagesはsw.js自体にも数分間のキャッシュを付与するため、
        // 開くたびに明示的に更新確認を行い、反映のタイムラグを縮める。
        registration.update();
      })
      .catch((err) => {
        console.error("Service worker registration failed:", err);
      });
  });

  // 新しいService Workerが有効化されたら、開いたままの画面にも即座に反映されるよう
  // 一度だけ自動リロードする(手動で何度も開き直さなくて済むようにするため)。
  let refreshingAfterUpdate = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshingAfterUpdate) return;
    refreshingAfterUpdate = true;
    window.location.reload();
  });
}
