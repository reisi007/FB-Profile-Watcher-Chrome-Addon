"use strict";
// Called when the user clicks on the browser action.
/**
 * Callback if an XMLHttpRequest has completed
 * @callback onRequestComplete
 * @param {XMLHttpRequest} request The request
 */
/**
 * Callback if an Image downlaod has finished
 * @callback onImageDlCompleted
 * @param {String} dataUrl The data URL (base64 encoded)
 * @param {ImageData} imageData An ImageDataobject for further usage
 */
/**
 * Callback for receiving stored data
 * @callback onDataAvailable
 * @param {*} obj The stored value
 */
/**
 * ID callback
 * @callback idCallback
 * @param {Number} id
 */
/**
 * Callback with no params
 * @callback noParamsCallback
 */

/**
 * Stores all static Urls
 * @type {{fbbase: string, graphBase: string, id: number, graphUrlPostFix: string}}
 */
var staticUrls = {
  fbbase: "https://facebook.com/",
  graphBase: "https://graph.facebook.com/",
  graphUrlPostFix: "/picture"
};

var model = {
    images: {
      /**
       *
       * @param url {String} Url to fetch the image from
       * @param onImageDlCompleted {onImageDlCompleted} A callback
       */
      downloadImage: function (url, onImageDlCompleted) {
        let c = document.createElement('canvas');
        let ctx = c.getContext('2d');
        let img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function () {
          c.width = this.width;
          c.height = this.height;
          ctx.drawImage(this, 0, 0);
          let imageData = ctx.getImageData(0, 0, c.width, c.height);
          let dataUrl = c.toDataURL();
          onImageDlCompleted(dataUrl, imageData);
        };
        img.src = url;
      },
      /**
       * Issues an HEAD request
       * @param url {String} Url to the image
       * @param onRequestComplete {onRequestComplete}
       */
      getImageLocation: function (url, onRequestComplete) {
        let xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function (event) {
          let currentTarget = event.currentTarget;
          if (currentTarget.readyState == 4) {
            onRequestComplete(currentTarget);
          }
        };
        xhr.open('HEAD', url, true);
        xhr.send();
      },
      /**
       * Resizes an ImageData object
       * @param imageData {ImageData} The ImageData to resize
       * @param newWidth {Number} The new width of the picture
       * @returns {ImageData} The scaled ImageData object
       */
      resizeImage: function (imageData, newWidth) {
        let scale = newWidth / imageData.width;
        let c = document.createElement("canvas");
        c.width = newWidth;
        c.height = imageData.height * scale;
        let ctx = c.getContext("2d");
        let tmpC = document.createElement("canvas");
        tmpC.width = imageData.width;
        tmpC.height = imageData.height;
        tmpC.getContext("2d").putImageData(imageData, 0, 0);
        ctx.scale(scale, scale);
        ctx.drawImage(tmpC, 0, 0);
        return ctx.getImageData(0, 0, c.width, c.height);
      },
      /**
       *
       * @param {Number[]} data
       * @param {Number} width
       * @param {Number}height
       */
      createImageData: function (data, width, height) {
        let imageData = new ImageData(width, height);
        let cur = data["0"], index = 0;
        while (!(cur === undefined)) {
          imageData.data[index] = cur;
          index++;
          cur = data[index.toString()];
        }
        return imageData;
      }
    },
    setIconPath: function (iconPath) {
      chrome.browserAction.setIcon(
        {path: iconPath}
      );
    }
    ,
    setIconData: function (data) {
      chrome.browserAction.setIcon(
        {imageData: data}
      )
    },
    /**
     * Checks whether a new image is available. If so the image is update an an onNewImageCallback is provided
     * @param [onNewImageCallback] {onImageDlCompleted} Only called when an update is necessary
     * @param [onUptoDate] {noParamsCallback} Called when Image is up to date
     * @param [force] {Boolean} Forces the update. Defaults to false
     */
    updateImage: function (onNewImageCallback, onUptoDate, force) {
      if (force === undefined || force == null) {
        force = false;
      }
      model.storage.sync.get(model.storage.keys.id, function (obj) {
        let id = obj[model.storage.keys.id];
        if (id === undefined) {
          chrome.runtime.openOptionsPage();
          return;
        }
        let baseImageUrl = staticUrls.graphBase + id + staticUrls.graphUrlPostFix;
        let smallImageUrl = baseImageUrl + "?type=square", bigImageUrl = baseImageUrl + "?width=480";

        model.images.getImageLocation(smallImageUrl, function (response) {
          let newUrl = response.responseURL;
          model.storage.local.get(model.storage.keys.smallImageUrl, function (obj) {
            let oldUrl = obj[model.storage.keys.smallImageUrl];
            if (oldUrl != newUrl || force) {
              model.storage.local.set(model.storage.keys.smallImageUrl, newUrl);
              // Small image
              model.images.downloadImage(smallImageUrl, function (base64, imageData) {
                let x1 = model.images.resizeImage(imageData, 19), x2 = model.images.resizeImage(imageData, 38);
                let data = {"19": x1, "38": x2};
                model.storage.local.set(model.storage.keys.smallFoto + 19, {
                  data: JSON.stringify(x1.data),
                  w: x1.width,
                  h: x1.height
                }, () => {
                });
                model.storage.local.set(model.storage.keys.smallFoto + 38, {
                  data: JSON.stringify(x1.data),
                  w: x2.width,
                  h: x2.height
                }, () => {
                });
                model.setIconData(data);
              });
              model.images.downloadImage(bigImageUrl, function (dataUrl, imageData) {
                model.storage.local.set(model.storage.keys.bigFoto, dataUrl);
                if (onNewImageCallback != undefined) {
                  onNewImageCallback(dataUrl, imageData);
                }
              })
            } else {
              helper.log("Image is UP-TO-DATE");
            }
          });
        });
      });

    }
    ,
    storage: {
      local: {
        /**
         * Gets stored data
         * @param {String} id
         * @param {onDataAvailable} callback
         */
        get: function (id, callback) {
          chrome.storage.local.get(id, callback);
        }
        ,
        /**
         * Saves data
         * @param {String} id
         * @param {*} data
         * @param {noParamsCallback}[callback]
         */
        set: function (id, data, callback) {
          let o = {};
          o[id] = data;
          chrome.storage.local.set(o, callback);
        }
      },
      sync: {
        /**
         * Gets stored data
         * @param {String} id
         * @param {onDataAvailable} callback
         */
        get: function (id, callback) {
          chrome.storage.sync.get(id, callback);
        }
        ,
        /**
         * Saves data
         * @param {String} id
         * @param {*} data
         * @param {noParamsCallback}[callback]
         */
        set: function (id, data, callback) {
          let o = {};
          o[id] = data;
          chrome.storage.sync.set(o, callback);
        }
      },
      keys: {
        smallImageUrl: "IMAGE_URL_SMALL",
        smallFoto: "IMAGE_SMALL_DATA",
        bigFoto: "IMAGE_BIG_DATA",
        id: "BASE_ID"
      }
    },
    /**
     * Gets the id from storage
     * @param callback {idCallback} A callback with the ID, or -1 if no ID has been set
     */
    getID: function (callback) {
      model.storage.sync.get(model.storage.keys.id, function (obj) {
        let number = obj[model.storage.keys.id];
        if (number === undefined)
          number = -1;
        callback(number);
      });
    }
  }
  ;
var helper = {
  log: function (o) {
    chrome.extension.getBackgroundPage().console.log(o);
  }
};

model.updateImage();

//Event onInstalled
chrome.runtime.onInstalled.addListener(()=> {
  model.storage.local.get([model.storage.keys.smallFoto + 19, model.storage.keys.smallFoto + 38],
    obj => {
      let x1 = obj[model.storage.keys.smallFoto + 19], x2 = obj[model.storage.keys.smallFoto + 38];
      let data = {
        "19": model.images.createImageData(JSON.parse(x1.data), x1.w, x1.h),
        "38": model.images.createImageData(JSON.parse(x2.data), x2.w, x2.h)
      };
      model.setIconData(data);
    })
});