"use strict";
document.addEventListener('DOMContentLoaded', function () {
  chrome.runtime.getBackgroundPage(function (backgroundPage) {
    backgroundPage.model.updateImage(function (dataUrl, imageData) {
      let image = document.getElementsByTagName("img")[0];
      image.src = dataUrl;
    });
    let model = backgroundPage.model;
    let urls = backgroundPage.staticUrls;

    let image = document.getElementsByTagName("img")[0];
    model.storage.local.get(model.storage.keys.bigFoto, function (obj1) {
      image.src = obj1[model.storage.keys.bigFoto];
      model.storage.sync.get(model.storage.keys.id, function (obj2) {
        let target = urls.fbbase + obj2[model.storage.keys.id];
        console.log(target);
        let a = document.getElementsByTagName("a")[0];
        a.href = target;
      });
    });
  });
});
