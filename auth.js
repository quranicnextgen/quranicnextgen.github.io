// Where Google, Microsoft and Dropbox send the reader back after signing in.
// It only hands the answer to the app (on this same site) and leaves at once;
// the app checks it against what it asked for before using any of it.
(function () {
  var href = location.href;
  // the answer must not stay in the address bar or the history
  try { history.replaceState(null, '', location.pathname); } catch (e) {}
  if (window.parent !== window) {
    // a renewal out of sight, in a frame of the app
    window.parent.postMessage({ qngAuth: href }, location.origin);
    return;
  }
  try {
    localStorage.setItem('qng.cloud.result', JSON.stringify({ href: href, at: Date.now() }));
  } catch (e) {
    document.getElementById('m').textContent = 'Storan pelayar disekat. Log masuk tidak dapat diteruskan.';
    return;
  }
  location.replace(new URL('./#/me', location.href).href);
})();
