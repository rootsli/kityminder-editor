define(function (require, exports, module) {
    var kity = require('../core/kity');
    var utils = require('../core/utils');

    var Minder = require('../core/minder');
    var MinderNode = require('../core/node');
    var Command = require('../core/command');
    var Module = require('../core/module');
    var Renderer = require('../core/render');

    Module.register('mathjax', function () {
        var _loadImageSize = function (url, callback) {
            var img = document.createElement('img');
            img.onload = function () {
                callback(img.width, img.height);
            };
            img.onerror = function () {
                callback(null);
            };
            img.src = url;
        };

        var _fitImageSize = function (width, height, maxWidth, maxHeight) {
            var ratio = width / height,
                fitRatio = maxWidth / maxHeight;

            // 宽高比大于最大尺寸的宽高比，以宽度为标准适应
            if (width > maxWidth && ratio > fitRatio) {
                width = maxWidth;
                height = width / ratio;
            } else if (height > maxHeight) {
                height = maxHeight;
                width = height * ratio;
            }

            return {
                width: width | 0,
                height: height | 0
            };
        };

        /**
         * @command mathjax
         * @description 为选中的节点添加数学公式
         * @param {string} url 图片的 URL，设置为 null 移除
         * @param {string} title 图片的说明
         * @state
         *   0: 当前有选中的节点
         *  -1: 当前没有选中的节点
         * @return 返回首个选中节点的图片信息，JSON 对象： `{url: url, title: title}`
         */
        var MathjaxCommand = kity.createClass('MathjaxCommand', {
            base: Command,

            execute: function (km, math) {
                var node = minder.getSelectedNode();
                node.setData('mathjax', math);
                node.render();
                km.fire('saveScene');
                km.layout(300);
            },
            queryState: function (minder) {
                return minder.getSelectedNodes().length === 1 ? 0 : -1;
            },
            queryValue: function (minder) {
                var node = minder.getSelectedNode();
                return node && node.getData('mathjax');
            }
        });

        var MathjaxRenderer = kity.createClass('MathjaxRenderer', {
            base: Renderer,

            create: function (node) {
                var image = new kity.Image();
                image.setStyle('cursor', 'pointer');

                image.on('dblclick', function (e) {
                    e.stopPropagation();
                    var mathjax = this.getData('mathjax');
                    var event = document.createEvent('HTMLEvents');
                    event.initEvent("onMathJaxDBClick", true, true);
                    event.data = mathjax;
                    document.dispatchEvent(event);
                });

                return image;
            },

            shouldRender: function (node) {
                return node.getData('mathjax');
            },

            update: function (image, node, box) {
                window.drawLaTex(node.getData('mathjax'), function (base64Imgs) {
                    image.setUrl(base64Imgs[0][0]);
                    node.getContentBox().width = 150;
                });

                var size = {
                    width: 250,
                    height: 35
                };
                // var spaceTop = node.getStyle('space-top');
                var x = box.cx - size.width / 2;
                var y = box.y - size.height + 12;//- spaceTop;

                if (!image.getUrl()) {
                    image.setUrl('#');
                }

                image
                    .setData('mathjax', node.getData('mathjax'))
                    .setX(x | 0)
                    .setY(y | 0)
                    .setWidth(size.width | 0)
                    .setHeight(size.height | 0);

                return new kity.Box(x | 0, y | 0, size.width | 0, size.height | 0);
            }
        });

        return {
            'commands': {
                'mathjax': MathjaxCommand
            },
            'renderers': {
                'right': MathjaxRenderer
            }
        };
    });
});