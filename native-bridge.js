/* Archery Lab – γέφυρα για APK (Capacitor).
   Στο WebView του Android το <a download> με blob: δεν κατεβάζει τίποτα.
   Εδώ το πιάνουμε και γράφουμε το αρχείο στη συσκευή + ανοίγουμε το μενού "Κοινοποίηση"
   (από εκεί: Αποθήκευση στο Drive / Αρχεία / Γκαλερί κ.λπ.).
   Στον browser / PWA δεν κάνει τίποτα. */
(function () {
  var C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return;
  var P = C.Plugins || {};
  var FS = P.Filesystem, SH = P.Share;
  if (!FS || !SH) return;

  // Το κανονικό Web Share με αρχεία δεν είναι αξιόπιστο στο WebView -> πάμε πάντα από το plugin
  try { navigator.canShare = function () { return false; }; } catch (e) {}

  function toast(msg) {
    var t = document.getElementById('toast');
    if (t) { t.textContent = msg; t.classList.add('show'); setTimeout(function () { t.classList.remove('show'); }, 2500); }
  }

  function b64(blobPart) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(String(r.result).split(',')[1] || ''); };
      r.onerror = function () { rej(r.error); };
      r.readAsDataURL(blobPart);
    });
  }

  async function saveAndShare(url, name) {
    try {
      var blob = await (await fetch(url)).blob();
      var path = 'archerylab/' + name;
      var CH = 3 * 512 * 1024; // πολλαπλάσιο του 3 -> σωστό base64 ανά κομμάτι
      try { await FS.deleteFile({ path: path, directory: 'CACHE' }); } catch (e) {}
      for (var off = 0, first = true; off < blob.size || first; off += CH) {
        var data = await b64(blob.slice(off, off + CH));
        if (first) { await FS.writeFile({ path: path, data: data, directory: 'CACHE', recursive: true }); first = false; }
        else { await FS.appendFile({ path: path, data: data, directory: 'CACHE' }); }
        if (blob.size === 0) break;
      }
      var u = await FS.getUri({ path: path, directory: 'CACHE' });
      await SH.share({ title: name, url: u.uri, dialogTitle: 'Αποθήκευση / Κοινοποίηση' });
    } catch (e) {
      if (e && /cancel/i.test(String(e.message || e))) return;
      console.error(e);
      toast('Αποτυχία αποθήκευσης: ' + (e && e.message ? e.message : e));
    }
  }

  var origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.hasAttribute('download') && /^blob:/.test(this.href)) {
      saveAndShare(this.href, this.getAttribute('download') || ('archerylab-' + Date.now()));
      return;
    }
    return origClick.apply(this, arguments);
  };
})();
