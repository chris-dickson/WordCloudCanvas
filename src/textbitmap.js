var _ = require('./util');

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

	document.body.appendChild(this._canvas);

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
		var startY = this._canvas.height/2 - fontHeight - 2;
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

		var renderInfo = {
			width : maxX-minX,
			height : maxY-minY,
			bitmap : trimmedBooleanBitmap,
			fontSize : fontHeight,
			fontFamily : fontFamily
		};

		return renderInfo;
	},
	intersects : function(renderInfo,bitmap) {

		if (renderInfo.x + renderInfo.width > bitmap.length) {
			return true;
		}

		if (renderInfo.y + renderInfo.height > bitmap[0].length) {
			return true;
		}


		var doesItFit = true;

		for (var u = 0; u < renderInfo.bitmap.length && doesItFit; u++) {
			for (var v = 0; v < renderInfo.bitmap[u].length && doesItFit; v++) {
				var x = renderInfo.x + u;
				var y = renderInfo.y + v;

				var a = renderInfo.bitmap[u][v];
				var b = bitmap[x][y];

				doesItFit &= !(a && b);
			}
		}

		return !doesItFit;
	},
	toCanvas : function(bitmap) {
		var canvas = document.createElement('canvas');
		var ctx = canvas.getContext('2d');

		var width = bitmap.length;
		var height = bitmap[0].length;

		canvas.width = width;
		canvas.height = height;

		var imageData = ctx.createImageData(canvas.width,canvas.height);
		var pixelData = [];
		for (var i = 0; i < width; i++) {
			for (var j = 0; j < height; j++) {
				var color = bitmap[i][j] ? [255,255,255,1] : [0,0,0,1];
				pixelData.concat(color);
			}
		}
		imageData.data = pixelData;
		ctx.putImageData(imageData,0,0);
		return canvas;
	}
});

module.exports = TextBitmap;