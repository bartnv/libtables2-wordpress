/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Libtables2: framework for building web-applications on relational databases *
 * Version 2.1.0 / Copyright (C) 2019  Bart Noordervliet, MMVI                 *
 *                                                                             *
 * This program is free software: you can redistribute it and/or modify        *
 * it under the terms of the GNU Affero General Public License as              *
 * published by the Free Software Foundation, either version 3 of the          *
 * License, or (at your option) any later version.                             *
 *                                                                             *
 * This program is distributed in the hope that it will be useful,             *
 * but WITHOUT ANY WARRANTY; without even the implied warranty of              *
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the               *
 * GNU Affero General Public License for more details.                         *
 *                                                                             *
 * You should have received a copy of the GNU Affero General Public License    *
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.       *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Notes on variable names:                                        *
 *                                                                 *
 *   r     = table row iterator                                    *
 *   c     = table column iterator                                 *
 *   i, j  = generic iterators                                     *
 *   attr  = jQuery object built from HTML5 "data-" attributes     *
 *   table, thead, tbody, tfoot, row, cell                         *
 *         = jQuery object wrapping the corresponding DOM element  *
 *   data  = object parsed from server JSON response               *
 *   key   = unique identifier string for the table                *
 *             composed of <block>:<tag>_<params>                  *
 *             where the _<params> part is only present            *
 *             if the table has been passed parameters             *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var ajaxUrl = "/wp-content/plugins/libtables2-wordpress/data.php";
var tables = {};

function tr(str) {
  switch (navigator.language) {
    case "nl":
    case "nl-NL":
      switch (str) {
        case "Total": return "Totaal";
        case "Page": return "Pagina";
        case "Row": return "Rij";
        case "of": return "van";
        case "Error": return "Fout";
        case "Insert": return "Toevoegen";
        case "Export as": return "Exporteren als";
        case "Row has errors and cannot be inserted": return "Rij heeft fouten en kan niet worden toegevoegd";
        case "Select": return "Selecteren";
        case "rows for export": return "rijen om te exporteren";
        case "Next": return "Volgende";
        case "Previous": return "Vorige";
        case "Field": return "Veld";
        case "may not be empty": return "mag niet leeg zijn";
        default: return str;
      }
    default: return str;
  }
}

function userError(msg) {
  alert(tr('Error') + ': ' + msg);
}
function appError(msg, context) {
  console.log('Error: ' + msg);
  if (context) console.log('Context:', context);
}

$(document).ready(function() {
  $('.lt-div:visible').each(function() {
    var attr = $(this).data();
    loadTable($(this), attr);
  });
  $('.lt-control:visible').each(function() {
    var attr = $(this).data();
    loadControl($(this), attr);
  });
  window.setInterval(refreshAll, 30000);
});

function refreshAll() {
  $('.lt-table:visible').each(function() {
    var table = $(this);
    var key = $(this).attr('id');
    if (!table.length || !tables[key]) return;
    if (tables[key].data.rowcount) return; // rowcount is set for exports with nopreview=true
    refreshTable(table, key);
  });
}

function loadOrRefreshCollection(coll, sub) {
  coll.each(function() {
    var attr = $(this).data();
    var key = attr.source + (attr.params?'_' + attr.params:'');
    if (!tables[key] || !document.getElementById(key)) loadTable($(this), attr, sub); // Using getElementById() because jQuery gets confused by the colon in the id
    else refreshTable($(this).find('table'), key);
  });
}

function doFunction(button, addparam) {
  button = $(button);
  var fullscreen = button.closest('#lt-fullscreen-div');
  if (fullscreen.length) {
    var table = fullscreen.find('#lt-fullscreen-scroller table');
    var thead = fullscreen.find('thead');
  }
  else {
    var table = button.closest('table');
    var thead = button.closest('thead');
  }
  var key = table.attr('id');

  if (button.hasClass('lt-tablefunc')) {
    if (addparam) {
      var params = JSON.parse(atob(tables[key].data.params));
      params.push(addparam);
      var paramstr = btoa(JSON.stringify(params));
    }
    else var paramstr = tables[key].data.params;
    $.ajax({
      method: 'post',
      url: ajaxUrl,
      dataType: 'json',
      data: { mode: 'function', type: 'table', src: tables[key].data.block + ':' + tables[key].data.tag, params: paramstr },
      success: function(data) {
        if (data.error) appError(data.error, table);
        else if (data.redirect) window.location = data.redirect;
        else {
          refreshTable(table, key);
          if (tables[key].data.options.trigger) loadOrRefreshCollection($('#' + tables[key].data.options.trigger));
          else if (tables[key].data.options.tablefunction.trigger) loadOrRefreshCollection($('#' + tables[key].data.options.tablefunction.trigger));
          if (tables[key].data.options.tablefunction.replacetext) thead.find('.lt-tablefunc').val(tables[key].data.options.tablefunction.replacetext);
        }
      }
    });
  }
}

function showTableInDialog(table) {
  if (!table.dialog) {
    appError('jQuery UI Dialog widget not loaded', table);
    return;
  }
  table.find('thead > tr:first').hide();
  table.dialog({
    title: table.find('.lt-title').text(),
    width: table.outerWidth()+30,
    close: function(evt, ui) {
      $(this).dialog("destroy");
      $(this).find('thead > tr:first').show();
    }
  });
}
function toggleTableFullscreen(table) {
  var div = table.closest('#lt-fullscreen-div');
  if (div.length) {
    var id = div.find('#lt-fullscreen-scroller table').attr('id').split(':');
    var origDiv = $('body').find('div#'+id[1]);
    var origTable = div.find('#lt-fullscreen-scroller table');
    origTable.prepend(table.find('thead'));
    origTable.append(div.find('tfoot'));
    origDiv.append(origTable);
    div.remove();
    $('body').children().show();
    return;
  }
  div = $('<div id="lt-fullscreen-div"/>');
  table.detach();
  var thead = $('<table class="lt-table"/>');
  table.find('thead').detach().appendTo(thead);
  var tfoot = $('<table class="lt-table"/>');
  table.find('tfoot').detach().appendTo(tfoot);
  var scroller = $('<div id="lt-fullscreen-scroller"/>');
  scroller.append(table);
  div.append(thead, scroller, tfoot);
  $('BODY').children().hide();
  $('BODY').append(div);
  scroller.css({ height: div.height()-thead.outerHeight()-tfoot.outerHeight() })
  syncColumnWidths(div);
}
function syncColumnWidths(div) {
  var head = div.find('thead .lt-head');
  var cell = div.find('tbody tr:first-child .lt-cell');
  for (var i = 0; i < head.length && i < cell.length; i++) {
    if (head[i].offsetWidth > cell[i].offsetWidth) {
      cell[i].style.minWidth = head[i].offsetWidth + 'px';
      head[i].style.removeProperty('minWidth');
    }
    else {
      head[i].style.minWidth = cell[i].offsetWidth + 'px';
      cell[i].style.removeProperty('minWidth');
    }
  }
}

function changeParams(div, params) {
  var attr = div.data();
  var key = attr.source + (attr.params?'_' + attr.params:'');
  if (typeof params === 'string') {
    if (params === attr.params) {
      refreshTable(div.find('table').first(), key);
      return;
    }
    attr.params = params;
  }
  else {
    var str = btoa(JSON.stringify(params));
    if (str === attr.params) {
      refreshTable(div.find('table').first(), key);
      return;
    }
    attr.params = str;
  }
  if (tables[key]) delete tables[key];
  div.html("Loading...");
  loadTable(div, attr);
}

function loadControl(div, attr) {
  var options = JSON.parse(atob(attr.options));
  var classes = "lt-control-button";
  if (options.class) classes += ' ' + options.class;
  if (options.prev) {
    if (typeof options.prev == 'object') {
      div.append('<input type="button" class="' + classes + '" value="' + options.prev[1] + '" onclick="doNext(this, true)">');
    }
    else div.append('<input type="button" class="' + classes + '" value="' + tr('Previous') + '" onclick="doNext(this, true)">');
  }
  if (options.next) {
    if (typeof options.next == 'object') {
      div.append('<input type="button" class="' + classes + '" value="' + options.next[1] + '" onclick="doNext(this)">');
    }
    else div.append('<input type="button" class="' + classes + '" value="' + tr('Next') + '" onclick="doNext(this)">');
  }
  tables[attr.source] = {};
  tables[attr.source].div = div;
  tables[attr.source].options = options;
}

function loadTable(div, attr, sub) {
  if (attr.params === "-") return;
  var key = attr.source + (attr.params?'_' + attr.params:'');
  var table = $('<table id="' + key + '" class="lt-table"/>');

  if (tables[key]) {
    if (tables[key].doingajax) {
      console.log('Skipping load for', key, '(already in progress)');
      return;
    }
    tables[key].table = table;
    console.log('Rendering table ' + key + ' from existing data');
    renderTable(table, tables[key].data);
    div.empty().append(tables[key].table);
    refreshTable(table, key);
  }
  else if (attr.embedded) {
    tables[key] = {};
    tables[key].table = table;
    var json = atob(attr.embedded.replace(/\n/g, ''));
    var data = JSON.parse(json);
    tables[key].data = data;
    renderTable(table, data);
    div.empty().append(tables[key].table);
    div.removeAttr('embedded');
  }
  else {
    tables[key] = {};
    tables[key].table = table;
    tables[key].start = Date.now();
    tables[key].doingajax = true;
    $.ajax({
      dataType: "json",
      url: ajaxUrl,
      data: "mode=gettable&src=" + attr.source + (attr.params ? "&params=" + attr.params : ""),
      context: div,
      success: function(data) {
        if (data.error) {
          this.empty().append('<p>Error from server while loading table. Technical information is available in the console log.</p>');
          appError(data.error, this);
        }
        else {
          data.downloadtime = Date.now() - tables[key].start - data.querytime;
          if (this.data('active')) data.active = this.data('active');
          tables[key].data = data;
          renderTable(table, data, sub);
          this.empty().append(tables[key].table);
          if (data.options.callbacks && data.options.callbacks.load) window.setTimeout(data.options.callbacks.load.replace('#src', this.data('source')), 0);
        }
        tables[key].doingajax = false;
      },
      error: function(xhr, status) { this.empty().append('Error while loading table ' + this.data('source') + ' (' + status + ' from server)'); }
    });
  }
}

