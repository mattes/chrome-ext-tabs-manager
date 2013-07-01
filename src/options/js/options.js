"use strict";
$(document).ready(function() {

  // translate page
  $('[data-translate]').each(function(i, elm){
    $(elm).html(chrome.i18n.getMessage($(elm).data('translate')));
  });


  // get DOM elements in fieldset for $input
  var fieldset = function($input) {
    var $fieldset = $input.parent();
    if($fieldset) {
      var $statusSaved = $fieldset.children('.status.saved');
      var $statusChanged = $fieldset.children('.status.changed');
      return {
        $input: $input, 
        $fieldset: $fieldset,
        $statusSaved: $statusSaved,
        $statusChanged: $statusChanged
      }
    } else {
      return false;
    }
  }

  // restore state
  $('.form textarea, .form input[type=text]').each(function(i, elm){
    var $input = $(elm);
    chrome.storage.sync.get($input.attr('name'), function(items) {
      $input.val(items.emails);
    });
  });

  // monitor changes and show according status
  $('.form textarea, .form input[type=text]').bind('keyup', function(event){
    var $input = $(this);
    var fs = fieldset($input);  
    fs.$statusSaved.hide();
    fs.$statusChanged.show();
  });

  // save value
  $('.form textarea, .form input[type=text]').bind('change', function(event){
    var $input = $(this);
    var fs = fieldset($input);  
    var saveObject = {};
    saveObject[ $input.attr('name') ] = $input.val();
    chrome.storage.sync.set(saveObject, function() {
      // saved ...
      fs.$statusChanged.fadeOut(function() {
        fs.$statusSaved.show();  
      });
      window.setTimeout(function(){
        fs.$statusSaved.fadeOut();
      }, 3000);
    });    
  });

});