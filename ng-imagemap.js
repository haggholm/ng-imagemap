(function() {
  'use strict';

  var checkCanvas = document.createElement('canvas');
  var checkCanvasTransparent = document.createElement('canvas');
  checkCanvas.width = checkCanvas.height = 4;
  checkCanvasTransparent.width = checkCanvasTransparent.height = 16;

  (function() {
    var canvases = [
      [checkCanvas, false],
      [checkCanvasTransparent, true]
    ];
    for (var i = 0; i < canvases.length; i++) {
      var canvas = canvases[i][0],
        alpha = canvases[i][1] ? 32 : 255,
        ctx = canvas.getContext('2d'),
        w = canvas.width,
        x, y,
        imgData = ctx.createImageData(w, w),
        data = imgData.data;
      for (y = 0; y < w; y++) {
        for (x = 0; x < w; x++) {
          var pixel = y * w + x,
            pixelOffset = pixel * 4,
            blackQuadrant = ((x < w / 2) === (y < w / 2)),
            colour = blackQuadrant ? 255 : 0;
          data[pixelOffset + 0] = colour; // R
          data[pixelOffset + 1] = colour; // G
          data[pixelOffset + 2] = colour; // B
          data[pixelOffset + 3] = alpha;  // A
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }
  })();


  function IME(scope, canvas) {
    this.scope = scope;
    this.canvas = canvas;
    this.jqCanvas = $(canvas);
    this.isDrawing = false;
    this.canvasContext = null;
    this.getCoordinatesFromInput();
    this.initImage(scope);
  }

  IME.prototype.handleClickEvent = function handleClickEvent($event) {
    var offset = this.jqCanvas.offset(),
      e = $event.originalEvent,
      x = (e.pageX - offset.left).toFixed(0),
      y = (e.pageY - offset.top).toFixed(0);
    this.handleClick(Number(x), Number(y));
    this.setInputFromCoordinates();
  };
  IME.prototype.handleClick = function handleClick(x, y) {
    if (this.isDrawing) {
      var coordinates = this.coordinates;
      var lastX = coordinates[coordinates.length - 2],
        lastY = coordinates[coordinates.length - 1],
        firstX = coordinates.length >= 2 ? coordinates[0] : null,
        firstY = coordinates.length >= 2 ? coordinates[1] : null;

      if (x === firstX && y === firstY) {
        this.closePath();
      } else if (x !== lastX || y !== lastY) {
        this.canvasContext.lineWidth = 3;
        this.canvasContext.lineTo(x, y);
        this.canvasContext.stroke();

        coordinates.push(x);
        coordinates.push(y);
        this.closeable = this.coordinates.length >= 6;
      }
    } else {
      this.scope.imgMapForm.$setValidity('imgMapForm', false);
      this.scope.imgMapForm.$setDirty();
      this.coordinates = [x, y];
      this.closeable = false;
      this.canvasContext.clearRect(
        0, 0,
        this.canvas.width, this.canvas.height
      );
      this.canvasContext.drawImage(this.image, 0, 0);

      this.canvasContext.beginPath();
      this.canvasContext.lineWidth = 3;
      this.canvasContext.strokeRect(x - 1, y - 1, 3, 3);
      this.canvasContext.moveTo(x, y);
      this.canvasContext.stroke();
      this.isDrawing = true;
    }
  };
  IME.prototype.undo = function undo() {
    if (this.coordinates.length < 2) {
      throw 'There is nothing to undo';
    }
    this.coordinates.pop();
    this.coordinates.pop();
    this.closeable = this.coordinates.length >= 6;
    this.isDrawing = true;
    this.redraw();
    this.scope.imgMapForm.$setValidity('imgMapForm', false);
  };
  /**
   * @param {boolean} [closePath=false]
   */
  IME.prototype.redraw = function redraw(closePath) {
    this.canvasContext.save();

    this.canvasContext.clearRect(
      0, 0,
      this.canvas.width, this.canvas.height
    );
    this.canvasContext.drawImage(this.image, 0, 0);

    this.canvasContext.beginPath();
    for (var i = 0; i < this.coordinates.length; i += 2) {
      var x = this.coordinates[i], y = this.coordinates[i + 1];
      if (i === 0) {
        this.canvasContext.moveTo(x, y);
      } else {
        this.canvasContext.lineTo(x, y);
        this.canvasContext.stroke();
      }
    }

    if (closePath) {
      this.canvasContext.lineTo(this.coordinates[0], this.coordinates[1]);
      this.canvasContext.stroke();
      this.canvasContext.closePath();
    }

    this.canvasContext.restore();
  };
  IME.prototype.closePath = function closePath() {
    this.canvasContext.save();

    this.canvasContext.strokeStyle = "#000000";
    this.canvasContext.lineWidth = 2;
    this.redraw(true);
    this.canvasContext.fill();

    this.canvasContext.restore();

    this.scope.imgMapForm.$setValidity('imgMapForm', true);

    this.isDrawing = false;
    this.closeable = false;
    this.setInputFromCoordinates();
  };
  IME.prototype.setInputFromCoordinates = function setInputFromCoordinates() {
    this.scope.ngModel = this.coordinates;
    this.input = this.coordinates.join(',');
  };
  IME.prototype.getCoordinatesFromInput = function getCoordinatesFromInput() {
    this.coordinates = this.scope.ngModel || [];
  };
  IME.prototype.initImage = function initImage(/**object*/scope) {
    var self = this;

    self.image = new Image();
    self.image.src = scope.src;
    self.image.onload = function() {
      self.canvas.width = this.width;
      self.canvas.height = this.height;

      self.canvasContext = self.canvas.getContext('2d');
      self.canvasContext.drawImage(
        this,
        0, 0,
        this.width, this.height
      );
      self.canvasContext.strokeStyle = self.canvasContext.createPattern(
        checkCanvas,
        'repeat'
      );
      self.canvasContext.fillStyle = self.canvasContext.createPattern(
        checkCanvasTransparent,
        'repeat'
      );

      if (self.coordinates.length > 0) {
        self.closePath();
      }
    };
  };

  function validateCoordString(str) {
    // An empty string = no image map = OK
    if (str === undefined || str === null || str.length === 0) {
      return true;
    }
    var coords = str.split(',').map(Number);
    if (coords.length % 2 !== 0 || coords.length < 6) {
      return false;
    }
    for (var i = 0; i < coords.length; i++) {
      var n = coords[i];
      if (n === null || isNaN(n) || n < 0) {
        return false;
      }
    }
    return true;
  }

  angular.module('imagemap', [])
    .directive('ngImagemap', [function() {
      return {
        template: '<ng-form name="imgMapForm">' +
                  '  <div><canvas ng-click="ime.handleClickEvent($event)" /></div>' +
                  '<div>' +
                  '  <button class="btn btn-sm" ' +
                  '          ng-click="ime.closePath()" ' +
                  '          ng-disabled="!ime.closeable">' +
                  '    <span ng-show="imgMapForm.$dirty && imgMapForm.$invalid" ' +
                  '          class="fa fa-chain-broken"></span>' +
                  '    <span ng-show="imgMapForm.$pristine || imgMapForm.$valid" ' +
                  '          class="fa fa-chain"></span>' +
                  '    Close figure' +
                  '  </button>' +
                  '  <button class="btn btn-sm" ' +
                  '          ng-click="ime.undo()" ' +
                  '          ng-disabled="ime.coordinates.length === 0">' +
                  '    <span class="fa fa-undo"></span>' +
                  '    Undo' +
                  '  </button>' +
                  '</div>' +
                  '</ng-form>',
        restrict: 'E',
        replace: true,
        scope: { src: '@', ngModel: '=' },
        link: function link(scope, element/*, attrs*/) {
          scope.ime = new IME(
            scope,
            element.find('canvas').get(0)
          );
        }
      };
    }]);
})();
