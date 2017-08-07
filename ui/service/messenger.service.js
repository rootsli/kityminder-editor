/**
 * 支持iframe之间的通信
 */
angular.module('kityminderEditor')
    .service('messengerService', ['$window', function ($window) {
        var receiveQueue = [];

        function parse(data) {
            try {
                return JSON.parse(data);
            } catch (e) {
                return false;
            }
        }

        window.addEventListener('message', function (event) {
            var data = event.data,
                temp;
            if (typeof data === 'string') {
                temp = parse(data);
                if (typeof temp === 'object') {
                    data = temp;
                }
            }
            receiveQueue.forEach(function (cb) {
                cb(data, event);
            });
        }, false);

        return {
            /**
             * 发送消息
             * @param type 消息类型,例如：knowledgemap_add_ref->新增前后置关系；knowledgemap_delete_ref->删除前后置关系
             * @param data 发送的参数，json格式
             */
            sendMessage: function (type, data) {
                var parent = $window.parent, opener = $window.opener;
                var params = JSON.stringify(Object.assign({
                    'type': type
                }, data));

                [parent, opener].forEach(function (win) {
                    if (win) {
                        win.postMessage(params, '*');
                    }
                });
            },
            registerReceive: function (callback) {
                if (typeof callback === 'function') {
                    callback = [callback];
                }

                receiveQueue = receiveQueue.concat(callback);
                return callback;
            }
        }
    }]);