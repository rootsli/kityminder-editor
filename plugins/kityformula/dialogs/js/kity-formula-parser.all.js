/*!
 * ====================================================
 * Kity Formula Parser - v1.0.0 - 2015-08-19
 * https://github.com/HanCong03/kityformula-editor
 * GitHub: https://github.com/kitygraph/kityformula-editor.git 
 * Copyright (c) 2015 Baidu Kity Group; Licensed MIT
 * ====================================================
 */

(function () {
var _p = {
    r: function(index) {
        if (_p[index].inited) {
            return _p[index].value;
        }
        if (typeof _p[index].value === "function") {
            var module = {
                exports: {}
            }, returnValue = _p[index].value(null, module.exports, module);
            _p[index].inited = true;
            _p[index].value = returnValue;
            if (returnValue !== undefined) {
                return returnValue;
            } else {
                for (var key in module.exports) {
                    if (module.exports.hasOwnProperty(key)) {
                        _p[index].inited = true;
                        _p[index].value = module.exports;
                        return module.exports;
                    }
                }
            }
        } else {
            _p[index].inited = true;
            return _p[index].value;
        }
    }
};

//src/assembly.js
/*!
 * 装配器
 */
/* jshint forin: false */
/* global kf */
//TODO 重构generateExpression函数
/* 由于有一个大函数，临时把单个函数内的最大语句行数调整一下， 留待以后重构 */
/* jshint maxstatements: 500 */
_p[0] = {
    value: function(require) {
        var CONSTRUCT_MAPPING = {}, CURSOR_CHAR = "";
        /* ---------------------------------- Assembly 对象 */
        function Assembly(formula) {
            this.formula = formula;
        }
        Assembly.prototype.generateBy = function(data) {
            var tree = data.tree, objTree = {}, selectInfo = {}, mapping = {};
            if (typeof tree === "string") {
                //TODO return值统一
                throw new Error("Unhandled error");
            } else {
                //TODO slow ,use 108 of 253 of service render.draw         
                var exp = generateExpression(tree, deepCopy(tree), objTree, mapping, selectInfo);
                //TODO slow,use 100 of 271 for service render.draw
                //TODO 这一步将创建的dom元素加入svg container
                this.formula.appendExpression(exp);
                return {
                    select: selectInfo,
                    parsedTree: tree,
                    tree: objTree,
                    mapping: mapping
                };
            }
        };
        Assembly.prototype.regenerateBy = function(data) {
            //这一步清空全部expressions    	
            this.formula.clearExpressions();
            return this.generateBy(data);
        };
        /**
     * 根据提供的树信息生成表达式
     * @param tree 中间格式的解析树
     * @return {kf.Expression} 生成的表达式
     */
        function generateExpression(originTree, tree, objTree, mapping, selectInfo) {
            var currentOperand = null, exp = null, // 记录光标位置
            cursorLocation = [], operand = tree.operand || [], constructor = null, ConstructorProxy;
            objTree.operand = [];
            // 文本表达式已经不需要再处理了
            if (tree.name.indexOf("text") === -1) {
                // 处理操作数
                for (var i = 0, len = operand.length; i < len; i++) {
                    currentOperand = operand[i];
                    //TODO 光标定位， 配合编辑器， 后期应该考虑是否有更佳的方案来实现
                    if (currentOperand === CURSOR_CHAR) {
                        cursorLocation.push(i);
                        if (!selectInfo.hasOwnProperty("startOffset")) {
                            // 字符串中的开始偏移是需要修正的
                            selectInfo.startOffset = i;
                        }
                        selectInfo.endOffset = i;
                        if (tree.attr && tree.attr.id) {
                            selectInfo.groupId = tree.attr.id;
                        }
                        continue;
                    }
                    if (!currentOperand) {
                        operand[i] = createObject("empty");
                        objTree.operand.push(operand[i]);
                    } else if (typeof currentOperand === "string") {
                        // 括号表达式不能对前2个参数做处理， 这两个参数是代表括号类型
                        if (tree.name === "brackets" && i < 2) {
                            operand[i] = currentOperand;
                        } else if (tree.name === "function" && i === 0) {
                            operand[i] = currentOperand;
                        } else {
                            operand[i] = createObject("text", currentOperand);
                        }
                        objTree.operand.push(operand[i]);
                    } else {
                        objTree.operand.push({});
                        operand[i] = generateExpression(originTree.operand[i], currentOperand, objTree.operand[objTree.operand.length - 1], mapping, selectInfo);
                    }
                }
                // 包含有选区时， 需要修正一下偏移
                if (cursorLocation.length === 2) {
                    selectInfo.endOffset -= 1;
                }
                while (i = cursorLocation.length) {
                    i = cursorLocation[i - 1];
                    operand.splice(i, 1);
                    cursorLocation.length--;
                    originTree.operand.splice(i, 1);
                }
            }
            constructor = getConstructor(tree.name);
            if (!constructor) {
                throw new Error("operator type error: not found " + tree.operator);
            }
            ConstructorProxy = function() {};
            ConstructorProxy.prototype = constructor.prototype;
            exp = new ConstructorProxy();
            constructor.apply(exp, operand);
            objTree.func = exp;
            // 调用配置函数
            for (var fn in tree.callFn) {
                if (!tree.callFn.hasOwnProperty(fn) || !exp[fn]) {
                    continue;
                }
                exp[fn].apply(exp, tree.callFn[fn]);
            }
            if (tree.attr) {
                if (tree.attr.id) {
                    mapping[tree.attr.id] = {
                        objGroup: exp,
                        strGroup: originTree
                    };
                }
                if (tree.attr["data-root"]) {
                    mapping.root = {
                        objGroup: exp,
                        strGroup: originTree
                    };
                }
                exp.setAttr(tree.attr);
            }
            return exp;
        }
        function createObject(type, value) {
            switch (type) {
              case "empty":
                return new kf.EmptyExpression();

              case "text":
                return new kf.TextExpression(value);
            }
        }
        /**
     * 根据操作符获取对应的构造器
     */
        function getConstructor(name) {
            return CONSTRUCT_MAPPING[name] || kf[name.replace(/^[a-z]/i, function(match) {
                return match.toUpperCase();
            }).replace(/-([a-z])/gi, function(match, char) {
                return char.toUpperCase();
            }) + "Expression"];
        }
        function deepCopy(source) {
            var target = {};
            if ({}.toString.call(source) === "[object Array]") {
                target = [];
                for (var i = 0, len = source.length; i < len; i++) {
                    target[i] = doCopy(source[i]);
                }
            } else {
                for (var key in source) {
                    if (!source.hasOwnProperty(key)) {
                        continue;
                    }
                    target[key] = doCopy(source[key]);
                }
            }
            return target;
        }
        function doCopy(source) {
            if (!source) {
                return source;
            }
            if (typeof source !== "object") {
                return source;
            }
            return deepCopy(source);
        }
        return Assembly;
    }
};

//src/impl/latex/base/latex-utils.js
/**
 * latex实现工具包
 */
_p[1] = {
    value: function(require) {
        return {
            toRPNExpression: _p.r(3),
            generateTree: _p.r(4)
        };
    }
};

//src/impl/latex/base/qualifier-utils.js
/**
 * 限定符处理工具类.
 *
 * Created by chenzuopeng on 15-7-1.
 */
_p[2] = {
    value: function(require) {
        var QUALIFIER_LIST = [ "limits" ], ATTR_QUALIFIERS = "data-qualifiers", Utils = _p.r(5);
        return {
            /**
         * 是否是限定符.
         *
         * @author chenzuopeng  2015-07-01
         * @param input
         * @returns {boolean}
         */
            isQualifier: function(input) {
                return QUALIFIER_LIST.indexOf(input.replace(/^\\/, "")) > -1;
            },
            /**
         * 添加限定符到其选定的结构的限定符列表.
         *
         * @author chenzuopeng  2015-07-01
         * @param structs
         * @param qualifier
         * @returns {boolean}
         */
            appendQualifierTo: function(structs, qualifier) {
                qualifier = qualifier.replace(/^\\/, "");
                for (var j = structs.length - 1; j >= 0; j--) {
                    var struct = structs[j];
                    if (typeof struct === "object" && !Utils.isArray(struct)) {
                        if (struct.qualifiers) {
                            struct.qualifiers.push(qualifier);
                        } else {
                            struct.qualifiers = [ qualifier ];
                        }
                        break;
                    }
                }
            },
            /**
         * 将限定符转化成attr属性.
         *
         * @author chenzuopeng  2015-07-01
         * @param unit
         */
            qualifiersToAttrs: function(unit) {
                if (!unit.qualifiers) {
                    return;
                }
                if (!unit.attr) {
                    unit.attr = {};
                }
                unit.attr[ATTR_QUALIFIERS] = unit.qualifiers;
            },
            /**
         * 逆解析限定符
         *
         * @author chenzuopeng  2015-07-01
         * @param unit
         * @returns {*}
         */
            reverseQualifiers: function(unit) {
                if (unit.attr && unit.attr[ATTR_QUALIFIERS]) {
                    var qualifiers = unit.attr[ATTR_QUALIFIERS];
                    var tmpArray = [];
                    for (var i = 0, len = qualifiers.length; i < len; i++) {
                        tmpArray.push("\\" + qualifiers[i]);
                    }
                    return tmpArray.join("");
                }
                return "";
            }
        };
    }
};

//src/impl/latex/base/rpn.js
_p[3] = {
    value: function(require) {
        var Utils = _p.r(5), TYPE = _p.r(16);
        function rpn(units) {
            var signStack = [], currentUnit = null;
            // 先处理函数
            units = processFunction(units);
            while (currentUnit = units.shift()) {
                // 移除brackets和environment中外层包裹的combination节点
                if (currentUnit.name === "combination" && currentUnit.operand.length === 1 && (currentUnit.operand[0].name === "brackets" || currentUnit.operand[0].type === TYPE.ENV)) {
                    currentUnit = currentUnit.operand[0];
                }
                if (Utils.isArray(currentUnit)) {
                    signStack.push(rpn(currentUnit));
                    continue;
                }
                signStack.push(currentUnit);
            }
            // 要处理brackets被附加的包裹元素
            return signStack;
        }
        /**
     * “latex函数”处理器
     * @param units 单元组
     * @returns {Array} 处理过后的单元组
     */
        function processFunction(units) {
            var processed = [], currentUnit = null;
            while ((currentUnit = units.pop()) !== undefined) {
                if (currentUnit && typeof currentUnit === "object" && (currentUnit.sign === false || currentUnit.name === "function")) {
                    // 预先处理不可作为独立符号的函数
                    var tt = currentUnit.handler(currentUnit, [], processed.reverse());
                    processed.unshift(tt);
                    processed.reverse();
                } else {
                    processed.push(currentUnit);
                }
            }
            return processed.reverse();
        }
        return rpn;
    }
};

//src/impl/latex/base/tree.js
/**
 * 从单元组构建树
 */
_p[4] = {
    value: function(require) {
        var mergeHandler = _p.r(24), Utils = _p.r(5), QualifierUtils = _p.r(2);
        function generateTree(units) {
            var currentUnit = null, tree = [];
            for (var i = 0, len = units.length; i < len; i++) {
                if (Utils.isArray(units[i])) {
                    units[i] = generateTree(units[i]);
                }
            }
            while (currentUnit = units.shift()) {
                if (typeof currentUnit === "object" && currentUnit.handler) {
                    // 处理操作数
                    tree.push(currentUnit.handler(currentUnit, tree, units));
                } else {
                    tree.push(currentUnit);
                }
                /**
             * 处理limits
             * chenzuopeng 2015-06-29
             */
                QualifierUtils.qualifiersToAttrs(currentUnit);
            }
            return mergeHandler(tree);
        }
        return generateTree;
    }
};

//src/impl/latex/base/utils.js
/**
 * 通用工具包
 *
 * @history
 *
 *     2015-06 chenzuopeng 添加对环境(environment)支持的相关函数
 */
_p[5] = {
    value: function(require) {
        var OPERATOR_LIST = _p.r(12), FUNCTION_LIST = _p.r(11), FUNCTION_HANDLER = _p.r(37), ENVIRONMENT_LIST = _p.r(8), Utils = {
            // 根据输入的latex字符串， 检测出该字符串所对应的kf的类型
            getLatexType: function(str) {
                str = str.replace(/^\\/, "");
                // 操作符
                if (OPERATOR_LIST[str]) {
                    return "operator";
                }
                if (FUNCTION_LIST[str]) {
                    return "function";
                }
                return "text";
            },
            isArray: function(obj) {
                return obj && Object.prototype.toString.call(obj) === "[object Array]";
            },
            isEnvironment: function(type) {
                return ENVIRONMENT_LIST.hasOwnProperty(type);
            },
            getDefine: function(str) {
                return Utils.extend({}, OPERATOR_LIST[str.replace("\\", "")]);
            },
            getFuncDefine: function(str) {
                return {
                    name: "function",
                    params: str.replace(/^\\/, ""),
                    handler: FUNCTION_HANDLER
                };
            },
            getBracketsDefine: function(leftBrackets, rightBrackets) {
                return Utils.extend({
                    params: [ leftBrackets, rightBrackets ]
                }, OPERATOR_LIST.brackets);
            },
            /**
             * 获取环境定义.
             * @author chenzuopeng  2015-06-08
             * @param type
             * @returns {*}
             */
            getEnvironmentDefine: function(type) {
                return Utils.extend({
                    environmentType: type
                }, ENVIRONMENT_LIST[type]);
            },
            /**
             * 获取参数以及子单元.
             * @author chenzuopeng  2015-06-08
             * @param define
             * @param subunits
             * @returns {*}
             */
            extractArgumentsAndSubunit: function(define, subunits) {
                if (define.argumentExtractor) {
                    return define.argumentExtractor(define, subunits);
                }
                return subunits;
            },
            extend: function(target, sources) {
                for (var key in sources) {
                    if (sources.hasOwnProperty(key)) {
                        target[key] = sources[key];
                    }
                }
                return target;
            }
        };
        return Utils;
    }
};

//src/impl/latex/debug/debug-utils.js
/**
 * debug工具包.
 * Created by chenzuopeng on 15-6-4.
 */
_p[6] = {
    value: function(require) {
        return {
            toString: function(obj) {
                var string = [];
                //is object
                //    Both arrays and objects seem to return "object"
                //    when typeof(obj) is applied to them. So instead
                //    I am checking to see if they have the property
                //    join, which normal objects don't have but
                //    arrays do.
                if (obj === null) {
                    string.push(JSON.stringify(obj));
                } else if (typeof obj == "object" && obj.join === undefined) {
                    string.push("{");
                    for (var prop in obj) {
                        if (obj) {
                            string.push(prop, ": ", this.toString(obj[prop]), ",");
                        }
                    }
                    string.push("}");
                } else if (typeof obj == "object" && obj.join !== undefined) {
                    string.push("[");
                    //property
                    string.push("(");
                    for (var prop in obj) {
                        if (isNaN(prop)) {
                            string.push(prop, ": ", this.toString(obj[prop]), ",");
                        }
                    }
                    string.push(")|");
                    //item
                    for (var i = 0, len = obj.length; i < len; i++) {
                        string.push(this.toString(obj[i]));
                        if (i < len - 1) {
                            string.push(",");
                        }
                    }
                    string.push("]");
                } else if (typeof obj == "function") {
                    //string.push(obj.toString())
                    string.push("[[function]]");
                } else {
                    string.push(JSON.stringify(obj));
                }
                return string.join("");
            },
            log: function(prefix, message) {
                if (message) {
                    var outMessage = this.toString(message);
                    console.log(prefix + " - " + outMessage);
                } else {
                    console.log(prefix);
                }
            }
        };
    }
};

//src/impl/latex/define/brackets.js
/**
 * 定义括号类型， 对于属于括号类型的符号或表达式， 则可以应用brackets函数处理
 */
_p[7] = {
    value: function() {
        var t = true;
        return {
            ".": t,
            "{": t,
            "}": t,
            "[": t,
            "]": t,
            "(": t,
            ")": t,
            "|": t
        };
    }
};

//src/impl/latex/define/environment.js
/**
 * 环境列表.
 * Created by chenzuopeng on 15-6-8.
 */
_p[8] = {
    value: function(require) {
        var TYPE = _p.r(16);
        return {
            gathered: {
                name: "equations",
                type: TYPE.ENV,
                handler: _p.r(27)
            },
            gather: {
                name: "equations",
                type: TYPE.ENV,
                handler: _p.r(27)
            },
            "gather*": {
                name: "equations",
                type: TYPE.ENV,
                handler: _p.r(27)
            },
            align: {
                name: "equations",
                type: TYPE.ENV,
                handler: _p.r(27)
            },
            "align*": {
                name: "equations",
                type: TYPE.ENV,
                handler: _p.r(27)
            },
            aligned: {
                name: "equations",
                type: TYPE.ENV,
                handler: _p.r(27)
            },
            array: {
                name: "array",
                type: TYPE.ENV,
                handler: _p.r(26),
                argumentExtractor: _p.r(25)
            },
            matrix: {
                name: "matrix",
                type: TYPE.ENV,
                handler: _p.r(30)
            },
            pmatrix: {
                name: "matrix",
                type: TYPE.ENV,
                handler: _p.r(30)
            },
            bmatrix: {
                name: "matrix",
                type: TYPE.ENV,
                handler: _p.r(30)
            },
            Bmatrix: {
                name: "matrix",
                type: TYPE.ENV,
                handler: _p.r(30)
            },
            vmatrix: {
                name: "matrix",
                type: TYPE.ENV,
                handler: _p.r(30)
            },
            Vmatrix: {
                name: "matrix",
                type: TYPE.ENV,
                handler: _p.r(30)
            }
        };
    }
};

//src/impl/latex/define/escape.js
/**
 * 转义处理器列表
 * Created by chenzuopeng on 15-6-23.
 */
_p[9] = {
    value: function(require) {
        return {
            // 在矩阵环境或数组环境中的行分隔符转义
            rowSeparator: _p.r(18),
            // 命令的可选参数
            optionalParameter: _p.r(17),
            // 数学公式中文本中的空格(text,textrm等命令中文本中的空格)转义
            spaceInText: _p.r(19)
        };
    }
};

//src/impl/latex/define/factory.js
/**
 * 操作符列表
 */
_p[10] = {
    value: function(require) {
        //处理上下标类操作符
        var ScriptFactory = _p.r(21);
        var scriptFactory = new ScriptFactory();
        scriptFactory.keys = [ "prod", "coprod", "bigcup", "bigcap", "bigvee", "bigwedge" ];
        //处理可选参数的操作符
        var OptionParamFactory = _p.r(20);
        var optionParamFactory = new OptionParamFactory();
        optionParamFactory.keys = [ "xrightleftharpoons", "xrightarrow", "sqrt" ];
        //处理无上下标、无可选参数的操作符
        var SimpleFactory = _p.r(22);
        var simpleFactory = new SimpleFactory();
        simpleFactory.keys = [ "vec", "bar", "widehat", "hat", "cancel", "underrightarrow", "overrightarrow" ];
        return [ scriptFactory, optionParamFactory, simpleFactory ];
    }
};

//src/impl/latex/define/func.js
/**
 * 函数列表
 */
_p[11] = {
    value: function() {
        return {
            sin: 1,
            arcsin: 1,
            cos: 1,
            arccos: 1,
            cosh: 1,
            det: 1,
            inf: 1,
            limsup: 1,
            Pr: 1,
            tan: 1,
            arctan: 1,
            cot: 1,
            //arccot:1,
            dim: 1,
            ker: 1,
            ln: 1,
            sec: 1,
            tanh: 1,
            coth: 1,
            exp: 1,
            lg: 1,
            log: 1,
            arg: 1,
            csc: 1,
            gcd: 1,
            lim: 1,
            max: 1,
            sinh: 1,
            deg: 1,
            hom: 1,
            liminf: 1,
            min: 1,
            sup: 1
        };
    }
};

//src/impl/latex/define/operator.js
/**
 * 操作符列表
 */
_p[12] = {
    value: function(require) {
        var scriptHandler = _p.r(44);
        var TYPE = _p.r(16);
        var objects = {
            "^": {
                name: "superscript",
                type: TYPE.OP,
                handler: scriptHandler
            },
            _: {
                name: "subscript",
                type: TYPE.OP,
                handler: scriptHandler
            },
            frac: {
                name: "fraction",
                type: TYPE.FN,
                sign: false,
                handler: _p.r(36)
            },
            sum: {
                name: "summation",
                type: TYPE.FN,
                traversal: "rtl",
                handler: _p.r(46)
            },
            "int": {
                name: "integration",
                type: TYPE.FN,
                traversal: "rtl",
                handler: _p.r(38)
            },
            brackets: {
                name: "brackets",
                type: TYPE.FN,
                handler: _p.r(23)
            },
            mathcal: {
                name: "mathcal",
                type: TYPE.FN,
                sign: false,
                handler: _p.r(41)
            },
            mathfrak: {
                name: "mathfrak",
                type: TYPE.FN,
                sign: false,
                handler: _p.r(42)
            },
            mathbb: {
                name: "mathbb",
                type: TYPE.FN,
                sign: false,
                handler: _p.r(40)
            },
            mathrm: {
                name: "mathrm",
                type: TYPE.FN,
                sign: false,
                handler: _p.r(43)
            },
            //扩展部分
            /*        "xrightarrow": {
            name: "xrightarrow",
            type: TYPE.OP,
            handler: _p.r(34)
        }, */
            text: {
                name: "text",
                type: TYPE.OP,
                handler: _p.r(33)
            },
            mathop: {
                name: "mathop",
                type: TYPE.OP,
                handler: _p.r(29)
            },
            overset: {
                name: "overset",
                type: TYPE.OP,
                handler: _p.r(32)
            },
            underset: {
                name: "underset",
                type: TYPE.OP,
                handler: _p.r(32)
            },
            stackrel: {
                name: "stackrel",
                type: TYPE.OP,
                handler: _p.r(32)
            },
            overline: {
                name: "overline",
                type: TYPE.OP,
                handler: _p.r(31)
            },
            underline: {
                name: "underline",
                type: TYPE.OP,
                handler: _p.r(31)
            },
            xlongequal: {
                name: "xlongequal",
                type: TYPE.FN,
                handler: _p.r(35)
            }
        };
        var factory = _p.r(10);
        for (var i = 0; i < factory.length; i++) {
            var keys = factory[i].getSupportKeys();
            for (var j = 0; j < keys.length; j++) {
                var key = keys[j];
                objects[key] = factory[i].getOperator(key);
            }
        }
        return objects;
    }
};

//src/impl/latex/define/pre.js
/**
 * 预处理器列表
 */
_p[13] = {
    value: function(require) {
        return {
            // 积分预处理器
            "int": _p.r(48),
            // 引号预处理
            quot: _p.r(49)
        };
    }
};

//src/impl/latex/define/reverse.js
/*!
 * 逆解析对照表
 */
_p[14] = {
    value: function(require) {
        var objects = {
            combination: _p.r(51),
            fraction: _p.r(62),
            "function": _p.r(63),
            integration: _p.r(64),
            subscript: _p.r(71),
            superscript: _p.r(73),
            script: _p.r(69),
            radical: _p.r(70),
            summation: _p.r(72),
            brackets: _p.r(50),
            mathcal: _p.r(66),
            mathfrak: _p.r(67),
            mathbb: _p.r(65),
            mathrm: _p.r(68),
            //扩展部分
            equations: _p.r(53),
            array: _p.r(52),
            xarrow: _p.r(60),
            text: _p.r(59),
            mathop: _p.r(55),
            "over-under-set": _p.r(58),
            matrix: _p.r(56),
            "over-under-line": _p.r(57),
            xlongequal: _p.r(61)
        };
        var factory = _p.r(10);
        for (var i = 0; i < factory.length; i++) {
            var keys = factory[i].getSupportKeys();
            for (var j = 0; j < keys.length; j++) {
                var key = keys[j];
                objects[key] = factory[i].getReverseOperator(key);
            }
        }
        return objects;
    }
};

//src/impl/latex/define/special.js
/*!
 * 特殊字符定义
 */
_p[15] = {
    value: function() {
        return {
            "#": 1,
            $: 1,
            "%": 1,
            _: 1,
            "&": 1,
            "{": 1,
            "}": 1,
            "^": 1,
            "~": 1
        };
    }
};

//src/impl/latex/define/type.js
/**
 * 操作符类型定义
 */
_p[16] = {
    value: function() {
        return {
            OP: 1,
            FN: 2,
            ENV: 3
        };
    }
};

//src/impl/latex/escape/optional-parameter.js
/**
 * 命令可选参数的预处理器.
 * Created by chenzuopeng on 15-6-23.
 */
_p[17] = {
    value: function() {
        function wrap(match, p1, p2, p3) {
            return p1 + "{" + p2 + "}" + p3;
        }
        return {
            escape: function(input) {
                input = input.replace(/(\\xlongequal\s*\[)(.*?)(\])/gi, wrap);
                return input;
            }
        };
    }
};

//src/impl/latex/escape/row-separator.js
/**
 * 在矩阵环境或数组环境中的行分隔符转义.
 * Created by chenzuopeng on 15-6-23.
 */
_p[18] = {
    value: function() {
        var rowSeparatorChar = "￰";
        return {
            escape: function(input) {
                return input.replace(/\\\\/g, rowSeparatorChar);
            },
            unescape: function(input) {
                return input.replace(rowSeparatorChar, "\\\\");
            }
        };
    }
};

//src/impl/latex/escape/space-in-text.js
/**
 * 数学公式中文本中的空格(text,textrm等命令中文本中的空格)的预处理器
 * Created by chenzuopeng on 15-6-23.
 */
_p[19] = {
    value: function() {
        var spaceCharInText = "￳";
        function escapeSpace(input) {
            return input.replace(/\s/g, spaceCharInText);
        }
        return {
            escape: function(input) {
                return input.replace(/(\\text{)(.+?)(})/gi, function(match, p1, p2, p3) {
                    return p1 + escapeSpace(p2) + p3;
                });
            },
            unescape: function(input) {
                return input.replace(spaceCharInText, " ");
            }
        };
    }
};

//src/impl/latex/factory/option-param-factory.js
_p[20] = {
    value: function(require) {
        var TYPE = _p.r(16);
        var OptionParamFactory = function() {
            this.keys = [];
        };
        OptionParamFactory.prototype.getSupportKeys = function() {
            return this.keys;
        };
        var formatKey = function(key) {
            var map = {
                sqrt: "radical"
            };
            return map[key] || key;
        };
        OptionParamFactory.prototype.getOperator = function(key) {
            var mergeHandler = _p.r(24);
            // 处理函数接口
            var handler = function(info, processedStack, unprocessedStack) {
                var exponent = unprocessedStack.shift();
                var tmp = null;
                var radicand = null;
                if (exponent === "[") {
                    exponent = [];
                    while (tmp = unprocessedStack.shift()) {
                        if (tmp === "]") {
                            break;
                        }
                        exponent.push(tmp);
                    }
                    if (exponent.length === 0) {
                        exponent = null;
                    } else if (exponent.length === 1) {
                        exponent = exponent[0];
                    } else {
                        exponent = mergeHandler(exponent);
                    }
                    radicand = unprocessedStack.shift();
                } else {
                    radicand = exponent;
                    exponent = null;
                }
                info.operand = [ radicand, exponent ];
                delete info.handler;
                return info;
            };
            return {
                name: formatKey(key),
                type: TYPE.FN,
                sign: false,
                handler: handler
            };
        };
        OptionParamFactory.prototype.getReverseOperator = function(key) {
            return function(operands) {
                var result = [ "\\" + key ];
                // 可选参数
                if (operands[1]) {
                    result.push("[" + operands[1] + "]");
                }
                result.push(" " + operands[0]);
                return result.join("");
            };
        };
        return OptionParamFactory;
    }
};

//src/impl/latex/factory/script-factory.js
/**
 * 解析包含上下标的操作符 
 */
_p[21] = {
    value: function(require) {
        var TYPE = _p.r(16);
        var ScriptFactory = function() {
            this.keys = [];
        };
        ScriptFactory.prototype.getSupportKeys = function() {
            return this.keys;
        };
        ScriptFactory.prototype.getOperator = function(key) {
            var ScriptExtractor = _p.r(39);
            var handler = function(info, processedStack, unprocessedStack) {
                var params = ScriptExtractor.exec(unprocessedStack);
                info.operand = [ params.expr, params.superscript, params.subscript ];
                delete info.handler;
                return info;
            };
            return {
                name: key,
                type: TYPE.FN,
                sign: false,
                handler: handler
            };
        };
        var useLimits = function(operator) {
            var array = [ "prod", "coprod", "bigcup", "bigcap", "bigvee", "bigwedge" ];
            return array.indexOf(operator) > -1;
        };
        ScriptFactory.prototype.getReverseOperator = function(key) {
            return function(operands) {
                var operator = "\\" + key;
                if (useLimits(key)) {
                    operator = operator + " \\limits";
                }
                var result = [ operator ];
                // 上标
                if (operands[1]) {
                    result.push("^" + operands[1]);
                }
                // 下标
                if (operands[2]) {
                    result.push("_" + operands[2]);
                }
                if (operands[0]) {
                    result.push(" " + operands[0]);
                }
                return result.join("");
            };
        };
        return ScriptFactory;
    }
};

//src/impl/latex/factory/simple-factory.js
_p[22] = {
    value: function(require) {
        var TYPE = _p.r(16);
        var SimpleFactory = function() {
            this.keys = [];
        };
        SimpleFactory.prototype.getSupportKeys = function() {
            return this.keys;
        };
        SimpleFactory.prototype.getOperator = function(key) {
            var handler = function(info, processedStack, unprocessedStack) {
                var data = unprocessedStack.shift();
                info.operand = [ data ];
                delete info.handler;
                return info;
            };
            return {
                name: key,
                type: TYPE.FN,
                sign: false,
                handler: handler
            };
        };
        SimpleFactory.prototype.getReverseOperator = function(key) {
            /**
		 * 如果操作符的操作数为空，则删除这个操作符。
		 */
            return function(operands) {
                var value = operands[0] ? operands[0] + "" : null;
                if (operands[0] && value != "" && value != "{}") {
                    return [ "\\" + key, operands[0] || "" ].join("");
                }
                return "";
            };
        };
        return SimpleFactory;
    }
};

//src/impl/latex/handler/brackets.js
/*!
 * 括号处理器
 */
_p[23] = {
    value: function(require) {
        var BRACKETS_TYPE = _p.r(7);
        return function(info, processedStack, unprocessedStack) {
            // 括号验证
            for (var i = 0, len = info.params.length; i < len; i++) {
                if (!(info.params[i] in BRACKETS_TYPE)) {
                    throw new Error("Brackets: invalid params");
                }
            }
            info.operand = info.params;
            info.params[2] = unprocessedStack.shift();
            delete info.handler;
            delete info.params;
            return info;
        };
    }
};

//src/impl/latex/handler/combination.js
/*!
 * 合并处理(特殊处理函数)
 */
_p[24] = {
    value: function() {
        return function() {
            return {
                name: "combination",
                operand: arguments[0] || []
            };
        };
    }
};

//src/impl/latex/handler/extend/argument-extractor/array.js
/**
 * 参数提取器: array环境.
 *
 * Created by chenzuopeng on 15-6-8.
 */
_p[25] = {
    value: function() {
        return function(define, subunits) {
            if (subunits && subunits.length > 0) {
                return extractColClass(define, extractTableLocation(define, subunits));
            }
            return subunits;
        };
        function extractTableLocation(define, subunits) {
            var end = subunits.indexOf("]");
            if (subunits[0] === "[" && end > -1) {
                define.tableLocation = joinArray(subunits.slice(0, end + 1), false);
            }
            return subunits.slice(end + 1);
        }
        function extractColClass(define, subunits) {
            var subunit = subunits.shift();
            if (subunit) {
                define.colClass = isArray(subunit) ? joinArray(subunit, true) : subunit;
            }
            return subunits;
        }
        function joinArray(array, wrapped) {
            for (var i = 0, len = array.length; i < len; i++) {
                if (isArray(array[i])) {
                    array[i] = joinArray(array[i], wrapped);
                }
            }
            return wrapped ? "{" + array.join("") + "}" : array.join("");
        }
        function isArray(obj) {
            return obj && Object.prototype.toString.call(obj) === "[object Array]";
        }
    }
};

//src/impl/latex/handler/extend/array.js
/**
 * 解析处理函数:array环境.
 *
 * Created by chenzuopeng on 15-6-8.
 */
_p[26] = {
    value: function(require) {
        var mergeHandler = _p.r(24);
        return function(info, processedStack, unprocessedStack) {
            info.attr = {
                "data-table-location": info.tableLocation,
                "data-col-class": info.colClass
            };
            info.operand = [];
            //去除外层嵌套的"combination"
            var originalOperands = unprocessedStack.shift().operand;
            //console.log("matrix handler begin:"+JSON.stringify(originalOperands));
            //处理数组中的元素
            var matrixItem = [];
            var originalOperand = null;
            for (var i = 0, len = originalOperands.length; i < len; i++) {
                originalOperand = originalOperands[i];
                var rowSeparator = isRowSeparator(originalOperand);
                if (isColSeparator(originalOperand) || rowSeparator) {
                    info.operand.push(mergeHandler(matrixItem));
                    if (rowSeparator) {
                        info.operand.push("");
                    }
                    matrixItem = [];
                    continue;
                } else {
                    matrixItem.push(originalOperand);
                    if (i == len - 1) {
                        info.operand.push(mergeHandler(matrixItem));
                    }
                }
            }
            //console.log("matrix handler after:"+JSON.stringify(info.operand));
            delete info.handler;
            return info;
        };
        /**
	 * 判断当前元素是否为列分隔符.
	 * @param item
	 * @returns {boolean}
	 */
        function isColSeparator(item) {
            return typeof item === "string" && item == "&";
        }
        /**
	 * 判断给定元素是否为行分隔符.
	 * @param item
	 * @returns {boolean}
	 */
        function isRowSeparator(item) {
            return typeof item === "string" && /\\+/.test(item);
        }
    }
};

//src/impl/latex/handler/extend/equations.js
/**
 * 解析处理函数:方程组.
 *
 * Created by chenzuopeng on 15-5-26.
 */
_p[27] = {
    value: function(require) {
        var mergeHandler = _p.r(24);
        var hanldeOperand = function(arrays) {
            if (arrays.length == 1) {
                return arrays[0];
            }
            return mergeHandler(arrays);
        };
        var ignoreOperands = [ "\\hfill\\", "&" ];
        return function(info, processedStack, unprocessedStack) {
            info.attr = {
                "data-equations-type": info.environmentType
            };
            //去除外层嵌套的"combination"
            var originalOperands = unprocessedStack.shift().operand;
            info.operand = [];
            var matrixItem = [];
            for (var i = 0, len = originalOperands.length; i < len; i++) {
                var originalOperand = originalOperands[i];
                if (isIgnoredOperand(originalOperand)) {
                    if (i == len - 1) {
                        info.operand.push(hanldeOperand(matrixItem));
                    }
                    continue;
                }
                if (isRowSeparator(originalOperand)) {
                    info.operand.push(hanldeOperand(matrixItem));
                    matrixItem = [];
                    continue;
                } else {
                    matrixItem.push(originalOperand);
                    if (i == len - 1) {
                        info.operand.push(hanldeOperand(matrixItem));
                    }
                }
            }
            delete info.handler;
            return info;
        };
        /**
     * 此方法在IE6,7,8中无法正常工作
     */
        function isIgnoredOperand(operand) {
            return ignoreOperands.indexOf(operand) != -1;
        }
        function isRowSeparator(item) {
            return typeof item === "string" && /^\\+$/.test(item);
        }
    }
};

//src/impl/latex/handler/extend/lib/optional-argument-extractor.js
/**
 * 可选参数提取器.
 *
 *    注:需要配合impl/latex/pre/square-brackets这个输入预处理使用.
 *
 * Created by chenzuopeng on 15-6-18.
 */
_p[28] = {
    value: function(require) {
        var mergeHandler = _p.r(24);
        return function(units) {
            if (units[0] !== "[") {
                return;
            }
            units.shift();
            //去除“[”
            var tmp = null, optionalArgument = [];
            while (tmp = units.shift()) {
                if (tmp === "]") {
                    break;
                }
                optionalArgument.push(tmp);
            }
            if (optionalArgument.length === 0) {
                optionalArgument = null;
            } else {
                optionalArgument = mergeHandler(optionalArgument);
            }
            return optionalArgument;
        };
    }
};

//src/impl/latex/handler/extend/mathop.js
/**
 * 解析处理函数:mathop.
 *
 * Created by chenzuopeng on 15-6-26.
 */
_p[29] = {
    value: function() {
        return function(info, processedStack, unprocessedStack) {
            var operand = unprocessedStack.shift();
            if (typeof operand === "object" && operand.name === "combination" && operand.operand.length === 0) {
                operand = " ";
            }
            info.operand = [ operand ];
            delete info.handler;
            return info;
        };
    }
};

//src/impl/latex/handler/extend/matrix.js
/**
 * 解析处理函数:矩阵环境.
 *
 * Created by chenzuopeng on 15-7-7.
 */
_p[30] = {
    value: function(require) {
        var mergeHandler = _p.r(24);
        var hanldeOperand = function(arrays) {
            if (arrays.length == 1) {
                return arrays[0];
            }
            return mergeHandler(arrays);
        };
        return function(info, processedStack, unprocessedStack) {
            info.attr = {
                "data-matrix-type": info.environmentType
            };
            info.operand = [];
            //去除外层嵌套的"combination"
            var originalOperands = unprocessedStack.shift().operand;
            //处理数组中的元素
            var matrixItem = [];
            var originalOperand = null;
            for (var i = 0, len = originalOperands.length; i < len; i++) {
                originalOperand = originalOperands[i];
                var rowSeparator = isRowSeparator(originalOperand);
                if (isColSeparator(originalOperand) || rowSeparator) {
                    info.operand.push(hanldeOperand(matrixItem));
                    if (rowSeparator) {
                        info.operand.push("");
                    }
                    matrixItem = [];
                    continue;
                } else {
                    matrixItem.push(originalOperand);
                    if (i == len - 1) {
                        info.operand.push(hanldeOperand(matrixItem));
                    }
                }
            }
            delete info.handler;
            return info;
        };
        /**
	 * 判断当前元素是否为列分隔符.
	 * @param item
	 * @returns {boolean}
	 */
        function isColSeparator(item) {
            return item === "&";
        }
        /**
	 * 判断给定元素是否为行分隔符.
	 * @param item
	 * @returns {boolean}
	 */
        function isRowSeparator(item) {
            return typeof item === "string" && /\\+/.test(item);
        }
    }
};

//src/impl/latex/handler/extend/over-under-line.js
/**
 * 解析处理函数:overline,underline.
 * Created by chenzuopeng on 15-7-30.
 */
_p[31] = {
    value: function() {
        return function(info, processedStack, unprocessedStack) {
            info.operand = [ unprocessedStack.shift() ];
            info.actualName = info.name;
            info.name = "over-under-line";
            info.attr = {
                "data-line-type": info.actualName.substring(0, info.actualName.indexOf("line")),
                _reverse: "over-under-line"
            };
            delete info.handler;
            return info;
        };
    }
};

//src/impl/latex/handler/extend/over-under-set.js
/**
 * 解析处理函数:overset,underset,stackrel.
 *
 * Created by chenzuopeng on 15-6-30.
 */
_p[32] = {
    value: function() {
        function isUnder(type) {
            return type === "underset";
        }
        return function(info, processedStack, unprocessedStack) {
            var sup = isUnder(info.name) ? null : unprocessedStack.shift(), sub = isUnder(info.name) ? unprocessedStack.shift() : null;
            info.operand = [ unprocessedStack.shift(), sup, sub ];
            info.actualName = info.name;
            info.name = "script";
            info.attr = {
                "data-script-mode": "UP_DOWN",
                "data-not-contains-additional-space": "true",
                _reverse: "over-under-set"
            };
            delete info.handler;
            return info;
        };
    }
};

//src/impl/latex/handler/extend/text.js
/**
 * 解析处理函数:text.
 *
 * Created by chenzuopeng on 15-6-23.
 */
_p[33] = {
    value: function() {
        return function(info, processedStack, unprocessedStack) {
            var chars = unprocessedStack.shift();
            if (typeof chars === "object" && chars.name === "combination") {
                chars = chars.operand.join("");
            }
            info.callFn = {
                setFamily: [ "KF AMS ROMAN" ]
            };
            info.operand = [ chars ];
            delete info.handler;
            return info;
        };
    }
};

//src/impl/latex/handler/extend/xarrow.js
/**
 * 解析处理函数:可以伸长的箭头符号.
 *
 * Created by chenzuopeng on 15-6-18.
 */
_p[34] = {
    value: function(require) {
        var optionalArgumentExtractor = _p.r(28);
        return function(info, processedStack, unprocessedStack) {
            info.attr = {
                "data-arrow-type": info.name
            };
            info.operand = [];
            var downOperand = optionalArgumentExtractor(unprocessedStack);
            if (downOperand) {
                info.operand[1] = downOperand;
            }
            info.operand[0] = unprocessedStack.shift();
            info.name = "xarrow";
            delete info.handler;
            return info;
        };
    }
};

//src/impl/latex/handler/extend/xlongequal.js
/**
 * 解析处理函数:xlongequal.
 *
 *   注: 需要将editor的parse/vgroup-def.js文件中声明此命令为虚拟组;否则,当可选参数为空时,在编辑器中移动光标时会出现光标在命令中的定位问题.
 *
 * Created by chenzuopeng on 15-8-18.
 */
_p[35] = {
    value: function(require) {
        var optionalArgumentExtractor = _p.r(28);
        return function(info, processedStack, unprocessedStack) {
            info.operand = [];
            var downOperand = optionalArgumentExtractor(unprocessedStack);
            if (downOperand) {
                info.operand[1] = downOperand;
            }
            info.operand[0] = unprocessedStack.shift();
            delete info.handler;
            return info;
        };
    }
};

//src/impl/latex/handler/fraction.js
/*!
 * 分数函数处理器
 */
_p[36] = {
    value: function() {
        // 处理函数接口
        return function(info, processedStack, unprocessedStack) {
            var numerator = unprocessedStack.shift(), // 分子
            denominator = unprocessedStack.shift();
            // 分母
            if (numerator === undefined || denominator === undefined) {
                throw new Error("Frac: Syntax Error");
            }
            info.operand = [ numerator, denominator ];
            delete info.handler;
            return info;
        };
    }
};

//src/impl/latex/handler/func.js
/*!
 * 函数表达式处理器
 */
_p[37] = {
    value: function(require) {
        var ScriptExtractor = _p.r(39);
        // 处理函数接口
        return function(info, processedStack, unprocessedStack) {
            var params = ScriptExtractor.exec(unprocessedStack);
            info.operand = [ info.params, params.expr, params.superscript, params.subscript ];
            delete info.params;
            delete info.handler;
            return info;
        };
    }
};

//src/impl/latex/handler/integration.js
/*!
 * 积分函数处理器
 */
_p[38] = {
    value: function(require) {
        var ScriptExtractor = _p.r(39);
        return function(info, processedStack, unprocessedStack) {
            var count = unprocessedStack.shift(), params = ScriptExtractor.exec(unprocessedStack);
            info.operand = [ params.expr, params.superscript, params.subscript ];
            // 参数配置调用
            info.callFn = {
                setType: [ count | 0 ]
            };
            delete info.handler;
            return info;
        };
    }
};

//src/impl/latex/handler/lib/script-extractor.js
/*!
 * 通用上下标提取器
 */
_p[39] = {
    value: function() {
        return {
            exec: function(stack) {
                // 提取上下标
                var result = extractScript(stack), expr = stack.shift();
                if (expr && expr.name && expr.name.indexOf("script") !== -1) {
                    throw new Error("Script: syntax error!");
                }
                result.expr = expr || null;
                return result;
            }
        };
        function extractScript(stack) {
            var scriptGroup = extract(stack), nextGroup = null, result = {
                superscript: null,
                subscript: null
            };
            if (scriptGroup) {
                nextGroup = extract(stack);
            } else {
                return result;
            }
            result[scriptGroup.type] = scriptGroup.value || null;
            if (nextGroup) {
                if (nextGroup.type === scriptGroup.type) {
                    throw new Error("Script: syntax error!");
                }
                result[nextGroup.type] = nextGroup.value || null;
            }
            return result;
        }
        function extract(stack) {
            var forward = stack.shift();
            if (!forward) {
                return null;
            }
            if (forward.name === "subscript" || forward.name === "superscript") {
                return {
                    type: forward.name,
                    value: stack.shift()
                };
            }
            stack.unshift(forward);
            return null;
        }
    }
};

//src/impl/latex/handler/mathbb.js
/*!
 * 双线处理
 */
_p[40] = {
    value: function() {
        return function(info, processedStack, unprocessedStack) {
            var chars = unprocessedStack.shift();
            if (typeof chars === "object" && chars.name === "combination") {
                chars = chars.operand.join("");
            }
            info.name = "text";
            info.attr = {
                _reverse: "mathbb"
            };
            info.callFn = {
                setFamily: [ "KF AMS BB" ]
            };
            info.operand = [ chars ];
            delete info.handler;
            return info;
        };
    }
};

//src/impl/latex/handler/mathcal.js
/*!
 * 手写体处理
 */
_p[41] = {
    value: function() {
        return function(info, processedStack, unprocessedStack) {
            var chars = unprocessedStack.shift();
            if (typeof chars === "object" && chars.name === "combination") {
                chars = chars.operand.join("");
            }
            info.name = "text";
            info.attr = {
                _reverse: "mathcal"
            };
            info.callFn = {
                setFamily: [ "KF AMS CAL" ]
            };
            info.operand = [ chars ];
            delete info.handler;
            return info;
        };
    }
};

//src/impl/latex/handler/mathfrak.js
/*!
 * 花体处理
 */
_p[42] = {
    value: function() {
        return function(info, processedStack, unprocessedStack) {
            var chars = unprocessedStack.shift();
            if (typeof chars === "object" && chars.name === "combination") {
                chars = chars.operand.join("");
            }
            info.name = "text";
            info.attr = {
                _reverse: "mathfrak"
            };
            info.callFn = {
                setFamily: [ "KF AMS FRAK" ]
            };
            info.operand = [ chars ];
            delete info.handler;
            return info;
        };
    }
};

//src/impl/latex/handler/mathrm.js
/*!
 * 罗马处理
 */
_p[43] = {
    value: function() {
        return function(info, processedStack, unprocessedStack) {
            var chars = unprocessedStack.shift();
            if (typeof chars === "object" && chars.name === "combination") {
                chars = chars.operand.join("");
            }
            info.name = "text";
            info.attr = {
                _reverse: "mathrm"
            };
            info.callFn = {
                setFamily: [ "KF AMS ROMAN" ]
            };
            info.operand = [ chars ];
            delete info.handler;
            return info;
        };
    }
};

//src/impl/latex/handler/script.js
/*!
 * 上下标操作符函数处理
 */
_p[44] = {
    value: function() {
        // 处理函数接口
        return function(info, processedStack, unprocessedStack) {
            var base = processedStack.pop(), script = unprocessedStack.shift() || null;
            if (!script) {
                throw new Error("Missing script");
            }
            base = base || "";
            if (base.name === info.name || base.name === "script") {
                throw new Error("script error");
            }
            // 执行替换
            if (base.name === "subscript") {
                base.name = "script";
                base.operand[2] = base.operand[1];
                base.operand[1] = script;
                return base;
            } else if (base.name === "superscript") {
                base.name = "script";
                base.operand[2] = script;
                return base;
            }
            info.operand = [ base, script ];
            // 删除处理器
            delete info.handler;
            return info;
        };
    }
};

//src/impl/latex/handler/sqrt.js
/*!
 * 方根函数处理器
 */
_p[45] = {
    value: function(require) {
        var mergeHandler = _p.r(24);
        // 处理函数接口
        return function(info, processedStack, unprocessedStack) {
            var exponent = unprocessedStack.shift(), tmp = null, // 被开方数
            radicand = null;
            if (exponent === "[") {
                exponent = [];
                while (tmp = unprocessedStack.shift()) {
                    if (tmp === "]") {
                        break;
                    }
                    exponent.push(tmp);
                }
                if (exponent.length === 0) {
                    exponent = null;
                } else {
                    exponent = mergeHandler(exponent);
                }
                radicand = unprocessedStack.shift();
            } else {
                radicand = exponent;
                exponent = null;
            }
            info.operand = [ radicand, exponent ];
            delete info.handler;
            return info;
        };
    }
};

//src/impl/latex/handler/summation.js
/*!
 * 求和函数处理器
 */
_p[46] = {
    value: function(require) {
        var ScriptExtractor = _p.r(39);
        return function(info, processedStack, unprocessedStack) {
            var params = ScriptExtractor.exec(unprocessedStack);
            info.operand = [ params.expr, params.superscript, params.subscript ];
            delete info.handler;
            return info;
        };
    }
};

//src/impl/latex/latex.js
/**
 * Kity Formula Latex解析器实现
 *
 * @history
 *
 *     2015-06 chenzuopeng 扩展对begin-end结构的支持
 *
 */
/* jshint forin: false */
_p[47] = {
    value: function(require) {
        var Parser = _p.r(75).Parser, LatexUtils = _p.r(1), PRE_HANDLER = _p.r(13), serialization = _p.r(74), OP_DEFINE = _p.r(12), REVERSE_DEFINE = _p.r(14), SPECIAL_LIST = _p.r(15), Utils = _p.r(5), ESCAPE_HANDLER = _p.r(9), QualifierUtils = _p.r(2);
        var DebugUtils = _p.r(6);
        // data
        var leftChar = "￸", rightChar = "￼", clearCharPattern = new RegExp(leftChar + "|" + rightChar, "g"), leftCharPattern = new RegExp(leftChar, "g"), rightCharPattern = new RegExp(rightChar, "g");
        Parser.register("latex", Parser.implement({
            parse: function(data) {
                DebugUtils.log("input", data);
                var units = this.split(this.format(data));
                DebugUtils.log("units", units);
                units = this.parseToGroup(units);
                DebugUtils.log("parseToGroup", units);
                units = this.parseToStruct(units);
                DebugUtils.log("parseToStruct", units);
                var tree = this.generateTree(units);
                DebugUtils.log("tree", tree);
                return tree;
            },
            serialization: function(tree, options) {
                return serialization(tree, options);
            },
            expand: function(expandObj) {
                var parseObj = expandObj.parse, formatKey = null, preObj = expandObj.pre, reverseObj = expandObj.reverse, escapeObj = expandObj.escape;
                for (var key in parseObj) {
                    if (!parseObj.hasOwnProperty(key)) {
                        continue;
                    }
                    formatKey = key.replace(/\\/g, "");
                    OP_DEFINE[formatKey] = parseObj[key];
                }
                for (var key in reverseObj) {
                    if (!reverseObj.hasOwnProperty(key)) {
                        continue;
                    }
                    REVERSE_DEFINE[key.replace(/\\/g, "")] = reverseObj[key];
                }
                // 预处理
                if (preObj) {
                    for (var key in preObj) {
                        if (!preObj.hasOwnProperty(key)) {
                            continue;
                        }
                        PRE_HANDLER[key.replace(/\\/g, "")] = preObj[key];
                    }
                }
                // 转义
                if (escapeObj) {
                    for (var key in escapeObj) {
                        if (!escapeObj.hasOwnProperty(key)) {
                            continue;
                        }
                        ESCAPE_HANDLER[key.replace(/\\/g, "")] = escapeObj[key];
                    }
                }
            },
            //
            /**
         * 编码.
         * @author chenzuopeng
         * @param input
         */
            escape: function(input) {
                for (var key in ESCAPE_HANDLER) {
                    if (ESCAPE_HANDLER.hasOwnProperty(key)) {
                        var escapeHandler = ESCAPE_HANDLER[key];
                        if (escapeHandler.escape) {
                            input = escapeHandler.escape(input);
                            DebugUtils.log("EscapeHandler[" + key + "]", input);
                        }
                    }
                }
                return input;
            },
            /**
         * 解码.
         * @author chenzuopeng
         * @param input
         */
            unescape: function(input) {
                for (var key in ESCAPE_HANDLER) {
                    if (ESCAPE_HANDLER.hasOwnProperty(key)) {
                        var escapeHandler = ESCAPE_HANDLER[key];
                        if (escapeHandler.unescape) {
                            input = escapeHandler.unescape(input);
                        }
                    }
                }
                return input;
            },
            // 格式化输入数据
            format: function(input) {
                input = this.escape(input);
                // 清理多余的空格
                input = clearEmpty(input);
                DebugUtils.log("clearEmpty", input);
                // 处理输入的“{”和“}”
                input = input.replace(clearCharPattern, "").replace(/\\{/gi, leftChar).replace(/\\}/gi, rightChar);
                // 预处理器处理
                for (var key in PRE_HANDLER) {
                    if (PRE_HANDLER.hasOwnProperty(key)) {
                        input = PRE_HANDLER[key](input);
                        DebugUtils.log("PreHandler[" + key + "]", input);
                    }
                }
                DebugUtils.log("formatted input", input);
                return input;
            },
            split: function(data) {
                var units = [], pattern = /(?:\\[^a-z]\s*)|(?:\\[a-z]+\s*)|(?:[{}]\s*)|(?:[^\\{}]\s*)/gi, emptyPattern = /^\s+|\s+$/g, match = null;
                data = data.replace(emptyPattern, "");
                while (match = pattern.exec(data)) {
                    match = match[0].replace(emptyPattern, "");
                    if (match) {
                        units.push(match);
                    }
                }
                return units;
            },
            /**
         * 根据解析出来的语法单元生成树
         * @param units 单元
         * @return 生成的树对象
         */
            generateTree: function(units) {
                var tree = [], currentUnit = null;
                // 递归处理
                while (currentUnit = units.shift()) {
                    if (Utils.isArray(currentUnit)) {
                        tree.push(this.generateTree(currentUnit));
                    } else {
                        tree.push(currentUnit);
                    }
                }
                tree = LatexUtils.toRPNExpression(tree);
                return LatexUtils.generateTree(tree);
            },
            parseToGroup: function(units) {
                var group = [], groupStack = [ group ], groupCount = 0, bracketsCount = 0, environmentConunt = 0;
                for (var i = 0, len = units.length; i < len; i++) {
                    switch (units[i]) {
                      case "{":
                        groupCount++;
                        groupStack.push(group);
                        group.push([]);
                        group = group[group.length - 1];
                        break;

                      case "}":
                        groupCount--;
                        group = groupStack.pop();
                        break;

                      // left-right分组
                        case "\\left":
                        bracketsCount++;
                        groupStack.push(group);
                        // 进入两层
                        group.push([ [] ]);
                        group = group[group.length - 1][0];
                        group.type = "brackets";
                        // 读取左括号
                        i++;
                        group.leftBrackets = units[i].replace(leftCharPattern, "{").replace(rightCharPattern, "}");
                        break;

                      case "\\right":
                        bracketsCount--;
                        // 读取右括号
                        i++;
                        group.rightBrackets = units[i].replace(leftCharPattern, "{").replace(rightCharPattern, "}");
                        group = groupStack.pop();
                        break;

                      /**
                 * begin-end
                 * chenzuopeng 2015-06-08
                 */
                        case "\\begin":
                        environmentConunt++;
                        groupStack.push(group);
                        group.push([ [] ]);
                        group = group[group.length - 1][0];
                        group.type = "environment";
                        group.environmentType = this.extractEnvironmentType(i, units);
                        //读取环境类型
                        i += group.environmentType.length + 2;
                        //去除\begin后面的{}部分
                        break;

                      case "\\end":
                        environmentConunt--;
                        group = groupStack.pop();
                        i += this.extractEnvironmentType(i, units).length + 2;
                        //去除\end后面的{}部分
                        break;

                      default:
                        group.push(this.unescape(units[i]).replace(leftCharPattern, "\\{").replace(rightCharPattern, "\\}"));
                        break;
                    }
                }
                if (groupCount !== 0) {
                    throw new Error("Group Error!");
                }
                if (bracketsCount !== 0) {
                    throw new Error("Brackets Error!");
                }
                if (environmentConunt !== 0) {
                    throw new Error("Environment Error!");
                }
                return groupStack[0];
            },
            /**
         * 获取环境类型.
         * @author chenzuopeng  2015-06-08
         * @param start
         * @param units
         * @returns {string}
         */
            extractEnvironmentType: function(start, units) {
                var end = units.indexOf("}", start);
                return units.slice(start + 2, end).join("");
            },
            parseToStruct: function(units) {
                var structs = [];
                for (var i = 0, len = units.length; i < len; i++) {
                    if (Utils.isArray(units[i])) {
                        if (units[i].type === "brackets") {
                            // 处理自动调整大小的括号组
                            // 获取括号组定义
                            structs.push(Utils.getBracketsDefine(units[i].leftBrackets, units[i].rightBrackets));
                            // 处理内部表达式
                            structs.push(this.parseToStruct(units[i]));
                        } else if (units[i].type === "environment" && Utils.isEnvironment(units[i].environmentType)) {
                            /**
                         * 处理环境
                         * chenzuopeng 2015-06-08
                         */
                            var define = Utils.getEnvironmentDefine(units[i].environmentType);
                            var subunits = Utils.extractArgumentsAndSubunit(define, units[i]);
                            structs.push(define);
                            structs.push(this.parseToStruct(subunits));
                        } else {
                            // 普通组
                            structs.push(this.parseToStruct(units[i]));
                        }
                    } else if (QualifierUtils.isQualifier(units[i])) {
                        /**
                     * 处理限定符
                     * chenzuopeng 2015-06-29
                     */
                        QualifierUtils.appendQualifierTo(structs, units[i]);
                    } else {
                        structs.push(parseStruct(units[i]));
                    }
                }
                return structs;
            }
        }));
        /**
     * 把序列化的字符串表示法转化为中间格式的结构化表示
     */
        function parseStruct(str) {
            // 特殊控制字符优先处理
            if (isSpecialCharacter(str)) {
                return str.substring(1);
            }
            switch (Utils.getLatexType(str)) {
              case "operator":
                return Utils.getDefine(str);

              case "function":
                return Utils.getFuncDefine(str);

              default:
                // text
                return transformSpecialCharacters(str);
            }
        }
        // 转换特殊的文本字符
        function transformSpecialCharacters(char) {
            if (char.indexOf("\\") === 0) {
                return char + "\\";
            }
            return char;
        }
        function isSpecialCharacter(char) {
            if (char.indexOf("\\") === 0) {
                return !!SPECIAL_LIST[char.substring(1)];
            }
            return false;
        }
        function clearEmpty(data) {
            return data.replace(/\\\s+/, "").replace(/\s*([^a-z0-9\s])\s*/gi, function(match, symbol) {
                return symbol;
            });
        }
    }
};

//src/impl/latex/pre/int.js
/**
 * “开方”预处理器
 */
_p[48] = {
    value: function() {
        return function(input) {
            return input.replace(/\\(i+)nt(\b|[^a-zA-Z])/g, function(match, sign, suffix) {
                return "\\int " + sign.length + suffix;
            });
        };
    }
};

//src/impl/latex/pre/quot.js
/**
 * “双引号”预处理器
 */
_p[49] = {
    value: function() {
        return function(input) {
            return input.replace(/``/g, "“");
        };
    }
};

//src/impl/latex/reverse/brackets.js
/*!
 * 逆解析处理函数: brackets
 */
_p[50] = {
    value: function() {
        /**
     * operands中元素对照表
     * 0: 左符号
     * 1: 右符号
     * 2: 表达式
     */
        return function(operands) {
            if (operands[0] === "{" || operands[0] === "}") {
                operands[0] = "\\" + operands[0];
            }
            if (operands[1] === "{" || operands[1] === "}") {
                operands[1] = "\\" + operands[1];
            }
            return [ "\\left", operands[0], operands[2], "\\right", operands[1] ].join(" ");
        };
    }
};

//src/impl/latex/reverse/combination.js
/*!
 * 逆解析处理函数：combination
 */
_p[51] = {
    value: function() {
        return function(operands) {
            if (this.attr && (this.attr["data-root"] || this.attr["data-placeholder"])) {
                return operands.join("");
            }
            return "{" + operands.join("") + "}";
        };
    }
};

//src/impl/latex/reverse/extend/array.js
/**
 * 逆解析处理函数: array
 *
 * Created by chenzuopeng on 15-5-26.
 */
_p[52] = {
    value: function() {
        return function(operands) {
            var argsString = (this.tableLocation || "") + (this.colClass || "");
            var items = [ "\\begin{array}" + argsString ];
            for (var i = 0, len = operands.length; i < len; i++) {
                var item = operands[i];
                if (!item) {
                    items.pop();
                    //去除多余的&
                    items.push("\\\\");
                    continue;
                }
                items.push(operands[i]);
                if (i < len - 1) {
                    items.push("&");
                }
            }
            items.push("\\end{array}");
            return items.join(" ");
        };
    }
};

//src/impl/latex/reverse/extend/equations.js
/**
 * 逆解析处理函数: equations
 *
 * Created by chenzuopeng on 15-6-8.
 */
_p[53] = {
    value: function() {
        return function(operands) {
            var equationsType = this.environmentType;
            var items = [ "\\begin{" + equationsType + "}" ];
            for (var i = 0, len = operands.length; i < len; i++) {
                items.push(operands[i]);
                if (i < len - 1 && operands[i] != "") {
                    items.push("\\\\");
                }
            }
            items.push("\\end{" + equationsType + "}");
            console.log("equations " + items.join(" "));
            return items.join(" ");
        };
    }
};

//src/impl/latex/reverse/extend/lib/qualifier-reversor.js
/**
 * 逆解析诸如:\limits等命令.
 *
 * Created by chenzuopeng on 15-6-29.
 */
_p[54] = {
    value: function() {
        var qualifiers = [ "limits" ];
        return {
            reverse: function(unit) {
                var result = [];
                if (unit.attr && unit.attr["data-qualifiers"] && unit.attr["data-qualifiers"].length > 0) {
                    for (var i = 0, len = qualifiers.length; i < len; i++) {
                        result.push(this.reverseQualifier(unit, qualifiers[i]));
                    }
                }
                return result.join(" ");
            },
            reverseQualifier: function(unit, qualifier) {
                return unit.attr["data-qualifiers"].indexOf(qualifier) > -1 ? "\\" + qualifier : "";
            }
        };
    }
};

//src/impl/latex/reverse/extend/mathop.js
/**
 * 逆解析处理函数: mathop
 *
 * Created by chenzuopeng on 15-6-26.
 */
_p[55] = {
    value: function(require) {
        var QualifierReversor = _p.r(54);
        return function(operands) {
            var result = "\\mathop", operand = operands.shift();
            if (operand && operand.charAt(0) === "{" && operand.charAt(operand.length - 1) === "}") {
                result += operand;
            } else {
                result += "{" + operand + "}";
            }
            result += QualifierReversor.reverse(this);
            return result;
        };
    }
};

//src/impl/latex/reverse/extend/matrix.js
/**
 * 逆解析处理函数: 矩阵环境.
 *
 * Created by chenzuopeng on 15-7-7.
 */
_p[56] = {
    value: function() {
        return function(operands) {
            var matrixType = this.environmentType;
            var items = [ "\\begin{" + matrixType + "}" ];
            for (var i = 0, len = operands.length; i < len; i++) {
                var item = operands[i];
                if (!item) {
                    //空元素为换行标示
                    items.pop();
                    //去除多余的&
                    items.push("\\\\");
                    continue;
                }
                items.push(operands[i]);
                if (i < len - 1) {
                    items.push("&");
                }
            }
            items.push("\\end{" + matrixType + "}");
            return items.join(" ");
        };
    }
};

//src/impl/latex/reverse/extend/over-under-line.js
/**
 * 逆解析处理函数:overline,underline.
 * Created by chenzuopeng on 15-7-30.
 */
_p[57] = {
    value: function() {
        return function(operands) {
            return [ "\\" + this.actualName, "{", operands[0], "}" ].join(" ");
        };
    }
};

//src/impl/latex/reverse/extend/over-under-set.js
/**
 * 逆解析处理函数:overset,underset,stackrel.
 *
 * Created by chenzuopeng on 15-6-30.
 */
_p[58] = {
    value: function() {
        return function(operands) {
            return [ "\\" + this.actualName, operands[1] || operands[2], operands[0] ].join(" ");
        };
    }
};

//src/impl/latex/reverse/extend/text.js
/**
 * 逆解析处理函数: text
 * Created by chenzuopeng on 15-6-24.
 */
_p[59] = {
    value: function() {
        return function(operands) {
            return [ "\\", this.name, "{", operands.shift() || "", "}" ].join("");
        };
    }
};

//src/impl/latex/reverse/extend/xarrow.js
/**
 * 逆解析处理函数: xrightarrow
 *
 * Created by chenzuopeng on 15-6-18.
 */
_p[60] = {
    value: function() {
        return function(operands) {
            var items = [ "\\" + this.attr["data-arrow-type"] ];
            //下方操作数,在前
            if (operands.length > 1) {
                items.push("[" + operands[1] + "]");
            }
            //上方操作数
            items.push(operands[0]);
            return items.join("");
        };
    }
};

//src/impl/latex/reverse/extend/xlongequal.js
/**
 * 逆解析处理函数: xlongequal.
 *
 * Created by chenzuopeng on 15-8-18.
 */
_p[61] = {
    value: function() {
        return function(operands) {
            var items = [ "\\xlongequal" ];
            //下方操作数,在前
            if (operands[1]) {
                items.push("[" + operands[1] + "]");
            }
            //上方操作数
            items.push(operands[0]);
            return items.join("");
        };
    }
};

//src/impl/latex/reverse/fraction.js
/*!
 * 逆解析处理函数: fraction
 */
_p[62] = {
    value: function() {
        return function(operands) {
            return "\\frac " + operands[0] + " " + operands[1];
        };
    }
};

//src/impl/latex/reverse/func.js
/*!
 * 逆解析处理函数: func
 */
_p[63] = {
    value: function(require) {
        var QualifierUtils = _p.r(2);
        /**
     * operands中元素对照表
     * 0: 函数名
     * 1: 上标
     * 2: 下标
     */
        return function(operands) {
            var result = [ "\\" + operands[0] ];
            /**
         * 解析限定符.
         * @author chenzuopeng  2015-07-01
         */
            result.push(QualifierUtils.reverseQualifiers(this));
            // 上标
            if (operands[2]) {
                result.push("^" + operands[2]);
            }
            // 下标
            if (operands[3]) {
                result.push("_" + operands[3]);
            }
            if (operands[1]) {
                result.push(" " + operands[1]);
            }
            return result.join("");
        };
    }
};

//src/impl/latex/reverse/integration.js
/*!
 * 逆解析处理函数: integration
 */
_p[64] = {
    value: function() {
        /**
     * operands中元素对照表
     * 0: 上标
     * 1: 下标
     */
        return function(operands) {
            var result = [ "\\int " ];
            // 修正多重积分的序列化
            if (this.callFn && this.callFn.setType) {
                result = [ "\\" ];
                for (var i = 0, len = this.callFn.setType; i < len; i++) {
                    result.push("i");
                }
                result.push("nt ");
            }
            // 上标
            if (operands[1]) {
                result.push("^" + operands[1]);
            }
            // 下标
            if (operands[2]) {
                result.push("_" + operands[2]);
            }
            if (operands[0]) {
                result.push(" " + operands[0]);
            }
            return result.join("");
        };
    }
};

//src/impl/latex/reverse/mathbb.js
/*!
 * 逆解析处理函数: mathbb
 */
_p[65] = {
    value: function() {
        return function(operands) {
            return "\\mathbb{" + operands[0] + "}";
        };
    }
};

//src/impl/latex/reverse/mathcal.js
/*!
 * 逆解析处理函数: mathcal
 */
_p[66] = {
    value: function() {
        return function(operands) {
            return "\\mathcal{" + operands[0] + "}";
        };
    }
};

//src/impl/latex/reverse/mathfrak.js
/*!
 * 逆解析处理函数: mathfrak
 */
_p[67] = {
    value: function() {
        return function(operands) {
            return "\\mathfrak{" + operands[0] + "}";
        };
    }
};

//src/impl/latex/reverse/mathrm.js
/*!
 * 逆解析处理函数: mathcal
 */
_p[68] = {
    value: function() {
        return function(operands) {
            return "\\mathrm{" + operands[0] + "}";
        };
    }
};

//src/impl/latex/reverse/script.js
/*!
 * 逆解析处理函数: script
 */
_p[69] = {
    value: function() {
        /**
     * operands中元素对照表
     * 0: 表达式
     * 1: 上标
     * 2: 下标
     */
        return function(operands) {
            return operands[0] + "^" + operands[1] + "_" + operands[2];
        };
    }
};

//src/impl/latex/reverse/sqrt.js
/*!
 * 逆解析处理函数: sqrt
 */
_p[70] = {
    value: function() {
        /**
     * operands中元素对照表
     * 0: 表达式
     * 1: 指数
     */
        return function(operands) {
            var result = [ "\\sqrt" ];
            // 上标
            if (operands[1]) {
                result.push("[" + operands[1] + "]");
            }
            result.push(" " + operands[0]);
            return result.join("");
        };
    }
};

//src/impl/latex/reverse/subscript.js
/*!
 * 逆解析处理函数: subscript
 */
_p[71] = {
    value: function() {
        /**
     * operands中元素对照表
     * 0: 表达式
     * 1: 下标
     */
        return function(operands) {
            return operands[0] + "_" + operands[1];
        };
    }
};

//src/impl/latex/reverse/summation.js
/*!
 * 逆解析处理函数: summation
 */
_p[72] = {
    value: function() {
        /**
     * operands中元素对照表
     * 0: 上标
     * 1: 下标
     */
        return function(operands) {
            //var result = [ "\\sum " ];
            var result = [ "\\sum ", "\\limits" ];
            // 上标
            if (operands[1]) {
                result.push("^" + operands[1]);
            }
            // 下标
            if (operands[2]) {
                result.push("_" + operands[2]);
            }
            if (operands[0]) {
                result.push(" " + operands[0]);
            }
            return result.join("");
        };
    }
};

//src/impl/latex/reverse/superscript.js
/*!
 * 逆解析处理函数: superscript
 */
_p[73] = {
    value: function() {
        /**
     * operands中元素对照表
     * 0: 表达式
     * 1: 上标
     */
        return function(operands) {
            return operands[0] + "^" + operands[1];
        };
    }
};

//src/impl/latex/serialization.js
/**
 * Created by hn on 14-3-20.
 */
_p[74] = {
    value: function(require) {
        var reverseHandlerTable = _p.r(14), SPECIAL_LIST = _p.r(15), specialCharPattern = /(\\(?:[\w]+)|(?:[^a-z]))\\/gi;
        return function(tree, options) {
            return reverseParse(tree, options);
        };
        function reverseParse(tree, options) {
            var operands = [], reverseHandlerName = null, originalOperands = null;
            // 字符串处理， 需要处理特殊字符
            if (typeof tree !== "object") {
                if (isSpecialCharacter(tree)) {
                    return "\\" + tree + " ";
                }
                return tree.replace(specialCharPattern, function(match, group) {
                    return group + " ";
                });
            }
            // combination需要特殊处理, 重复嵌套的combination节点要删除
            if (tree.name === "combination" && tree.operand.length === 1 && tree.operand[0].name === "combination") {
                tree = tree.operand[0];
            }
            originalOperands = tree.operand;
            for (var i = 0, len = originalOperands.length; i < len; i++) {
                if (originalOperands[i]) {
                    operands.push(reverseParse(originalOperands[i]));
                } else {
                    operands.push(originalOperands[i]);
                }
            }
            if (tree.attr && tree.attr._reverse) {
                reverseHandlerName = tree.attr._reverse;
            } else {
                reverseHandlerName = tree.name;
            }
            return reverseHandlerTable[reverseHandlerName].call(tree, operands, options);
        }
        function isSpecialCharacter(char) {
            return !!SPECIAL_LIST[char];
        }
    }
};

//src/parser.js
/*!
 * Kity Formula 公式表示法Parser接口
 */
_p[75] = {
    value: function(require, exports, module) {
        // Parser 配置列表
        var CONF = {}, IMPL_POLL = {}, // 内部简单工具类
        Utils = {
            extend: function(target, sources) {
                var source = null;
                sources = [].slice.call(arguments, 1);
                for (var i = 0, len = sources.length; i < len; i++) {
                    source = sources[i];
                    for (var key in source) {
                        if (source.hasOwnProperty(key)) {
                            target[key] = source[key];
                        }
                    }
                }
            },
            setData: function(container, key, value) {
                if (typeof key === "string") {
                    container[key] = value;
                } else if (typeof key === "object") {
                    for (value in key) {
                        if (key.hasOwnProperty(value)) {
                            container[value] = key[value];
                        }
                    }
                } else {
                    // 配置项类型错误
                    throw new Error("invalid option");
                }
            }
        };
        /**
     * 解析器
     */
        var Parser = {
            use: function(type) {
                if (!IMPL_POLL[type]) {
                    throw new Error("unknown parser type");
                }
                return this.proxy(IMPL_POLL[type]);
            },
            config: function(key, value) {
                Utils.setData(CONF, key, value);
                return this;
            },
            /**
         * 注册解析器实现
         * @param type 解析器所属类型
         * @param parserImpl 解析器实现
         */
            register: function(type, parserImpl) {
                IMPL_POLL[type.toLowerCase()] = parserImpl;
                return this;
            },
            // 提供构造器的实现的默认结构
            implement: function(parser) {
                var Impl = function() {}, constructor = parser.constructor || function() {}, result = function() {
                    ParserInterface.call(this);
                    constructor.call(this);
                };
                Impl.prototype = ParserInterface.prototype;
                result.prototype = new Impl();
                delete parser.constructor;
                for (var key in parser) {
                    if (key !== "constructor" && parser.hasOwnProperty(key)) {
                        result.prototype[key] = parser[key];
                    }
                }
                return result;
            },
            /**
         * 代理给定的parser实现
         * @private
         * @param parserImpl 需代理的parser实现
         */
            proxy: function(parserImpl) {
                return new ParserProxy(parserImpl);
            }
        };
        /**
     * parser实现的代理对象， 所有实现均通过该代理对象对外提供统一接口
     * @constructor
     * @param parserImpl 需代理的对象
     */
        function ParserProxy(ParserImpl) {
            this.impl = new ParserImpl();
            this.conf = {};
        }
        Utils.extend(ParserProxy.prototype, {
            config: function(key, value) {
                Utils.setData(this.conf, key, value);
            },
            /**
         * 设置特定解析器实现所需的配置项，参数也可以是一个Key-Value Mapping
         * @param key 配置项名称
         * @param value 配置项值
         */
            set: function(key, value) {
                this.impl.set(key, value);
            },
            parse: function(data) {
                var result = {
                    config: {},
                    // 调用实现获取解析树
                    tree: this.impl.parse(data)
                };
                Utils.extend(result.config, CONF, this.conf);
                return result;
            },
            serialization: function(tree, options) {
                return this.impl.serialization(tree, options);
            },
            expand: function(obj) {
                this.impl.expand(obj);
            }
        });
        /**
     * 解析器所需实现的接口
     * @constructor
     */
        function ParserInterface() {
            this.conf = {};
        }
        Utils.extend(ParserInterface.prototype, {
            set: function(key, value) {
                Utils.extend(this.conf, key, value);
            },
            /**
         * 需要特定解析器实现， 该方法是解析器的核心方法，解析器的实现者应该完成该方法对给定数据进行解析
         * @param data 待解析的数据
         * @return 解析树， 具体格式庆参考Kity Formula Parser 的文档
         */
            parse: function() {
                throw new Error("Abstract function");
            }
        });
        // exports
        module.exports = {
            Parser: Parser,
            ParserInterface: ParserInterface
        };
    }
};

//dev-lib/start.js
/*!
 * 启动模块
 */
_p[76] = {
    value: function(require) {
        var Parser = _p.r(75).Parser;
        // 初始化组件
        _p.r(47);
        window.kf.Parser = Parser;
        window.kf.Assembly = _p.r(0);
    }
};

var moduleMapping = {
    "kf.start": 76
};

function use(name) {
    _p.r([ moduleMapping[name] ]);
}
/**
 * 模块暴露
 */

( function ( global ) {

    // build环境中才含有use
    try {
        use( 'kf.start' );
    } catch ( e ) {
    }

} )( this );
})();