// ==UserScript==
// @name         場外大樓過濾器
// @description  已經厭倦看到一堆不感興趣的大樓? 這就是你在找的東西
// @namespace    nathan60107
// @author       nathan60107(貝果)
// @version      1.0.0
// @homepage     https://home.gamer.com.tw/creationCategory.php?owner=nathan60107&c=425332
// @match        https://forum.gamer.com.tw/B.php?*bsn=60076*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=gamer.com.tw
// @require      https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js
// @require      https://code.jquery.com/jquery-3.6.3.min.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @run-at       document-start
// @noframes
// ==/UserScript==

//---------------------External libarary---------------------//
/**
 *
 * detectIncognito v1.1.0 - (c) 2022 Joe Rutkowski <Joe@dreggle.com> (https://github.com/Joe12387/detectIncognito)
 *
 **/
var detectIncognito = function () { return new Promise(function (t, o) { var e, n = "Unknown"; function r(e) { t({ isPrivate: e, browserName: n }) } function i(e) { return e === eval.toString().length } function a() { (void 0 !== navigator.maxTouchPoints ? function () { try { window.indexedDB.open("test", 1).onupgradeneeded = function (e) { var t = e.target.result; try { t.createObjectStore("test", { autoIncrement: !0 }).put(new Blob), r(!1) } catch (e) { /BlobURLs are not yet supported/.test(e.message) ? r(!0) : r(!1) } } } catch (e) { r(!1) } } : function () { var e = window.openDatabase, t = window.localStorage; try { e(null, null, null, null) } catch (e) { return r(!0), 0 } try { t.setItem("test", "1"), t.removeItem("test") } catch (e) { return r(!0), 0 } r(!1) })() } function c() { navigator.webkitTemporaryStorage.queryUsageAndQuota(function (e, t) { r(t < (void 0 !== (t = window).performance && void 0 !== t.performance.memory && void 0 !== t.performance.memory.jsHeapSizeLimit ? performance.memory.jsHeapSizeLimit : 1073741824)) }, function (e) { o(new Error("detectIncognito somehow failed to query storage quota: " + e.message)) }) } function d() { void 0 !== Promise && void 0 !== Promise.allSettled ? c() : (0, window.webkitRequestFileSystem)(0, 1, function () { r(!1) }, function () { r(!0) }) } void 0 !== (e = navigator.vendor) && 0 === e.indexOf("Apple") && i(37) ? (n = "Safari", a()) : void 0 !== (e = navigator.vendor) && 0 === e.indexOf("Google") && i(33) ? (e = navigator.userAgent, n = e.match(/Chrome/) ? void 0 !== navigator.brave ? "Brave" : e.match(/Edg/) ? "Edge" : e.match(/OPR/) ? "Opera" : "Chrome" : "Chromium", d()) : void 0 !== document.documentElement && void 0 !== document.documentElement.style.MozAppearance && i(37) ? (n = "Firefox", r(void 0 === navigator.serviceWorker)) : void 0 !== navigator.msSaveBlob && i(39) ? (n = "Internet Explorer", r(void 0 === window.indexedDB)) : o(new Error("detectIncognito cannot determine the browser")) }) };
//---------------------External libarary---------------------//

let $ = jQuery
let dd = (...d) => {
  if (window.BAHAID && window.BAHAID !== 'nathan60107') return
  d.forEach((it) => { console.log(it) })
}

/**
 * @param {boolean} bool 
 */
function isCheck(bool) {
  return bool ? 'checked' : ''
}
/**
 * @param {string} condi 
 * @param {string} curr 
 */
function isSelected(condi, curr) {
  return condi === curr ? 'selected' : ''
}
/**
 * @param {number} reply
 * @param {number} like
 */
function userCondition(reply, like) {
  if (!setting.filterReply && !setting.filterLike) {
    return false
  } else if (!setting.filterLike) {
    return reply > setting.replyLimit
  } else if (!setting.filterReply) {
    return like > setting.likeLimit
  } else {
    return [
      reply > setting.replyLimit,
      like > setting.likeLimit,
    ].reduce(
      setting.likeCondition === 'or'
        ? (a, b) => a || b : (a, b) => a && b
    )
  }
}

/**
 * @type {defaultSetting}
 */
let setting = {}
const defaultSetting = {
  enableLoadMore: true,
  enableFilter: true,
  filterReply: true,
  replyLimit: 1000,
  filterLike: false,
  likeCondition: 'and',
  likeLimit: 1000,
  whitelist: []
}
const settingKey = Object.keys(defaultSetting)
let postSet = new Set()
let removeCount = 0
let url = new URLSearchParams(window.location.href)
let pageIndex = +(url.get('page') ?? 1)

function initSettingPanel() {
  for (const key of settingKey) {
    setting[key] = GM_getValue(key)
    if (setting[key] === undefined) {
      setting[key] = defaultSetting[key]
      GM_setValue(key, defaultSetting[key])
    }
  }

  $('.b-popular, .b-pager').hide()
  $('#BH-slave').append(`
  <style>
    #no-building label {
      display: block;
    }
    #no-building :not(input) {
      margin-top: 10px;
      margin-bottom: 10px;
    }
    #no-building .setting-building > * {
      margin-left: 15px;
    }
    #no-building .setting-building > select {
      margin: 0 0 0 60px;
    }
    #no-building input[type="number"] {
      width: 4em;
    }
    #no-building input::-webkit-outer-spin-button,
    #no-building input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    #no-building input[type=number] {
      -moz-appearance: textfield;
    }
  </style>
  <h5>大樓過濾設定</h5>
  <div id="no-building" class="BH-rbox"></div>
  `)
  updateSettingPanel()
}

