
$(function () {
  let config, cotApp, keys= ["ptc_config", "ptc_terms" , "ptc_terms_decline", "ptc_overview"];
  cotApp = new CotApp();
  // @if ENV='local' || ENV='dev'
  console.log('READY - running on env: ', '/* @echo ENV*/');
  // @endif
  //let cotApp = new CotApp();

  //@if ENV='local'
  cotApp.appContentKeySuffix = '';
  //@endif

  cotApp.loadAppContent({
    keys: keys,
    onComplete: function (data) {

      //@if ENV='local'
      config = JSON.parse(data[keys[0]]);
      //@endif
      //@if ENV!='local'
      config = data[keys[0]];
      //@endif
      config.terms = data[keys[1]];
      config.terms_decline = data[keys[2]];
      config.overview = data[keys[3]];
      initialize();
    }
  });

  function initialize() {
    $.get("/* @echo SRC_PATH*//html/cot_pt_calc.html#fh-steps", function (template) {
      let rendered = Mustache.render(template, config);
      $("#view_container").empty().html(rendered);
      loadFormValidation();
      showTerms();
      $(".fv-hidden-submit").addClass(".hidden").text("system button");
    }).fail(function () {
      $("#view_container").empty();
    });
  }

  function loadFormValidation(){

    $("#view_container")
      .off("click", "#btn_back").on("click","#btn_back", function(){navigatetoStep(1);})
      .off("click", "#btn_back_2").on("click","#btn_back_2", function(){navigatetoStep(2);refreshCalculator();})
      .off("click", "#btn_forward").on("click","#btn_forward", function(){showSessions();})
      .off("click", "#btn_calc").on("click","#btn_calc", function(){calculatePT($('#propertyValue').val());})
      .off("click", "#btn_print").on("click","#btn_print", function(){window.print();})
      .off("click", "#btn_calc_refresh").on("click","#btn_calc_refresh", function(){navigatetoStep(2);refreshCalculator();})
      .off("keyup", "#propertyValue").on("keyup","#propertyValue", function (event) {
      if (event.keyCode === 13) {
        $("#btn_calc").click();
      }
    });

    $('#numericForm')
      .formValidation({
        framework: 'bootstrap',
        icon: {
          valid: 'glyphicon glyphicon-ok',
          invalid: 'glyphicon glyphicon-remove',
          validating: 'glyphicon glyphicon-refresh'
        },
        fields: {
          propertyValue: {
            validators: {
              greaterThan: {
                value: 1,
                message: 'The value must be greater than 1'
              },
              numeric: {
                message: 'The value is not a number',
                // The default separators
                thousandsSeparator: '',
                decimalSeparator: '.'
              },
              notEmpty:{message:"Current Property Assessment Value is required"}
            }
          }
        }
      })
      .submit(function(e){
        $(this).formValidation('revalidateField', 'propertyValue');
        e.preventDefault();
      });
  }

  function refreshCalculator(){
    $('#propertyValue').val('').focus();$('#calcArea').html('');
  }

  function formatAsCurrency(val, places){
    return '$' + val.toFixed(places).replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
  }

  function calculatePT(strValue){
    let val = parseFloat(strValue);
    if($.isNumeric(val)){
      let html = "";
      let rates = config["calculation"].rates;
      let details = config["calculation"].city_detail_rates;
      let totalTaxRate = config["calculation"].totalTaxRate;
      let totalTax = 0;
      html+="<h3>"+config["Single Family"]+ formatAsCurrency(val, 0) +"</h3>";
      html+="<div class=\"table-responsive\"><table class=\"table table-striped table-bordered\" border=\"0\"><thead><tr><th>Line Item</th><th style=\"text-align:right\">Calculation</th></tr></thead><tbody>";
      $.each(rates, function(i, item){
        html+= "<tr><td>" + config["Year"] + "&nbsp;"  + item.label + "</td><td style=\"text-align:right\">"+ formatAsCurrency(val, 2) + "&nbsp;*&nbsp;"+ item.rate + "&nbsp;=&nbsp;" +formatAsCurrency((val*item.rate),2) + "</td></tr>";
        totalTax += Number((val*item.rate).toFixed(2))
      });
      html+= "<tr><td style=\"text-align: right;\" colspan=\"2\"><b>"+totalTaxRate.label+"= "+ formatAsCurrency(totalTax, 2)+"</b></td></tr>";
      html+="</tbody></table ></div><br/>";
      html+="<p>"+config["Any other property"]+"</p>";

      html+="<div class=\"table-responsive\"><table class=\"table table-striped table-bordered\" border=\"0\"><thead><tr><th>Item Breakdown</th><th style=\"text-align:right\">Rate</th></tr></thead><tbody>";
      $.each(rates, function(i, item){
        html+= "<tr><td>" + config["Year"] + "&nbsp;"  + item.label + "</td><td style=\"text-align:right\">"+  (item.rate*100).toFixed(7) +  "%</td></tr>";
      });

      html+= "<tr><td style=\"text-align: right;\" colspan=\"2\"><b>"+ totalTaxRate.breakdown_label +"="+(totalTaxRate.rate*100) + "%</b></td></tr>";
      html+="</tbody></table ></div>";
      html+= "<p>"+ config["find out more"] + "</p>";


      html+="<div class=\"table-responsive\"><table class=\"table\"><thead><tr><th class='col-md-6 text-right'>"+config["works for you"]+"</th><th class='col-md-6 text-left'>"+config["works for you rate"]+"</th></tr></thead><tbody>";
      $.each(details, function(i, item){
        let rate = formatAsCurrency(((val*rates.cityRate.rate)*item.rate), 2);
        let percent = (item.rate*100).toFixed(0);
        html+= "<tr><td class='text-right'>" + item.label+ "</td>";
        html+= "<td class='text-left'> ";
        html+= "<div aria-hidden='true' class='progress' ><div class='progress-bar progress-bar-custom' role='progressbar' aria-valuenow='"+percent+"' aria-valuemin='0' aria-valuemax='100' style='width:"+percent+"%;margin:0;background-color:"+item.color+";'>" ;
        html+= "</div>&nbsp;"+rate +"</div>";
        html+="<span class='sr-only'>" + rate + "</span>";
        html+="</td></tr>";
      });
      html+="</tbody></table ></div>";

      $("#calcArea").html(html)

    }else{$("#calcArea").html('')}
  }

  function showSessions() {
    $("#fh-step1, #fh-step3").addClass("hide");
    $("#fh-step2").removeClass("hide");
  }

  function showTerms() {

    CotApp.showTerms({
      termsText: config.terms,
      disagreedText: config.terms_decline,
      containerSelector: '#terms_container',
      agreedCookieName: 'cot-terms-ptc',
      onAgreed: function () {
        $("#fh-steps").removeClass("hide");
      }
    });
  }

  function navigatetoStep(stepNo) {
    switch (stepNo) {
      case 1:
        $.removeCookie("cot-terms-ptc");
        $("#fh-steps").addClass("hide");
        showTerms();
        $("#cot-terms-agree").focus();
        break;
      case 2:
        $("#fh-step2").addClass("hide");
        $("#fh-step1").removeClass("hide");
        $("#btn_back").focus();
        break;
      default:
    }
  }
});
