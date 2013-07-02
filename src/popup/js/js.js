// http://developer.chrome.com/extensions/windows.html
// http://developer.chrome.com/extensions/tabs.html

// system colors
// http://nadeausoftware.com/articles/2010/07/java_tip_systemcolors_mac_os_x_user_interface_themes

DEBUG = true;

if(!DEBUG) {
  console.log = function(){};
}

// uncomment once, run the extension to delete storage
// chrome.storage.local.set({tabs: null});

// -------------------------------------------------------

// copy & paste from http://stackoverflow.com/questions/5723154/truncate-a-string-in-the-middle-with-javascript
var truncate = function (fullStr, strLen, separator) {
    if (fullStr.length <= strLen) return fullStr;
    
    separator = separator || '...';
    
    var sepLen = separator.length,
        charsToShow = strLen - sepLen,
        frontChars = Math.ceil(charsToShow/2),
        backChars = Math.floor(charsToShow/2);
    
    return fullStr.substr(0, frontChars) + 
           separator + 
           fullStr.substr(fullStr.length - backChars);
};

// template for one window
var windowTemplate = function(win) {
  return $(' \
    <li class="window" id="window-'+escape(win['id'])+'" \
        data-id="'        + escape(win['id'])+'" \
        data-focused="'   + escape(win['focused'])+'" \
        data-incognito="' + escape(win['incognito'])+'" \
        data-type="'      + escape(win['type'])+'" \
        data-state="'     + escape(win['state'])+'"> \
      <div class="info"> \
        <span class="title">Window #'+escape(win['id'])+'</span> \
      </div> \
      <ul class="tabs"> \
      </ul> \
    </li>');
}

// template for one tab in window
var tabsTemplate = function(tab, activeTab){
  if(tab['url'] == '') {
    // if the most important part (=url) is missing for some reasons, 
    // dont display the item!
    console.log('missing url for tab item', tab);
    return $('');
  }

  if(!activeTab) {
    activeTab = {};
  }

  if(!activeTab.hasOwnProperty('url')) {
    activeTab['url'] = null;
  }


  return $(' \
    <li class="tab" id="tab-'+escape(tab['id'])+'-'+escape(tab['windowId'])+'" \
      data-id="'            + escape(tab['id'])+'" \
      data-window-id="'     + escape(tab['windowId'])+'" \
      data-title="'         + escape(tab['title'])+'" \
      data-fav-icon-url="'  + escape(tab['favIconUrl'])+'" \
      data-index="'         + escape(tab['index'])+'" \
      data-highlighted="'   + escape(tab['highlighted'])+'" \
      data-active="'        + escape(tab['active'])+'" \
      data-pinned="'        + escape(tab['pinned'])+'" \
      data-url="'           + escape(tab['url'])+'" \
      data-status="'        + escape(tab['status'])+'" \
      data-opener-tab-id="' + escape(tab['openerTabId'])+'" \
      data-saved-but-no-window-anymore="' + escape(tab['missingWindow'])+'" \
      data-incognito="'     + escape(tab['incognito'])+'"> \
      <div class="left"> \
        <input type="checkbox" class="remember" data-url="'+escape(tab['url'])+'" title="Remember and close this tab" \
          '+(tab['checked'] ? 'checked' : '')+'> \
        <img src="'+tab['favIconUrl']+'"> \
      </div> \
      <div class="right ' 
        + (activeTab['url'] == tab['url'] ? 'active ' : '') 
        + (tab['missingWindow'] ? 'saved-but-no-window-anymore ' : '')
        + '"> \
        <div class="options"> \
          <div class="close"><img src="img/close.png"></div> \
        </div> \
        <div class="title" \
        title="'+(tab['title'].replace("'", '').replace('"', ''))+'">'
        +(tab['title'] ? truncate(tab['title'], 50, ' ... ')  : 'What?! Where is the title?')+'</div> \
        <div class="url" \
        title="'+(tab['url'].replace("'", '').replace('"', ''))+'" \
        >' 
        + truncate(tab['url'], 60, ' ... ') + '</div> \
      </div> \
    </li>');
  
}


