!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self),o.WordCloudCanvas=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var _ = _dereq_('./util');
var TextBitmap = _dereq_('./textbitmap');

function createArray(length) {
	var arr = new Array(length || 0),
		i = length;

	if (arguments.length > 1) {
		var args = Array.prototype.slice.call(arguments, 1);
		while(i--) {
			arr[length-1 - i] = createArray.apply(this, args);
		}
	}

	return arr;
}

var Layout = function(attributes) {
	this._canvas = null;
	this._words = null;
	this._bitmap = null;
	this._textBitmapper = null;

	_.extend(this,attributes);
};

Layout.prototype = _.extend(Layout.prototype, {
	_initialize : function() {
		var textBitmapperAttributes = {};
		if (this.debug) {
			textBitmapperAttributes.debug = true;
		}

		this._textBitmapper = new TextBitmap(textBitmapperAttributes);
		this._bitmap = createArray(this._canvas.width,this._canvas.height);
		for (var i = 0; i < this._canvas.width; i++) {
			for (var j = 0; j < this._canvas.height; j++) {
				this._bitmap[i][j] = false;
			}
		}
	},

	canvas : function(canvas) {
		if (canvas) {
			this._canvas = canvas;
			return this;
		} else {
			return this._canvas;
		}
	},
	words : function(words) {
		if (words) {
			this._words = words;
			return this;
		} else {
			return this._words;
		}
	},

	bitmap : function() {
		return this._textBitmapper.toCanvas(this._bitmap);
	},

	onWordOver : function(handler) {
		this._onWordOver = handler;
		return this;
	},

	layout : function() {
		this._initialize();
		var renderInfo = {};
		if (this._words) {
			var that = this;

			var minCount = Number.MAX_VALUE;
			var maxCount = 0;

			Object.keys(this._words).forEach(function(word) {
				minCount = Math.min(that._words[word],minCount);
				maxCount = Math.max(that._words[word],maxCount);
			});


			var minFontSize = this.minFontSize || 10;
			var maxFontSize = this.maxFontSize || 200;
			Object.keys(this._words).forEach(function(word) {

				var t = (that._words[word] - minCount)/(maxCount-minCount);
				var fontSize =_.step(minFontSize,maxFontSize,t);

				var bitmap = that._textBitmapper.create(word,fontSize,that.font || 'Calibri');
				renderInfo[word] = bitmap;
			});
		}

		var sortedWordArray = Object.keys(this._words).sort(function(w1,w2) {
			return that._words[w2]-that._words[w1];
		});

		function debugDrawAll(ctx,w,h) {
			ctx.fillStyle = 'white';
			ctx.fillRect(0,0,w,h);
			Object.keys(renderInfo).forEach(function(word) {
				var wordRenderInfo = renderInfo[word];
				if (wordRenderInfo.x !== undefined && wordRenderInfo.x !== -1 && wordRenderInfo.y !== undefined && wordRenderInfo.y !== -1) {
					ctx.font = wordRenderInfo.fontSize + 'px ' + wordRenderInfo.fontFamily;
					ctx.fillStyle = 'red';
					ctx.strokeStyle = 'green';
					ctx.fillText(word,wordRenderInfo.x,wordRenderInfo.y);
					ctx.strokeRect(wordRenderInfo.x + wordRenderInfo.bb.offsetX, wordRenderInfo.y + wordRenderInfo.bb.offsetY, wordRenderInfo.bb.width, wordRenderInfo.bb.height);
				}
			});
		}

		sortedWordArray.forEach(function(word) {
			var placed = false;
			var attempts = 100;

			if (this.debug) {
				debugDrawAll(that._canvas.getContext('2d'),that._canvas.width, that._canvas.height);
			}

			while (!placed && attempts > 0) {
				var x = Math.floor(Math.random() * that._canvas.width);
				var y = Math.floor(Math.random() * that._canvas.height);

				renderInfo[word].x = x;
				renderInfo[word].y = y;

				if (that._textBitmapper.fits(renderInfo[word],that._bitmap)) {
					placed = true;

					var bitmapWidth = renderInfo[word].bitmap.length;
					var bitmapHeight = renderInfo[word].bitmap[0].length;

					for (var i = 0; i < bitmapWidth; i++) {
						for (var j = 0; j < bitmapHeight; j++) {
							var u = renderInfo[word].x + renderInfo[word].bb.offsetX + i;
							var v = renderInfo[word].y + renderInfo[word].bb.offsetY + j;

							if (renderInfo[word].bitmap[i][j]) {
								that._bitmap[u][v] = word;
							}
						}
					}

				} else {
					attempts--;
				}
			}
			if (!placed) {
				renderInfo[word].x = -1;
				renderInfo[word].y = -1;
			}
		});

		function onMouseMove(e) {
			var x = e.offsetX;
			var y = e.offsetY;

			var word = that._bitmap[x][y];
			if (word) {
				if (that._onWordOver) {
					that._onWordOver(word);
				}
			}
		}

		this._canvas.onmousemove = onMouseMove;


		return renderInfo;
	}
});

