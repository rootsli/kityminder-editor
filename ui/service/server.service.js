/**
 * @fileOverview
 *
 *  与后端交互的服务
 *
 * @author: zhangbobell
 * @email : zhangbobell@163.com
 *
 * @copyright: Baidu FEX, 2015
 */
angular.module('kityminderEditor')
    .service('server', ['config', '$http', function (config, $http) {

        return {
            uploadImage: function (file) {
                var url = config.get('imageUpload');
                var fd = new FormData();
                fd.append('upload_file', file);

                return $http.post(url, fd, {
                    transformRequest: angular.identity,
                    headers: {'Content-Type': undefined}
                });
            },
            uploadCsImage: function (session, file) {
                var serviceName = session.path.split('/')[1];
                var url = session.cs_url + '/v0.1/upload?serviceName=' + serviceName + '&session=' + session.session;
                var fd = new FormData();
                fd.append('path', session.path);
                fd.append('name', file.name);
                fd.append('scope', session.scope);
                fd.append('serviceName', serviceName);
                fd.append('file', file);

                return $http.post(url, fd, {
                    transformRequest: angular.identity,
                    headers: {'Content-Type': undefined}
                });
            }
        }
    }]);