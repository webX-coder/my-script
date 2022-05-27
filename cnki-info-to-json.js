// ==UserScript==
// @name        知网页面信息转JSON
// @namespace   script
// @match       https://*.cnki.net/kcms/detail**
// @license     MIT
// @version     1.8
// @author      Ybond
// @grant       GM_notification
// @grant       GM_setClipboard
// @require     https://lf6-cdn-tos.bytecdntp.com/cdn/expire-1-M/jquery/3.6.0/jquery.min.js
// @description 把页面上的部分信息抽取成JSON并放入剪切板
// @updateURL   https://raw.githubusercontent.com/ybd0612/my-script/master/cnki-info-to-json.js
// @downloadURL https://raw.githubusercontent.com/ybd0612/my-script/master/cnki-info-to-json.js
// ==/UserScript==
initButton();

/** 创建按钮 */
function initButton() {
    $("body").append("<button class='cjwk_btn'>复制数据</button>");
    $('.cjwk_btn').css({
        "position": "fixed",
        "top": "100px",
        "right": "2%",
        "z-index": "99",
        "background-color": "#f98c51",
        "display": "inline-block",
        "width": "110px", 
        "height": "32px",
        "font-size": "14px",
        "text-indent": "0",
        "text-align": "center",
        "color": "#fff",
        "line-height": "32px",
        "font-family": "Microsoft Yahei,serif",
        "border-radius": "4px",
        "overflow": "visible",
        "background-color": "#f98c51",
        "display": "inline-block",
        "width": "110px",
        "height": "32px",
        "font-size": "14px",
        "text-indent": "0",
        "text-align": "center",
        "color": "#fff",
        "line-height": "32px",
        "font-family": "Microsoft Yahei,serif",
        "border-radius": "4px",
        "overflow": "visible"
    });
}

$('.cjwk_btn').on("click", function () {
    getDetail();
});

let items = [];

/** 获取详情 */
function getDetail() {
    let data = {};
    data.data = {};


    // 获取标题
    data.data.articles = {};
    data.data.articles.title = $(".wx-tit>h1").text();

    // 获取作者及单位
    data.data.articlesAuthors = getAuthors();

    // 获取摘要
    data.data.articles.summary = $("#ChDivSummary").text();

    // 获取关键词
    data.data.articles.keywords = getKeywords();

    // 获取基金项目
    data.data.articles.fund = handleStr($(".funds").text());

    // 获取分类号
    data.data.clcs = getClc();

    // 获取目录
    data.data.menus = getMenus();

    GM_setClipboard(JSON.stringify(data), 'text');
    GM_notification("信息获取成功,已复制");

}

/** 删除空格,并替换分号 */
function handleStr(str) {
    return str.replace(/\s+/mg, "").replace(/；/mg, ";");
};

/** 获取关键词 */
function getKeywords() {
    let keywords = handleStr($(".keywords").text());
    if (keywords.endsWith(";")) {
        return keywords.slice(0, keywords.length - 1);
    }
}

/** 来自wf的目录解析 */
function parseMenu(str) {
    let arr = str.split(/[\r\n]+/);
    let result = [];
    let result_ = [];
    let isNew = false;
    let name = "";
    let children = [];
    let $level1_key = 0;

    for (let i = 0, len_i = arr.length; i < len_i; i++) {
        let line = arr[i];

        //非空白行才进
        if (/\S/.test(line)) {
            //一级菜单
            if (/^\S/.test(line)) {
                $level1_key = i;
                result[$level1_key] = {
                    text: line,
                    children: [],
                };
            }

            //二级菜单
            if (/^\s/.test(line) && result[$level1_key]) {
                result[$level1_key]["children"].push({
                    text: line.trim(),
                    children: [],
                });
            }
        }
    }

    for (let i = 0, len_i = result.length; i < len_i; i++) {
        if (result[i] !== undefined) {
            result_.push(result[i]);
        }
    }
    return result_;
}

/** 获取目录 */
function getMenus() {
    let mns = $(".catalog-list>li");
    let res = "";
    for (let index = 0; index < mns.length; index++) {
        const element = mns[index];
        let eleText = $(element).text();
        res += eleText + "\r\n";
    }
    return parseMenu(res);
}

