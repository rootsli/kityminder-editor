angular.module('kityminderEditor')
    .controller('mathjax.ctrl', ['$scope', '$modalInstance', 'mathjax', function ($scope, $modalInstance, mathjax) {
        function _getIFrameSrc() {
            return 'plugins/kityformula/dialogs/kityformula-mathjax.html?f=' + (new Date()).valueOf();
        }

        var _trim = function (value) {
            var begin = value.indexOf('\\(') + 2,
                end = value.lastIndexOf('\\)');

            return value.substring(begin, end);
        };

        var _existPlaceholder = function (latex) {
            return latex.trim().indexOf("\\placeholder") > -1;
        };

        if (mathjax) {
            window.currentLatex = _trim(mathjax);
        } else {
            window.currentLatex = "\\placeholder";
        }

        $scope.src = _getIFrameSrc();

        //公式编辑器初始化
        // window.onMathJaxIframeLoad = function () {
        //     // var ifrm = document.getElementById('iframe_mathjax_editor');
        //     // var win = ifrm.contentWindow;
        //     // var doc = ifrm.contentDocument ? ifrm.contentDocument : ifrm.contentWindow.document;
        //     console.log("current latex:" + win.parent.currentLatex);
        // };

        $scope.ok = function () {
            var win = document.getElementById('iframe_mathjax_editor').contentWindow;
            var latex = win.getLatexData();
            if (_existPlaceholder(latex)) {
                alert("公式不完整");
            } else {
                $modalInstance.close({
                    math: '\\(' + latex + '\\)'
                });
            }

            editor.receiver.selectAll();
        };

        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
            editor.receiver.selectAll();
        };
    }]);