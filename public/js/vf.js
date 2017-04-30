var Tracker = function() {

    var $log = $("#log");

    var _self = this;

    _self.FPS = {
        startTime: 0,
        frameNumber: 0,
        data: [],
        period: 5,
        getMW: function(val) {
            this.data.push(val);
            if (this.data.length > this.period)
                this.data.splice(0, 1); // remove the first element of the array
            var sum = 0;
            for (var i in this.data)
                sum += this.data[i];
            return (sum / this.data.length).toFixed(2);
        },
        getFPS: function() {
            this.frameNumber++;
            var d = new Date().getTime(),
                currentTime = (d - this.startTime) / 1000,
                result = Math.floor((this.frameNumber / currentTime));
            if (currentTime > 1) {
                this.startTime = new Date().getTime();
                this.frameNumber = 0;
            }
            return this.getMW(result);
        }
    };

    return _self;
}();


var LinearAlgebra = function() {
    var _self = this;

    _self.each = function(arr, operation) {
        var arrCopy = arr.slice();

        for (var i = 0; i < arrCopy.length; i++) {
            arrCopy[i] = operation.call(_self, arrCopy[i]);
        }

        return arrCopy;
    };

    return _self;
}();

var Filter = function() {
    var _self = this;

    _self.convnetjs = convnetjs;
    _self.convNet = null;
    _self.tmpCanvas = document.createElement('canvas');
    _self.tmpCtx = _self.tmpCanvas.getContext('2d');

    if (!window.Float32Array) {
        Float32Array = Array;
    }

    _self.mergeArgs = function() {
        var obj, name, copy,
            target = arguments[0] || {},
            i = 1,
            length = arguments.length;

        for (; i < length; i++) {
            if ((obj = arguments[i]) != null) {
                for (name in obj) {
                    copy = obj[name];

                    if (target === copy) {
                        continue;
                    } else if (copy !== undefined) {
                        target[name] = copy;
                    }
                }
            }
        }

        return target;
    };

    _self.filterImage = function(filter, image, var_args) {
        var args = [context.getImageData(0, 0, width, height)];
        for (var i = 2; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
        return filter.apply(null, args);
    };

    _self.parseImage = function(img, params, cb) {
        var defaults = {
            rgba: true
        };

        var options = _self.mergeArgs(defaults, params || {});

        var d = img.data;
        var index = 0;
        var w = img.width,
            h = img.height;
        var n = 0,
            m = 0;
        for (var i = 0; i < d.length; i += 4) {
            var r = d[i];
            var g = d[i + 1];
            var b = d[i + 2];
            var a = d[i + 3];
            var value = [r, g, b, a];
            if (!!cb) {
                cb.call(_self, value, index, n, m);
            }
            index++;
            n = index % img.width;
            m = (n == 0) ? m + 1 : m;
        }

    };

    _self.convInit = function(){
        var layer_defs = []
        layer_defs.push({type:'input', out_sx:32, out_sy:32, out_depth:3}); // declare size of input
        // output Vol is of size 32x32x3 here
        layer_defs.push({type:'conv', sx:5, filters:16, stride:1, pad:2, activation:'relu'});
        // the layer will perform convolution with 16 kernels, each of size 5x5.
        // the input will be padded with 2 pixels on all sides to make the output Vol of the same size
        // output Vol will thus be 32x32x16 at this point
        layer_defs.push({type:'pool', sx:2, stride:2});
        // output Vol is of size 16x16x16 here
        layer_defs.push({type:'conv', sx:5, filters:20, stride:1, pad:2, activation:'relu'});
        // output Vol is of size 16x16x20 here
        layer_defs.push({type:'pool', sx:2, stride:2});
        // output Vol is of size 8x8x20 here
        layer_defs.push({type:'conv', sx:5, filters:20, stride:1, pad:2, activation:'relu'});
        // output Vol is of size 8x8x20 here
        layer_defs.push({type:'pool', sx:2, stride:2});
        // output Vol is of size 4x4x20 here
        layer_defs.push({type:'softmax', num_classes:10});
        // output Vol is of size 1x1x10 here

        var net = new convnetjs.Net();
        net.makeLayers(layer_defs);
        return net;
    };

    _self.convVol = function(img){
        // helpful utility for converting images into Vols is included
        var x = convnetjs.img_to_vol(img);
        var output_probabilities_vol = _self.convNet.forward(x)
    }

    //https://github.com/wellflat/imageprocessing-labs/blob/master/cv/corner_detection/cornerdetect.js
    //https://github.com/codeplaysoftware/visioncpp/wiki/Example:-Harris-Corner-Detection
    /* Harris Operator */
    _self.detectHarris = function(img, params) {
        var _params = ['qualityLevel', 'blockSize', 'k'],
            msg = '';
        for (var i = 0; i < _params.length; i++) {
            if (!params.hasOwnProperty(_params[i])) {
                msg = 'invalid parameters, required \'' + _params[i] + '\'';
                throw new Error(msg);
            }
            if (!parseFloat(params[_params[i]])) {
                msg = 'invalid parameters, required number \'' + _params[i] + '\'';
                throw new TypeError(msg);
            }
        }
        if (params.blockSize % 2 !== 1) {
            throw new Error('odd number required \'blockSize\'');
        }
        if (params.blockSize > 5) {
            throw new Error('unsupported \'blockSize\' ' + params.blockSize);
        }

        var w = img.width,
            h = img.height,
            imgdata = img.data,
            len = w * h << 2,
            src, cov, eig, corners,
            r = (params.blockSize - 1) / 2,
            dx, dy, dxdata, dydata, kernelx, kernely, maxval, quality,
            x, y, kx, ky, i, j, step, tmp;

        if (typeof Float32Array === 'function') {
            src = cov = new Float32Array(w * h * 3);
            corners = new Float32Array(w * h);
        } else {
            src = cov = corners = [];
        }
        // change container, uint8 to float32
        for (i = 0, j = 0; i < len; i += 3, j += 4) {
            src[i] = imgdata[j];
            src[i + 1] = imgdata[j + 1];
            src[i + 2] = imgdata[j + 2];
        }
        // apply sobel filter
        switch (params.blockSize) {
            case 3:
                kernelx = [-1, 0, 1, -2, 0, 2, -1, 0, 1]; // 3*3 kernel
                kernely = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
                break;
            case 5:
                kernelx = [1, 2, 0, -2, -1, // 5*5 kernel
                    4, 8, 0, -8, -4,
                    6, 12, 0, -12, -6,
                    4, 8, 0, -8, -4,
                    1, 2, 0, -2, -1
                ];
                kernely = [-1, -4, -6, -4, -1, -2, -8, -12, -8, -2,
                    0, 0, 0, 0, 0,
                    2, 8, 12, 8, 2,
                    1, 4, 6, 4, 1
                ];
                break;
        }
        dx = _self.convolution(src, w, h, kernelx, 1);
        dy = _self.convolution(src, w, h, kernely, 1);
        // store squared differences directly
        for (y = 0; y < h; y++) {
            step = y * w;
            for (x = 0; x < w; x++) {
                i = (step + x) * 3;
                dxdata = dx[i];
                dydata = dy[i];
                cov[i] = dxdata * dxdata; // dxx
                cov[i + 1] = dxdata * dydata; // dxy
                cov[i + 2] = dydata * dydata; // dyy
            }
        }
        // apply box blur filter
        cov = _self.blur(cov, w, h, (params.blockSize - 1) / 2);
        // compute Harris operator
        eig = _self.calcHarris(cov, w, h, params.k);
        // suppress non-maxima values
        for (y = r; y < h - r; y++) {
            step = y * w;
            for (x = r; x < w - r; x++) {
                i = step + x;
                tmp = eig[i];
                for (ky = -r;
                    (tmp !== 0) && (ky <= r); ky++) {
                    for (kx = -r; kx <= r; kx++) {
                        if (eig[i + ky * w + kx] > tmp) {
                            tmp = 0;
                            break;
                        }
                    }
                }
                if (tmp !== 0) {
                    corners[i] = eig[i];
                }
            }
        }
        // threshold
        maxval = 0;
        len = eig.length;
        for (i = 0; i < len; i++) {
            if (corners[i] > maxval) maxval = corners[i];
        }
        quality = maxval * params.qualityLevel;
        for (j = 0; j < len; j++) {
            if (corners[j] <= quality) {
                corners[j] = 0;
            }
        }
        return corners;
    };

    _self.calcHarris = function(data, width, height, k) {
        var w = width,
            h = height,
            cov = data,
            M, A, B, C, step, i;

        if (typeof Float32Array === 'function') {
            M = new Float32Array(w * h * 3);
        } else {
            M = [];
        }
        for (var y = 0; y < h; y++) {
            step = y * w;
            for (var x = 0; x < w; x++) {
                i = (step + x) * 3;
                A = cov[i];
                B = cov[i + 1];
                C = cov[i + 2];
                M[step + x] = (A * C - B * B - k * (A + C) * (A + C));
            }
        }
        return M;
    };
    /* convolution filter (as sobel/box filter, sigle channel) */
    _self.convolution = function(data, width, height, kernel, divisor) {
        var w = width,
            h = height,
            src = data,
            dst,
            div = 1 / divisor,
            r = Math.sqrt(kernel.length),
            buff = [],
            i, j, k, v, px, py, step, kstep;

        if (divisor === 0) {
            throw new Error('division zero');
        }
        if (r % 2 !== 1) {
            throw new Error('square kernel required');
        }
        if (typeof Float32Array === 'function') {
            dst = new Float32Array(w * h * 3);
        } else {
            dst = [];
        }
        r = (r - 1) / 2;
        for (var y = 0; y < h; y++) {
            step = y * w;
            for (var x = 0; x < w; x++) {
                buff[0] = buff[1] = buff[2] = 0;
                i = (step + x) * 3;
                k = 0;
                // convolution
                for (var ky = -r; ky <= r; ky++) {
                    py = y + ky;
                    if (py <= 0 || h <= py) py = y;
                    kstep = py * w;
                    for (var kx = -r; kx <= r; kx++) {
                        px = x + kx;
                        if (px <= 0 || w <= px) px = x;
                        j = (kstep + px) * 3;
                        buff[0] += src[j] * kernel[k];
                        buff[1] += src[j + 1] * kernel[k];
                        buff[2] += src[j + 2] * kernel[k];
                        k++;
                    }
                }
                dst[i] = buff[0] * div;
                dst[i + 1] = buff[1] * div;
                dst[i + 2] = buff[2] * div;
            }
        }
        return dst;
    };
    /* box blur filter */
    _self.blur = function(data, width, height, radius) {
        var kernel = [],
            size = (2 * radius + 1) * (2 * radius + 1);
        for (var i = 0; i < size; i++) {
            kernel[i] = 1.0;
        }
        return _self.convolution(data, width, height, kernel, 1);
    };

    _self.grayscale = function(pixels, args) {
        var d = pixels.data;
        for (var i = 0; i < d.length; i += 4) {
            var r = d[i];
            var g = d[i + 1];
            var b = d[i + 2];
            // CIE luminance for the RGB
            // The human eye is bad at seeing red and blue, so we de-emphasize them.
            var v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            d[i] = d[i + 1] = d[i + 2] = v
        }
        return pixels;
    };

    _self.rgb2hsl = function(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;

        var min = Math.min(r, g, b);
        var max = Math.max(r, g, b);
        var delta = max - min;
        var h, s, l;

        if (max == min) {
            h = 0;
        } else if (r == max) {
            h = (g - b) / delta;
        } else if (g == max) {
            h = 2 + (b - r) / delta;
        } else if (b == max) {
            h = 4 + (r - g) / delta;
        }

        h = Math.min(h * 60, 360);

        if (h < 0) {
            h += 360;
        }

        l = (min + max) / 2;

        if (max == min) {
            s = 0;
        } else if (l <= 0.5) {
            s = delta / (max + min);
        } else {
            s = delta / (2 - max - min);
        }

        return [h, s * 100, l * 100];
    };

    _self.replaceGreen = function(pixels) {
        var d = pixels.data;

        for (var i = 0, j = 0; j < d.length; i++, j += 4) {
            // Convert from RGB to HSL...
            var hsl = Filter.rgb2hsl(d[j], d[j + 1], d[j + 2]);
            var h = hsl[0],
                s = hsl[1],
                l = hsl[2];

            // ... and check if we have a somewhat green pixel.
            if (h >= 90 && h <= 160 && s >= 25 && s <= 90 && l >= 20 && l <= 75) {
                d[j + 3] = 0;
            }
        }

        return pixels;
    };

    _self.replaceYellow = function(pixels) {
        var d = pixels.data;

        for (var i = 0, j = 0; j < d.length; i++, j += 4) {
            // Convert from RGB to HSL...
            var hsl = Filter.rgb2hsl(d[j], d[j + 1], d[j + 2]);
            var h = hsl[0],
                s = hsl[1],
                l = hsl[2];

            // ... and check if we have a somewhat green pixel.
            if (h >= 30 && h <= 75 && s >= 25 && s <= 100 && l >= 20 && l <= 75) {
                d[j + 3] = 0;
            }
        }

        return pixels;
    };

    _self.threshold = function(pixels, threshold) {
        var d = pixels.data;
        for (var i = 0; i < d.length; i += 4) {
            var r = d[i];
            var g = d[i + 1];
            var b = d[i + 2];
            var v = (0.2126 * r + 0.7152 * g + 0.0722 * b >= threshold) ? 255 : 0;
            d[i] = d[i + 1] = d[i + 2] = v
        }
        return pixels;
    };

    _self.createImageData = function(w, h) {
        return _self.tmpCtx.createImageData(w, h);
    };

    _self.convolute = function(pixels, weights, opaque) {
        var side = Math.round(Math.sqrt(weights.length));
        var halfSide = Math.floor(side / 2);
        var src = pixels.data;
        var sw = pixels.width;
        var sh = pixels.height;
        // pad output by the convolution matrix
        var w = sw;
        var h = sh;
        var output = _self.createImageData(w, h);
        var dst = output.data;
        // go through the destination image pixels
        var alphaFac = opaque ? 1 : 0;
        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                var sy = y;
                var sx = x;
                var dstOff = (y * w + x) * 4;
                // calculate the weighed sum of the source image pixels that
                // fall under the convolution matrix
                var r = 0,
                    g = 0,
                    b = 0,
                    a = 0;
                for (var cy = 0; cy < side; cy++) {
                    for (var cx = 0; cx < side; cx++) {
                        var scy = sy + cy - halfSide;
                        var scx = sx + cx - halfSide;
                        if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
                            var srcOff = (scy * sw + scx) * 4;
                            var wt = weights[cy * side + cx];
                            r += src[srcOff] * wt;
                            g += src[srcOff + 1] * wt;
                            b += src[srcOff + 2] * wt;
                            a += src[srcOff + 3] * wt;
                        }
                    }
                }
                dst[dstOff] = r;
                dst[dstOff + 1] = g;
                dst[dstOff + 2] = b;
                dst[dstOff + 3] = a + alphaFac * (255 - a);
            }
        }
        return output;
    };

    _self.convoluteFloat32 = function(pixels, weights, opaque) {
        var side = Math.round(Math.sqrt(weights.length));
        var halfSide = Math.floor(side / 2);

        var src = pixels.data;
        var sw = pixels.width;
        var sh = pixels.height;

        var w = sw;
        var h = sh;
        var output = {
            width: w,
            height: h,
            data: new Float32Array(w * h * 4)
        };
        var dst = output.data;

        var alphaFac = opaque ? 1 : 0;

        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                var sy = y;
                var sx = x;
                var dstOff = (y * w + x) * 4;
                var r = 0,
                    g = 0,
                    b = 0,
                    a = 0;
                for (var cy = 0; cy < side; cy++) {
                    for (var cx = 0; cx < side; cx++) {
                        var scy = Math.min(sh - 1, Math.max(0, sy + cy - halfSide));
                        var scx = Math.min(sw - 1, Math.max(0, sx + cx - halfSide));
                        var srcOff = (scy * sw + scx) * 4;
                        var wt = weights[cy * side + cx];
                        r += src[srcOff] * wt;
                        g += src[srcOff + 1] * wt;
                        b += src[srcOff + 2] * wt;
                        a += src[srcOff + 3] * wt;
                    }
                }
                dst[dstOff] = r;
                dst[dstOff + 1] = g;
                dst[dstOff + 2] = b;
                dst[dstOff + 3] = a + alphaFac * (255 - a);
            }
        }
        return output;
    };

    _self.sobelFeldman = function(frame) {
        var grayscale = _self.grayscale(frame);
        // Note that ImageData values are clamped between 0 and 255, so we need
        // to use a Float32Array for the gradient values because they
        // range between -255 and 255.
        var vertical = _self.convoluteFloat32(grayscale, [-1, 0, 1, -2, 0, 2, -1, 0, 1]);
        var horizontal = _self.convoluteFloat32(grayscale, [-1, -2, -1,
            0, 0, 0,
            1, 2, 1
        ]);
        var final_image = _self.createImageData(vertical.width, vertical.height);
        for (var i = 0; i < final_image.data.length; i += 4) {
            // make the vertical gradient red
            var v = Math.abs(vertical.data[i]);
            final_image.data[i] = v;
            // make the horizontal gradient green
            var h = Math.abs(horizontal.data[i]);
            final_image.data[i + 1] = h;
            // and mix in some blue for aesthetics
            final_image.data[i + 2] = (v + h) / 4;
            final_image.data[i + 3] = 250; // opaque alpha
        }

        return final_image
    };

    _self.convNet = _self.convInit();

    return _self;

}();

