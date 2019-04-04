$ = document.querySelector.bind(document);
$$ = document.querySelectorAll.bind(document);
i18n = chrome.i18n.getMessage;

var Settings = {
    get title(){
        return localStorage.getItem('title');
    },
    set title(value){
        localStorage.setItem('title', value);
    },

    get fromDay(){
        return localStorage.getItem('fromDay');
    },
    set fromDay(value){
        localStorage.setItem('fromDay', value);
        refreshProgress();
    },

    get toDay(){
        return localStorage.getItem('toDay');
    },
    set toDay(value){
        localStorage.setItem('toDay', value);
        refreshProgress();
    },

    get searchEngine(){
        return localStorage.getItem('searchEngine');
    },
    set searchEngine(value){
        localStorage.setItem('searchEngine', value);
    },

    get bgColor(){
        return localStorage.getItem('bgColor');
    },
    set bgColor(value){
        localStorage.setItem('bgColor', value);
        refreshColors();
    },

    get fgColor(){
        return localStorage.getItem('fgColor');
    },
    set fgColor(value){
        localStorage.setItem('fgColor', value);
        refreshColors();
    }
};

var SearchEngines = {
    baidu: 'https://www.baidu.com/s?wd={keyword}',
    google: 'https://www.google.com/search?q={keyword}',
    bing: 'https://cn.bing.com/search?q={keyword}'
};

var searchInput = $('.search-ctn input');
var suggestionsCtn = $('.suggestions-ctn');

initSettings();
initI18n();
initLight();
initSearch();
initTitle();
initSettingWindow();
refreshColors();
var result = refreshProgress();
if(result < 0){
    alert(i18n('incorrectDate'));
}

function initI18n(){
    document.title = i18n('pluginName');
    $('#label-date-interval').innerHTML = i18n('dateInterval') + ':&nbsp;';
    $('#label-search-engine').innerHTML = i18n('searchEngine') + ':&nbsp;';
    $('#label-radio-baidu').innerHTML = i18n('baidu');
    $('#label-fg-color').innerHTML = i18n('fgColor') + ':&nbsp;';
    $('#label-bg-color').innerHTML = i18n('bgColor') + ':&nbsp;';
}

function initSettings(){
    var title = Settings.title;
    var thisYear = getThisYear();
    if(!title || title.trim() == '' || /^[(<br>)(<br\/>)]*$/.test(title)){
        Settings.title = i18n('shortName') + ' ' + thisYear;
    }
    if(!Settings.fromDay){
        Settings.fromDay = thisYear + '-01-01';
    }
    if(!Settings.toDay){
        Settings.toDay = thisYear + '-12-31';
    }
    if(!Settings.searchEngine){
        Settings.searchEngine = 'baidu';
    }
    if(!Settings.bgColor){
        Settings.bgColor = '#eeeeee';
    }
    if(!Settings.fgColor){
        Settings.fgColor = '#000000';
    }
}

function refreshProgress(){
    var fromDay = Settings.fromDay;
    var toDay = Settings.toDay;
    if(!fromDay || !toDay){
        return;
    }
    var dFromDay = new Date(Date.parse(fromDay.replace(/-/g, "/")));
    var dToDay = new Date(Date.parse(toDay.replace(/-/g, "/")));
    var today = getToday();
    return setProgress(diffDay(dFromDay, today), diffDay(dFromDay, dToDay));
}

function refreshColors(){
    var bgColor = Settings.bgColor;
    var fgColor = Settings.fgColor;
    if(bgColor){
        Theme.changeRule('.progress-ctn', 'background-color', bgColor);
        Theme.changeRule('.progress-ctn .title', 'color', bgColor);
        Theme.changeRule('.search-ctn input', 'color', bgColor);
        Theme.changeRule('.suggestions-ctn', 'color', bgColor);
        Theme.changeRule('.percents', 'color', bgColor);
    }
    if(fgColor){
        Theme.changeRule('.progress-ctn .past', 'background-color', fgColor);
        Theme.changeRule('.progress-ctn .past', 'box-shadow', '0 0rem 10rem ' + fgColor);
        Theme.changeRule('.clear-text', 'text-shadow', '2px 0 2px ' + fgColor + ',0 2px 2px ' + fgColor + ',-2px 0 2px ' + fgColor + ',0 -2px 2px ' + fgColor);
    }
    if(bgColor && fgColor){
        Theme.changeRule('.clear-box-shadow', 'box-shadow', '2px 2px 1rem ' + fgColor + ', -2px -2px 1rem ' + bgColor);
    }
}

