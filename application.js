
/*
[Suica to Moneyforward]

Copyright (c) 2016 nalgami
Mail: narugami@backbones.jp

This software is released under the MIT License.
http://opensource.org/licenses/mit-license.php
 */

(function() {
  $(function() {
    var ref, ref1, ref2, show_alert;
    show_alert = function(msg) {
      return $('#alert').text(msg).show();
    };
    if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
      show_alert('お使いのブラウザでは利用できません。');
      return $('#select_file').prop('disabled', true);
    } else {
      $('#bank').val((ref = Cookies.get('bank')) != null ? ref : 'Suica');
      $('#disable_transfers').prop('checked', (ref1 = Cookies.get('disable_transfers')) != null ? ref1 : true);
      $('#disable_duplicates').prop('checked', (ref2 = Cookies.get('disable_duplicates')) != null ? ref2 : true);
      $('#select_file').click(function() {
        return $('#input_file').click();
      });
      return $('#input_file').change(function() {
        var disable_duplicates, disable_transfers, file, file_name, reader;
        if (this.files.length !== 1) {
          return;
        }
        disable_transfers = $('#disable_transfers').prop('checked');
        disable_duplicates = $('#disable_duplicates').prop('checked');
        file = this.files[0];
        file_name = file.name;
        if (!file_name.match(/\.csv$/)) {
          show_alert(file_name + "はCSVファイルではありません。");
          return;
        } else if (!(file.size < 5120)) {
          show_alert(file_name + "は容量が大きすぎます。");
          return;
        }
        reader = new FileReader();
        reader.onerror = function() {
          return show_alert(file_name + "の読み込みに失敗しました。");
        };
        reader.onload = function() {
          var card_re, in_duplicates, last_row, output, prev_cursor, raw, step_counter;
          card_re = /^カードID=\w+?\r\n/;
          if (!card_re.test(this.result)) {
            show_alert(file_name + "はSFCard Viewer 2で出力されたCSVファイルではありません。");
            return;
          }
          raw = this.result.replace(card_re, '');
          output = "計算対象,金融機関,日付,振替,大項目,中項目,内容,金額,メモ";
          last_row = Cookies.get('last_row');
          step_counter = 0;
          prev_cursor = 0;
          in_duplicates = false;
          return Papa.parse(raw, {
            error: function() {
              return show_alert(file_name + "の読み込みに失敗しました。");
            },
            step: function(result) {
              var bank, category, current_cursor, date, description, enabled, memo, price, raw_row, row, section, transfer;
              current_cursor = result.meta.cursor;
              raw_row = raw.substr(prev_cursor, current_cursor - prev_cursor);
              prev_cursor = current_cursor;
              row = result.data[0];
              step_counter += 1;
              if (row.length !== 10) {
                return;
              }
              if (step_counter === 1) {
                return;
              }
              if (step_counter === 2) {
                Cookies.set('last_row', raw_row, {
                  expires: 7300
                });
              }
              if (disable_duplicates && raw_row === last_row) {
                in_duplicates = true;
              }
              price = -parseInt(("" + row[7]).split(',').join('').trim());
              transfer = price > 0;
              enabled = !in_duplicates && !(disable_transfers && transfer);
              bank = "Suica";
              date = "" + row[0];
              description = ("" + row[2] + row[3] + " " + row[5] + row[6]).trim();
              memo = "" + row[9];
              category = "";
              section = "";
              if (!transfer) {
                if (memo.indexOf('ﾊﾞｽ') >= 0) {
                  category = '交通費';
                  section = 'バス';
                } else if (memo.indexOf('物販') >= 0) {
                  category = '食費';
                  section = 'その他食費';
                } else {
                  category = '交通費';
                  section = '電車';
                }
              }
              return output += "\n" + (enabled | 0) + "," + bank + "," + date + "," + (transfer | 0) + "," + category + "," + section + "," + description + "," + price + "," + memo;
            },
            complete: function(results) {
              var blob;
              if (results.errors.length === 0) {
                blob = new Blob([output], {
                  type: 'text/csv'
                });
                saveAs(blob, (file_name.replace(/\.csv$/, '')) + "_converted.csv");
              }
              $('#input_file').replaceWith($('#input_file').clone(true));
              Cookies.set('bank', $('#bank').val());
              Cookies.set('disable_transfers', $('#disable_transfers').prop('checked'));
              return Cookies.set('disable_duplicates', $('#disable_duplicates').prop('checked'));
            }
          });
        };
        return reader.readAsText(file, 'shift-jis');
      });
    }
  });

}).call(this);