function updateSettingPanel() {
  $('#no-building').html(`
  <div class="version">腳本版本：${GM_info.script.version}</div>
  <div class="page">目前頁數：${pageIndex}</div>
  <div class="info">已過濾大樓： ${removeCount} 棟</div>
  <label>
    <input ${isCheck(setting.enableLoadMore)} data-key="enableLoadMore"  type="checkbox" >
    啟用載入更多內容
  </label>
  <label>
    <input ${isCheck(setting.enableFilter)} data-key="enableFilter"  type="checkbox" >
    啟用大樓過濾
  </label>
  <div class="setting-building">大樓過濾條件：
    <label>
      <input ${isCheck(setting.filterReply)} data-key="filterReply"  type="checkbox">
      回覆超過<input value="${setting.replyLimit}" data-key="replyLimit"  type="number">樓
    </label>
    <label>
      <input ${isCheck(setting.filterLike)} data-key="filterLike"  type="checkbox">
      <select data-key="likeCondition">
        <option value="and" ${isSelected(setting.likeCondition, 'and')}>且</option>
        <option value="or" ${isSelected(setting.likeCondition, 'or')}>或</option>
      </select>
      推文超過<input value="${setting.likeLimit}" data-key="likeLimit"  type="number">次
    </label>
    <div>白名單文章snA：[${setting.whitelist}]</div>
    <input class="setting-whitelist-input" placeholder="在此處貼上文章網址" type="text">
    <button class="setting-add-whitelist" type="button">新增白名單</button>
    <button class="setting-rm-whitelist" type="button">刪除白名單</button>
  </div>
  <button class="setting-reset" type="button">重置設定</button>
  `)
  $('#no-building .setting-reset').on('click', resetSetting)
  $('#no-building .setting-add-whitelist').on('click', () => modifyWhitelist('add'))
  $('#no-building .setting-rm-whitelist').on('click', () => modifyWhitelist('delete'))
  for (const [key, val] of Object.entries(defaultSetting)) {
    if (Array.isArray(val)) continue

    let targetKey = typeof val === 'boolean' ? 'checked' : 'value'
    $(`#no-building [data-key="${key}"]`).on('change', function (e) {
      setting[key] = e.target[targetKey]
      if (typeof val === 'number') setting[key] = parseInt(setting[key])
      saveSetting()
    })
  }
}

function saveSetting() {
  for (const key of settingKey) {
    GM_setValue(key, setting[key])
  }
  toastr.info('大樓過濾設定已更新')
}
function resetSetting() {
  for (const key of settingKey) {
    GM_setValue(key, defaultSetting[key])
  }
  location.reload()
}
/**
 * @param {'add'|'delete'} action 
 */
function modifyWhitelist(action) {
  let tempList = new Set(setting.whitelist)
  let input = $('.setting-whitelist-input').val().match(/snA=(\d+)/)
  if (!input) {
    return
  }
  if (action === 'add') {
    tempList.add(input[1])
  } else if (action === 'delete') {
    tempList.delete(input[1])
  }
  setting.whitelist = Array.from(tempList)
  updateSettingPanel()
  saveSetting()
}

/**
 * @param {HTMLElement} html
 * @param {'append'|'remove'} mode 
 */
function processHtml(html, mode) {
  let id = $(html).find('.b-list__time__edittime > a').attr('href').match(/snA=([\d]+)/)[1]
  let title = $(html).find('.b-list__main__title').text()
  let top = $(html).hasClass('b-list__row--sticky')
  let like = $(html).find('.b-list__summary__gp').text()
  let replyRaw = $(html).find('.b-list__time__edittime > a').attr('href').match(/tnum=([0-9]+)&/)
  let reply = replyRaw ? parseInt(replyRaw[1]) - 1 : 0
  let inWhitelist = _.includes(setting.whitelist, id) === true
  // Duplicated, skip it
  if (postSet.has(id)) return
  // Should be filtered
  if (setting.enableFilter && !top && !inWhitelist &&
    userCondition(reply, like)) {
    if (mode === 'remove') $(html).remove()
    removeCount++
    // Should be kept
  } else {
    if (mode === 'append') $('.b-list > tbody').append(html)
  }
  postSet.add(id)
}

function htmlToPost() {
  $('.b-list__row:not(:has(.b-list_ad))').map(
    function f() { processHtml(this, 'remove') }
  )
  updateSettingPanel()
}

/**
 * @type {IntersectionObserverCallback}
 */
function loadMore(entries) {
  if (!setting.enableLoadMore || entries.every((val) => !val.isIntersecting)) return

  pageIndex++
  url.set('page', pageIndex)
  GM_xmlhttpRequest({
    method: 'GET',
    url: decodeURIComponent(url.toString()),
    onload: (result) => {
      $(result.response).find('.b-list__row:not(:has(.b-list_ad))').map(
        function f() { processHtml(this, 'append') }
      )
      updateSettingPanel()
      // Register lazyload img and draw non-image thumbnail
      Forum.B.lazyThumbnail()
      Forum.Common.drawNoImageCanvas()
    },
  })
}

function initIntersectionObserver() {
  let observer = new IntersectionObserver(loadMore)
  observer.observe($('#BH-footer')[0])
}

(function () {
  document.addEventListener("DOMContentLoaded", function () {
    initIntersectionObserver()
    initSettingPanel()
    htmlToPost()
  })
})();

/**
 * Reference:
 * [JSDoc](https://ricostacruz.com/til/typescript-jsdoc)
 */