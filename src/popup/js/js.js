// http://developer.chrome.com/extensions/windows.html
// http://developer.chrome.com/extensions/tabs.html

function windowTemplate(win) {
  return $(' \
    <li class="window" id="window-'+win['id']+'" \
        data-id="'+win['id']+'" \
        data-focused="'+win['focused']+'" \
        data-incognito="'+win['incognito']+'" \
        data-type="'+win['type']+'" \
        data-state="'+win['state']+'" \
        > \
      <div class="info"> \
        <span class="title">Window</span> \
      </div> \
      <ul class="tabs"> \
      </ul> \
    </li>');
}

function tabsTemplate(tab){
  return $(' \
    <li class="tab" \
      data-id="'+tab['id']+'" \
      data-windowId="'+tab['windowId']+'" \
      data-index="'+tab['index']+'" \
      data-highlighted="'+tab['highlighted']+'" \
      data-active="'+tab['active']+'" \
      data-pinned="'+tab['pinned']+'" \
      data-url="'+tab['url']+'" \
      data-status="'+tab['status']+'" \
      data-openerTabId="'+tab['openerTabId']+'" \
      data-incognito="'+tab['incognito']+'"> \
      <div class="left"> \
        <input type="checkbox" class="remember" data-url="'+tab['url']+'" title="Remember and close this tab" \
          '+(tab['checked'] ? 'checked' : '')+'> \
        <img src="'+tab['favIconUrl']+'"> \
      </div> \
      <div class="right"> \
        <span class="title">'+tab['title']+'</span> \
      </div> \
    </li>');
}


function mergeActiveTabsWithSavedTabs(activeTabs, savedTabs) {

  return tabs;
}


// get me all windows and tabs first
chrome.windows.getAll({populate: true}, function(windows){

  // then load the storage, if this fails, we are f%@#!)
  chrome.storage.local.get('tabs', function(db){

    // build popup
    // -----------
    console.log("init with tabs:", db['tabs']);

    // make our tabs storage an array, if its not an array already
    if(!Array.isArray(db['tabs'])) {
      db['tabs'] = new Array();
    }

    // iterate over every singly window
    $(windows).each(function(i, win){

      // build windows template and append it to the popup
      $('#windows').append(windowTemplate(win));

      // build tab template and append it to the popup
      // check if its in saved tabs
      $(win.tabs).each(function(i, tab){

        for(var i=0; i < db['tabs'].length; i++) {
          if(db['tabs'][i].id == tab.id) {
            tab['checked'] = true;
            db['tabs'][i].isShown = true;
            break;
          }
        }
        $('#window-' + win.id + ' .tabs').append(tabsTemplate(tab));

      });
      
      // find saved tabs for this windowId and append them as well
      var tabsForWindowId = [];
      for(var i=0; i < db['tabs'].length; i++) {
        if(db['tabs'][i].windowId == win.id && db['tabs'][i].isShown == false) {
          tabsForWindowId.push(db['tabs'][i]);
          db['tabs'][i].isShown = true;
        }
      }

      // ... now append to popup
      $(tabsForWindowId).each(function(i, tab){
        tab['checked'] = true;
        $('#window-' + win.id + ' .tabs').append(tabsTemplate(tab));
      });
      tabsForWindowId = null;
    });


    // now there might be tabs for which there is no windowId anymore
    // because the window was closed or simply doesnt exist.
    // so now show all of these tabs, but still have them 
    // grouped together by the windowId
  
    // group tabs that are not shown yet by windowId
    var tabsByWindowId = {};
    for(var i=0; i < db['tabs'].length; i++) {
      if(!db['tabs'][i].isShown) {
        // this tab is not shown yet, use it ...
        if(!Array.isArray(tabsByWindowId[ '' + db['tabs'][i].windowId ])) {
          // init array for windowId if necessary
          tabsByWindowId[ '' + db['tabs'][i].windowId ] = new Array();
        }

        tabsByWindowId[ '' + db['tabs'][i].windowId ].push(db['tabs'][i]);
      }
    }


    // now append tabs from tabsByWindowId
    if(tabsByWindowId) {
      console.log("tabsByWindowId", tabsByWindowId);

      $(tabsByWindowId).each(function(windowId, tabs){

        console.log(Array.isArray(tabs), tabs);
        // create fake window instance for these tabs
        win = {id: '_' + windowId};
        $('#windows').append(windowTemplate(win));
        // append tabs 
        
        $(tabs).each(function(i, tab){
          // console.log(tab);
          tab['checked'] = true;
          $('#window-' + win.id + ' .tabs').append(tabsTemplate(tab));
        });
      });
    }

  

    // add some event handlers 
    // -----------------------

    $('.remember').on('click', function(event){
      // click on checkbox
      // if checkbox is not checked: save and close tab
      // if checkbox is checked: unsave tab
      
      $checkbox = $(this);
      var $tab = $checkbox.parents('.tab').first();
      var nowItsChecked = $checkbox.prop('checked');

      // create tab object from html data
      var tab = {
        id: parseInt($tab.data('id'), 10),
        windowId: parseInt($tab.data('windowId'), 10),
        index: parseInt($tab.data('index'), 10),
        openerTabId: parseInt($tab.data('openerTabId'), 10),
        url: $tab.data('url'),
        pinned: $tab.data('pinned') ? true : false
      };

      if(nowItsChecked == true) {
        // checkbox: unchecked -> checked

        // close the tab
        chrome.tabs.remove(tab.id);
        // console.log('remove tab', tab.id);

        // get tabs from storage again
        // things might have changed in popups in other windows
        chrome.storage.local.get('tabs', function(db){
          // make array if its not 
          if(!Array.isArray(db['tabs'])) {
            db['tabs'] = new Array();
          }

          // push this tab to the stack and save it!
          db['tabs'].push(tab);
          chrome.storage.local.set(db, function(){
            if(chrome.runtime.lastError) {
              console.log('unable to save tabs');
            }
          });
        });
        
      } else {
        // checkbox: checked -> unchecked
        // delete tab from db storage
        chrome.storage.local.get('tabs', function(db){
          // just verify its an array this time
          if(Array.isArray(db['tabs'])) {
            var tmpTabs = []

            $(db['tabs']).each(function(i, _tab){
              if(_tab.url != tab.url) {
                tmpTabs.push(_tab);
              }
            });

            // save tmpTabs
            chrome.storage.local.set({'tabs':tmpTabs}, function(){
              if(chrome.runtime.lastError) {
                console.log('unable to save tabs');
              }
            });
          }
        });
        
      }

    });

    $('.tab .right').on('click', function(event){
      // click on link
      // activate the tab
      event.preventDefault();

      var $right = $(this);
      var $tab = $right.parent('.tab');
      var id = parseInt($tab.data('id'), 10);
      chrome.tabs.update(id, {
        active: true
      });
    });

  });


});
