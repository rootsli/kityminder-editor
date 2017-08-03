MathJax.Callback.Queue(
	MathJax.Hub.Register.StartupHook("TeX Jax Ready", function () {
		var VERSION = "1.0";

		var TEX = MathJax.InputJax.TeX,
			TEXDEF = TEX.Definitions,
			MML = MathJax.ElementJax.mml,
			HTML = MathJax.HTML;

		TEXDEF.macros.gap = "gap";
		
		TEX.Parse.Augment({
			//
			//  Implements \gap{id|size|width|value}
			//
			gap: function (name) {
				var	args = this.GetArgument(name).split('|');
					id = args[0],
					size = parseInt(args[1], 10),
					width = args[2],
					value = args[3];
					
				var element = HTML.Element('input', { 
						'type' : 'text', 
						'className' : 'ic_gap mathGap',
						'size' : size ? size : 1,
						'id' : id,
						'value' : value.replace('{{value:' + id.replace('editor-', '') + '}}', '')
					});
				
				if (width > 0) {
					$(element).css('width', width);
				}
				
				element.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
				var mml = MML["annotation-xml"](MML.xml(element)).With({ encoding: "application/xhtml+xml", isToken: true });
				this.Push(MML.semantics(mml));
				
			}
		});
		
	})
	
);

MathJax.Ajax.loadComplete("[MathJax]/extensions/forminput.js");

