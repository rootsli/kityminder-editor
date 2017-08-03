/**
 * Created by chenzuopeng on 15-5-27.
 */
CKEDITOR.dialog.add('kityformulaDialog', function (editor) {	
    var fid = "kityformula-editor";

    return {
        title: '公式编辑器',
        minWidth: 782,
        minHeight: 385,
        resizeable:CKEDITOR.DIALOG_RESIZE_NONE,
        contents: [
            {
                id: 'tab-basic',
                label: 'Editor',
               
                elements: [
                    {
                        type: 'html',
                        html: '<div style="width:500px;height:300px;"><iframe id="' + fid + '" style="width:782px;height:382px;" frameborder="no" scrolling="no" src="' + CKEDITOR.basePath + 'plugins/kityformula/dialogs/kityformula.html"></iframe></div>'
                    }
                ]
            }
        ],
        onOk: function () {
            getIFrame(fid).contentWindow.getImageData(function(imageData){
                editor.insertHtml(imageData);
            });
        },
        onShow: function () {
            var selectedHtml = getSelectionHtml(editor);
            console.log("select math data:" + selectedHtml);

            var iframeWindow = getIFrame(fid).contentWindow;
            if (!selectedHtml || selectedHtml.length == 0) {
                if (iframeWindow.init) {
                    iframeWindow.init();
                }
            } else {
                if (iframeWindow.reload) {
                    var latex=iframeWindow.getLatexData(selectedHtml);
                    console.log("select latex data:" + selectedHtml);
                    iframeWindow.reload(latex);
                }
            }

        }
    };
});

function getIFrame(fid) {
    return document.frames ? document.frames[fid] : document.getElementById(fid);
}

function getSelectionHtml(editor) {
    var sel = editor.getSelection();
    var ranges = sel.getRanges();
    var el = new CKEDITOR.dom.element("div");
    for (var i = 0, len = ranges.length; i < len; ++i) {
        el.append(ranges[i].cloneContents());
    }
    return el.getHtml();
}