function refreshTable(table, key) {
  if (tables[key].doingajax) {
    console.log('Skipping refresh on ' + key + ' (already in progress)');
    return;
  }
  tables[key].start = Date.now();
  tables[key].doingajax = true;
  $.ajax({
    dataType: "json",
    url: ajaxUrl,
    data: "mode=refreshtable&src=" + tables[key].data.block + ':' + tables[key].data.tag +
          "&crc=" + tables[key].data.crc + (tables[key].data.params ? "&params=" + tables[key].data.params : ""),
    context: table,
    success: function(data) {
      if (data.error) appError(data.error, this);
      else if (data.nochange);
      else {
        tables[key].data.downloadtime = Date.now() - tables[key].start - data.querytime;
        if (tables[key].data.headers.length != data.headers.length) {
          console.log('Column count changed; reloading table');
          tables[key].data.headers = data.headers;
          tables[key].data.rows = data.rows;
          tables[key].data.crc = data.crc;
          tables[key].doingajax = false;
          loadTable(this.parent(), this.parent().data());
          return;
        }

        var tbody = this.find('tbody');
        if (!tbody.length) {
          tbody = $('<tbody/>');
          this.prepend(tbody);
        }

        if (data.rows.length) {
          var thead = table.find('thead');
          if (!thead.length) {
            thead = $('<thead/>');
            if (this.closest('.lt-div').data('sub') != 'true') thead.append(renderTitle(tables[key].data));
            table.prepend(thead);
          }
          if (!thead.find('.lt-head').length) {
            thead.append(renderHeaders(tables[key].data, this.attr('id')));
          }
//          else updateHeaders(thead, data); // BROKEN: doesn't support mouseover or other hidden columns
        }

        updateTable(tbody, tables[key].data, data.rows);
        tables[key].data.rows = data.rows;
        tables[key].data.crc = data.crc;
        var options = tables[key].data.options;
        if (options.sum) updateSums(this.find('tfoot'), tables[key].data);
        if (options.callbacks && options.callbacks.change) window.setTimeout(options.callbacks.change.replace('#src', this.parent().data('source')), 0);
        if (options.tablefunction && data.options && data.options.tablefunction && (data.options.tablefunction.hidecondition !== undefined)) {
          options.tablefunction.hidecondition = data.options.tablefunction.hidecondition;
          if (options.tablefunction.hidecondition) this.find('.lt-tablefunc').hide();
          else this.find('.lt-tablefunc').show();
        }
      }
      tables[key].doingajax = false;
    }
  });
}

function updateHeaders(thead, data) {
  thead.find('.lt-head').each(function(i) {
    var th = $(this);
    if (th.html() != data.headers[i+1]) {
      th.html(data.headers[i+1]).css('background-color', 'green');
      setTimeout(function(th) { th.css('background-color', ''); }, 2000, th);
    }
  });
}

function sortOnColumn(a, b, index) {
  if (a[index] === null) return -1;
  if (a[index] === b[index]) return 0;
  else if (a[index] < b[index]) return -1;
  else return 1;
}

function colVisualToReal(data, idx) {
  if (!data.options.mouseover && !data.options.hidecolumn && !data.options.selectone && !data.options.selectany && !data.options.showid) return idx;
  if (data.options.showid) idx--;
  if (data.options.selectone) idx--;
  if (data.options.selectany) idx--;
  for (c = 0; c <= data.headers.length; c++) {
    if (data.options.mouseover && data.options.mouseover[c]) idx++;
    else if (data.options.hidecolumn && data.options.hidecolumn[c]) idx++;
    if (c == idx) return c;
  }
}

function sortBy(tableId, el) {
  el = $(el);
  var table = tables[tableId].table;
  var data = tables[tableId].data;
  if (data.options.sortby == el.html()) {
    if (data.options.sortdir == 'ascending') data.options.sortdir = 'descending';
    else data.options.sortdir = 'ascending';
  }
  else {
    data.options.sortby = el.html();
    data.options.sortdir = 'ascending';
  }
  console.log('Sort table ' + tableId + ' on column ' + el.html() + ' ' + data.options.sortdir);

  var c = colVisualToReal(data, el.index()+1);
  if (data.options.sortdir == 'ascending') {
    data.rows.sort(function(a, b) { return sortOnColumn(a, b, c); });
    el.siblings().removeClass('lt-sorted-asc lt-sorted-desc');
    el.removeClass('lt-sorted lt-sorted-desc').addClass('lt-sorted-asc');
  }
  else {
    data.rows.sort(function(a, b) { return sortOnColumn(b, a, c); });
    el.siblings().removeClass('lt-sorted-asc lt-sorted-desc');
    el.removeClass('lt-sorted lt-sorted-asc').addClass('lt-sorted-desc');
  }

  var tbody = table.find('tbody');
  var rowcount = renderTbody(tbody, data);
  var div = table.closest('#lt-fullscreen-div');
  if (div.length) syncColumnWidths(div); // Table is in fullscreen mode
}

function goPage(tableId, which) {
  var table = tables[tableId].table;
  var data = tables[tableId].data;
  var old = data.options.page;
  if (isNaN(which)) {
    if (which == 'prev') data.options.page -= 1;
    else if (which == 'next') data.options.page += 1;
  }
  else data.options.page = which;
  if ((data.options.page <= 0) || ((data.options.page-1) * data.options.limit > data.rows.length)) {
    data.options.page = old;
    return;
  }
  if (data.options.format) renderTableFormat(table.empty(), data);
  else var rowcount = renderTbody(table.find('tbody'), data);
  if (data.options.limit) table.find('.lt-pages').html(tr('Page') + ' ' + data.options.page + ' ' + tr('of') + ' ' + Math.ceil(rowcount/data.options.limit));
}

