// ==UserScript==
// @name        知网页面信息转JSON
// @namespace   script
// @match       https://kns.cnki.net/kcms/detail/detail.aspx
// @version     1.0
// @author      Ybond
// @grant       GM_notification
// @grant       GM_setClipboard
// @require     https://lf6-cdn-tos.bytecdntp.com/cdn/expire-1-M/jquery/3.6.0/jquery.min.js
// @description 把页面上的部分信息抽取成JSON并放入剪切板
// @updateURL   https://raw.githubusercontent.com/ybd0612/my-script/master/cnki-info-to-json.js
// @downloadURL https://raw.githubusercontent.com/ybd0612/my-script/master/cnki-info-to-json.js
// ==/UserScript==
(function () {

initButton();

/** 创建按钮 */
function initButton() {
    $("body").append("<button class='cjwk_btn'>按钮</button>");
    $('.cjwk_btn').css({
        "position": "fixed",
        "top": "100px",
        "right": "15px",
        "background": "red",
        "line-height": "30px",
        "font-size": "30px"
    });
}

$('.cjwk_btn').on("click", function () {
    getDetail();
});

let items = [];

/** 获取详情 */
function getDetail() {
    let data = {};

    // 获取标题
    data.title = $(".wx-tit>h1").text();

    // 获取作者及单位
    data.authors = getAuthors();

    // 获取摘要
    data.summary = $("#ChDivSummary").text();

    // 获取关键词
    data.keyword = handleStr($(".keywords").text());

    // 获取基金项目
    data.funds = handleStr($(".funds").text());

    // 获取分类号
    data.clc = getClc();

    // 获取目录
    data.menus = getMenus();

    GM_setClipboard(JSON.stringify(data), 'text');
    GM_notification("信息获取成功,已复制");
    // copy();

    // 获取参考文献(先不搞)
    // items = [];
    // items[0] = [];
    // items[1] = [];
    // items[2] = [];
    // getRefs().then((data) => {
    //     console.log(data);
    // });


}

//赋值字符串到剪切板
function copy(data) {
    let transfer = document.createElement('input');
    document.body.appendChild(transfer);
    transfer.value = data;  // 这里表示想要复制的内容
    transfer.focus();
    transfer.select();
    if (document.execCommand('copy')) {
        document.execCommand('copy');
    }
    transfer.blur();
    // console.log('复制成功');
    document.body.removeChild(transfer);
}

/** 删除空格 */
function handleStr(str) {
    return str.replace(/\s+/mg, "").replace(/；/mg,";");
};

/** 获取参考文献 */
function getRefs() {
    return new Promise(res => {
        let lis = $(".module-tab>li");
        for (let index = 0; index < lis.length; index++) {
            const element = lis[index];
            if ($(element).text() == "参考文献") {
                // if (!$(element).hasClass("cur")) {
                $(element).click();
                let to1 = setTimeout(() => {
                    clearTimeout(to1);
                    getRefList().then(() => {
                        res(items);
                    });
                }, 1000);
                // }

            }
        }
    })
}

/** 获取三种参考文献 */
async function getRefList() {
    await getRefPage(0);
    await getRefPage(1);
    await getRefPage(2);
}

// 需要递归的函数
function getRefPage(lindex) {
    return new Promise((resolve) => {
        let ti = setInterval(() => {
            let count = $(document.querySelector('#frame1').contentWindow.document).find(".essayBox:eq(" + lindex + ")>.ebBd>li").length;
            if (count > 0) {
                clearInterval(ti);
                let data = $(document.querySelector('#frame1').contentWindow.document).find(".essayBox:eq(" + lindex + ")>.ebBd>li");
                for (let index = 0; index < data.length; index++) {
                    const element = data[index];
                    items[lindex].push($(element).text());
                }
            }
            return resolve();
        }, 100);
        if (flagNext(lindex)) {
            let to1 = setTimeout(() => {
                clearTimeout(to1);
                return getRefPage(lindex);
            }, 1000);
        } else {
            return resolve(items);
        }
    });
}

/** 判断是否有下一页 */
function flagNext(lindex) {
    let res = $(document.querySelector('#frame1').contentWindow.document).find(".essayBox:eq(" + lindex + ")>.pageBar>#CJFQ>a");
    for (let rindex = 0; rindex < res.length; rindex++) {
        const element = res[rindex];
        let next = $(element).text();
        if (next == "下一页") {
            // 有下一页
            $(element)[0].click();
            return true;
        }
    }
    return false;
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
    return res;
}

/** 获取分类号 */
function getClc() {
    let rows = $(".top-space>.rowtit");
    var clcreg = /^分类号[:：]/m;
    for (let index = 0; index < rows.length; index++) {
        const element = rows[index];
        let eleText = $(element).text();
        if (clcreg.test(eleText)) {
            return $(element).parent().find("p").text();
        }
    }
}

/** 获取作者及单位信息 */
function getAuthors() {
    // 获取单位信息放入map
    let compsText;
    let comps = new Map();
    let comp = $(".wx-tit>h3>.author");
    for (let index = 0; index < comp.length; index++) {
        const element = comp[index];
        let eleText = $(element).text();
        let compMatch = eleText.match(/^(\d+)\s*\.\s*(.+)/m);
        if (compMatch != null) {
            comps.set(compMatch[1], compMatch[2]);
        } else {
            compsText = eleText;
        }
    }
    // 获取作者信息,遍历放入结果集,
    let authors = [];
    let a = $("#authorpart>span>a");
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
});