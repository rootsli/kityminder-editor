/**
 * 修复当underset和overset命令的第一个参数为空时出现解析错位的问题(如\overset {} {a} 或 \underset {} {a}).
 * Created by chenzuopeng on 15-8-4.
 */
MathJax.Hub.Register.StartupHook("TeX Jax Ready", function () {

    var MML = MathJax.ElementJax.mml,
        TEX = MathJax.InputJax.TeX;

    MathJax.InputJax.TeX.Definitions.Add({
        macros: {
            overset:  'FixOverset',
            underset: 'FixUnderset',
        }
    }, null, true);

    MathJax.InputJax.TeX.Parse.Augment({

        FixOverset: function (name) {
            var top = this.ParseArg(name), base = this.ParseArg(name);
            if (top.data.length === 0) {
                top = TEX.Parse("\\,").mml();//添加一个空格
            }
            this.Push(MML.mover(base,top));
        },

        FixUnderset: function (name) {
            var bot = this.ParseArg(name), base = this.ParseArg(name);
            if (bot.data.length === 0) {
                bot = TEX.Parse("\\,").mml();//添加一个空格
            }
            this.Push(MML.munder(base, bot));
        }
    });

});

MathJax.Ajax.loadComplete("[MathJax]/extensions/TeX/fixed-over-under-set.js");
