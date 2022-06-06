// ==UserScript==
// @name        知网页面信息转JSON
// @namespace   script
// @match       https://*.cnki.net/kcms/detail**
// @license     MIT
// @version     2.0.7
// @author      Ybond
// @grant       GM_notification
// @grant       GM_setClipboard
// @require     https://lf6-cdn-tos.bytecdntp.com/cdn/expire-1-M/jquery/3.6.0/jquery.min.js
// @description 把页面上的部分信息抽取成JSON并放入剪切板
// ==/UserScript==
//initButton();
/** 创建按钮 */
function initButton() {
    $(".wrapper").append("<button class='cjwk_btn cjwk_btn_arr'>复制全部</button>");
    $("#ChDivSummary").next().append("<button class='cjwk_btn cjwk_btn_jc' title='插件更新时间：2022-05-31'>复制基础数据(标题、副标题、摘要、关键词、基金、专辑、专题、分类号)</button>");
    $(".brief #authorpart").append("<button class='cjwk_btn cjwk_btn_zzdw'>复制作者单位</button>");
    $("#left_part").after("<button class='cjwk_btn cjwk_btn_ml'>复制目录</button>");
    //$("#zqfilelist").prev().children().append("<button class='cjwk_btn cjwk_btn_flh'>复制分类号</button>");
    $('.cjwk_btn').css({
        "background-color": "#f98c51",
        "display": "inline-block",
        "height": "32px",
        "width":"auto",
        "padding":"0 10px",
        "font-size": "14px",
        "text-indent": "0",
        "text-align": "center",
        "color": "#fff",
        "line-height": "32px",
        "font-family": "Microsoft Yahei,serif",
        "border-radius": "4px",
        "overflow": "visible",
    });
    $(".cjwk_btn_arr").css({
        "position": "fixed",
        "top": "100px",
        "right": "2%",
        "z-index": "99",
    });
}
let items = [];
let data = {};
//全部数据
$('.cjwk_btn_arr').on("click", function () {
    setAllData()
});
//基础数据
$('.cjwk_btn_jc').on("click", function () {
   setJichuData()
});
//作者单位
$('.cjwk_btn_zzdw').on("click", function () {
    setAuthorsUnitData()
});
//文章目录
$('.cjwk_btn_ml').on("click", function () {
    setCatalogueData()
});


//----获取全部数据----
function setAllData(){
     data.data = {};
    // 获取标题
    data.data.articles = {};
    let _title = $(".wx-tit>h1").text().trim();
    let _index = _title.indexOf("——");
    if(_index>0){
        let _subtitle = _title.substr(_index + 2,_title.length)
        data.data.articles.subTitle = _subtitle;
    }
    data.data.articles.title = _title;
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
    alert('全部信息获取成功,已复制')
}
//----获取基础数据----
function setJichuData(){
    data.data = {};
    // 获取标题
    data.data.articles = {};
    let _title = $(".wx-tit>h1").text().trim();
    let _index = _title.indexOf("——");
    if(_index>0){
        let _subtitle = _title.substr(_index + 2,_title.length)
        data.data.articles.subTitle = _subtitle;
    }
    data.data.articles.title = _title;
    // 获取摘要
    data.data.articles.summary = $("#ChDivSummary").text();

    // 获取关键词
    data.data.articles.keywords = getKeywords();

    // 获取基金项目
    data.data.articles.fund = handleStr($(".funds").text());

    // 获取分类号
    data.data.clcs = getClc();

    GM_setClipboard(JSON.stringify(data), 'text');

    alert('基础数据获取成功,已复制')

}
//----获取目录数据----
function setCatalogueData(){
    data.data = {};
    data.data.menus = {}
    // 获取目录
    data.data.menus = getMenus();
    GM_setClipboard(JSON.stringify(data), 'text');
    alert('目录获取成功,已复制')

}
//----获取作者单位数据----
function setAuthorsUnitData(){
    data.data = {};
    data.data.articlesAuthors = {}
    // 获取作者及单位
    data.data.articlesAuthors = getAuthors();
    GM_setClipboard(JSON.stringify(data), 'text');
    alert('作者单位获取成功,已复制')

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
/** 来自xjd的获取作者单位 */
class Getunits{
    constructor(){
        this.string = $('.wx-tit h3:last-child')
        this.qukg = /\s+/mg,''
        this.tihuan = /\d+\.(\S+?)(?=\d+\.|$)/mg
        this._arr = []
        this._praent = this.string.text().trim().length
        this._chiild = this.string.children().text().trim().length
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
        // let _praent = this.string.text().length
        // let _chiild = this.string.children().text().length
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
let _data = new Getunits();

/** 获取作者及单位信息 */
function getAuthors() {
    // 获取单位信息放入map
    let compsText;
    let comps = new Map();
    let comp = _data.strType();
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
        let authorMatch = eleText.match(/^(\D+)([\d,]+)/m);
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

//-------------------------------------------------------------------------------------更新日志-------------------------------------------------------------------------------------

// date              |-|               author           |-|             versions          |-|             describe

//2022-05-31                           xjd                              2.0                             代码基础优化，有待深入优化（添加单个数据源获取）
//2022-05-31                           xjd                              2.0.1                           修改点击复制弹窗两次bug
//2022-05-31                           xjd                              2.0.2                           修改更多摘要覆盖基础按钮bug
//2022-06-1                            xjd                              2.0.5                           添加副标题                           添加副标题
//2022-06-02                           xjd                              2.0.6                           修改副标题bug
//2022-06-06                           xjd                              2.0.7                           隐藏插件