//高光和百分比动画
function initLight(){
    $('.progress-ctn .past').onmouseover = function(){
        $('.progress-ctn .light').classList.add('ani');
        $('.progress-ctn .percents').classList.remove('fadeout');
        $('.progress-ctn .percents').classList.add('fadein');
    };
    $('.progress-ctn .past').onmouseout = function(){
        $('.progress-ctn .light').classList.remove('ani');
        $('.progress-ctn .percents').classList.remove('fadein');
        $('.progress-ctn .percents').classList.add('fadeout');
    };
}

//搜索框
function initSearch(){
    $('body').onkeyup = function(e){
        if(e.keyCode == 27){
            //ESC
            searchInput.value = '';
            searchInput.blur();
            suggestionsCtn.innerHTML = '';
        }
    }
    $('body').onkeydown = function(e){
        if(e.keyCode == 17 || e.keyCode == 91 || e.keyCode == 93){
            //Control or Command
            searchInput.focus();
        }
    }
    $('body').onkeypress = function(e){
        searchInput.focus();
    }
    var oldKeyword = '';
    searchInput.onkeyup = function(e){
        if(e.keyCode == 13){
            doSearch(this.value);
            return;
        }
        if(e.keyCode == 27){
            //ESC
            return;
        }
        if(e.keyCode == 38){
            //up arrow
            return;
        }
        if(e.keyCode == 40){
            //down arrow
            return;
        }
        var keyword = searchInput.value;
        if(keyword == oldKeyword){
            return;
        }
        oldKeyword = keyword;
        var timer = setTimeout(function(){
            clearTimeout(timer);
            suggestionsCtn.innerHTML = '';
            var callbackName = randomCallbackName();
            Ajax.get('http://suggestion.baidu.com/su?' + formatParams({wd: keyword, t: new Date().getTime(), cb: 'onSuggestionReceived'}), function(r){
                eval(r);
            });
        }, 200);
    };
    
    searchInput.onkeydown = function(e){
        if(e.keyCode == 38){
            //up arrow
            preSuggestion();
            return;
        }
        if(e.keyCode == 40){
            //down arrow
            nextSuggestion();
            return;
        }
    }
}


//搜索建议相关事件
function onSuggestionReceived(r){
    var suggestionsHtml = '';
    if(r.s && r.s.length > 0){
        r.s.forEach(function(v, i){
            suggestionsHtml += '<li><span>' + v + '</span></li>';
        });
        currentSelectSuggestionIndex = -1;
        suggestionsCtn.innerHTML = suggestionsHtml;
        $$('.suggestions-ctn li span').forEach(function(v, i){
            v.onclick = function(){doSearch(this.innerText)};
        });
    }
}
function doSearch(keyword){
    window.location.href = SearchEngines[Settings.searchEngine].replace('{keyword}', keyword);
}
var currentSelectSuggestionIndex = -1;
function preSuggestion(){
    if(currentSelectSuggestionIndex <= 0){
        return;
    }
    if(currentSelectSuggestionIndex >= 0 && currentSelectSuggestionIndex < suggestionsCtn.childNodes.length){
        suggestionsCtn.childNodes[currentSelectSuggestionIndex].childNodes[0].classList.remove('clear-box-shadow');
    }
    currentSelectSuggestionIndex--;
    suggestionsCtn.childNodes[currentSelectSuggestionIndex].childNodes[0].classList.add('clear-box-shadow');
    searchInput.value = suggestionsCtn.childNodes[currentSelectSuggestionIndex].childNodes[0].innerHTML;
}
function nextSuggestion(){
    if(currentSelectSuggestionIndex >= suggestionsCtn.childNodes.length - 1){
        return;
    }
    if(currentSelectSuggestionIndex >= 0 && currentSelectSuggestionIndex < suggestionsCtn.childNodes.length){
        suggestionsCtn.childNodes[currentSelectSuggestionIndex].childNodes[0].classList.remove('clear-box-shadow');
    }
    currentSelectSuggestionIndex++;
    suggestionsCtn.childNodes[currentSelectSuggestionIndex].childNodes[0].classList.add('clear-box-shadow');
    searchInput.value = suggestionsCtn.childNodes[currentSelectSuggestionIndex].childNodes[0].innerHTML;
}


