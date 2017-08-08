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

/**
 * 获取CS session
 */
function getCSSession() {
    var csData = {
        "scope": 1,
        "path": "/qa_content_learningcard/assets",
        "session": "81ecbad4-eedf-4e9e-8a2a-625f5ff93fed",
        "expire_at": 1504680456225,
        "service_id": "9f29f796-d605-40f0-8d20-2f12694c7af6",
        "role": "admin",
        "uid": 2083252226,
        "cs_url": "http://sdpcs.beta.web.sdp.101.com",
        "expires": 2592000
    };
    sendMessage('_mind_res_cs_session_', {
        data: JSON.stringify(csData)
    });
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
            case '_mind_data_change_': //数据变更通知
                alert(params.data);
                break;
            case '_mind_req_cs_session_': //请求获取cs session
                getCSSession();
                break;
            default:
                console.log('unknow mesage type');
        }
    }
});

function onIframeLoad() {
    var data = {
        "root": {
            "data": {"id": "berm5d9eie80", "created": 1501829564361, "text": "中心主题", "mathjax": ""},
            "children": [{
                "data": {"id": "berqgi7afco0", "created": 1501841721562, "text": "分支主题", "layout": null},
                "children": [{
                    "data": {"id": "berqgis2bnc0", "created": 1501841722819, "text": "分支主题", "layout": null},
                    "children": []
                }, {
                    "data": {"id": "berqgnlbva80", "created": 1501841733295, "text": "分支主题", "layout": null},
                    "children": []
                }]
            }, {
                "data": {"id": "berqgk2n0a80", "created": 1501841725635, "text": "aaa", "layout": null},
                "children": []
            }, {
                "data": {
                    "id": "bermyp3r17k0",
                    "created": 1501831862701,
                    "text": "我的一个早晨和傍晚",
                    "layout": null,
                    "expandState": "expand"
                },
                "children": [{
                    "data": {
                        "id": "bermdb52l6g0",
                        "created": 1501830186659,
                        "text": " ",
                        "mathjax": "\\({a}^{2}+{b}^{2}={c}^{2}\\)",
                        "layout": null,
                        "layout_mind_offset": {"x": 55, "y": -23},
                        "image": "http://img3.imgtn.bdimg.com/it/u=1188174684,795370521&fm=200&gp=0.jpg",
                        "imageTitle": "野地小花",
                        "imageSize": {"width": 200, "height": 133},
                        "note": null
                    }, "children": []
                }]
            }, {
                "data": {
                    "id": "bersjaw3wtc0",
                    "created": 1501847582961,
                    "text": "分支主题",
                    "hyperlink": null,
                    "hyperlinkTitle": null,
                    "image": "",
                    "imageTitle": "",
                    "imageSize": "",
                    "mathjax": "\\({这是一个物理公式：a}^{2}+{b}^{2}={c}^{2}\\)",
                    "layout": null
                }, "children": []
            }]
        }, "template": "right", "theme": "fresh-blue", "version": "1.4.43"
    };
    sendMessage('_mind_data_load_', {
        data: JSON.stringify(data)
    });
}