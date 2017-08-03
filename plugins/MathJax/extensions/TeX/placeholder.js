/**
 * 占位符.
 * Created by chenzuopeng on 15-8-20.
 */
MathJax.Hub.Register.StartupHook("TeX Jax Ready", function () {

    MathJax.InputJax.TeX.Definitions.Add({
        macros: {
            placeholder: ["Macro", "\\color{red}{⬚}"]
        }
    });

});

MathJax.Ajax.loadComplete("[MathJax]/extensions/TeX/placeholder.js");