/** 获取分类号 */
function getClc() {
    let rows = $(".top-space>.rowtit");
    var clcreg = /^分类号[:：]/m;
    let clcCode = "";
    for (let index = 0; index < rows.length; index++) {
        const element = rows[index];
        let eleText = $(element).text();
        if (clcreg.test(eleText)) {
            clcCode = $(element).parent().find("p").text();
            break;
        }
    }
    let res = [];
    res.push({
        "clcCode": clcCode
    });
    return res;
}

/** 获取作者及单位信息 */
function getAuthors() {
    // 获取单位信息放入map
    let compsText;
    let comps = new Map();
    let comp = _Getunits.strType();
    for (let index = 0; index < comp.length; index++) {
        const eleText = comp[index];
        let compMatch = eleText.match(/^(\d+)\s*\.\s*(.+)/m);
        if (compMatch != null) {
            comps.set(compMatch[1], compMatch[2]);
        } else {
            compsText = eleText;
        }
    }
    // 获取作者信息,遍历放入结果集,
    let authors = [];
    let a = $("#authorpart>span");
    for (let index = 0; index < a.length; index++) {
        const element = a[index];
        let eleText = $(element).text();
        authorMatch = eleText.match(/^(\D+)([\d,]+)/m);
        if (authorMatch != null) {
            let a1 = authorMatch[1];
            let a2 = authorMatch[2];
            if (a2.indexOf(",") > -1) {
                // 有分组
                let a2s = a2.split(",");
                for (let a2sindex = 0; a2sindex < a2s.length; a2sindex++) {
                    const a2sele = a2s[a2sindex];
                    authors.push({
                        authorName: a1,
                        unitsName: comps.get(a2sele)
                    })
                }
            } else {
                authors.push({
                    authorName: a1,
                    unitsName: comps.get(a2)
                })
            }
        } else {
            authors.push({
                authorName: eleText,
                unitsName: compsText
            })
        }
    }
    return authors;
}

/** 来自xjd的获取作者单位NO-1 */
// function getUnits() {
//     let _arr = [];
//     let _string = $('.wx-tit h3:last-child').text().replace(/\s+/mg, "");
//     if (_string.indexOf('1')) {
//         _arr.push(_string)
//     }
//     var myregexp = /\d+\.(\S+?)(?=\d+\.|$)/mg;
//     var match = myregexp.exec(_string);
//     while (match != null) {
//         _arr.push(match[0])
//         match = myregexp.exec(_string)
//     }
//     return _arr;
// }
/** 来自xjd的获取作者单位NO-2 */
class Getunits{
    constructor(){
        this.type = type
        this.string = $('.wx-tit h3:last-child')
        this.qukg = /\s+/mg,''
        this.tihuan = /\d+\.(\S+?)(?=\d+\.|$)/mg
        this._arr = []
        this._praent = this.string.text().length
        this._chiild = this.string.children().text().length
    }
    getUnits_1() {//只有单个字符且没有编号的单位
        let _string = this.string.text().trim();
        return [_string];
    }
    getUnits_2() { //单位有编号但首行编号(没有标签包裹)的单位
        this._arr = []
        let _string = this.string.text().replace(this.qukg);
        if (_string.indexOf('1')) {
            this._arr.push(_string)
        }
        // let _reg =  /\d+\.(\S+?)(?=\d+\.|$)/mg;
        let match = this.tihuan.exec(_string);
        while (match != null) {
            this._arr.push(match[0].trim().replace(/undefined/g,''))
            match = this.tihuan.exec(_string)
        }
        return this._arr;
    }
    getUnits_3() { //单位没有编号都是标签包裹纯文本
        this._arr = []
        let _string_1 = this.string.children()
        for(let i=0;i<_string_1.length;i++){
            let _text = _string_1[i].innerText
            this._arr.push(_text.trim())
        }
        return this._arr;
    }
    strType(){//枚举字符串可能出现的问题
        if(this.string.children().length==1){//没有编号且只有一个单位
            return this.getUnits_1()
        }
        if(this._praent>this._chiild){//单位有编号但首行编号(没有标签包裹)的单位
           return this.getUnits_2()
        }
        if(this._praent===this._chiild){//单位没有编号都是标签包裹纯文本
           return this.getUnits_3()
        }
     }
}
const _Getunits = new Getunits();

//console.log(_data.strType())
