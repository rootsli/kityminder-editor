angular.module('kityminderEditor')
    .directive('mathjaxBtn', ['$modal', function ($modal) {
        return {
            restrict: 'E',
            templateUrl: 'ui/directive/mathjaxBtn/mathjaxBtn.html',
            scope: {
                minder: '='
            },
            replace: true,
            link: function ($scope) {
                var minder = $scope.minder;

                $scope.addMathJax = function (mathjax) {
                    if (!mathjax) {
                        mathjax = minder.queryCommandValue('mathjax');
                    }
                    var mathjaxModal = $modal.open({
                        animation: true,
                        templateUrl: 'ui/dialog/mathjax/mathjax.tpl.html',
                        controller: 'mathjax.ctrl',
                        size: 'lg',
                        resolve: {
                            mathjax: function () {
                                return mathjax;
                            }
                        }
                    });

                    mathjaxModal.result.then(function (result) {
                        minder.execCommand('mathjax', result.math);
                    });
                };

                //监听双击事件
                document.addEventListener('onMathJaxDBClick', function (event) {
                    $scope.addMathJax(event.data);
                });
            }
        }
    }]);