var Webcam = function(params) {

    var _self = this;

    _self._setupFrameAnimation = function() {
        window.requestAnimationFrame = window.requestAnimationFrame ||
            window.msRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.webkitRequestAnimationFrame;

        navigator.getUserMedia = navigator.getUserMedia ||
            navigator.oGetUserMedia ||
            navigator.msGetUserMedia ||
            navigator.mozGetUserMedia ||
            navigator.webkitGetUserMedia;

        // Fallback for browsers that don't provide
        // the requestAnimationFrame API (e.g. Opera).
        if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = function(callback) {
                setTimeout(callback, 0);
            };
        }

        // Fallback for browsers that don't provide
        // the URL.createObjectURL API (e.g. Opera).
        if (!window.URL || !window.URL.createObjectURL) {
            window.URL = window.URL || {};
            window.URL.createObjectURL = function(obj) {
                return obj;
            };
        }
    };


    _self.init = function() {

        _self._setupFrameAnimation();

        _self.width = params.width || 640;
        _self.height = params.height || 320;
        _self.video = document.getElementById(params.video || 'v');
        _self.video.width = _self.width;
        _self.video.height = _self.height;
        _self.canvas = document.getElementById(params.canvas || 'c');
        _self.context = _self.canvas.getContext("2d");
        _self.canvas.width = _self.video.width;
        _self.canvas.height = _self.video.height;
        _self.onFrameChanged = params.onFrameChanged;
        // Get the webcam's stream.
        navigator.getUserMedia({
            //video: true,
            video: {
                optional: [
                    { minWidth: 320 },
                    { minWidth: 640 },
                    { minWidth: 1024 },
                    { minWidth: 1280 },
                    { minWidth: 1920 },
                    { minWidth: 2560 },
                ]
            },
        }, _self._startStream, function() {});
    };

    _self._startStream = function(stream) {
        _self.video.src = URL.createObjectURL(stream);


        _self.video.onloadedmetadata = function(e) {
            // Do something with the video here.
            _self.video.play();
        };

        // Ready! Let's start drawing.
        requestAnimationFrame(_self._drawFrame);
    };

    _self._drawFrame = function() {
        var frame = _self._readFrame();

        if (frame) {
            if (!!_self.onFrameChanged) {
                _self.onFrameChanged.call(_self, frame);
            }
        }

        // Wait for the next frame.
        requestAnimationFrame(_self._drawFrame);
    };

    _self._readFrame = function() {
        try {
            _self.context.drawImage(_self.video, 0, 0, _self.video.width, _self.video.height);
        } catch (e) {
            // The video may not be ready, yet.
            return null;
        }

        return _self.context.getImageData(0, 0, _self.video.width, _self.video.height);
    };

    addEventListener("DOMContentLoaded", _self.init);

}({
    width: 32,//320,
    height: 32,//160,
    onFrameChanged: function(frame) {
        var fps = Tracker.FPS.getFPS();
        var _this = this;

        $('#log').text(`FPS: ${fps}`);

        //var data = Filter.grayscale(frame);

        //var data = Filter.sobelFeldman(frame);
        var data = frame;

        //data = Filter.sobelFeldman(frame);
        //var corners = Filter.detectHarris(frame, { blockSize: 3, k: 0.04, qualityLevel: 0.01 });
        //console.log(data.data.length, corners.length * 4);


       

        /*
        var s = 0;
        for (var i = 0; i < data.data.length; i += 4) {
            var d = data.data;
            var r = d[i];
            var g = d[i + 1];
            var b = d[i + 2];
            // CIE luminance for the RGB
            // The human eye is bad at seeing red and blue, so we de-emphasize them.
            var v = 0;
            if (corners[s++] > 0){
                d[i] = 0;
                d[i + 1] = 255;
                d[i + 2] = 0;
            }
        }
        */

        //var data = Filter.replaceGreen(frame);

        //var data = Filter.replaceYellow(frame);

        this.context.putImageData(data, 0, 0);
        /*
        Filter.parseImage(data, {
            rgba: true
        }, function(v, i, n, m) {
            var r = v[0];
            var g = v[1];
            var b = v[2];

            if (corners[i] > 0) {
                _this.context.fillStyle = "#00FF00";
                _this.context.fillRect(n, m, 2, 2);

                
                //_this.context.beginPath();
                //_this.context.fillStyle = "#FF0000";
                //_this.context.arc(n, m, 1, 0, 2 * Math.PI, true);
                //_this.context.stroke();
                
            }
        });
        */
    }
});


$(document).ready(function(){
    var x = Filter.convnetjs.img_to_vol(document.getElementById('static_image'));
    var output_probabilities_vol = Filter.convNet.forward(x);
    console.log(x, output_probabilities_vol);
});


var VF = function() {


};
