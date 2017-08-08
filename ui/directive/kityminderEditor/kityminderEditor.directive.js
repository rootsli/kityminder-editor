angular.module('kityminderEditor')
    .directive('kityminderEditor', ['config', 'minder.service', 'revokeDialog', '$window', 'messengerService', function (config, minderService, revokeDialog, $window, messengerService) {
        return {
            restrict: 'EA',
            templateUrl: 'ui/directive/kityminderEditor/kityminderEditor.html',
            replace: true,
            scope: {
                onInit: '&'
            },
            link: function (scope, element, attributes) {

                var $minderEditor = element.children('.minder-editor')[0];

                function onInit(editor, minder) {
                    scope.onInit({
                        editor: editor,
                        minder: minder
                    });

                    minderService.executeCallback();

                    //监听message事件
                    $window.addEventListener('message', function (e) {
                        if (typeof(event.data) !== 'undefined') {
                            var params;
                            try {
                                params = JSON.parse(e.data);
                            } catch (e) {
                                params = {};
                            }
                            switch (params.type) {
                                case '_mind_data_load_': //设置数据
                                    var minderData = JSON.parse(params.data);
                                    window.localStorage.__orig_minder_content = JSON.stringify(minderData.root); //保存一份原始数据
                                    editor.minder.importJson(minderData);
                                    break;
                                default:
                                    console.log('unknow message type');
                            }
                        }
                    });
                }

                if (typeof(seajs) != 'undefined') {
                    /* global seajs */
                    seajs.config({
                        base: './src'
                    });

                    define('demo', function (require) {
                        var Editor = require('editor');

                        var editor = window.editor = new Editor($minderEditor);

                        // if (window.localStorage.__dev_minder_content) {
                        //     editor.minder.importJson(JSON.parse(window.localStorage.__dev_minder_content));
                        // }

                        editor.minder.on('contentchange', function () {
                            var editData = editor.minder.exportJson();
                            var origData = window.localStorage.__orig_minder_content;

                            if (JSON.stringify(editData.root) !== origData) {
                                var minderData = JSON.stringify(editor.minder.exportJson());
                                // window.localStorage.__dev_minder_content = minderData;
                                messengerService.sendMessage('_mind_data_change_', {
                                    data: minderData
                                });
                            }
                        });

                        window.minder = window.km = editor.minder;

                        scope.editor = editor;
                        scope.minder = minder;
                        scope.config = config.get();

                        //scope.minder.setDefaultOptions(scope.config);
                        scope.$apply();

                        onInit(editor, minder);
                    });

                    seajs.use('demo');

                } else if (window.kityminder && window.kityminder.Editor) {
                    var editor = new kityminder.Editor($minderEditor);

                    window.editor = scope.editor = editor;
                    window.minder = scope.minder = editor.minder;

                    scope.config = config.get();

                    //scope.minder.setDefaultOptions(config.getConfig());

                    onInit(editor, editor.minder);
                }

            }
        }
    }]);