//左下角标题
function initTitle(){
    var titleInput = $('.progress-ctn .title span');
    var title = Settings.title;
    titleInput.innerHTML = title;
    titleInput.onclick=function(e){e.stopPropagation()};
    titleInput.oninput = function(){
        Settings.title = this.innerHTML;
    };
    titleInput.onkeypress = function(e){
        e.stopPropagation();
    }
}

function initSettingWindow(){
    $('.progress-ctn .setting a').onclick = function(){
        $('#setting-window').style.display='flex';
    };
    var settingWindow = $('#setting-window');
    settingWindow.onkeypress = function(e){
        e.stopPropagation();
    };
    $('#setting-window .window-close').onclick = function(){
        this.parentNode.parentNode.parentNode.style.display='none';
    };
    $('#from-day').value = Settings.fromDay;
    $('#to-day').value = Settings.toDay;
    $('#from-day').onchange = function(){
        Settings.fromDay = this.value;
    };
    $('#to-day').onchange = function(){
        Settings.toDay = this.value;
    };
    var seRadios = document.getElementsByName('search-engine');
    var radioClick = function(){
        Settings.searchEngine = this.value;
    };
    var currentSe = Settings.searchEngine;
    seRadios.forEach(function(v, i){
        if(v.value == currentSe){
            v.checked = 'checked';
        }else{
            delete v.checked;
        }
        v.onclick = radioClick;
    });
    $('#fg-color').value = Settings.fgColor;
    $('#bg-color').value = Settings.bgColor;
    $('#fg-color').onchange = function(){
        Settings.fgColor = this.value;
    };
    $('#bg-color').onchange = function(){
        Settings.bgColor = this.value;
    };
}

function setProgress(past, total){
    if(total <= 0){
        return -1;
    }
    if(past > total){
        past = total;
    }
    var pastPercent = (past / total * 1000) / 10;
    var past = $('.progress-ctn .past');
    aniToPast(pastPercent);
    var percentSpan = $('.percents');
    percentSpan.style.left = pastPercent + '%';
    percentSpan.innerHTML = (Math.round(pastPercent * 10) / 10) + '%';
    if(pastPercent > 90){
        past.style.transform = 'rotate(' + (100 - pastPercent) + 'deg)';
    }else{
        past.style.transform = 'rotate(10deg)';
    }
    return 0;
}

function aniToPast(pastPercent){
    var aniPercent = 3;
    var past = $('.progress-ctn .past');
    var basePercent = pastPercent;
    past.style.width = basePercent + '%';
    if(pastPercent > aniPercent){
        basePercent -= aniPercent;
    }else{
        basePercent = 0;
        aniPercent = pastPercent;
    }
    var base = 1;
    var frame = 50;
    var framePast = function(){
        past.style.width = basePercent + (aniPercent * base++ / frame) + '%';
        if(base < frame){
            setTimeout(framePast, base / 4);
        }
    };
    setTimeout(framePast, base / 4);
}

function getThisYear(){
    return new Date().getFullYear();
}

function getToday(){
    var today = new Date();
    today.setHours(0);
    today.setMinutes(0);
    today.setSeconds(0);
    today.setMilliseconds(0);
    return today;
}

function diffDay(fromDay, toDay){
    return (toDay.getTime() - fromDay.getTime()) / 1000 / (3600 * 24) + 1;
}