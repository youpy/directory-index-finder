
var Ci = Components.interfaces;
var Cc = Components.classes;

var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
var alertsService = Cc["@mozilla.org/alerts-service;1"].getService(Ci.nsIAlertsService);
var observerService = Cc['@mozilla.org/observer-service;1'].getService(Ci.nsIObserverService);

var checkedDirs = {};
var foundDirs = {};

var DirectoryIndexFinder = {
  observe: function(aSubject, aTopic, aData) {
    if (aTopic == 'http-on-examine-response') {
      var httpChannel = aSubject.QueryInterface(Ci.nsIHttpChannel);
      var mimeType = httpChannel.getResponseHeader('Content-Type').split(';')[0];
      var contentLength = httpChannel.getResponseHeader('Content-Length');

      if (mimeType.match(/^(image|audio)/) && contentLength > 1024 * 2) {
				var guessUrl = httpChannel.originalURI.resolve('.');
				
       	// prevent loop
				if(guessUrl == httpChannel.originalURI.resolve(''))
					return;

				if(!checkedDirs[guessUrl]) {
					checkedDirs[guessUrl] = true;

					var req = new XMLHttpRequest();
					req.open("GET", guessUrl, true);
					req.onload = function(e) {
						if(req.responseText.match(/<title>Index of/i)) {
							if(!foundDirs[guessUrl]) {
								foundDirs[guessUrl] = true;
								alertsService.showAlertNotification(null, 'Found directory index', guessUrl, false, guessUrl)
								openAndReuseOneTabPerURL(guessUrl);
							}
						}
					};

					req.send(null);
				}
      }
    }
  },
  start: function() {
    addToListener(this);
  }
};

window.addEventListener('load', function() {
  DirectoryIndexFinder.start();
}, false);

function addToListener(obj) {
  observerService.addObserver(obj, 'http-on-examine-response', false);
}

function openAndReuseOneTabPerURL(url) {
  var browserEnumerator = wm.getEnumerator("navigator:browser");

  var found = false;
  while (!found && browserEnumerator.hasMoreElements()) {
    var browserInstance = browserEnumerator.getNext().getBrowser();

    var numTabs = browserInstance.tabContainer.childNodes.length;
    for(var index=0; index<numTabs; index++) {
      var currentBrowser = browserInstance.getBrowserAtIndex(index);
      if (url == currentBrowser.currentURI.spec) {
       	// do nothing
        break;
      }
    }
  }

  if (!found) {
    var recentWindow = wm.getMostRecentWindow("navigator:browser");
    if (recentWindow) {
      recentWindow.gBrowser.addTab(url);
    }
    else {
      window.open(url);
    }
  }
}
