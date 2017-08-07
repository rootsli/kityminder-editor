/**
 * 脑图组件iframe通信交互测试
 * Created by lichb on 2017/8/7.
 */

/**
 * 发送窗口消息
 * @param type
 * @param data
 * @private
 */
function sendMessage(type, data) {
    if (window.frames.length > 0) {
        var params = {
            type: type
        };

        Object.assign(params, data);
        window.frames[0].postMessage(JSON.stringify(params), '*');
    }
}

//监听message事件
window.addEventListener('message', function (e) {
    if (typeof(event.data) !== 'undefined') {
        var params;
        try {
            params = JSON.parse(e.data);
        } catch (e) {
            params = {};
        }
        switch (params.type) {
            case '_mind_data_change_': //设置数据
                alert(params.data);
                break;
            default:
                console.log('unknow mesage type');
        }
    }
});

function onIframeLoad() {
    var data = {
        "root": {
            "data": {
                "id": "berm5d9eie80",
                "created": 1501829564361,
                "text": "中心主题"
            },
            "children": [
                {
                    "data": {
                        "id": "berqgi7afco0",
                        "created": 1501841721562,
                        "text": "分支主题"
                    },
                    "children": [
                        {
                            "data": {
                                "id": "berqgis2bnc0",
                                "created": 1501841722819,
                                "text": "分支主题"
                            },
                            "children": []
                        },
                        {
                            "data": {
                                "id": "berqgnlbva80",
                                "created": 1501841733295,
                                "text": "分支主题"
                            },
                            "children": []
                        }
                    ]
                },
                {
                    "data": {
                        "id": "berqgk2n0a80",
                        "created": 1501841725635,
                        "text": "分支主题"
                    },
                    "children": []
                },
                {
                    "data": {
                        "id": "bermyp3r17k0",
                        "created": 1501831862701,
                        "text": "我的一个早晨和傍晚"
                    },
                    "children": [
                        {
                            "data": {
                                "id": "bermdb52l6g0",
                                "created": 1501830186659,
                                "text": " ",
                                "mathjax": "\\({这是一个屋里公式：a}^{2}+{b}^{2}={c}^{2}\\)",
                                "image": "http://img3.imgtn.bdimg.com/it/u=1188174684,795370521&fm=200&gp=0.jpg",
                                "imageTitle": "野地小花"
                            },
                            "children": []
                        }
                    ]
                },
                {
                    "data": {
                        "id": "bersjaw3wtc0",
                        "created": 1501847582961,
                        "text": "分支主题"
                    },
                    "children": []
                }
            ]
        }
    };
    sendMessage('_mind_data_load_', {
        data: JSON.stringify(data)
    });
}