module.exports = Layout;
},{"./textbitmap":3,"./util":4}],2:[function(_dereq_,module,exports){
var _ = _dereq_('./util');
var Layout = _dereq_('./layout');

var WordCloudCanvas = function(attributes) {

	this._words = {};
	this._stopWords = {};

	this._canvas = null;
	this._width = null;
	this._height = null;
	this._backgroundFill = null;
	this._onWordOver = null;
	this._layout = null;

	_.extend(this,attributes);
};

WordCloudCanvas.prototype = _.extend(WordCloudCanvas.prototype, {
	canvas : function(canvas) {
		if (canvas) {
			this._canvas = canvas;
			this._width = canvas.width;
			this._height = canvas.height;
			return this;
		} else {
			return this._canvas;
		}
	},
	width : function(width) {
		if (width) {
			if (this._canvas) {
				this._canvas.width = width;
				this._width = width;
			}
			return this;
		} else {
			return this.width;
		}
	},
	height : function(height) {
		if (height) {
			if (this._canvas) {
				this._canvas.height = height;
				this._height = height;
			}
			return this;
		} else {
			return this._height;
		}
	},
	text : function(text) {
		var filtered = text.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g,'');
		filtered = filtered.replace(/\[[0-9]*\]/g,'');
		filtered = filtered.replace(/[\t+\[\]]/g,'');
		var words = filtered.split(' ');
		this.words(words);
		return this;
	},

	stop : function(words) {
		if (words) {
			var that = this;
			words.forEach(function (word) {
				that._stopWords[word.trim().toLowerCase()] = true;
			});
			return this;
		} else {
			return this._stopWords;
		}
	},

	background : function(fillStyle) {
		if (fillStyle) {
			this._backgroundFill = fillStyle;
			return this;
		} else {
			return this._backgroundFill;
		}
	},

	words : function(words) {
		if (words) {
			var that = this;
			words.forEach(function (raw) {
				var word = raw.trim().toLowerCase();
				if (that._stopWords[word] || word === '') {
					return;
				}

				var count = that._words[word];
				if (!count) {
					count = 0;
				}
				count++;
				that._words[word] = count;
			});

			return this;
		} else {
			return this._words;
		}
	},

	onWordOver : function(handler) {
		this._onWordOver = handler;
		return this;
	},

	font : function(font) {
		if (font) {
			this._font = font;
			return this;
		} else {
			return this._font;
		}
	},

	minFontSize : function(minFontSize) {
		if (minFontSize) {
			this._minFontSize = minFontSize;
			return this;
		} else {
			return this._minFontSize;
		}
	},

	maxFontSize : function(maxFontSize) {
		if (maxFontSize) {
			this._maxFontSize = maxFontSize;
			return this;
		} else {
			return this._maxFontSize;
		}
	},

	colors : function(colors) {
		if (colors) {
			this._colors = colors;
			return this;
		} else {
			return this._colors;
		}
	},

	generate : function() {
		var layoutAttributes = {};
		if (this.debug) {
			layoutAttributes.debug = true;
		}
		if (this._font) {
			layoutAttributes.font = this._font;
		}
		if (this._minFontSize) {
			layoutAttributes.minFontSize = this._minFontSize;
		}
		if (this._maxFontSize) {
			layoutAttributes.maxFontSize = this._maxFontSize;
		}
		if (this._colors) {
			layoutAttributes.colors = this._colors;
		}

		this._layout = new Layout(layoutAttributes)
			.canvas(this._canvas)
			.words(this._words)
			.onWordOver(this._onWordOver);

		var renderInfo = this._layout.layout();

		var ctx = this._canvas.getContext('2d');
		ctx.fillStyle = this._backgroundFill || 'white';
		ctx.fillRect(0, 0, this._width, this._height);


		var that = this;
		Object.keys(renderInfo).forEach(function(word) {
			var wordRenderInfo = renderInfo[word];
			if (wordRenderInfo.x !== -1 && wordRenderInfo.y !== -1) {
				ctx.font = wordRenderInfo.fontSize + 'px ' + wordRenderInfo.fontFamily;

				ctx.fillStyle = 'red';
				ctx.fillText(word,wordRenderInfo.x,wordRenderInfo.y);

				if (that.debug) {
					ctx.strokeStyle = 'green';
					ctx.strokeRect(wordRenderInfo.x + wordRenderInfo.bb.offsetX, wordRenderInfo.y + wordRenderInfo.bb.offsetY, wordRenderInfo.bb.width, wordRenderInfo.bb.height);
				}
			}
		});
		return this;
	}
});


exports.Extend = _.extend;
exports.WordCloud = WordCloudCanvas;
},{"./layout":1,"./util":4}],3:[function(_dereq_,module,exports){
var _ = _dereq_('./util');

function createArray(length) {
	var arr = new Array(length || 0),
		i = length;

	if (arguments.length > 1) {
		var args = Array.prototype.slice.call(arguments, 1);
		while(i--) {
			arr[length - 1 - i] = createArray.apply(this, args);
		}
	}


	return arr;
}

var TextBitmap = function(attributes) {
	this._canvas = null;
	this._context = null;
	_.extend(this,attributes);

	this._canvas = document.createElement('canvas');
	this._canvas.width = 640;
	this._canvas.height = 480;
	this._context = this._canvas.getContext('2d');

	if (this.debug) {
		document.body.appendChild(this._canvas);
	}

	this._bitmap = createArray(this._canvas.width,this._canvas.height);
	for (var i = 0; i < this._canvas.width; i++) {
		for (var j = 0; j < this._canvas.height; j++) {
			this._bitmap[i][j] = false;
		}
	}
};

TextBitmap.prototype = _.extend(TextBitmap.prototype, {

	create : function(text,fontHeight,fontFamily) {
		var ctx = this._context;
		ctx.fillStyle = 'black';
		ctx.fillRect(0,0,this._canvas.width,this._canvas.height);




		var textRenderX = 5;
		var textRenderY = Math.floor(this._canvas.height/2);

		ctx.fillStyle = 'white';
		ctx.font = fontHeight + 'px ' + fontFamily;
		ctx.fillText(text,textRenderX,textRenderY);

		var width = ctx.measureText(text).width;

		var startX = textRenderX;
		var startY = textRenderY - fontHeight - 2;
		var endX = startX + width + textRenderX;
		var endY = startY + fontHeight + fontHeight*0.5;



		var imageData = ctx.getImageData(startX,startY,endX - startX,endY - startY);

		var booleanBitmap = createArray(imageData.width,imageData.height);
		var x = 0;
		var y = 0;
		for (var i = 0; i < imageData.data.length; i+=4) {

			booleanBitmap[x][y] =  imageData.data[i] !== 0;
			x++;
			if (x === imageData.width) {
				x = 0;
				y++;
			}
		}


		var minX = Number.MAX_VALUE;
		var minY = Number.MAX_VALUE;
		var maxX = -Number.MAX_VALUE;
		var maxY = -Number.MAX_VALUE;
		for (x = 0; x < booleanBitmap.length; x++) {
			for (y = 0; y < booleanBitmap[x].length; y++) {
				if (booleanBitmap[x][y]) {
					minX = Math.min(minX,x);
					minY = Math.min(minY,y);
					maxX = Math.max(maxX,x);
					maxY = Math.max(maxY,y);
				}
			}
		}

		var trimmedBooleanBitmap = createArray(maxX-minX,maxY-minY);
		for (x = 0; x < maxX-minX; x++) {
			for (y = 0; y < maxY-minY; y++) {
				trimmedBooleanBitmap[x][y] = booleanBitmap[minX+x][minY+y];
			}
		}

		if (this.debug) {
			ctx.strokeStyle = 'yellow';
			ctx.strokeRect(startX,startY,endX-startX,endY-startY);
		}

		ctx.strokeStyle = 'red';
		ctx.strokeRect(textRenderX,textRenderY,this._canvas.width, this._canvas.height);

		var bbWidth = maxX-minX;
		var bbHeight = maxY-minY;
		var bbOffsetX = -(textRenderX - (startX + minX ));
		var bbOffsetY = -(textRenderY - (startY + minY));

		if (this.debug) {
			ctx.strokeStyle = 'green';
			ctx.strokeRect(textRenderX + bbOffsetX, textRenderY + bbOffsetY, bbWidth, bbHeight);
		}

		var renderInfo = {
			bb : {
				offsetX : bbOffsetX,
				offsetY : bbOffsetY,
				width : bbWidth,
				height : bbHeight
			},
			bitmap : trimmedBooleanBitmap,
			fontSize : fontHeight,
			fontFamily : fontFamily
		};

		return renderInfo;
	},
	fits : function(renderInfo,bitmap) {

		var startX = renderInfo.x + renderInfo.bb.offsetX;
		var startY = renderInfo.y + renderInfo.bb.offsetY;

		var bitmapWidth = bitmap.length;
		var bitmapHeight = bitmap[0].length;

		var hitEdge = startX < 0 || startY < 0;
		var hitOther = false;
		var doesntFit = hitEdge || hitOther;

		for (var i = 0; i < renderInfo.bb.width && !doesntFit; i++) {
			var u = startX + i;
			for (var j = 0; j < renderInfo.bb.height && !doesntFit; j++) {
				var v = startY + j;
				if (u >= bitmapWidth || v >= bitmapHeight) {
					hitEdge = true;
				} else if (bitmap[u][v]) {
					hitOther = true;
				}
				doesntFit = hitEdge || hitOther;
			}
		}
		return !doesntFit;
	}
});

module.exports = TextBitmap;
},{"./util":4}],4:[function(_dereq_,module,exports){

var Util = {

	extend: function(dest, sources) {
		var key, i, source;
		for (i=1; i<arguments.length; i++) {
		  source = arguments[i];
		  for (key in source) {
			if (source.hasOwnProperty(key)) {
			  dest[key] = source[key];
			}
		  }
		}
		return dest;
	},

	lerp : function(min,max,t) {
		return min + (t*(max-min));
	},

	step : function(min,max,t) {
		return Math.round(this.lerp(min,max,t));
	}
};

module.exports = Util;
},{}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9Xb3JkQ2xvdWRDYW52YXMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9Xb3JkQ2xvdWRDYW52YXMvc3JjL2xheW91dC5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9Xb3JkQ2xvdWRDYW52YXMvc3JjL21haW4uanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvV29yZENsb3VkQ2FudmFzL3NyYy90ZXh0Yml0bWFwLmpzIiwiL1VzZXJzL2NocmlzZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL1dvcmRDbG91ZENhbnZhcy9zcmMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciBUZXh0Qml0bWFwID0gcmVxdWlyZSgnLi90ZXh0Yml0bWFwJyk7XG5cbmZ1bmN0aW9uIGNyZWF0ZUFycmF5KGxlbmd0aCkge1xuXHR2YXIgYXJyID0gbmV3IEFycmF5KGxlbmd0aCB8fCAwKSxcblx0XHRpID0gbGVuZ3RoO1xuXG5cdGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuXHRcdHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcblx0XHR3aGlsZShpLS0pIHtcblx0XHRcdGFycltsZW5ndGgtMSAtIGldID0gY3JlYXRlQXJyYXkuYXBwbHkodGhpcywgYXJncyk7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGFycjtcbn1cblxudmFyIExheW91dCA9IGZ1bmN0aW9uKGF0dHJpYnV0ZXMpIHtcblx0dGhpcy5fY2FudmFzID0gbnVsbDtcblx0dGhpcy5fd29yZHMgPSBudWxsO1xuXHR0aGlzLl9iaXRtYXAgPSBudWxsO1xuXHR0aGlzLl90ZXh0Qml0bWFwcGVyID0gbnVsbDtcblxuXHRfLmV4dGVuZCh0aGlzLGF0dHJpYnV0ZXMpO1xufTtcblxuTGF5b3V0LnByb3RvdHlwZSA9IF8uZXh0ZW5kKExheW91dC5wcm90b3R5cGUsIHtcblx0X2luaXRpYWxpemUgOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgdGV4dEJpdG1hcHBlckF0dHJpYnV0ZXMgPSB7fTtcblx0XHRpZiAodGhpcy5kZWJ1Zykge1xuXHRcdFx0dGV4dEJpdG1hcHBlckF0dHJpYnV0ZXMuZGVidWcgPSB0cnVlO1xuXHRcdH1cblxuXHRcdHRoaXMuX3RleHRCaXRtYXBwZXIgPSBuZXcgVGV4dEJpdG1hcCh0ZXh0Qml0bWFwcGVyQXR0cmlidXRlcyk7XG5cdFx0dGhpcy5fYml0bWFwID0gY3JlYXRlQXJyYXkodGhpcy5fY2FudmFzLndpZHRoLHRoaXMuX2NhbnZhcy5oZWlnaHQpO1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fY2FudmFzLndpZHRoOyBpKyspIHtcblx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgdGhpcy5fY2FudmFzLmhlaWdodDsgaisrKSB7XG5cdFx0XHRcdHRoaXMuX2JpdG1hcFtpXVtqXSA9IGZhbHNlO1xuXHRcdFx0fVxuXHRcdH1cblx0fSxcblxuXHRjYW52YXMgOiBmdW5jdGlvbihjYW52YXMpIHtcblx0XHRpZiAoY2FudmFzKSB7XG5cdFx0XHR0aGlzLl9jYW52YXMgPSBjYW52YXM7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2NhbnZhcztcblx0XHR9XG5cdH0sXG5cdHdvcmRzIDogZnVuY3Rpb24od29yZHMpIHtcblx0XHRpZiAod29yZHMpIHtcblx0XHRcdHRoaXMuX3dvcmRzID0gd29yZHM7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX3dvcmRzO1xuXHRcdH1cblx0fSxcblxuXHRiaXRtYXAgOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5fdGV4dEJpdG1hcHBlci50b0NhbnZhcyh0aGlzLl9iaXRtYXApO1xuXHR9LFxuXG5cdG9uV29yZE92ZXIgOiBmdW5jdGlvbihoYW5kbGVyKSB7XG5cdFx0dGhpcy5fb25Xb3JkT3ZlciA9IGhhbmRsZXI7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0bGF5b3V0IDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5faW5pdGlhbGl6ZSgpO1xuXHRcdHZhciByZW5kZXJJbmZvID0ge307XG5cdFx0aWYgKHRoaXMuX3dvcmRzKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cblx0XHRcdHZhciBtaW5Db3VudCA9IE51bWJlci5NQVhfVkFMVUU7XG5cdFx0XHR2YXIgbWF4Q291bnQgPSAwO1xuXG5cdFx0XHRPYmplY3Qua2V5cyh0aGlzLl93b3JkcykuZm9yRWFjaChmdW5jdGlvbih3b3JkKSB7XG5cdFx0XHRcdG1pbkNvdW50ID0gTWF0aC5taW4odGhhdC5fd29yZHNbd29yZF0sbWluQ291bnQpO1xuXHRcdFx0XHRtYXhDb3VudCA9IE1hdGgubWF4KHRoYXQuX3dvcmRzW3dvcmRdLG1heENvdW50KTtcblx0XHRcdH0pO1xuXG5cblx0XHRcdHZhciBtaW5Gb250U2l6ZSA9IHRoaXMubWluRm9udFNpemUgfHwgMTA7XG5cdFx0XHR2YXIgbWF4Rm9udFNpemUgPSB0aGlzLm1heEZvbnRTaXplIHx8IDIwMDtcblx0XHRcdE9iamVjdC5rZXlzKHRoaXMuX3dvcmRzKS5mb3JFYWNoKGZ1bmN0aW9uKHdvcmQpIHtcblxuXHRcdFx0XHR2YXIgdCA9ICh0aGF0Ll93b3Jkc1t3b3JkXSAtIG1pbkNvdW50KS8obWF4Q291bnQtbWluQ291bnQpO1xuXHRcdFx0XHR2YXIgZm9udFNpemUgPV8uc3RlcChtaW5Gb250U2l6ZSxtYXhGb250U2l6ZSx0KTtcblxuXHRcdFx0XHR2YXIgYml0bWFwID0gdGhhdC5fdGV4dEJpdG1hcHBlci5jcmVhdGUod29yZCxmb250U2l6ZSx0aGF0LmZvbnQgfHwgJ0NhbGlicmknKTtcblx0XHRcdFx0cmVuZGVySW5mb1t3b3JkXSA9IGJpdG1hcDtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHZhciBzb3J0ZWRXb3JkQXJyYXkgPSBPYmplY3Qua2V5cyh0aGlzLl93b3Jkcykuc29ydChmdW5jdGlvbih3MSx3Mikge1xuXHRcdFx0cmV0dXJuIHRoYXQuX3dvcmRzW3cyXS10aGF0Ll93b3Jkc1t3MV07XG5cdFx0fSk7XG5cblx0XHRmdW5jdGlvbiBkZWJ1Z0RyYXdBbGwoY3R4LHcsaCkge1xuXHRcdFx0Y3R4LmZpbGxTdHlsZSA9ICd3aGl0ZSc7XG5cdFx0XHRjdHguZmlsbFJlY3QoMCwwLHcsaCk7XG5cdFx0XHRPYmplY3Qua2V5cyhyZW5kZXJJbmZvKS5mb3JFYWNoKGZ1bmN0aW9uKHdvcmQpIHtcblx0XHRcdFx0dmFyIHdvcmRSZW5kZXJJbmZvID0gcmVuZGVySW5mb1t3b3JkXTtcblx0XHRcdFx0aWYgKHdvcmRSZW5kZXJJbmZvLnggIT09IHVuZGVmaW5lZCAmJiB3b3JkUmVuZGVySW5mby54ICE9PSAtMSAmJiB3b3JkUmVuZGVySW5mby55ICE9PSB1bmRlZmluZWQgJiYgd29yZFJlbmRlckluZm8ueSAhPT0gLTEpIHtcblx0XHRcdFx0XHRjdHguZm9udCA9IHdvcmRSZW5kZXJJbmZvLmZvbnRTaXplICsgJ3B4ICcgKyB3b3JkUmVuZGVySW5mby5mb250RmFtaWx5O1xuXHRcdFx0XHRcdGN0eC5maWxsU3R5bGUgPSAncmVkJztcblx0XHRcdFx0XHRjdHguc3Ryb2tlU3R5bGUgPSAnZ3JlZW4nO1xuXHRcdFx0XHRcdGN0eC5maWxsVGV4dCh3b3JkLHdvcmRSZW5kZXJJbmZvLngsd29yZFJlbmRlckluZm8ueSk7XG5cdFx0XHRcdFx0Y3R4LnN0cm9rZVJlY3Qod29yZFJlbmRlckluZm8ueCArIHdvcmRSZW5kZXJJbmZvLmJiLm9mZnNldFgsIHdvcmRSZW5kZXJJbmZvLnkgKyB3b3JkUmVuZGVySW5mby5iYi5vZmZzZXRZLCB3b3JkUmVuZGVySW5mby5iYi53aWR0aCwgd29yZFJlbmRlckluZm8uYmIuaGVpZ2h0KTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0c29ydGVkV29yZEFycmF5LmZvckVhY2goZnVuY3Rpb24od29yZCkge1xuXHRcdFx0dmFyIHBsYWNlZCA9IGZhbHNlO1xuXHRcdFx0dmFyIGF0dGVtcHRzID0gMTAwO1xuXG5cdFx0XHRpZiAodGhpcy5kZWJ1Zykge1xuXHRcdFx0XHRkZWJ1Z0RyYXdBbGwodGhhdC5fY2FudmFzLmdldENvbnRleHQoJzJkJyksdGhhdC5fY2FudmFzLndpZHRoLCB0aGF0Ll9jYW52YXMuaGVpZ2h0KTtcblx0XHRcdH1cblxuXHRcdFx0d2hpbGUgKCFwbGFjZWQgJiYgYXR0ZW1wdHMgPiAwKSB7XG5cdFx0XHRcdHZhciB4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogdGhhdC5fY2FudmFzLndpZHRoKTtcblx0XHRcdFx0dmFyIHkgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiB0aGF0Ll9jYW52YXMuaGVpZ2h0KTtcblxuXHRcdFx0XHRyZW5kZXJJbmZvW3dvcmRdLnggPSB4O1xuXHRcdFx0XHRyZW5kZXJJbmZvW3dvcmRdLnkgPSB5O1xuXG5cdFx0XHRcdGlmICh0aGF0Ll90ZXh0Qml0bWFwcGVyLmZpdHMocmVuZGVySW5mb1t3b3JkXSx0aGF0Ll9iaXRtYXApKSB7XG5cdFx0XHRcdFx0cGxhY2VkID0gdHJ1ZTtcblxuXHRcdFx0XHRcdHZhciBiaXRtYXBXaWR0aCA9IHJlbmRlckluZm9bd29yZF0uYml0bWFwLmxlbmd0aDtcblx0XHRcdFx0XHR2YXIgYml0bWFwSGVpZ2h0ID0gcmVuZGVySW5mb1t3b3JkXS5iaXRtYXBbMF0ubGVuZ3RoO1xuXG5cdFx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBiaXRtYXBXaWR0aDsgaSsrKSB7XG5cdFx0XHRcdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IGJpdG1hcEhlaWdodDsgaisrKSB7XG5cdFx0XHRcdFx0XHRcdHZhciB1ID0gcmVuZGVySW5mb1t3b3JkXS54ICsgcmVuZGVySW5mb1t3b3JkXS5iYi5vZmZzZXRYICsgaTtcblx0XHRcdFx0XHRcdFx0dmFyIHYgPSByZW5kZXJJbmZvW3dvcmRdLnkgKyByZW5kZXJJbmZvW3dvcmRdLmJiLm9mZnNldFkgKyBqO1xuXG5cdFx0XHRcdFx0XHRcdGlmIChyZW5kZXJJbmZvW3dvcmRdLmJpdG1hcFtpXVtqXSkge1xuXHRcdFx0XHRcdFx0XHRcdHRoYXQuX2JpdG1hcFt1XVt2XSA9IHdvcmQ7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRhdHRlbXB0cy0tO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoIXBsYWNlZCkge1xuXHRcdFx0XHRyZW5kZXJJbmZvW3dvcmRdLnggPSAtMTtcblx0XHRcdFx0cmVuZGVySW5mb1t3b3JkXS55ID0gLTE7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRmdW5jdGlvbiBvbk1vdXNlTW92ZShlKSB7XG5cdFx0XHR2YXIgeCA9IGUub2Zmc2V0WDtcblx0XHRcdHZhciB5ID0gZS5vZmZzZXRZO1xuXG5cdFx0XHR2YXIgd29yZCA9IHRoYXQuX2JpdG1hcFt4XVt5XTtcblx0XHRcdGlmICh3b3JkKSB7XG5cdFx0XHRcdGlmICh0aGF0Ll9vbldvcmRPdmVyKSB7XG5cdFx0XHRcdFx0dGhhdC5fb25Xb3JkT3Zlcih3b3JkKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMuX2NhbnZhcy5vbm1vdXNlbW92ZSA9IG9uTW91c2VNb3ZlO1xuXG5cblx0XHRyZXR1cm4gcmVuZGVySW5mbztcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gTGF5b3V0OyIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgTGF5b3V0ID0gcmVxdWlyZSgnLi9sYXlvdXQnKTtcblxudmFyIFdvcmRDbG91ZENhbnZhcyA9IGZ1bmN0aW9uKGF0dHJpYnV0ZXMpIHtcblxuXHR0aGlzLl93b3JkcyA9IHt9O1xuXHR0aGlzLl9zdG9wV29yZHMgPSB7fTtcblxuXHR0aGlzLl9jYW52YXMgPSBudWxsO1xuXHR0aGlzLl93aWR0aCA9IG51bGw7XG5cdHRoaXMuX2hlaWdodCA9IG51bGw7XG5cdHRoaXMuX2JhY2tncm91bmRGaWxsID0gbnVsbDtcblx0dGhpcy5fb25Xb3JkT3ZlciA9IG51bGw7XG5cdHRoaXMuX2xheW91dCA9IG51bGw7XG5cblx0Xy5leHRlbmQodGhpcyxhdHRyaWJ1dGVzKTtcbn07XG5cbldvcmRDbG91ZENhbnZhcy5wcm90b3R5cGUgPSBfLmV4dGVuZChXb3JkQ2xvdWRDYW52YXMucHJvdG90eXBlLCB7XG5cdGNhbnZhcyA6IGZ1bmN0aW9uKGNhbnZhcykge1xuXHRcdGlmIChjYW52YXMpIHtcblx0XHRcdHRoaXMuX2NhbnZhcyA9IGNhbnZhcztcblx0XHRcdHRoaXMuX3dpZHRoID0gY2FudmFzLndpZHRoO1xuXHRcdFx0dGhpcy5faGVpZ2h0ID0gY2FudmFzLmhlaWdodDtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fY2FudmFzO1xuXHRcdH1cblx0fSxcblx0d2lkdGggOiBmdW5jdGlvbih3aWR0aCkge1xuXHRcdGlmICh3aWR0aCkge1xuXHRcdFx0aWYgKHRoaXMuX2NhbnZhcykge1xuXHRcdFx0XHR0aGlzLl9jYW52YXMud2lkdGggPSB3aWR0aDtcblx0XHRcdFx0dGhpcy5fd2lkdGggPSB3aWR0aDtcblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy53aWR0aDtcblx0XHR9XG5cdH0sXG5cdGhlaWdodCA6IGZ1bmN0aW9uKGhlaWdodCkge1xuXHRcdGlmIChoZWlnaHQpIHtcblx0XHRcdGlmICh0aGlzLl9jYW52YXMpIHtcblx0XHRcdFx0dGhpcy5fY2FudmFzLmhlaWdodCA9IGhlaWdodDtcblx0XHRcdFx0dGhpcy5faGVpZ2h0ID0gaGVpZ2h0O1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9oZWlnaHQ7XG5cdFx0fVxuXHR9LFxuXHR0ZXh0IDogZnVuY3Rpb24odGV4dCkge1xuXHRcdHZhciBmaWx0ZXJlZCA9IHRleHQucmVwbGFjZSgvW1xcLiwtXFwvIyEkJVxcXiZcXCo7Ont9PVxcLV9gfigpXS9nLCcnKTtcblx0XHRmaWx0ZXJlZCA9IGZpbHRlcmVkLnJlcGxhY2UoL1xcW1swLTldKlxcXS9nLCcnKTtcblx0XHRmaWx0ZXJlZCA9IGZpbHRlcmVkLnJlcGxhY2UoL1tcXHQrXFxbXFxdXS9nLCcnKTtcblx0XHR2YXIgd29yZHMgPSBmaWx0ZXJlZC5zcGxpdCgnICcpO1xuXHRcdHRoaXMud29yZHMod29yZHMpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdHN0b3AgOiBmdW5jdGlvbih3b3Jkcykge1xuXHRcdGlmICh3b3Jkcykge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0d29yZHMuZm9yRWFjaChmdW5jdGlvbiAod29yZCkge1xuXHRcdFx0XHR0aGF0Ll9zdG9wV29yZHNbd29yZC50cmltKCkudG9Mb3dlckNhc2UoKV0gPSB0cnVlO1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX3N0b3BXb3Jkcztcblx0XHR9XG5cdH0sXG5cblx0YmFja2dyb3VuZCA6IGZ1bmN0aW9uKGZpbGxTdHlsZSkge1xuXHRcdGlmIChmaWxsU3R5bGUpIHtcblx0XHRcdHRoaXMuX2JhY2tncm91bmRGaWxsID0gZmlsbFN0eWxlO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9iYWNrZ3JvdW5kRmlsbDtcblx0XHR9XG5cdH0sXG5cblx0d29yZHMgOiBmdW5jdGlvbih3b3Jkcykge1xuXHRcdGlmICh3b3Jkcykge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0d29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmF3KSB7XG5cdFx0XHRcdHZhciB3b3JkID0gcmF3LnRyaW0oKS50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0XHRpZiAodGhhdC5fc3RvcFdvcmRzW3dvcmRdIHx8IHdvcmQgPT09ICcnKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dmFyIGNvdW50ID0gdGhhdC5fd29yZHNbd29yZF07XG5cdFx0XHRcdGlmICghY291bnQpIHtcblx0XHRcdFx0XHRjb3VudCA9IDA7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y291bnQrKztcblx0XHRcdFx0dGhhdC5fd29yZHNbd29yZF0gPSBjb3VudDtcblx0XHRcdH0pO1xuXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX3dvcmRzO1xuXHRcdH1cblx0fSxcblxuXHRvbldvcmRPdmVyIDogZnVuY3Rpb24oaGFuZGxlcikge1xuXHRcdHRoaXMuX29uV29yZE92ZXIgPSBoYW5kbGVyO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdGZvbnQgOiBmdW5jdGlvbihmb250KSB7XG5cdFx0aWYgKGZvbnQpIHtcblx0XHRcdHRoaXMuX2ZvbnQgPSBmb250O1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9mb250O1xuXHRcdH1cblx0fSxcblxuXHRtaW5Gb250U2l6ZSA6IGZ1bmN0aW9uKG1pbkZvbnRTaXplKSB7XG5cdFx0aWYgKG1pbkZvbnRTaXplKSB7XG5cdFx0XHR0aGlzLl9taW5Gb250U2l6ZSA9IG1pbkZvbnRTaXplO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9taW5Gb250U2l6ZTtcblx0XHR9XG5cdH0sXG5cblx0bWF4Rm9udFNpemUgOiBmdW5jdGlvbihtYXhGb250U2l6ZSkge1xuXHRcdGlmIChtYXhGb250U2l6ZSkge1xuXHRcdFx0dGhpcy5fbWF4Rm9udFNpemUgPSBtYXhGb250U2l6ZTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbWF4Rm9udFNpemU7XG5cdFx0fVxuXHR9LFxuXG5cdGNvbG9ycyA6IGZ1bmN0aW9uKGNvbG9ycykge1xuXHRcdGlmIChjb2xvcnMpIHtcblx0XHRcdHRoaXMuX2NvbG9ycyA9IGNvbG9ycztcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fY29sb3JzO1xuXHRcdH1cblx0fSxcblxuXHRnZW5lcmF0ZSA6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBsYXlvdXRBdHRyaWJ1dGVzID0ge307XG5cdFx0aWYgKHRoaXMuZGVidWcpIHtcblx0XHRcdGxheW91dEF0dHJpYnV0ZXMuZGVidWcgPSB0cnVlO1xuXHRcdH1cblx0XHRpZiAodGhpcy5fZm9udCkge1xuXHRcdFx0bGF5b3V0QXR0cmlidXRlcy5mb250ID0gdGhpcy5fZm9udDtcblx0XHR9XG5cdFx0aWYgKHRoaXMuX21pbkZvbnRTaXplKSB7XG5cdFx0XHRsYXlvdXRBdHRyaWJ1dGVzLm1pbkZvbnRTaXplID0gdGhpcy5fbWluRm9udFNpemU7XG5cdFx0fVxuXHRcdGlmICh0aGlzLl9tYXhGb250U2l6ZSkge1xuXHRcdFx0bGF5b3V0QXR0cmlidXRlcy5tYXhGb250U2l6ZSA9IHRoaXMuX21heEZvbnRTaXplO1xuXHRcdH1cblx0XHRpZiAodGhpcy5fY29sb3JzKSB7XG5cdFx0XHRsYXlvdXRBdHRyaWJ1dGVzLmNvbG9ycyA9IHRoaXMuX2NvbG9ycztcblx0XHR9XG5cblx0XHR0aGlzLl9sYXlvdXQgPSBuZXcgTGF5b3V0KGxheW91dEF0dHJpYnV0ZXMpXG5cdFx0XHQuY2FudmFzKHRoaXMuX2NhbnZhcylcblx0XHRcdC53b3Jkcyh0aGlzLl93b3Jkcylcblx0XHRcdC5vbldvcmRPdmVyKHRoaXMuX29uV29yZE92ZXIpO1xuXG5cdFx0dmFyIHJlbmRlckluZm8gPSB0aGlzLl9sYXlvdXQubGF5b3V0KCk7XG5cblx0XHR2YXIgY3R4ID0gdGhpcy5fY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cdFx0Y3R4LmZpbGxTdHlsZSA9IHRoaXMuX2JhY2tncm91bmRGaWxsIHx8ICd3aGl0ZSc7XG5cdFx0Y3R4LmZpbGxSZWN0KDAsIDAsIHRoaXMuX3dpZHRoLCB0aGlzLl9oZWlnaHQpO1xuXG5cblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0T2JqZWN0LmtleXMocmVuZGVySW5mbykuZm9yRWFjaChmdW5jdGlvbih3b3JkKSB7XG5cdFx0XHR2YXIgd29yZFJlbmRlckluZm8gPSByZW5kZXJJbmZvW3dvcmRdO1xuXHRcdFx0aWYgKHdvcmRSZW5kZXJJbmZvLnggIT09IC0xICYmIHdvcmRSZW5kZXJJbmZvLnkgIT09IC0xKSB7XG5cdFx0XHRcdGN0eC5mb250ID0gd29yZFJlbmRlckluZm8uZm9udFNpemUgKyAncHggJyArIHdvcmRSZW5kZXJJbmZvLmZvbnRGYW1pbHk7XG5cblx0XHRcdFx0Y3R4LmZpbGxTdHlsZSA9ICdyZWQnO1xuXHRcdFx0XHRjdHguZmlsbFRleHQod29yZCx3b3JkUmVuZGVySW5mby54LHdvcmRSZW5kZXJJbmZvLnkpO1xuXG5cdFx0XHRcdGlmICh0aGF0LmRlYnVnKSB7XG5cdFx0XHRcdFx0Y3R4LnN0cm9rZVN0eWxlID0gJ2dyZWVuJztcblx0XHRcdFx0XHRjdHguc3Ryb2tlUmVjdCh3b3JkUmVuZGVySW5mby54ICsgd29yZFJlbmRlckluZm8uYmIub2Zmc2V0WCwgd29yZFJlbmRlckluZm8ueSArIHdvcmRSZW5kZXJJbmZvLmJiLm9mZnNldFksIHdvcmRSZW5kZXJJbmZvLmJiLndpZHRoLCB3b3JkUmVuZGVySW5mby5iYi5oZWlnaHQpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cbn0pO1xuXG5cbmV4cG9ydHMuRXh0ZW5kID0gXy5leHRlbmQ7XG5leHBvcnRzLldvcmRDbG91ZCA9IFdvcmRDbG91ZENhbnZhczsiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG5mdW5jdGlvbiBjcmVhdGVBcnJheShsZW5ndGgpIHtcblx0dmFyIGFyciA9IG5ldyBBcnJheShsZW5ndGggfHwgMCksXG5cdFx0aSA9IGxlbmd0aDtcblxuXHRpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcblx0XHR2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG5cdFx0d2hpbGUoaS0tKSB7XG5cdFx0XHRhcnJbbGVuZ3RoIC0gMSAtIGldID0gY3JlYXRlQXJyYXkuYXBwbHkodGhpcywgYXJncyk7XG5cdFx0fVxuXHR9XG5cblxuXHRyZXR1cm4gYXJyO1xufVxuXG52YXIgVGV4dEJpdG1hcCA9IGZ1bmN0aW9uKGF0dHJpYnV0ZXMpIHtcblx0dGhpcy5fY2FudmFzID0gbnVsbDtcblx0dGhpcy5fY29udGV4dCA9IG51bGw7XG5cdF8uZXh0ZW5kKHRoaXMsYXR0cmlidXRlcyk7XG5cblx0dGhpcy5fY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdHRoaXMuX2NhbnZhcy53aWR0aCA9IDY0MDtcblx0dGhpcy5fY2FudmFzLmhlaWdodCA9IDQ4MDtcblx0dGhpcy5fY29udGV4dCA9IHRoaXMuX2NhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG5cdGlmICh0aGlzLmRlYnVnKSB7XG5cdFx0ZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLl9jYW52YXMpO1xuXHR9XG5cblx0dGhpcy5fYml0bWFwID0gY3JlYXRlQXJyYXkodGhpcy5fY2FudmFzLndpZHRoLHRoaXMuX2NhbnZhcy5oZWlnaHQpO1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX2NhbnZhcy53aWR0aDsgaSsrKSB7XG5cdFx0Zm9yICh2YXIgaiA9IDA7IGogPCB0aGlzLl9jYW52YXMuaGVpZ2h0OyBqKyspIHtcblx0XHRcdHRoaXMuX2JpdG1hcFtpXVtqXSA9IGZhbHNlO1xuXHRcdH1cblx0fVxufTtcblxuVGV4dEJpdG1hcC5wcm90b3R5cGUgPSBfLmV4dGVuZChUZXh0Qml0bWFwLnByb3RvdHlwZSwge1xuXG5cdGNyZWF0ZSA6IGZ1bmN0aW9uKHRleHQsZm9udEhlaWdodCxmb250RmFtaWx5KSB7XG5cdFx0dmFyIGN0eCA9IHRoaXMuX2NvbnRleHQ7XG5cdFx0Y3R4LmZpbGxTdHlsZSA9ICdibGFjayc7XG5cdFx0Y3R4LmZpbGxSZWN0KDAsMCx0aGlzLl9jYW52YXMud2lkdGgsdGhpcy5fY2FudmFzLmhlaWdodCk7XG5cblxuXG5cblx0XHR2YXIgdGV4dFJlbmRlclggPSA1O1xuXHRcdHZhciB0ZXh0UmVuZGVyWSA9IE1hdGguZmxvb3IodGhpcy5fY2FudmFzLmhlaWdodC8yKTtcblxuXHRcdGN0eC5maWxsU3R5bGUgPSAnd2hpdGUnO1xuXHRcdGN0eC5mb250ID0gZm9udEhlaWdodCArICdweCAnICsgZm9udEZhbWlseTtcblx0XHRjdHguZmlsbFRleHQodGV4dCx0ZXh0UmVuZGVyWCx0ZXh0UmVuZGVyWSk7XG5cblx0XHR2YXIgd2lkdGggPSBjdHgubWVhc3VyZVRleHQodGV4dCkud2lkdGg7XG5cblx0XHR2YXIgc3RhcnRYID0gdGV4dFJlbmRlclg7XG5cdFx0dmFyIHN0YXJ0WSA9IHRleHRSZW5kZXJZIC0gZm9udEhlaWdodCAtIDI7XG5cdFx0dmFyIGVuZFggPSBzdGFydFggKyB3aWR0aCArIHRleHRSZW5kZXJYO1xuXHRcdHZhciBlbmRZID0gc3RhcnRZICsgZm9udEhlaWdodCArIGZvbnRIZWlnaHQqMC41O1xuXG5cblxuXHRcdHZhciBpbWFnZURhdGEgPSBjdHguZ2V0SW1hZ2VEYXRhKHN0YXJ0WCxzdGFydFksZW5kWCAtIHN0YXJ0WCxlbmRZIC0gc3RhcnRZKTtcblxuXHRcdHZhciBib29sZWFuQml0bWFwID0gY3JlYXRlQXJyYXkoaW1hZ2VEYXRhLndpZHRoLGltYWdlRGF0YS5oZWlnaHQpO1xuXHRcdHZhciB4ID0gMDtcblx0XHR2YXIgeSA9IDA7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBpbWFnZURhdGEuZGF0YS5sZW5ndGg7IGkrPTQpIHtcblxuXHRcdFx0Ym9vbGVhbkJpdG1hcFt4XVt5XSA9ICBpbWFnZURhdGEuZGF0YVtpXSAhPT0gMDtcblx0XHRcdHgrKztcblx0XHRcdGlmICh4ID09PSBpbWFnZURhdGEud2lkdGgpIHtcblx0XHRcdFx0eCA9IDA7XG5cdFx0XHRcdHkrKztcblx0XHRcdH1cblx0XHR9XG5cblxuXHRcdHZhciBtaW5YID0gTnVtYmVyLk1BWF9WQUxVRTtcblx0XHR2YXIgbWluWSA9IE51bWJlci5NQVhfVkFMVUU7XG5cdFx0dmFyIG1heFggPSAtTnVtYmVyLk1BWF9WQUxVRTtcblx0XHR2YXIgbWF4WSA9IC1OdW1iZXIuTUFYX1ZBTFVFO1xuXHRcdGZvciAoeCA9IDA7IHggPCBib29sZWFuQml0bWFwLmxlbmd0aDsgeCsrKSB7XG5cdFx0XHRmb3IgKHkgPSAwOyB5IDwgYm9vbGVhbkJpdG1hcFt4XS5sZW5ndGg7IHkrKykge1xuXHRcdFx0XHRpZiAoYm9vbGVhbkJpdG1hcFt4XVt5XSkge1xuXHRcdFx0XHRcdG1pblggPSBNYXRoLm1pbihtaW5YLHgpO1xuXHRcdFx0XHRcdG1pblkgPSBNYXRoLm1pbihtaW5ZLHkpO1xuXHRcdFx0XHRcdG1heFggPSBNYXRoLm1heChtYXhYLHgpO1xuXHRcdFx0XHRcdG1heFkgPSBNYXRoLm1heChtYXhZLHkpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dmFyIHRyaW1tZWRCb29sZWFuQml0bWFwID0gY3JlYXRlQXJyYXkobWF4WC1taW5YLG1heFktbWluWSk7XG5cdFx0Zm9yICh4ID0gMDsgeCA8IG1heFgtbWluWDsgeCsrKSB7XG5cdFx0XHRmb3IgKHkgPSAwOyB5IDwgbWF4WS1taW5ZOyB5KyspIHtcblx0XHRcdFx0dHJpbW1lZEJvb2xlYW5CaXRtYXBbeF1beV0gPSBib29sZWFuQml0bWFwW21pblgreF1bbWluWSt5XTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAodGhpcy5kZWJ1Zykge1xuXHRcdFx0Y3R4LnN0cm9rZVN0eWxlID0gJ3llbGxvdyc7XG5cdFx0XHRjdHguc3Ryb2tlUmVjdChzdGFydFgsc3RhcnRZLGVuZFgtc3RhcnRYLGVuZFktc3RhcnRZKTtcblx0XHR9XG5cblx0XHRjdHguc3Ryb2tlU3R5bGUgPSAncmVkJztcblx0XHRjdHguc3Ryb2tlUmVjdCh0ZXh0UmVuZGVyWCx0ZXh0UmVuZGVyWSx0aGlzLl9jYW52YXMud2lkdGgsIHRoaXMuX2NhbnZhcy5oZWlnaHQpO1xuXG5cdFx0dmFyIGJiV2lkdGggPSBtYXhYLW1pblg7XG5cdFx0dmFyIGJiSGVpZ2h0ID0gbWF4WS1taW5ZO1xuXHRcdHZhciBiYk9mZnNldFggPSAtKHRleHRSZW5kZXJYIC0gKHN0YXJ0WCArIG1pblggKSk7XG5cdFx0dmFyIGJiT2Zmc2V0WSA9IC0odGV4dFJlbmRlclkgLSAoc3RhcnRZICsgbWluWSkpO1xuXG5cdFx0aWYgKHRoaXMuZGVidWcpIHtcblx0XHRcdGN0eC5zdHJva2VTdHlsZSA9ICdncmVlbic7XG5cdFx0XHRjdHguc3Ryb2tlUmVjdCh0ZXh0UmVuZGVyWCArIGJiT2Zmc2V0WCwgdGV4dFJlbmRlclkgKyBiYk9mZnNldFksIGJiV2lkdGgsIGJiSGVpZ2h0KTtcblx0XHR9XG5cblx0XHR2YXIgcmVuZGVySW5mbyA9IHtcblx0XHRcdGJiIDoge1xuXHRcdFx0XHRvZmZzZXRYIDogYmJPZmZzZXRYLFxuXHRcdFx0XHRvZmZzZXRZIDogYmJPZmZzZXRZLFxuXHRcdFx0XHR3aWR0aCA6IGJiV2lkdGgsXG5cdFx0XHRcdGhlaWdodCA6IGJiSGVpZ2h0XG5cdFx0XHR9LFxuXHRcdFx0Yml0bWFwIDogdHJpbW1lZEJvb2xlYW5CaXRtYXAsXG5cdFx0XHRmb250U2l6ZSA6IGZvbnRIZWlnaHQsXG5cdFx0XHRmb250RmFtaWx5IDogZm9udEZhbWlseVxuXHRcdH07XG5cblx0XHRyZXR1cm4gcmVuZGVySW5mbztcblx0fSxcblx0Zml0cyA6IGZ1bmN0aW9uKHJlbmRlckluZm8sYml0bWFwKSB7XG5cblx0XHR2YXIgc3RhcnRYID0gcmVuZGVySW5mby54ICsgcmVuZGVySW5mby5iYi5vZmZzZXRYO1xuXHRcdHZhciBzdGFydFkgPSByZW5kZXJJbmZvLnkgKyByZW5kZXJJbmZvLmJiLm9mZnNldFk7XG5cblx0XHR2YXIgYml0bWFwV2lkdGggPSBiaXRtYXAubGVuZ3RoO1xuXHRcdHZhciBiaXRtYXBIZWlnaHQgPSBiaXRtYXBbMF0ubGVuZ3RoO1xuXG5cdFx0dmFyIGhpdEVkZ2UgPSBzdGFydFggPCAwIHx8IHN0YXJ0WSA8IDA7XG5cdFx0dmFyIGhpdE90aGVyID0gZmFsc2U7XG5cdFx0dmFyIGRvZXNudEZpdCA9IGhpdEVkZ2UgfHwgaGl0T3RoZXI7XG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHJlbmRlckluZm8uYmIud2lkdGggJiYgIWRvZXNudEZpdDsgaSsrKSB7XG5cdFx0XHR2YXIgdSA9IHN0YXJ0WCArIGk7XG5cdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IHJlbmRlckluZm8uYmIuaGVpZ2h0ICYmICFkb2VzbnRGaXQ7IGorKykge1xuXHRcdFx0XHR2YXIgdiA9IHN0YXJ0WSArIGo7XG5cdFx0XHRcdGlmICh1ID49IGJpdG1hcFdpZHRoIHx8IHYgPj0gYml0bWFwSGVpZ2h0KSB7XG5cdFx0XHRcdFx0aGl0RWRnZSA9IHRydWU7XG5cdFx0XHRcdH0gZWxzZSBpZiAoYml0bWFwW3VdW3ZdKSB7XG5cdFx0XHRcdFx0aGl0T3RoZXIgPSB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGRvZXNudEZpdCA9IGhpdEVkZ2UgfHwgaGl0T3RoZXI7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiAhZG9lc250Rml0O1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBUZXh0Qml0bWFwOyIsIlxudmFyIFV0aWwgPSB7XG5cblx0ZXh0ZW5kOiBmdW5jdGlvbihkZXN0LCBzb3VyY2VzKSB7XG5cdFx0dmFyIGtleSwgaSwgc291cmNlO1xuXHRcdGZvciAoaT0xOyBpPGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuXHRcdCAgc291cmNlID0gYXJndW1lbnRzW2ldO1xuXHRcdCAgZm9yIChrZXkgaW4gc291cmNlKSB7XG5cdFx0XHRpZiAoc291cmNlLmhhc093blByb3BlcnR5KGtleSkpIHtcblx0XHRcdCAgZGVzdFtrZXldID0gc291cmNlW2tleV07XG5cdFx0XHR9XG5cdFx0ICB9XG5cdFx0fVxuXHRcdHJldHVybiBkZXN0O1xuXHR9LFxuXG5cdGxlcnAgOiBmdW5jdGlvbihtaW4sbWF4LHQpIHtcblx0XHRyZXR1cm4gbWluICsgKHQqKG1heC1taW4pKTtcblx0fSxcblxuXHRzdGVwIDogZnVuY3Rpb24obWluLG1heCx0KSB7XG5cdFx0cmV0dXJuIE1hdGgucm91bmQodGhpcy5sZXJwKG1pbixtYXgsdCkpO1xuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFV0aWw7Il19
(2)
});
