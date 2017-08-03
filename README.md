KityMinder Editor - 支持数学公式的渲染与编辑
==========

## 简介

本项目基于百度[KityMinder Editor](https://github.com/fex-team/kityminder-editor) 进行二次开发，融入了[Kity Formula](http://gongshi.baidu.com/)公式编辑器功能，支持数理化公式的编辑与渲染。

![](https://github.com/rootsli/kityminder-editor/blob/master/doc/images/1.png)

![](https://github.com/rootsli/kityminder-editor/blob/master/doc/images/2.png)

## 使用
根目录下的 `index.html` 为开发环境，`dist` 目录下的 `index.html` 使用打包好的代码，适用于线上环境。

1. 安装 [nodejs](http://nodejs.org) 和 [npm](https://docs.npmjs.com/getting-started/installing-node)
2. 初始化：切到 kityminder-editor 根目录下运行 `npm run init`
3. 你可以基于根目录的 `index.html` 开发，或者查看 `dist` 目录下用于生产环境的 `index.html`，Enjoy it!

另外，kityminder-editor 还提供了 bower 包，方便开发者直接使用。你可以在需要用到 kityminder-editor 的工程目录下
运行 `bower install kityminder-editor`，接着手动引入 kityminder-editor 所依赖的 css 和 js 文件，具体文件见
`dist` 目录下的 `index.html`，推荐使用 npm 包 [wireDep](https://www.npmjs.com/package/wiredep) 自动进行，
可参考根目录下 `Gruntfile.js`。

## 构建
运行 `grunt build`，完成后 `dist` 目录里就是可用运行的 kityminder-editor

## 初始化配置
用户可以根据需要，配置 `kityminder-editor`, 具体使用方法如下：
```
angular.module('kityminderDemo', ['kityminderEditor'])
    .config(function (configProvider) {
        configProvider.set('imageUpload', 'path/to/image/upload/handler');
    });

```

## 数据导入导出
由于 kityminder-editor 是基于 kityminder-core 搭建的，而 kityminder-core 内置了五种常见
格式的导入或导出，在创建编辑器实例之后，可以使用四个接口进行数据的导入导出。

* `editor.minder.exportJson()` - 导出脑图数据为 JSON 对象
* `editor.minder.importJson(json)` - 导入 JSON 对象为当前脑图数据
* `editor.minder.exportData(protocol, option)` - 导出脑图数据为指定的数据格式，返回一个 Promise，其值为导出的结果
* `editor.minder.importData(protocol, data, option)` - 导入指定格式的数据为脑图数据，返回一个 Promise，其值为转换之后的脑图 Json 数据

目前支持的数据格式包括：

* `json` - JSON 字符串，支持导入和导出
* `text` - 纯文本格式，支持导入和导出
* `markdown` - Markdown 格式，支持导入和导出
* `svg` - SVG 矢量格式，仅支持导出
* `png` - PNG 位图格式，仅支持导出

更多格式的支持，可以加载 [kityminder-protocol](https://github.com/fex-team/kityminder-protocol) 来扩展第三方格式支持。

数据格式的具体信息，可参考 [kityminder-core-wiki 的中的说明](https://github.com/fex-team/kityminder-core/wiki)。