// tab exists in storage? comparison by url
// pass callback(status) as an additional argument,
// status will be true or false
var storageIncludesTab = function(tab, callback) {
  console.log('storageIncludesTab called', tab);

  chrome.storage.local.get('tabs', function(db){
    // make array if its not 
    if(!Array.isArray(db['tabs'])) {
      db['tabs'] = new Array();
    }

    if(db['tabs'].length > 0 && tab.url){
      for(var i=0; i < db['tabs'].length; i++) {
        if(db['tabs'][i]['url'] == tab.url) {
          if(callback) {
            return callback.call(null, true);
          }
          return;
        }
      }
    }
    return callback.call(null, false);
  });
}

// find all saved tabs with oldWindowId and replace it with newWindowId
var updateAllSavedTabsWindowId = function(oldWindowId, newWindowId, callback){
  console.log("updateAllSavedTabsWindowId", "oldWindowId", oldWindowId, 
    "newWindowId", newWindowId);

  // get tabs from storage again
  // things might have changed in popups in other windows
  chrome.storage.local.get('tabs', function(db){
    // make array if its not 
    if(!Array.isArray(db['tabs'])) {
      db['tabs'] = new Array();
    }

    // update saved tabs
    if(db['tabs'].length > 0){
      for(var i=0; i < db['tabs'].length; i++) {
        console.log(oldWindowId, newWindowId, db['tabs'][i]['windowId']);
        if(db['tabs'][i]['windowId'] == oldWindowId) {
          db['tabs'][i]['windowId'] = newWindowId;
        }
      }

      // save updated tabs
      console.log("save updateAllSavedTabsWindowId", db);
      chrome.storage.local.set(db, function(){
        if(chrome.runtime.lastError) {
          console.log('unable to save tab', tab);
          if(callback) return callback.call(null, false);
        }
        if(callback) return callback.call(null, true);
      });

    } else {
      // we didnt update anything, but we dont care
      if(callback) callback.call(null, true);
    }
  });
}

// save tab, pass callback(status) as an additional argument,
// status will be true or false depending on storage success
var saveTab = function(tab, callback) {
  console.log('saving tab', tab);

  // check if tab already exists in storage
  // to prevent double records
  storageIncludesTab(tab, function(includes){
    console.log("storageIncludesTab", includes);
    if(includes) {
      if(callback) return callback.call(null, false);
    } 
    
    // get tabs from storage again
    // things might have changed in popups in other windows
    chrome.storage.local.get('tabs', function(db){
      // make array if its not 
      if(!Array.isArray(db['tabs'])) {
        db['tabs'] = new Array();
      }

      // push tab to the stack and save it!
      db['tabs'].push(tab);
      chrome.storage.local.set(db, function(){
        if(chrome.runtime.lastError) {
          console.log('unable to save tab', tab);
          if(callback) return callback.call(null, false);
        }
        if(callback) return callback.call(null, true);
      });
    });

  });
}

// delete tab, pass callback(status) as an additional argument,
// status will be true or false depending on storage success
// comparison is done by url
var deleteTab = function(tab, callback) {
  console.log('deleting tab', tab);
  chrome.storage.local.get('tabs', function(db){

    // just verify its an array this time
    if(!Array.isArray(db['tabs'])) {
      if(callback) return callback.call(null, false); 
    }

    // create a new copy without tab
    var tmpTabs = []
    for(var i=0; i < db['tabs'].length; i++) {
      if(db['tabs'][i]['url'] != tab['url']) {
        tmpTabs.push(db['tabs'][i]);
      }
    }
    console.log("deleting tab", tab, "tmpTabs", tmpTabs);

    // save tmpTabs
    chrome.storage.local.set({'tabs': tmpTabs}, function(){
      if(chrome.runtime.lastError) {
        console.log('unable to delete tab', tab);
        if(callback) return callback.call(null, false);
      }
      $('#tab-'+escape(tab['id'])+'-'+escape(tab['windowId'])+'').prop('checkbox', false);
      if(callback) return callback.call(null, true);
    });
  });
}

