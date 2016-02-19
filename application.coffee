###
[s2mf]

Copyright (c) 2016 narugami
Mail: narugami@backbones.jp

This software is released under the MIT License.
http://opensource.org/licenses/mit-license.php
###

$ ->
  show_alert = (msg) ->
    $('#alert').text(msg).show()

  unless window.File && window.FileReader && window.FileList && window.Blob
    show_alert 'お使いのブラウザでは利用できません。'
    $('#select_file').prop 'disabled', true
  else
    $('#bank').val(Cookies.get('bank') ? 'Suica')
    $('#disable_transfers').prop('checked', Cookies.get('disable_transfers') == 'true')
    $('#disable_duplicates').prop('checked', Cookies.get('disable_duplicates') == 'true')

    $('#select_file').click ->
      $('#input_file').click()
    $('#input_file').change ->
      return unless @.files.length == 1

      disable_transfers = $('#disable_transfers').prop('checked')
      disable_duplicates = $('#disable_duplicates').prop('checked')

      file = @.files[0]
      file_name = file.name
      unless file_name.match /\.csv$/
        show_alert "#{file_name}はCSVファイルではありません。"
        return
      else unless file.size < 5120
        show_alert "#{file_name}は容量が大きすぎます。"
        return

      reader = new FileReader()
      reader.onerror = ->
        show_alert "#{file_name}の読み込みに失敗しました。"
      reader.onload = ->
        card_re = /^カードID=\w+?\r\n/
        unless card_re.test @.result
          show_alert "#{file_name}はSFCard Viewer 2で出力されたCSVファイルではありません。"
          return

        raw = @.result.replace(card_re, '')
        output = "計算対象,金融機関,日付,振替,大項目,中項目,内容,金額,メモ"
        last_row = Cookies.get('last_row')
        step_counter = 0
        prev_cursor = 0
        in_duplicates = false

        Papa.parse raw,
          error: ->
            show_alert "#{file_name}の読み込みに失敗しました。"
          step: (result) ->
            current_cursor = result.meta.cursor
            raw_row = raw.substr(prev_cursor, current_cursor - prev_cursor)
            prev_cursor = current_cursor
            row = result.data[0]
            step_counter += 1

            return unless row.length == 10
            return if step_counter == 1
            if step_counter == 2
              Cookies.set 'last_row', raw_row, { expires: 7300 }

            in_duplicates = true if disable_duplicates && raw_row == last_row

            price = -parseInt("#{row[7]}".split(',').join('').trim())
            transfer = price > 0
            enabled = !in_duplicates && !(disable_transfers && transfer)
            bank = $('#bank').val()
            date = "#{row[0]}"
            description = "#{row[2]}#{row[3]} #{row[5]}#{row[6]}".trim()
            memo = "#{row[9]}"
            category = ""
            section = ""

            unless transfer
              if memo.indexOf('ﾊﾞｽ') >= 0
                category = '交通費'
                section = 'バス'
              else if memo.indexOf('物販') >= 0
                category = '食費'
                section = 'その他食費'
              else
                category = '交通費'
                section = '電車'

            output += "\n#{enabled | 0},#{bank},#{date},#{transfer | 0},#{category},#{section},#{description},#{price},#{memo}"
          complete: (results) ->
            if results.errors.length == 0
              blob = new Blob([output], type: 'text/csv')
              saveAs blob, "#{file_name.replace(/\.csv$/, '')}_converted.csv"
            $('#input_file').replaceWith $('#input_file').clone(true)
            Cookies.set 'bank', $('#bank').val()
            Cookies.set 'disable_transfers', $('#disable_transfers').prop('checked')
            Cookies.set 'disable_duplicates', $('#disable_duplicates').prop('checked')

      reader.readAsText file, 'shift-jis'
