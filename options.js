"use strict";
/**
 * @callback onGetFbId
 * @param id {Number}
 */
/**
 *
 * @param fbPrrofileUrl {String}
 * @param callback {onGetFbId}
 */
function getFbIdfromUrl(fbPrrofileUrl, callback) {
  let param = "url=" + fbPrrofileUrl;
  let xhr = new XMLHttpRequest();
  xhr.open("POST", "http://findmyfbid.com/", true);
  xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  xhr.onreadystatechange = function (event) {
    if (xhr.readyState == 4) {
      let response = xhr.responseText;
      //Parse response and get the ID
      let parser = new DOMParser();
      let downloadedDocument = parser.parseFromString(response, "text/html");
      let codeElement = downloadedDocument.getElementsByTagName("code")[0];
      let id = codeElement === undefined ? -1 : parseInt(codeElement.innerHTML);
      callback(id); //Uncaught TypeError: callback is not a function
    }
  };

  xhr.send(param);
}
function updateID(id) {
  let div = document.getElementById("id");
  div.innerHTML = id;
}
document.addEventListener('DOMContentLoaded', function () {
  let button = document.getElementsByTagName("button")[0];
  button.addEventListener("click", function () {
    getFbIdfromUrl(document.getElementsByName('fbUrl')[0].value, function (id) {
      chrome.runtime.getBackgroundPage(function (backgroundPage) {
        let model = backgroundPage.model;
        model.storage.sync.set(model.storage.keys.id, id, ()=> {
          updateID(id);
          model.updateImage(undefined,undefined, true);
        })
      });

    })
  });
  chrome.runtime.getBackgroundPage(function (backgroundPage) {
    let model = backgroundPage.model;
    model.getID(function (id) {
      let url = backgroundPage.staticUrls.fbbase + "profile.php?id=" + id;
      let input = document.getElementsByName("fbUrl")[0];
      console.log(input);
      console.log(url);
      input.value = url;
      updateID(id < 0 ? "Not set" : id);
    });
  });
});