var listIsReady = function() {

  
  // add some event handlers 
  // -----------------------

  $('.close').on('click', function(event){
    console.log('close clicked');

    // do do any other events
    // this is necessary because of the on top layer of the close button
    event.stopImmediatePropagation();
    
    $closeButton = $(this);
    var $parentTab = $closeButton.parents('.tab').first();
    var url = unescape($parentTab.data('url'));
    var tabId = parseInt($parentTab.data('id'), 10);
    console.log("$parentTab", $parentTab, url, tabId);

    chrome.tabs.remove(tabId);  
    deleteTab({url: url}, function(status){
      if(status) {
        $parentTab.remove();
      }
    });


  });

  // click on checkbox
  // if checkbox: unchecked -> checked: save and close tab
  // if checkbox: checked -> unchecked: unsave tab and open tab
  $('.remember').on('click', function(event){
    console.log('click on checkbox');
    
    $checkbox = $(this);
    var $tab = $checkbox.parents('.tab').first();
    var nowItsChecked = $checkbox.prop('checked');

    // create tab object from html data
    var tab = {
      id:           parseInt(unescape($tab.data('id')), 10),
      windowId:     parseInt(unescape($tab.data('window-id')), 10),
      index:        parseInt(unescape($tab.data('index')), 10),
      openerTabId:  parseInt(unescape($tab.data('opener-tab-id')), 10),
      url:          unescape($tab.data('url')),
      title:        unescape($tab.data('title')),
      favIconUrl:   unescape($tab.data('fav-icon-url')),
      pinned:       $tab.data('pinned') ? true : false
    };

    if(nowItsChecked == true) {
      // checkbox: unchecked -> checked
      console.log('unchecked -> checked');

      // save tab in db storage
      saveTab(tab, function(status){
        if(status) {
          // close the tab
          chrome.tabs.remove(tab.id);  
        }
      });
      
    } else {
      // checkbox: checked -> unchecked
      console.log('checked -> unchecked');

      createOrActivateTab(tab, function(status){
        if(status) {
          deleteTab(tab);
        }
      });
    
    }
  });


  // click on link
  // activate the tab
  $('.tab .right').on('click', function(event){
    console.log('click on link');
    event.preventDefault();

    var $right = $(this);
    var $tab = $right.parent('.tab');
    var id = parseInt(unescape($tab.data('id')), 10);
    var url = unescape($tab.data('url'));
    createOrActivateTab({id: id, url: url});
  });

};

var getActiveTab = function(callback) {
  chrome.windows.getCurrent({populate: true}, function(win){
    var tabs = win.tabs;
    if(tabs.length > 0) {
      for(var i=0; i < tabs.length; i++) {
        if(tabs[i]['active'] == true) {
          console.log('activeTab', tabs[i]);
          if(callback) return callback.call(null, tabs[i]);
          return;
        }
      }      
    }
    if(callback) return callback.call(null, undefined);
  });

  // this will not work, because of the popup execution
  /*
  chrome.tabs.getCurrent(function(tab){
    if(!chrome.runtime.lastError) {
      console.log('activeTab', tab);
      if(callback) return callback.call(null, tab);
    } else {
      if(callback) return callback.call(null, undefined);
    }
  })
  */
}

// does the tab exist?
var tabExists = function(tab, callback) {
  chrome.tabs.get(tab.id, function(_tab){
    if(!chrome.runtime.lastError) {
      // okay, tab exists, activate!
      if(callback) return callback.call(null, true);
    }
    if (callback) return callback.call(null, false);
  });
}