function replaceHashes(str, row) {
  if (str.indexOf('#') >= 0) {
    str = str.replace(/#id/g, row[0]);
    for (var c = row.length-1; c >= 0; c--) {
      if (str.indexOf('#'+c) >= 0) {
        if (row[c] === null) var content = '';
        else var content = String(row[c]).replace('#', '\0');
        str = str.replace(new RegExp('#'+c, 'g'), content);
      }
    }
  }
  return str.replace('\0', '#');
}

function renderTable(table, data, sub) {
  var start = Date.now();
  if (data.options.display && (data.options.display == 'list')) renderTableList(table, data, sub);
  else if (data.options.display && (data.options.display == 'select')) renderTableSelect(table, data, sub);
  else if (data.options.display && (data.options.display == 'vertical')) renderTableVertical(table, data, sub);
  else if (data.options.format) renderTableFormat(table, data, sub);
  else if (data.options.renderfunction) window[data.options.renderfunction](table, data);
  else renderTableGrid(table, data, sub);
  console.log('Load timings for ' + (sub?'sub':'') + 'table ' + data.tag + ': sql ' + (data.querytime?data.querytime:'n/a') +
              ' download ' + (data.downloadtime?data.downloadtime:'n/a') + ' render ' + (Date.now()-start) + ' ms');
}

function renderTableVertical(table, data) {
  table.addClass('lt-insert');
  for (id in data.options.insert) {
    if (!$.isNumeric(id)) continue;
    var input = renderField(data.options.insert[id], data, id);
    if (data.options.insert[id].name !== undefined) var name = data.options.insert[id].name;
    else var name = input.attr('name').split('.')[1];
    var label = '<label for="' + input.attr('name') + '">' + name + '</label>';
    var row = $('<tr><td class="lt-form-label">' + label + '</td><td class="lt-form-input"></td></tr>');
    row.find('.lt-form-input').append(input);
    table.append(row);
  }
  table.append('<tr><td colspan="2"><input type="button" class="lt-insert-button" value="' + tr('Insert') + '" onclick="doInsert(this)"></td></tr>');
}

function renderTableSelect(table, data, sub) {
  var section = $('<section class="lt-select"><h3>' + data.title + '</h3>');

  if (data.options.selectone) {
    if (typeof selectones == 'undefined') selectones = 1;
    else selectones++;
    var select = '<select name="select' + selectones + '">';
  }
  else var select = '<select>';

  if (data.options.placeholder) select += '<option value="" disabled selected hidden>' + data.options.placeholder + '</option>';

  for (var r = 0; r < data.rows.length; r++) { // Main loop over the data rows
    if (!data.rows[r][2]) select += '<option value="' + data.rows[r][0] + '">' + data.rows[r][1] + '</option>';
    else select += '<option value="' + data.rows[r][0] + '">' + data.rows[r][1] + ' (' + data.rows[r][2] + ')</option>';
  }
  select += '</select>';
  section.append(select);

  if (data.options.selectone && data.options.selectone.default) {
    if (data.options.selectone.default == 'first') section.find('select').prop('selectedIndex', 0);
    else if (data.options.selectone.default == 'last') section.find('select').prop('selectedIndex', data.rows.length-1);
  }
  else if (!data.options.placeholder) section.find('select').prop('selectedIndex', -1);

  var key = table.attr('id');
  tables[key].table = section;
}

function renderTableList(table, data, sub) {
  var section = $('<section class="lt-list"><h3>' + data.title + '</h3>');
  var ul = '<ul>';

  if (data.options.selectone) {
    if (typeof selectones == 'undefined') selectones = 1;
    else selectones++;
  }

  for (var r = 0; r < data.rows.length; r++) { // Main loop over the data rows
    if (data.options.style && data.options.style.list) var style = ' style="' + replaceHashes(data.options.style.list, data.rows[r]) + '"';
    else var style = '';
    ul += '<li data-rowid="' + data.rows[r][0] + '"' + style + '>';
    if (data.options.selectone) {
      if (data.options.selectone.trigger) var trigger = ' data-trigger="' + data.options.selectone.trigger + '"';
      else var trigger = '';
      if (data.options.style && data.options.style.selectone) style = ' style="' + replaceHashes(data.options.style.selectone, data.rows[r]) + '"';
      else style = '';
      ul += '<span><input type="radio" name="select' + selectones + '" ' + trigger + style + '></span>';
    }
    ul += data.rows[r][1];
  }
  ul += '</ul>';
  section.append(ul);

  if (data.options.selectone && data.options.selectone.default) {
    if (data.options.selectone.default == 'first') section.find('input[name^=select]:first').prop('checked', true);
    else if (data.options.selectone.default == 'last') section.find('input[name^=select]:last').prop('checked', true);
  }

  var key = table.attr('id');
  tables[key].table = section;
}

function renderTableFormat(table, data, sub) {
  if (data.options.classes && data.options.classes.table) table.addClass(data.options.classes.table);
  if (data.options.hideheader) var headstr = '';
  else {
    var headstr = '<thead><tr><th class="lt-title" colspan="' + (data.headers.length+1) + '">' + data.title;
    if (data.options.popout && (data.options.popout.type == 'floating-div')) {
      headstr += '<span class="lt-popout ' + (data.options.popout.icon_class?data.options.popout.icon_class:"");
      headstr += '" onclick="showTableInDialog($(this).closest(\'table\'));">';
    }
    headstr += '</th></tr></thead>';
  }

  if (!data.options.page) {
    if (data.active) {
      for (var r = 0; data.rows[r]; r++) {
        if (data.rows[r][0] == data.active) {
          data.options.page = r+1;
          break;
        }
      }
    }
    if (!data.options.page) data.options.page = 1;
  }
  var offset = data.options.page - 1;

  if (data.rows && data.rows.length > 1) {
    headstr += '<tr class="lt-limit"><th colspan="' + data.headers.length + '">';
    headstr += '<a href="javascript:goPage(\'' + table.attr('id') + '\', \'prev\')"><span class="lt-page-control">&lt;</span></a> ';
    headstr += (data.options.pagename?data.options.pagename:tr('Row')) + ' ' + data.options.page + ' ' + tr('of') + ' ' + data.rows.length;
    headstr += ' <a href="javascript:goPage(\'' + table.attr('id') + '\', \'next\')"><span class="lt-page-control">&gt;</span></a></th></tr>';
  }

  var thead = $(headstr);

  if (data.options.pagetitle) document.title = replaceHashes(data.options.pagetitle, data.rows[offset]);

  if (data.options.format.indexOf('I') < 0) var tbody = $('<tbody/>');
  else var tbody = $('<tbody class="lt-insert"/>');
  if (typeof(data.options.format) == 'string') var fmt = data.options.format.split('\n');
  else var fmt = data.options.format;
  var headcount = 0;
  var colcount = 0;
  var inscount = 0;
  var colspan;
  var rowspan = 0;

  for (var r = 0; fmt[r]; r++) {
    var row = $('<tr class="lt-row" data-rowid="' + (data.rows && data.rows[offset]?data.rows[offset][0]:0) + '"/>');
    for (var c = 0; fmt[r][c]; c++) {
      if (fmt[r][c] == 'H') {
        if (headcount++ >= data.headers.length) {
          appError('Too many headers specified in format string for ' + data.block + ':' + data.tag, data.options.format);
          break;
        }
        while (data.options.mouseover && data.options.mouseover[headcount]) headcount++;
        for (rowspan = 1; fmt[r+rowspan] && fmt[r+rowspan][c] == '|'; rowspan++);
        for (colspan = 1; fmt[r][c+colspan] == '-'; colspan++);
        var tdstr = '<td class="lt-head"' + (colspan > 1?' colspan="' + colspan + '"':'') + (rowspan > 1?' rowspan="' + rowspan + '"':'') + '>';
        tdstr += data.headers[headcount] + '</td>';
        row.append(tdstr);
      }
      else if (fmt[r][c] == 'C') {
        if (colcount++ >= data.rows[offset].length) {
          appError('Too many columns specified in format string for ' + data.block + ':' + data.tag, data.options.format);
          break;
        }
        while (data.options.mouseover && data.options.mouseover[colcount]) colcount++;
        for (rowspan = 1; fmt[r+rowspan] && fmt[r+rowspan][c] == '|'; rowspan++);
        for (colspan = 1; fmt[r][c+colspan] == '-'; colspan++);
        var cell = $(renderCell(data.options, data.rows[offset], colcount));
        if (colspan > 1) cell.attr('colspan', colspan);
        if (rowspan > 1) cell.attr('rowspan', rowspan);
        row.append(cell);
      }
      else if (fmt[r][c] == 'I') {
        var insert;
        inscount++;
        var count = 0;
        for (i in data.options.insert) {
          if (!$.isNumeric(i)) continue;
          if (++count === inscount) {
            insert = data.options.insert[i];
            break;
          }
        }
        if (!insert) {
          appError('Too many insert cells specified in format string for ' + data.block + ':' + data.tag, data.options.format);
          break;
        }
        for (rowspan = 1; fmt[r+rowspan] && fmt[r+rowspan][c] == '|'; rowspan++);
        for (colspan = 1; fmt[r][c+colspan] == '-'; colspan++);
        var td = $('<td class="lt-cell"' + (colspan > 1?' colspan="' + colspan + '"':'') + (rowspan > 1?' rowspan="' + rowspan + '"':'') + '/>');
        td.append(renderField(insert, data, count));
        row.append(td);
      }
      else if (fmt[r][c] == 'S') {
        for (rowspan = 1; fmt[r+rowspan] && fmt[r+rowspan][c] == '|'; rowspan++);
        for (colspan = 1; fmt[r][c+colspan] == '-'; colspan++);
        row.append(renderInsertButton(data.options.insert, colspan, rowspan));
        row.parent().find('INPUT[type=text],SELECT').on('keyup', function(e) { if (e.keyCode == 13) $(this).closest('tbody').find('.lt-insert-button').click(); });
      }
      else if ((fmt[r][c] == 'A') && data.options.appendcell) {
        for (rowspan = 1; fmt[r+rowspan] && fmt[r+rowspan][c] == '|'; rowspan++);
        for (colspan = 1; fmt[r][c+colspan] == '-'; colspan++);
        var tdstr = '<td class="lt-cell lt-append"' + (colspan > 1?' colspan="' + colspan + '"':'') + (rowspan > 1?' rowspan="' + rowspan + '"':'') + '>';
        tdstr += replaceHashes(data.options.appendcell, data.rows[offset]) + '</td>';
        row.append(tdstr);
      }
      else if (fmt[r][c] == 'x') row.append('<td class="lt-unused"/>');
    }
    tbody.append(row);
  }

  table.append(thead, tbody);
  table.parent().data('crc', data.crc);

  if (data.options.subtables) loadOrRefreshCollection(tbody.find('.lt-div'), true);
}

function renderTitle(data) {
  var str = '<tr><th class="lt-title" colspan="' + (data.headers.length+1) + '">' + data.title;
  if (data.options.popout && (data.options.popout.type == 'floating-div')) {
    str += '<span class="lt-popout ' + (data.options.popout.icon_class?data.options.popout.icon_class:"");
    str += '" onclick="showTableInDialog($(this).closest(\'table\'));"></span>';
  }
  else if (data.options.popout && (data.options.popout.type == 'fullscreen')) {
    str += '<span class="lt-fullscreen-button ' + (data.options.popout.icon_class?data.options.popout.icon_class:"") + '" ';
    str += 'onclick="toggleTableFullscreen($(this).closest(\'table\'));"></span>';
  }
  if (data.options.tablefunction && data.options.tablefunction.text) {
    if (data.params) {
      var params = JSON.parse(atob(data.params));
      params.unshift('');
    }
    else var params = [];
    if (data.options.tablefunction.hidecondition) var disp = ' style="display: none;"';
    else var disp = '';
    if (data.options.tablefunction.confirm) {
      str += '<input type="button" class="lt-tablefunc"' + disp + ' onclick="if (confirm(\'' + replaceHashes(data.options.tablefunction.confirm, params);
      str += '\')) doFunction(this);" value="' + replaceHashes(data.options.tablefunction.text, params) + '">';
    }
    else if (data.options.tablefunction.addparam && data.options.tablefunction.addparam.text) {
      str += '<input type="button" class="lt-tablefunc"' + disp + ' onclick="if ((ret = prompt(\'' + replaceHashes(data.options.tablefunction.addparam.text, params);
      str += '\')) != null) doFunction(this, ret);" value="' + replaceHashes(data.options.tablefunction.text, params) + '">';
    }
    else {
      str += '<input type="button" class="lt-tablefunc"' + disp + ' onclick="doFunction(this);" value="';
      str += replaceHashes(data.options.tablefunction.text, params) + '">';
    }
  }
  str += '</th></tr>';
 return str;
}

function renderHeaders(data, id) {
  var str = '';
  if (data.options.limit) {
    if (!data.options.page) data.options.page = 1;
    str += '<tr class="lt-limit"><th colspan="' + data.headers.length + '"><a href="javascript:goPage(\'' + id;
    str += '\', \'prev\')">&lt;</a> <span class="lt-pages"></span> <a href="javascript:goPage(\'' + id + '\', \'next\')">&gt;</a></th></tr>';
  }

  str += '<tr class="lt-row">';
  if (data.options.selectone) {
    if (typeof selectones == 'undefined') selectones = 1;
    else selectones++;
    if (data.options.selectone.name) str += '<td class="lt-head">' + data.options.selectone.name + '</td>';
    else str += '<td class="lt-head">' + tr('Select') + '</td>';
  }
  if (data.options.selectany) {
    if (data.options.selectany.name) str += '<td class="lt-head">' + data.options.selectany.name + '</td>';
    else str += '<td class="lt-head">' + tr('Select') + '</td>';
  }
  for (var c = 0; c < data.headers.length; c++) { // Loop over the columns for the headers
    if (data.options.sortby) {
      if (data.options.sortby == data.headers[c]) {
        if (data.options.sortdir == 'ascending') data.rows.sort(function(a, b) { return sortOnColumn(a, b, c); });
        else data.rows.sort(function(a, b) { return sortOnColumn(b, a, c); });
      }
    }
    if (!c && !data.options.showid) continue;
    if (data.options.mouseover && data.options.mouseover[c]) continue;
    if (data.options.hidecolumn && data.options.hidecolumn[c]) continue;
    var onclick = "";
    var classes = [ "lt-head" ];
    if (data.options.sortable) {
      if (typeof(data.options.sortable) == 'boolean') {
        onclick = "sortBy('" + id + "', this);";
        if (data.options.sortby == data.headers[c]) {
          if (data.options.sortdir == 'ascending') classes.push('lt-sorted-asc');
          else classes.push('lt-sorted-desc');
        }
        else classes.push('lt-sort');
      }
    }
    str += '<td class="' + classes.join(' ') + '" onclick="' + onclick + '">' + data.headers[c] + '</td>';
  }
  str += '</tr>';

  if (data.options.filter && (typeof data.options.filter != 'function')) {
    var row = $('<tr class="lt-row"/>');
    if (data.options.selectone) row.append('<td/>');
    if (data.options.selectany) row.append('<td/>');
    for (var c = data.options.showid?0:1; c < data.headers.length; c++) {
      if (data.options.mouseover && data.options.mouseover[c]) continue;
      if (data.options.hidecolumn && data.options.hidecolumn[c]) continue;
      if ((data.options.filter === true) || data.options.filter[c]) {
        row.append('<td class="lt-filter"><input type="text" size="5" oninput="updateFilter(this);"></td>');
      }
      else row.append('<td/>');
    }
    var filtertext = "Use these fields to filter the table\n" +
                     "Multiple filtered columns combine with AND logic\n" +
                     "Numeric matching is supported by starting with =, <, >, <= or >=\n" +
                     "Regular expressions can also be used, for example:\n" +
                     "  '^text' to match at the start\n" +
                     "  'text$' to match at the end\n" +
                     "  '(one|two)' to match one or two";
    row.find('td').first()
      .css('position', 'relative')
      .prepend('<span class="lt-label-filter"><img src="filter.svg" style="width: 15px; height: 15px;" title="' + filtertext + '"></span>');
    row.find('td').last()
      .css('position', 'relative')
      .append('<span class="lt-label-clear"><a href="javascript:clearFilters(\'' + id + '\');"><img src="clear.svg"></a></span>');
    str += row.html(); // Yeah I know this is a bit silly, but I need a DOM for it to append the spans above
  }

  return str;
}

function renderTableGrid(table, data, sub) {
  var pagetitle;
  if (data.options.classes && data.options.classes.table) table.addClass(data.options.classes.table);

  var thead = $('<thead/>');
  if (!sub) thead.append(renderTitle(data));

  if ((data.rows && data.rows.length) || (data.rowcount >= 0) || data.options.textifempty) { // rowcount is set for exports with nopreview=true
    thead.append(renderHeaders(data, table.attr('id')));
  }
  else if (data.options.hideifempty) {
    table.hide();
    table.parent().data('crc', data.crc);
    return;
  }
  else if (data.options.insert && (typeof(data.options.insert) == 'object')) {
    var tfoot = $('<tfoot/>');
    tfoot.append(renderInsert(data));
    table.append(thead, tfoot);
    table.parent().data('crc', data.crc);
    return;
  }

  if (data.rowcount >= 0) { // rowcount is set for exports with nopreview=true
    var tbody = $('<td colspan="' + data.headers.length + '" class="lt-cell"> ... ' + data.rowcount + ' ' + tr('rows for export') + ' ... </td>');
  }
  else {
    var tbody = $('<tbody/>');
    var rowcount = renderTbody(tbody, data);
  }

  if (data.options.limit) thead.find('.lt-pages').html(tr('Page') + ' ' + data.options.page + ' ' + tr('of') + ' ' + Math.ceil(rowcount/data.options.limit));
  if (data.options.selectone && data.options.selectone.default) {
    if (data.options.selectone.default == 'first') tbody.find('input[name^=select]:first').prop('checked', true);
    else if (data.options.selectone.default == 'last') tbody.find('input[name^=select]:last').prop('checked', true);
  }

  var tfoot = $('<tfoot/>');
  if (data.options.sum) calcSums(tfoot, data);

  if (data.options.appendrow) {
    var row = $('<tr class="lt-row"/>');
    row.html(data.options.appendrow);
    tfoot.append(row);
  }

  if (data.options.insert && (typeof(data.options.insert) == 'object')) {
    tfoot.append(renderInsert(data));
  }

  if (data.options.export) {
    if (data.options.export.xlsx) {
      tfoot.append('<tr><td class="lt-foot lt-exports" colspan="' + data.headers.length + '">' + tr('Export as') + ': <a href="' + ajaxUrl + '?mode=excelexport&src=' + data.block + ':' + data.tag + '">Excel</a></td></tr>');
    }
    else if (data.options.export.image) {
      tfoot.append('<tr><td class="lt-foot lt-exports" colspan="' + data.headers.length + '">' + tr('Export as') + ': <a href="#" onclick="exportToPng(this);">' + tr('Image') + '</a></td></tr>');
    }
  }

  table.append(thead, tbody, tfoot);
  table.parent().data('crc', data.crc);

  if (data.active) {
    var row = tbody.find('tr[data-rowid="' + data.active + '"]');
    row.addClass('lt-row-active');
    setTimeout(function (row) { row.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' }); }, 100, row[0]);
    setTimeout(function (row) { row.removeClass('lt-row-active'); }, 5000, row);
  }
}

function renderInsert(data) {
  if (data.options.insert.include == 'edit') var fields = jQuery.extend({}, data.options.edit, data.options.insert);
  else var fields = data.options.insert;

  var rows = [];
  var row = $('<tr class="lt-row"/>');
  if (data.options.selectany) row.append('<td/>');
  var colspan = 1;
  if (data.options.delete) colspan++;
  if (data.options.appendcell) colspan++;
  for (var c = 1; ; c++) {
    if (data.options.mouseover && data.options.mouseover[c]) continue;
    if (data.options.hidecolumn && data.options.hidecolumn[c]) continue;
    if (!fields[c]) {
      row.append('<td class="lt-head" colspan="' + colspan + '">' + tr('Insert') + '</td>');
      break;
    }
    else {
      if ((typeof(fields[c]) == 'object') && fields[c].label) str = '<td class="lt-head">' + fields[c].label + '</td>';
      else str = '<td class="lt-head">' + data.headers[c] + '</td>';
    }
    row.append(str);
  }
  rows.push(row);

  row = $('<tr class="lt-row lt-insert"/>');
  if (data.options.selectany) row.append('<td/>');
  for (var c = 1; ; c++) {
    var insert = null;
    if (!fields[c]) {
      if (c >= data.headers.length-1) break;
      else {
        row.append('<td class="lt-cell"></td>');
        continue;
      }
    }
    var cell = $('<td/>');
    var classes = [ 'lt-cell' ];
    if (data.options.class && data.options.class[c]) classes.push(data.options.class[c]);
    cell.addClass(classes.join(' '));
    cell.append(renderField(fields[c], data, c));
    if (insert) cell.append(insert);
    row.append(cell);
  }
  row.append(renderInsertButton(fields, colspan, 1));
  row.find('INPUT[type=text],SELECT').on('keyup', function(e) { if (e.keyCode == 13) $(this).parent().parent().find('.lt-insert-button').click(); });
  rows.push(row);
  return rows;
}

function renderInsertButton(fields, colspan, rowspan) {
  var str = '<td class="lt-cell" colspan="' + colspan + '">';
  var label;
  if (fields.submit) {
    if (fields.submit.label) label = fields.submit.label;
    else if (typeof fields.submit == 'string') label = fields.submit;
    else label = tr('Insert');
  }
  else label = tr('Insert');
  var classes = 'lt-insert-button';
  if (fields.submit && fields.submit.class) classes += ' ' + fields.submit.class;
  str += '<input type="button" class="' + classes + '" value="' + label + '" onclick="doInsert(this)"></td>';
  return str;
}

function renderField(field, data, c) {
  if (typeof(field) == 'string') var input = $('<input type="text" class="lt-insert-input" name="' + field + '">');
  else if (Object.keys(field).length == 1) var input = $('<input type="text" class="lt-insert-input" name="' + field[0] + '">');
  else if (field.type == 'multiline') {
    var input = $('<textarea class="lt_insert" class="lt-insert-input" name="' + field.target + '" oninput="$(this).textareaAutoSize();"/>');
  }
  else if (field.type == 'checkbox') var input = $('<input type="checkbox" class="lt-insert-input" name="' + field.target + '">');
  else if (field.type == 'date') var input = $('<input type="date" class="lt-insert-input" name="' + field.target + '" value="' + new Date().toISOString().slice(0, 10) + '">');
  else if (field.type == 'password') var input = $('<input type="password" class="lt-insert-input" name="' + field.target + '">');
  else if (field.type == 'email') var input = $('<input type="email" class="lt-insert-input" name="' + field.target + '">');
  else if (field.type == 'color') var input = $('<input type="text" class="lt-insert-input lt-color-cell" name="' + field.target + '" onfocus="showColPick(this)">');
  else if (field.target && !field.query) var input = $('<input type="text" class="lt-insert-input" name="' + field.target + '">');
  else {
    if (field.target) var input = $('<select class="lt-insert-input" name="' + field.target + '"/>');
    else var input = $('<select class="lt-insert-input" name="' + field[0] + '"/>');
    if (field.default) input.default = field.default;
    if (field.defaultid) input.defaultid = field.defaultid;
    if (field.insert || field[2]) {
      if (field.insert) var setting = field.insert;
      else var setting = field[2];
      if (setting.type == '2-step') var insert = $('<input type="button" class="lt-add-option" value="➕" onclick="addOption(this, ' + c + ');">');
      else {
        if (setting.target) var target = setting.target;
        else var target = setting[1];
        insert = $('<input type="button" class="lt-add-option" value="➕" onclick="switchToText(this, \'' + target + '\');">');
      }
    }
    loadOptions(input, data, c);
  }
  if ((typeof field == 'object') && field.required) {
    input.addClass('lt-input-required');
    input.on('input', field.required, function(evt) {
      if (evt.data === true) {
        var input = $(this);
        if ((input.val() === '') || (input.val() === null)) input.addClass('lt-input-error');
        else input.removeClass('lt-input-error');
      }
      else if (evt.data.regex) {
        var input = $(this);
        if (input.val().search(new RegExp(evt.data.regex)) >= 0) {
          input.removeClass('lt-input-error');
          input.attr('title', '');
        }
        else {
          input.addClass('lt-input-error');
          if (evt.data.message) input.attr('title', evt.data.message);
        }
      }
    });
  }
  if (field.default) {
    input.val(field.default);
    input.data('default', field.default);
  }
  if (field.placeholder) input.attr('placeholder', field.placeholder);
  if (field.class) input.addClass(field.class);
  return input;
}

function showColPick(el) {
  var cell = $(el).parent();
  cell.colpick({
    layout: 'hex',
    onSubmit: function(hsb, hex) {
      cell.find('input').val('#' + hex);
      cell.css('background-color', '#' + hex);
      cell.colpickHide();
    }
  }).colpickShow();
}

function loadOptions(input, data, c) {
  $.ajax({
    method: 'get',
    url: ajaxUrl,
    dataType: 'json',
    context: input,
    data: { mode: 'selectbox', src: data.block + ':' + data.tag, params: data.params, col: c },
    success: function(data) {
      if (data.error) {
        this.parent().css({ backgroundColor: '#ffa0a0' });
        appError(data.error, this);
      }
      else {
        var items = data.items;
        if (data.null) this.append('<option value=""></option>');
        for (var i = 0; items[i]; i++) {
          if (this.default && (this.default == items[i][1])) var selected = ' selected';
          else if (this.defaultid && (this.defaultid == items[i][0])) var selected = ' selected';
          else var selected = '';
          this.append('<option value="' + items[i][0] + '"' + selected + '>' + items[i][1] + '</option>');
        }
        if (!this.default && !this.defaultid) this.prop('selectedIndex', -1); // This selects nothing, rather than the first option
      }
    }
  });
}
function addOption(el, c) {
  var option = prompt(tr('New entry:'));
  if (!option) return;
  var key = $(el).closest('table').attr('id');
  $.ajax({
    method: 'post',
    url: ajaxUrl,
    dataType: 'json',
    context: el,
    data: { mode: 'addoption', src: tables[key].data.block + ':' + tables[key].data.tag, params: tables[key].data.params, col: c, option: option },
    success: function(data) {
      if (data.error) return appError(data.error, this);
      if (!data.insertid) return appError("Mode addoption didn't return an insert id");
      $(el).siblings('select').append('<option value="' + data.insertid + '" selected>' + option + '</option>');
    }
  });
}
function switchToText(el, target) {
  var cell = $(el).closest('.lt-cell');
  cell.children().hide().filter('select').empty();
  cell.append('<input type="text" class="lt-addoption" name="' + target + '">').find('input').focus();
}
function switchToSelect(el) {
  var cell = $(el).closest('.lt-cell');
  var key = cell.closest('table').attr('id');
  var data = tables[key].data;
  var c = colVisualToReal(data, cell.index()+1);
  cell.find('.lt-addoption').remove();
  loadOptions(cell.find('select'), data, c);
  cell.children().show();
}

function exportToPng(el) {
  var exports = $(el);
  var div = exports.closest('table');
  exports.closest('tr').css('display', 'none');
  if (!domtoimage) $.ajax({
    url: 'https://cdnjs.cloudflare.com/ajax/libs/dom-to-image/2.5.2/dom-to-image.min.js',
    dataType: "script",
    async: false
  });
  domtoimage.toPng(div.get(0), { height: div.height()+10, width: div.width()+10 })
            .then(function(url) {
              var link = document.createElement('a');
              link.download = div.find('.lt-title').html() + '.png';
              link.href = url;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              exports.closest('tr').css('display', 'table-row');
            });
}

function isFiltered(filters, row, options) {
  for (i in filters) {
    if (filters[i] instanceof RegExp) {
      if ((typeof row[i] == 'string') && (row[i].search(filters[i]) >= 0)) continue;
      if (typeof row[i] == 'boolean') {
        if (String(row[i]).search(filters[i]) >= 0) continue;
        if (row[i] && options.edit && options.edit[i] && options.edit[i].truevalue && (options.edit[i].truevalue.search(filters[i]) >= 0)) continue;
        if (!row[i] && options.edit && options.edit[i] && options.edit[i].falsevalue && (options.edit[i].falsevalue.search(filters[i]) >= 0)) continue;
      }
    }
    else if (filters[i].startsWith('>=')) {
      if (row[i] >= parseFloat(filters[i].substring(2))) continue;
    }
    else if (filters[i].startsWith('>')) {
      if (row[i] > parseFloat(filters[i].substring(1))) continue;
    }
    else if (filters[i].startsWith('<=')) {
      if (row[i] <= parseFloat(filters[i].substring(2))) continue;
    }
    else if (filters[i].startsWith('<')) {
      if (row[i] < parseFloat(filters[i].substring(1))) continue;
    }
    else if (filters[i].startsWith('=')) {
      if (row[i] == parseFloat(filters[i].substring(1))) continue;
    }
    return true;
  }
  return false;
}

function renderTbody(tbody, data) {
  if (data.options.page) var offset = data.options.limit * (data.options.page - 1);
  else var offset = 0;
  var rowcount = 0;
  rows = [];

  if (!data.rows.length && data.options.textifempty) {
    rows.push('<tr class="lt-row"><td class="lt-cell lt-empty-placeholder" colspan="' + data.headers.length + '">' + data.options.textifempty + '</td></tr>');
    rowcount = 1;
  }
  else {
    for (var r = 0; r < data.rows.length; r++) { // Main loop over the data rows
      if (data.filters && isFiltered(data.filters, data.rows[r], data.options)) continue;
      rowcount++;
      if (rowcount <= offset) continue;
      if (data.options.limit && (offset+data.options.limit < rowcount)) continue;
      if ((rowcount == offset) && data.options.pagetitle) document.title = replaceHashes(data.options.pagetitle, data.rows[r]);
      rows.push(renderRow(data.options, data.rows[r]));
    }
  }
  tbody[0].innerHTML = rows.join('');
  tbody.width(); // Force a DOM reflow to fix an IE9-11 bug https://stackoverflow.com/a/21032333
  return rowcount;
}

function renderRow(options, row) {
  let html = [ '<tr class="lt-row" data-rowid="'+ row[0]+'">' ];
  if (options.selectone) {
    if (options.selectone.trigger) var trigger = ' data-trigger="' + options.selectone.trigger + '"';
    else var trigger = '';
    html.push('<td><input type="radio" name="select' + selectones + '" ' + trigger + '></td>');
  }
  if (options.selectany) {
    if (options.selectany.links && (options.selectany.links.indexOf(row[0]) >= 0)) var checked = ' checked';
    else var checked = '';
    html.push('<td class="lt-cell"><input type="checkbox" onchange="doSelect(this)"' + checked + '></td>');
  }
  for (var c = options.showid?0:1; c < row.length; c++) { // Loop over each column
    if (options.mouseover && options.mouseover[c]) continue;
    if (options.hidecolumn && options.hidecolumn[c]) continue;
    html.push(renderCell(options, row, c));
  }
  if (options.appendcell) html.push('<td class="lt-cell lt-append">' + replaceHashes(options.appendcell, row) + '</td>');
  if (options.delete) {
    if (options.delete.text) var value = options.delete.text;
    else var value = '✖';
    if (options.delete.notids && (options.delete.notids.indexOf(row[0]) >= 0));
    else if (options.delete.html) html.push('<td class="lt-cell lt-append"><a onclick="doDelete(this)">' + options.delete.html + '</a></td>');
    else html.push('<td class="lt-cell lt-append"><input type="button" class="lt-delete" value="' + value + '" onclick="doDelete(this);"></td>');
  }
  html.push('</tr>');
  return html.join('');
}

function checkCondition(row, a, comp, b) {
  a = replaceHashes(a, row);
  if (comp == '==') {
    if (a == b) return true;
    return false;
  }
  else if (a != b) return true;
  return false;
}

function renderCell(options, row, c) {
  var input;
  var classes = [ "lt-cell", "lt-data" ];
  if (options.class && options.class[c]) classes.push(options.class[c]);
  if (options.edit && options.edit[c]) {
    classes.push('lt-edit');
    if (typeof(options.edit[c]) == 'string') var onclick = ' onclick="doEdit(this)"';
    else if (typeof(options.edit[c]) == 'object') {
      if (options.edit[c].required && (row[c] === null)) classes.push('lt-required-empty');
      if ((a = options.edit[c].condition) && (a.length == 3) && !checkCondition(row, a[0], a[1], a[2])) {
        var onclick = '';
        classes.pop(); // Remove the .lt-edit class
      }
      else if (options.edit[c].show && options.edit[c].show == 'always') {
        input = renderEdit(options.edit[c], null, row[c], ' onchange="directEdit(this);"');
      }
      else if (options.edit[c].query || (!options.edit[c].target && (options.edit[c].length >= 2))) var onclick = ' onclick="doEditSelect(this)"';
      else var onclick = ' onclick="doEdit(this)"';
    }
  }
  else var onclick = "";
  if (options.mouseover && options.mouseover[c+1] && row[c+1]) {
    var mouseover = ' title="' + row[c+1] + '"';
    classes.push('lt-mouseover');
  }
  else var mouseover = '';
  if (options.style && options.style[c]) var style = ' style="' + replaceHashes(options.style[c], row) + '"';
  else var style = '';

  if (options.subtables && (options.subtables[c])) {
    if (typeof(row[c]) == 'string') {
      if (row[c].startswith('[')) var params = btoa(row[c]);
      else var params = btoa('[ "' + row[c] + '" ]');
    }
    else if (typeof(row[c]) == 'number') var params = btoa('[ ' + row[c] + ' ]');
    else var params = '';
    var content = '<div class="lt-div" data-source="' + options.subtables[c] + '" data-params="' + params + '" data-sub="true">Loading subtable ' + options.subtables[c] + '</div>';
  }
  else if (options.transformations && (options.transformations[c])) {
    if (options.transformations[c].image) var content = '<img src="' + replaceHashes(options.transformations[c].image, row) + '">';
    else if (options.transformations[c].round && $.isNumeric(row[c])) {
      var content = parseFloat(row[c]).toFixed(options.transformations[c].round);
    }
  }
  else if (input) var content = input;
  else if (row[c] === null) {
    if (typeof options.emptycelltext == 'string') var content = $('<div/>').text(options.emptycelltext).html(); // Run through jQuery .text() and .html() to apply HTML entity escaping
    else var content = '';
  }
  else var content = row[c];
  return '<td class="' + classes.join(' ') + '"' + style + onclick + mouseover + '>' + content + '</td>';
}

function calcSums(tfoot, data, update) {
  var avgs = [];
//  if ((typeof(data.options.sum) === 'string') && (data.options.sum.indexOf('#') == 0)) {
//    var col = parseInt(data.options.sum.substring(1));
//    if (!isNaN(col)) sums.push(col);
//  }

  var labeldone = 0;
  var row = $('<tr class="lt-sums">');
  for (var c = 1; c < data.headers.length; c++) {
    if (data.options.mouseover && data.options.mouseover[c]) continue;
    var classes = [ "lt-cell", "lt-sum" ];
    if (data.options.class && data.options.class[c]) classes.push(data.options.class[c]);
    if (data.options.sum[c]) {
      var sum = 0;
      for (var r = 0; r < data.rows.length; r++) {
        if (data.rows[r][c]) sum += parseFloat(data.rows[r][c]);
      }
      if (data.options.transformations && data.options.transformations[c]) {
        if (data.options.transformations[c].round) var content = sum.toFixed(data.options.transformations[c].round);
      }
      else var content = Math.round(sum*1000000)/1000000;
      row.append('<td class="' + classes.join(' ') + '">' + content + '</td>');
    }
    else if (!labeldone) {
      row.append('<td class="' + classes.join(' ') + '">' + tr('Total') + '</td>');
      labeldone = 1;
    }
    else row.append('<td/>');
  }
  tfoot.append(row);
}
function updateSums(tfoot, data) {
  var row = tfoot.find('tr.lt-sums');
  var skipped = 0;
  for (var c = 1; c < data.headers.length; c++) {
    if (data.options.mouseover && data.options.mouseover[c]) {
      skipped++;
      continue;
    }
    if (data.options.sum[c]) {
      var sum = 0;
      for (var r = 0; r < data.rows.length; r++) {
        if (data.filters && isFiltered(data.filters, data.rows[r], data.options)) continue;
        if (data.rows[r][c]) sum += parseFloat(data.rows[r][c]);
      }
      sum = String(Math.round(sum*1000000)/1000000);
      var oldsum = row.children().eq(c-1-skipped).html();
      if (data.options.transformations && data.options.transformations[c]) {
        if (data.options.transformations[c].round) sum = parseFloat(sum).toFixed(data.options.transformations[c].round);
      }
      if (sum != oldsum) {
        var cell = row.children().eq(c-1-skipped);
        cell.html(sum);
        cell.css('background-color', 'green');
        setTimeout(function(cell) { cell.css('background-color', ''); }, 2000, cell);
      }
    }
  }
}

function updateTable(tbody, data, newrows) {
  var start = Date.now();
  var oldrows = data.rows;
  var newrows = newrows.slice(); // Copy the array so that we can filter out the existing rows

  if (newrows.length) tbody.find('.lt-empty-placeholder').remove();
  else if (data.options.textifempty && (tbody.find('.lt-empty-placeholder').length == 0)) {
    tbody.prepend('<tr class="lt-row"><td class="lt-cell lt-empty-placeholder" colspan="' + data.headers.length + '">' + data.options.textifempty + '</td></tr>');
  }

  for (var i = 0, found; i < oldrows.length; i++) {
    found = 0;
    for (var j = 0; j < newrows.length; j++) {
      if (oldrows[i][0] == newrows[j][0]) { // Row remains
        if (!data.options.format || (i+1 == data.options.page)) updateRow(data.options, tbody, oldrows[i], newrows[j]);
        newrows.remove(j);
        found = 1;
        break;
      }
    }
    if (!found) { // Row deleted
      var row = tbody.children('[data-rowid="' + oldrows[i][0] + '"]');
      if (row.length) {
        row.addClass('notransition');
        row.css('background-color', 'red');
        if (!data.options.format) {
          row.animate({ opacity: 0 }, 2000, 'swing', function() {
            $(this).css('height', $(this).height());
            $(this).empty();
            $(this).animate({ height: 0 }, 1000, 'linear', function() { $(this).remove(); });
          });
        }
      }
    }
  }
  if (data.options.format) {
    // Update page-number here
  }
  else {
    for (var i = 0; i < newrows.length; i++) { // Row added
      let row = $(renderRow(data.options, newrows[i]));
      row.css({ 'background-color': 'green' });
      tbody.append(row);
      setTimeout(function(row) { row.css({ 'background-color': '' }); }, 1000, row);
    }
  }
  console.log('Refresh timings for table ' + data.tag + ': sql ' + data.querytime + ' download ' + data.downloadtime + ' render ' + (Date.now()-start) + ' ms');
}
function updateRow(options, tbody, oldrow, newrow) {
  var offset = 1;
  for (var c = 1; c < oldrow.length; c++) {
    var cell = null;
    if (options.mouseover && options.mouseover[c]) {
      offset++;
      if (oldrow[c] != newrow[c]) {
        if (options.format) var cell = tbody.find('.lt-data').eq(c-1);
        else var cell = tbody.children('[data-rowid="' + oldrow[0] + '"]').children().eq(c-offset);
        if (cell) {
          cell.attr('title', newrow[c]?newrow[c]:(newrow[c]===false?'false':''));
          cell.css('background-color', 'green');
          if (newrow[c]) cell.addClass('lt-mouseover');
          else cell.removeClass('lt-mouseover');
          setTimeout(function(cell) { cell.css('background-color', ''); }, 2000, cell);
        }
      }
    }
    else if (options.hidecolumn && options.hidecolumn[c]) offset++;
    else if (oldrow[c] != newrow[c]) {
      if (options.format) cell = tbody.find('.lt-data').eq(c-1);
      else cell = tbody.children('[data-rowid="' + oldrow[0] + '"]').children().eq(c-offset);
      if (cell) {
        if ((newrow[c] === null) && (typeof options.emptycelltext == 'string')) cell.text(options.emptycelltext);
        else if (options.transformations && (options.transformations[c])) {
          if (options.transformations[c].image) cell.html('<img src="' + replaceHashes(options.transformations[c].image, newrow) + '">');
          else if (options.transformations[c].round && $.isNumeric(newrow[c])) {
            cell.html(parseFloat(newrow[c]).toFixed(options.transformations[c].round));
          }
        }
        else if (options.edit && options.edit[c] && options.edit[c].show && (options.edit[c].show == 'always')) {
          cell.html(renderEdit(options.edit[c], cell, newrow[c], ' onchange="directEdit(this);"'));
        }
        else cell.html(newrow[c]?newrow[c]:(newrow[c]===false?'false':''));
        cell.css('background-color', 'green');
        setTimeout(function(cell) { cell.css('background-color', ''); }, 2000, cell);
      }
      else appError('Updated cell not found', tbody);
    }

    if (options.style && options.style[c]) {
      if (!cell) {
        if (options.format) cell = tbody.find('.lt-data').eq(c-1);
        else cell = tbody.children('[data-rowid="' + oldrow[0] + '"]').children().eq(c-offset);
      }
      if (cell) cell.attr('style', replaceHashes(options.style[c], newrow));
    }
  }
  if (options.pagetitle) document.title = replaceHashes(options.pagetitle, newrow);
  if (options.appendcell) {
    if (options.format) var cell = tbody.find('.lt-append');
    else var cell = tbody.children('[data-rowid="' + oldrow[0] + '"]').find('.lt-append');
    if (cell.length) {
      var content = replaceHashes(options.appendcell, newrow);
      if (cell.html() !== content.replace(/&/g, '&amp;')) {
        cell.html(content);
        cell.css('background-color', 'green');
        setTimeout(function(cell) { cell.css('background-color', ''); }, 2000, cell);
      }
    }
  }
}

function updateFilter(edit) {
  edit = $(edit);
  var table = edit.closest('table');
  var fullscreen = table.closest('#lt-fullscreen-div');
  if (fullscreen.length) table = fullscreen.find('#lt-fullscreen-scroller table');
  var data = tables[table.attr('id')].data;
  var c = colVisualToReal(data, edit.parent().index()+1);
  if (!data.filters) data.filters = {};
  edit.css('background-color', '');
  if (edit.val() === "") delete data.filters[c];
  else if (edit.val().search(/^[<>= ]+$/) >= 0) edit.css('background-color', 'rgba(255,0,0,0.5)');
  else if (edit.val().startsWith('<') || edit.val().startsWith('>') || edit.val().startsWith('=')) data.filters[c] = edit.val();
  else {
    try { data.filters[c] = new RegExp(edit.val(), 'i'); }
    catch (e) { edit.css('background-color', 'rgba(255,0,0,0.5)'); }
  }
  runFilters(table, data);
  if (fullscreen.length) syncColumnWidths(fullscreen);
  if (data.options.sum) updateSums(table.find('tfoot'), data);
}
function runFilters(table, data) {
  if (data.options.page > 1) data.options.page = 1;
  var tbody = table.find('tbody');
  var rowcount = renderTbody(tbody, data);
  if (data.options.limit) table.find('.lt-pages').html(tr('Page') + ' ' + data.options.page + ' ' + tr('of') + ' ' + Math.ceil(rowcount/data.options.limit));
}
function clearFilters(key) {
  var table = $(document.getElementById(key));
  var data = tables[table.attr('id')].data;
  table.find('.lt-filter').children('input').css('background-color', '').val('');
  data.filters = {};
  runFilters(table, data);
  var fullscreen = table.closest('#lt-fullscreen-div');
  if (fullscreen.length) {
    fullscreen.find('thead .lt-filter input').css('background-color', '').val('');
    syncColumnWidths(fullscreen);
  }
}

function renderEdit(edit, cell, content, handler) {
  if (handler === undefined) handler = '';
  var input;
  if (edit.type == 'multiline') {
    input = '<textarea id="editbox" name="input" style="width: ' + cell.width() + 'px; height: ' + cell.height() + 'px;">' + content + '</textarea>';
  }
  else if (edit.type == 'checkbox') {
    if (content === (edit.truevalue || 'true')) var checked = ' checked';
    else var checked = '';
    input = '<input type="checkbox" id="editbox" name="input"' + checked + handler + '>';
  }
  else if (edit.type == 'password') {
    input = '<input type="password" id="editbox" name="input">';
  }
  else if (edit.type == 'date') {
    var res;
    if (res = content.match(/^([0-9]{2})-([0-9]{2})-([0-9]{4})$/)) var value = res[3] + '-' + res[2] + '-' + res[1];
    else var value = content;
    input = '<input type="date" id="editbox" name="input" value="' + value + '">';
  }
  else if (edit.type == 'email') {
    input = $('<input type="email" id="editbox" name="input" value="' + content + '">');
  }
  else {
    input = $('<input type="text" id="editbox" name="input" value="' + content + '" style="width: ' + cell.width() + 'px; height: ' + cell.height() + 'px;">');
  }
  return input;
}

function doEdit(cell, newcontent) {
  cell = $(cell);
  if (cell.hasClass('lt-editing')) return;
  cell.addClass('lt-editing');
  var content = cell.html();
  var data = tables[cell.closest('table').attr('id')].data;
  if ((typeof data.options.emptycelltext == 'string') && (content === $('<div/>').text(data.options.emptycelltext).html())) content = '';
  if (data.options.format) var c = cell.closest('tbody').find('.lt-data').index(cell)+1;
  else var c = cell.parent().children('.lt-data').index(cell)+1;

  var edit = $(renderEdit(data.options.edit[c], cell, typeof newcontent == 'string'?newcontent:content));
  cell.empty().append(edit);

  if (edit.prop('nodeName') == 'TEXTAREA') {
    var len = edit.html().length;
    edit.focus().textareaAutoSize()[0].setSelectionRange(len, len);
  }
  else edit.select();
  edit.on('keydown', cell, function(evt){
    var cell = evt.data;
    var edit = $(this);
    if ((evt.altKey == true) && (evt.which == 40)) {
      var content = edit.val();
      edit.blur();
      doEdit(cell.parent().next().children().eq(cell.index()).get(0), content);
      return;
    }
    if ((evt.altKey == true) && (evt.which == 38)) {
      var content = edit.val();
      edit.blur();
      doEdit(cell.parent().prev().children().eq(cell.index()).get(0), content);
      return;
    }
    if (edit.prop('nodeName') == 'TEXTAREA') edit.textareaAutoSize();
    if ((evt.which != 9) && (evt.which != 13) && (evt.which != 27) && (evt.which != 38) && (evt.which != 40)) return;
    if ((edit.prop('nodeName') == 'TEXTAREA') && ((evt.which == 13) || (evt.which == 38) || (evt.which == 40))) return;

    if (evt.which == 27) cell.html(content); // Escape
    else checkEdit(cell, edit, content);

    if (evt.which == 38) { // Arrow up
      cell.parent().prev().children().eq(cell.index()).trigger('click');
    }
    else if (evt.which == 40) { // Arrow down
      cell.parent().next().children().eq(cell.index()).trigger('click');
    }
    else if (evt.which == 9) { // Tab
      if (evt.shiftKey) cell.prev().trigger('click');
      else findNextEdit(cell, evt);
    }
    cell.removeClass('lt-editing');
    return false;
  });
  edit.on('blur', cell, function(evt){
    if (!checkEdit(evt.data, $(this), content)) return false;
    evt.data.removeClass('lt-editing');
  });
  if ((typeof(data.options.edit[c]) == 'object') && data.options.edit[c].type == 'color') {
    $(cell).colpick({
      color: content,
      layout: 'hex',
      onSubmit: function(hsb, hex, rgb, el) {
        edit.val('#' + hex);
        checkEdit(cell, edit, content);
        $(cell).colpickHide();
      }
    }).colpickShow();
    return;
  }
  else edit.focus();
}

function doSelect(el) {
  input = $(el);
  input.parent().css('background-color', 'red');
  key = input.closest('table').attr('id');
  id = input.closest('tr').data('rowid');
  $.ajax({
    method: 'post',
    url: ajaxUrl,
    dataType: 'json',
    context: input,
    data: { mode: 'select', src: tables[key].data.block + ':' + tables[key].data.tag, params: tables[key].data.params, id: id, link: input.prop('checked') },
    success: function(data) {
      if (data.error) appError(data.error, this);
      else this.parent().css('background-color', '');
    }
  });
}
function doEditSelect(cell) {
  cell = $(cell);
  if (cell.hasClass('lt-editing')) return;
  cell.addClass('lt-editing');
  var key = cell.closest('table').attr('id');
  var content = cell.html();
  if (tables[key].data.options.format) var c = cell.closest('tbody').find('.lt-data').index(cell)+1;
  else var c = cell.parent().children('.lt-data').index(cell)+1;
  $.ajax({
    method: 'get',
    url: ajaxUrl,
    dataType: 'json',
    context: cell,
    data: { mode: 'selectbox', src: tables[key].data.block + ':' + tables[key].data.tag, col: c },
    success: function(data) {
      if (data.error) appError(data.error, cell);
      else {
        var oldvalue = null;
        this.css({ backgroundColor: 'transparent' });
        var items = data.items;
        var selectbox = $('<select id="editbox"></select>');
        selectbox.css({ maxWidth: this.width() + 'px', minHeight: this.height() + 'px' });
        var selected = 0;
        if (data.null) selectbox.append('<option value=""></option>');
        for (var i = 0; items[i]; i++) {
          if (items[i][1] == content) {
             selectbox.append('<option value="' + items[i][0] + '" selected>' + items[i][1] + '</option>');
             oldvalue = String(items[i][0]);
             selected = 1;
          }
          else selectbox.append('<option value="' + items[i][0] + '">' + items[i][1] + '</option>');
        }
        this.empty().append(selectbox);
        if (data.insert) this.append('<input type="button" class="lt-add-option" value="➕" onclick="addOption(this, ' + c + ');">');
        if (!selected) selectbox.prop('selectedIndex', -1);
        selectbox.focus();
        selectbox.on('keydown', this, function(evt) {
          var cell = evt.data;
          if (evt.which == 27) cell.html(content); // Escape
          else if (evt.which == 13) checkEdit(cell, selectbox, oldvalue); // Enter
          else if (evt.keyCode == 9) { // Tab
            checkEdit(cell, selectbox, oldvalue);
            if (evt.shiftKey) cell.prev().trigger('click');
            else findNextEdit(cell, evt);
          }
          else {
            return true; // Allow default action (for instance list searching)
//            if (selectbox.data('filter')) {
//              if (evt.which == 8) selectbox.data('filter', selectbox.data('filter').substring(0, selectbox.data('filter').length-1));
//              else selectbox.data('filter', selectbox.data('filter') + String.fromCharCode(evt.keyCode));
//              console.log(selectbox.data('filter'));
//              selectbox.find('option').each(function() {
//                var option = $(this);
//                var regex = new RegExp(option.parent().data('filter'),"i")
//                if (option.text().search(regex) != -1) option.removeProp('hidden');
//                else option.prop('hidden', 'hidden');
//              });
//            }
//            else selectbox.data('filter', String.fromCharCode(evt.keyCode));
          }
          cell.removeClass('lt-editing');
          return false;
        });
        selectbox.on('blur', this, function(evt) {
          checkEdit(evt.data, $(this), oldvalue);
          evt.data.removeClass('lt-editing');
        });
      }
    }
  });
  cell.css({ backgroundColor: '#ffa0a0' });
}

function checkRequirements(options, c, value) {
  if (options.edit[c].required === true) {
    if (value === '') {
      alert(tr('Field') + ' ' + c + ' ' + tr('may not be empty'));
      return false;
    }
  }
  else if (typeof options.edit[c].required == 'object') {
    if (options.edit[c].required.regex) {
      if (value.search(new RegExp(options.edit[c].required.regex)) >= 0) return true;
      if (options.edit[c].required.message) alert(options.edit[c].required.message);
      else alert('Invalid input for column ' + c);
      return false;
    }
    else if (value === '') {
      if (options.edit[c].required.message) alert(options.edit[c].required.message);
      else alert('Column ' + c + ' may not be empty');
      return false;
    }
  }
  return true;
}

function directEdit(el) {
  var edit = $(el);
  checkEdit(edit.parent(), edit);
}

function checkEdit(cell, edit, oldvalue) {
  var newvalue = edit.val();
  var key = cell.closest('table').attr('id');
  var options = tables[key].data.options;
  if (options.format) var c = cell.closest('tbody').find('.lt-data').index(cell)+1;
  else var c = cell.parent().children('.lt-data').index(cell)+1;
  if (options.edit[c].type == 'checkbox') {
    if (edit.prop('checked')) {
      if (options.edit[c].truevalue) newvalue = options.edit[c].truevalue;
      else newvalue = 'true';
    }
    else {
      if (options.edit[c].falsevalue) newvalue = options.edit[c].falsevalue;
      else newvalue = 'false';
    }
  }

  if ((typeof oldvalue == 'undefined') || (newvalue !== oldvalue)) {
    if (options.edit[c].required) {
      if (!checkRequirements(options, c, newvalue)) return false;
    }
    var data = { mode: 'inlineedit', src: tables[key].data.block + ':' + tables[key].data.tag, col: c, row: cell.parent().data('rowid'), val: newvalue };
    if (tables[key].data.params) data['params'] = tables[key].data.params;
    if (options.sql) data['sql'] = options.sql;
    $.ajax({
      method: 'post',
      url: ajaxUrl,
      dataType: 'json',
      context: cell,
      data: data,
      success: function(data) {
        if (data.error) userError(data.error);
        else {
          tables[key].data.crc = '-';
          if (!options.style || !options.style[c]) this.css({ backgroundColor: 'transparent' });
          var rows = tables[key].data.rows;
          for (var r = 0; r < rows.length; r++) {
            if (rows[r][0] == this.parent().data('rowid')) break;
          }
          if (r == rows.length) console.log('Row not found in table data');
          else {
            if ((data.input == 'true') || (data.input == options.edit[c].truevalue)) data.input = true;
            else if ((data.input == 'false') || (data.input == options.edit[c].falsevalue)) data.input = false;
            if ((data.input === '') && (data.rows[0][c] === null)) data.input = null;

            if ((typeof(options.edit[c]) == 'object') && (options.edit[c].query || (!options.edit[c].target && (options.edit[c].length == 2)))) {
              rows[r][c] = data.rows[0][c];
            }
            else rows[r][c] = data.input;
            updateRow(options, this.closest('tbody'), rows[r], data.rows[0]);
            rows[r] = data.rows[0];
            if (options.callbacks && options.callbacks.change) window.setTimeout(options.callbacks.change, 0);
            if (options.trigger) loadOrRefreshCollection($('#' + options.trigger));
            else if (options.edit.trigger) loadOrRefreshCollection($('#' + options.edit.trigger));
            if (options.sum) updateSums(this.closest('table').find('tfoot'), tables[key].data);
            if (options.edit[c].required) {
              if (data.rows[0][c] === null) this.addClass('lt-required-empty');
              else this.removeClass('lt-required-empty');
            }
          }
        }
      }
    });
    if (edit.prop('nodeName') == 'SELECT') cell.html(edit.find('option:selected').text());
    else if (options.edit[c].type == 'password') cell.empty();
    else if ((newvalue == '') && (typeof options.emptycelltext == 'string')) cell.text(options.emptycelltext);
    else cell.html(newvalue);
    if (!options.style || !options.style[c]) cell.css({ backgroundColor: '#ffa0a0' });
  }
  else if (edit.prop('nodeName') == 'SELECT') cell.html(edit.find('option[value="' + oldvalue + '"]').text());
  else {
    cell.html(oldvalue);
    if ((oldvalue === '') && (typeof options.emptycelltext == 'string')) cell.text(options.emptycelltext);
  }
  return true;
}

function doInsert(el) {
  el = $(el);
  row = el.closest('.lt-insert');
  var error = false;
  postdata = row.find('input,select,textarea').not(el).map(function() {
    input = $(this);
    if (input.prop('type') == 'checkbox') value = input.prop('checked');
    else value = input.val();
    if (value === null) value = '';
    input.trigger('input');
    if (input.hasClass('lt-input-error')) error = true;
    return input.prop('name').replace('.', ':') + '=' + encodeURIComponent(value);
  }).get().join('&');
  if (error) {
    alert(tr('Row has errors and cannot be inserted'));
    return;
  }
  table = tables[row.closest('table').attr('id')].data;
  if (table.options.insert && table.options.insert.hidden) {
    if (typeof(table.options.insert.hidden[0]) == 'object') { // Multiple hidden fields (array of arrays)
      for (i = 0; table.options.insert.hidden[i]; i++) processHiddenInsert(table.options.insert.hidden[i], row.closest('.lt-div').data('params'));
    }
    else processHiddenInsert(table.options.insert.hidden, row.closest('.lt-div').data('params'));
  }
  postdata = 'params=' + row.closest('.lt-div').data('params') + '&' + postdata;
  $.ajax({
    dataType: 'json',
    url: ajaxUrl,
    method: 'post',
    context: row,
    data: 'mode=insertrow&src=' + table.block + ':' + table.tag + '&' + postdata,
    success: function(data) {
      if (data.error) userError(data.error);
      else if (data.replace) {
        var parent = this.closest('.lt-div').parent();
        parent.empty().html(data.replace);
        loadOrRefreshCollection(parent.find('.lt-div'));
      }
      else {
        var table = this.closest('table');
        var tabledata = tables[table.attr('id')].data;

        if (!tabledata.options.insert || (tabledata.options.insert.noclear !== true)) {
          this.find('input,select,textarea').each(function() {
            var el = $(this);
            if (el.prop('type') == 'button');
            else if (el.data('default')) {
              if (el.prop('nodeName') == 'SELECT') el.find('option').contents().filter(function() { return this.nodeValue == el.data('default'); }).parent().prop('selected', true);
              else el.val(el.data('default'));
            }
            else if (el.prop('nodeName') == 'SELECT') el.prop('selectedIndex', -1);
            else if (el.prop('type') == 'date') el.val(new Date().toISOString().slice(0, 10));
            else if (el.prop('type') == 'checkbox') el.prop('checked', false);
            else if (el.hasClass('lt-addoption')) switchToSelect(el);
            else el.val('');
          });
        }

        if (data.rows && data.rows.length) {
          var tbody = table.find('tbody');
          if (!tbody.length) {
            tbody = $('<tbody/>');
            table.prepend(tbody);
          }
          var thead = table.find('thead');
          if (!thead.length) {
            thead = $('<thead/>');
            if (table.closest('.lt-div').data('sub') != 'true') thead.append(renderTitle(tabledata));
            thead.append(renderHeaders(tabledata, table.attr('id')));
            table.prepend(thead);
          }

          updateTable(tbody, tabledata, data.rows);
          tabledata.rows = data.rows;
          tabledata.crc = data.crc;
          if (tabledata.options.sum) updateSums(table.find('tfoot'), tabledata);
        }
        if (tabledata.options.trigger) loadOrRefreshCollection($('#' + tabledata.options.trigger));
        else if (tabledata.options.insert.trigger) loadOrRefreshCollection($('#' + tabledata.options.insert.trigger));
        else if ((tabledata.options.insert.include == 'edit') && tabledata.options.edit.trigger) loadOrRefreshCollection($('#' + tabledata.options.edit.trigger));

        this.find('input,select,textarea').first().focus();
      }
    }
  });
}

function doNext(el, prev) {
  var div = $(el).closest('div');
  var key = div.data('source');
  var options = tables[key].options;
  if (options.prev || options.next) {
    $.ajax({
      dataType: 'json',
      url: ajaxUrl,
      method: 'post',
      data: 'mode=donext&src=' + key + '&prev=' + prev,
      success: function(data) {
        if (data.error) userError(data.error);
        else if (data.replace) {
          var parent = div.parent();
          parent.empty().html(data.replace);
          loadOrRefreshCollection(parent.find('.lt-div'));
          parent.find('.lt-control:visible').each(function() {
            var attr = $(this).data();
            loadControl($(this), attr);
          });
        }
        else if (data.location) {
          window.location = data.location;
        }
      }
    });
  }
}

function processHiddenInsert(hidden, paramstr) {
  if (!hidden.target || !hidden.value) appError('No target or value defined in insert hidden');
  value = String(hidden.value);
  if (value.indexOf('#') >= 0) {
    if (paramstr) {
      params = JSON.parse(atob(paramstr));
      for (var i = 0; params[i]; i++) {
        value = value.replace('#param' + (i+1), params[i]);
      }
    }
  }
  postdata += '&' + hidden.target.replace('.', ':') + '=' + value;
}

function doDelete(el) {
  el = $(el);
  var rowid = el.closest('tr').data('rowid');
  var table = tables[el.closest('table').attr('id')].data;
  if (table.options.delete.confirm) {
    for (var r = 0; r < table.rows.length; r++) {
      if (table.rows[r][0] == rowid) break;
    }
    if (r == table.rows.length) {
      appError('Row to be deleted not found', table.rows);
      return;
    }
    if (!confirm(replaceHashes(table.options.delete.confirm, table.rows[r]))) return;
  }
  $.ajax({
    dataType: 'json',
    url: ajaxUrl,
    method: 'post',
    context: el.closest('tbody'),
    data: 'mode=deleterow&src=' + table.block + ':' + table.tag + '&id=' + rowid + '&params=' + el.closest('.lt-div').data('params'),
    success: function(data) {
      if (data.error) userError(data.error);
      else {
        var newrows = table.rows.slice();
        for (var r = 0; r < newrows.length; r++) {
          if (newrows[r][0] == rowid) break;
        }
        if (r == newrows.length) {
          appError('Deleted row not found', newrows);
          return;
        }
        newrows.remove(r);
        updateTable(this, table, newrows);
        table.rows = newrows;
        table.crc = data.crc;
        if (table.options.sum) updateSums(this.parent().find('tfoot'), table);
        if (table.options.trigger) loadOrRefreshCollection($('#'+table.options.trigger));
        else if (table.options.delete.trigger) loadOrRefreshCollection($('#'+table.options.delete.trigger));
      }
    }
  });
}

function findNextEdit(el, evt) {
  while (el.next().length > 0) {
    if (el.next().hasClass('lt-edit')) {
      el.next().trigger('click');
//      el.next().scrollIntoViewLazy();
      return;
    }
    if (el.next().hasClass('form')) {
      el.next().children(':first').focus();
//      el.next().scrollIntoViewLazy();
      el.removeClass('lt-editing');
      return;
    }
    el = el.next();
  }
  el.removeClass('lt-editing');
}

function run_sql(form) {
  var textarea = $(form).find('textarea');
  $.ajax({
    dataType: "json",
    url: ajaxUrl,
    method: "post",
    data: "mode=sqlrun&sql=" + encodeURIComponent(textarea.val()),
    context: this,
    success: function(data) {
      var table = $('#sqlrun\\:table');
      if (data.error) {
        table.empty();
        table.append('<tr class="lt-row"><td class="lt-cell" style="font-family: monospace; border-color: red;">' + data.error + '</td></tr>');
        textarea.focus();
      }
      else {
        tables['sqlrun:table'] = {};
        tables['sqlrun:table'].data = data;
        table.empty();
        renderTable(table, data);
        textarea.focus();
      }
    },
    error: function(xhr, status) { $(this).empty().append('Error while loading table ' + $(this).data('source') + ' (' + status + ' from server)'); }
  });
}

/* * * * * * * * * * * * * * * * * * * * * *
 *                                         *
 * Functions for FullCalendar integration  *
 *                                         *
 * * * * * * * * * * * * * * * * * * * * * */

function calendarSelect(start, end, timezone, callback) {
  $.ajax({
    url: ajaxUrl,
    type: 'POST',
    dataType: 'json',
    data: {
      mode: 'calendarselect',
      src: this.overrides.src,
      start: start.format(),
      end: end.format()
    },
    success: function(data) {
      if (data.error) {
        alert(data.error);
        if (data.redirect) window.location = data.redirect;
      }
      else callback(data);
    },
    error: function(jqXHR, testStatus, errorThrown) {
      alert(errorThrown);
    }
  });
}
function calendarUpdate(event, delta, revertFunc) {
  $.ajax({
    url: ajaxUrl,
    type: 'POST',
    dataType: 'json',
    data: {
      mode: 'calendarupdate',
      src: event.src,
      id: event.id,
      start: event.start.format(),
      end: event.end.format()
    },
    error: function(jqXHR, textStatus, errorThrown) {
      alert(errorThrown);
      revertFunc();
    }
  });
}
function calendarInsert(start, end) {
  if (this.calendar.overrides.allDayOnly && start.hasTime()) return;
  if (this.calendar.overrides.insertTitle) {
    var title = this.calendar.overrides.insertTitle();
    if (!title) return;
  }
  else var title = '';
  if (this.calendar.overrides.params) {
    for (var i = 1; this.calendar.overrides.params[i]; i++) {
      var checked = false;
      var elem = $('input[name=select'+i+']:checked');
      if (elem.length) checked = true;
      if (!checked.length) {
        elem = $('select[name=select'+i+']');
        if ((elem.prop('selectedIndex') >= 0) && ($('select[name=select'+i+'] option').eq($('select[name=select'+i+']').prop('selectedIndex')).attr('value') !== "")) checked = true;
      }
      if (this.calendar.overrides.params[i].required && !checked) {
        if (this.calendar.overrides.params[i].missingtext) userError(this.calendar.overrides.params[i].missingtext);
        else userError(tr('Missing parameter'));
        return;
      }
    }
  }
  $.ajax({
    url: ajaxUrl,
    type: 'POST',
    dataType: 'json',
    data: {
      mode: 'calendarinsert',
      src: this.calendar.overrides.src,
      param1: $('input[name=select1]:checked').parent().parent().data('rowid') || $('select[name=select1]').val(),
      param2: $('input[name=select2]:checked').parent().parent().data('rowid') || $('select[name=select2]').val(),
      start: start.format(),
      end: end.format(),
      title: title
    },
    context: this,
    success: function(data) {
      if (data.error) alert(data.error);
      this.calendar.refetchEvents();
    },
    error: function(jqXHR, testStatus, errorThrown) {
      alert(errorThrown);
    }
  });
}
function calendarDelete(src, id, successFunc) {
  $.ajax({
    url: ajaxUrl,
    type: 'POST',
    dataType: 'json',
    data: {
      mode: 'calendardelete',
      src: src,
      id: id
    },
    success: successFunc,
    error: function(jqXHR, textStatus, errorThrown) {
      alert(errorThrown);
    }
  });
}

/* * * * * * * * * * * * *
 *                       *
 *   3rd-party scripts   *
 *                       *
 * * * * * * * * * * * * */

// Array Remove - By John Resig (MIT licensed) - http://ejohn.org/blog/javascript-array-remove/
Array.prototype.remove = function(from, to) {
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};

// ES6 String.startsWith() polyfill - Public domain - https://developer.mozilla.org/nl/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith#Polyfill
if (!String.prototype.startsWith) {
    String.prototype.startsWith = function(searchString, position){
      return this.substr(position || 0, searchString.length) === searchString;
  };
}

// jQuery Textarea AutoSize plugin - By Javier Julio (MIT licensed) - https://github.com/javierjulio/textarea-autosize
;(function ($, window, document, undefined) {
  var pluginName = "textareaAutoSize";
  var pluginDataName = "plugin_" + pluginName;
  var containsText = function (value) {
    return (value.replace(/\s/g, '').length > 0);
  };

  function Plugin(element, options) {
    this.element = element;
    this.$element = $(element);
    this.init();
  }

  Plugin.prototype = {
    init: function() {
      var height = this.$element.outerHeight();
      var diff = parseInt(this.$element.css('paddingBottom')) +
                 parseInt(this.$element.css('paddingTop')) || 0;

      if (containsText(this.element.value)) {
        this.$element.height(this.element.scrollHeight - diff);
      }

      // keyup is required for IE to properly reset height when deleting text
      this.$element.on('input keyup', function(event) {
        var $window = $(window);
        var currentScrollPosition = $window.scrollTop();

        $(this)
          .height(0)
          .height(this.scrollHeight - diff);

        $window.scrollTop(currentScrollPosition);
      });
    }
  };

  $.fn[pluginName] = function (options) {
    this.each(function() {
      if (!$.data(this, pluginDataName)) {
        $.data(this, pluginDataName, new Plugin(this, options));
      }
    });
    return this;
  };

})(jQuery, window, document);