// window exists?
var winExists = function(win, callback) {
  chrome.windows.get(win.id, function(_win){
    if(!chrome.runtime.lastError) {
      // yes, it exists
      if(callback) return callback.call(null, true);
    } else {
      // nope, nothing found
      if(callback) return callback.call(null, false);
    }
  }); 
}



// callback with status param
var createOrActivateTab = function(tab, callback) {
  console.log("createOrActivateTab", tab);

  // create new window
  // if successful, return newly created win as third parameter in callback
  var createWin = function(win, callback) {
    chrome.windows.create(win, function(_win) {
      if(!chrome.runtime.lastError) {
        // created 
        console.log("new window created", _win);
        if(callback) return callback.call(null, true, _win);
      } else {
        // failure
        if(callback) return callback.call(null, false, undefined);
      }
    });
  }

  // open tab
  // requires at least url
  var createTab = function(tab, callback) {
    console.log("createTab", tab);
    // return;

    var _tab = {
      index: tab.index,
      url: tab.url,
      active: false,
      pinned: tab.pinned
      // openerTabId: tab.openerTabId // this causing a lot of "unknown errors"
    };
    if(tab.windowId !== null) {
      _tab.windowId = tab.windowId;
    }
    
    chrome.tabs.create(_tab, 
      function(tab){
      if(!tab) {
        console.log('unable to create new tab!', chrome.runtime.lastError);
        if(callback) return callback.call(null, false);
      } else {
        // error!
        if(callback) return callback.call(null, true);
      }
    });
  }

  // requires at least tab.id
  var activateTab = function(tab, callback) {
    console.log("activateTab", tab);
    // return;
    chrome.tabs.update(tab.id, {
      active: true
    });
    if(callback) {
      return callback.call(null, true);
    }
  }

  // okay, here we go ...thats the plan:
  // 1) find out if the tab stil exists. if yes, activate it
  // 2) if the tab doesnt exist anymore, create it
  //    try to create it in its old window, if possible

  // 1) get infos about tab
  tabExists(tab, function(status){
    if(status) {
      // okay, tab exists, activate!
      activateTab(tab, callback);
    } else {
      // is there a windowId available for this tab?
      if(!tab.hasOwnProperty('windowId')) {
        // if there is no windowId, let api know in advance! haha!
        tab.windowId = null;
        createTab(tab, callback);
      } else {
        winExists({id: tab.windowId}, function(status){
          if(status) {
            // win exists
            createTab(tab, callback);
          } else {
            // no window anymore, create a new win with url
            createWin({url: tab.url, focused: false}, function(status, _win){
              if(status) {
                // if that worked, update all according tabs with this new win id
                updateAllSavedTabsWindowId(tab.windowId, _win.id, function(status){
                  // update successful?
                  if (callback) return callback.call(null, status);
                });
              } else {
                // okay, window could not be created. try to create tab 
                // in active window
                tab.windowId = null;
                createTab(tab, callback);
              }
            });
          }
        });
      }
    }
  });

}


var groupByWindowId = function(tabs) {
  var tabsByWindowId = {};
  if(tabs) {
    for(var i=0; i < tabs.length; i++) {
      var windowId = String(tabs[i].windowId);
      if(!Array.isArray(tabsByWindowId[windowId])) {
        tabsByWindowId[windowId] = new Array();
      }
      tabsByWindowId[windowId].push(tabs[i]);
    }
  }
  return tabsByWindowId;
}


var buildWindow = function(win) {
  console.log("buildWindow", win);
  $('#windows').append(windowTemplate(win));
}

var buildTabs = function(windowId, tabs, activeTab) {
  console.log("buildTabs for windowId", windowId, tabs);

  var tabsHtml = [];
  for(var i=0; i < tabs.length; i++) {
    // add windowId, since its not added
    tabs[i]['windowId'] = windowId;
    // ... and do the template stuff
    tabsHtml.push(tabsTemplate(tabs[i], activeTab));
  }
  $('#window-' +windowId + ' .tabs').append(tabsHtml);
  tabsHtml = null;
}

var buildList = function(windows, activeWindowId, listIsReadyCallback) {

  // get active tab before
  getActiveTab(function(activeTab){

    // do we have activeWindowId in our tabs list?
    if(windows.hasOwnProperty(activeWindowId)){
      // ... yes we have 
      buildWindow({id: activeWindowId});
      buildTabs(activeWindowId, windows[activeWindowId], activeTab);

      // build all other windows, except the one for activeWindowId
      for (var windowId in windows) {
        if(windowId != activeWindowId) {
          buildWindow({id: windowId});
          buildTabs(windowId, windows[windowId], activeTab);
        }      
      }
    } else {
      for (var windowId in windows) {
        buildWindow({id: windowId});
        buildTabs(windowId, windows[windowId], activeTab);
      }
    }

    if(listIsReadyCallback) {
      listIsReadyCallback.call(null);
    }

  });

}


var mergeTabs = function(activeTabs, savedTabs) {
  // 1) go over activeTabs and see if it includes savedTabs
  //    if yes, then set checked=true for tab
  //    and keep track which savedTabs are already used
  // 2) append other savedTabs that are not included in activeTabs

  // do merging by url comparison

  var mergedTabs = [];

  // create a deep copy of savedTabs and delete from it if we find a matching
  // tab in activeTabs ... actually, do it in a method
  // var savedTabsCopy = $.merge([], savedTabs);
  if(savedTabs && savedTabs.length > 0) {
    var savedTabsCopy = savedTabs.slice(0);
  } else {
    var savedTabsCopy = [];
  }
  var deleteInSavedTabsIfMatch = function(url) {
    for(var i=0; i < savedTabsCopy.length; i++) {
      if(savedTabsCopy[i] !== null 
        && savedTabsCopy[i]['url'] == url) {
        // null it, because we used it!
        savedTabsCopy[i] = null;
        return true;
      }
    }
    return false;
  }

  // 1) go over activeTabs and see if it includes savedTabs
  for(var i=0; i < activeTabs.length; i++) {
    if(deleteInSavedTabsIfMatch(activeTabs[i].url)) {
      // oh, nice, found a match. set checked!
      activeTabs[i]['checked'] = true;
    }
    // lets merge it.
    mergedTabs.push(activeTabs[i]);
  }

  // 2) append other savedTabs that are not included in activeTabs
  for(var i=0; i < savedTabsCopy.length; i++) {
    if(savedTabsCopy[i] !== null) {
      savedTabsCopy[i]['checked'] = true;
      savedTabsCopy[i]['missingWindow'] = true;
      mergedTabs.push(savedTabsCopy[i]);
    }
  }

  return mergedTabs;
}

// -------------------------------------------------------

// get me all windows and tabs first
chrome.windows.getAll({populate: true}, function(windows){

  // flatten tabs for windows
  // ex [win[tab, tab]] -> [tab, tab]
  var activeTabs = [];
  for(var i=0; i < windows.length; i++) {
    for(var j=0; j < windows[i].tabs.length; j++) {
      activeTabs.push(windows[i].tabs[j]);
    }
  }
  console.log("activeTabs", activeTabs);

  // then load the storage, if this fails, we are f%@#!)
  chrome.storage.local.get('tabs', function(db){

    var savedTabs = db['tabs'];
    console.log("savedTabs", savedTabs);

    // now merge activeTabs with savedTabs into new tabs array
    var tabs = mergeTabs(activeTabs, savedTabs);
    console.log("mergedTabs", tabs);

    // group tabs by windowsId
    tabs = groupByWindowId(tabs);
    console.log("tabsByWindowId", tabs);

    // get currently active window and build list
    chrome.windows.getCurrent(function(win){
      console.log("activeWindowId", win.id);
      buildList(tabs, win.id, listIsReady); 
      // put your event handlers in listIsReady e.g.
    });
  
  });

});
