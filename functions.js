    function showExamples() {
      document.getElementById("funcion").value=exampleObj[lp_demo_exampleNumber%exampleObj.length];
      document.getElementById("restriccion").value=exampleRest[lp_demo_exampleNumber%exampleRest.length];
      lp_demo_exampleNumber++;
    }

    function showExamplesCoef() {
      document.getElementById("cantVariable").value = "2";
      document.getElementById("cantRestriccion").value = "3";
      CrearRelleno();
      document.getElementById("Z1").value = "5";
      document.getElementById("Z2").value = "6";
      document.getElementById("C11").value = "1";
      document.getElementById("C12").value = "2";
      document.getElementById("B1").value = "200";
      document.getElementById("C21").value = "3";
      document.getElementById("C22").value = "1";
      document.getElementById("B2").value = "360";
      document.getElementById("C31").value = "2";
      document.getElementById("C32").value = "5";
      document.getElementById("B3").value = "600";
    }

    function clearAll() {
      document.getElementById("funcion").value="";
            document.getElementById("restriccion").value="";
      document.getElementById("solutionout").innerHTML="Una solución óptima (o mensaje) aparecerá aquí.";
      document.getElementById("outputarea").innerHTML="Las tablas del Método Simplex apareceran aquí.";
      document.getElementById("costoOportunidad").innerHTML = "";
      document.getElementById("valorSlack").innerHTML = "";
      document.getElementById("situacion").innerHTML="";
    }

    function clearAllCoef() {
      var cantidadVariable = document.getElementById("cantVariable").value;
      var cantidadRestricciones= document.getElementById("cantRestriccion").value;
      for (var j = 1; j <= (cantidadVariable) ; j++) {
            document.getElementById(`Z${j}`).value = "";
            }
      for (var i = 1; i <= (cantidadRestricciones) ; i++) {//filas
        for (var j = 1; j <= (cantidadVariable) ; j++) {//columnas
          document.getElementById(`C${i}${j}`).value = "";
        }
          document.getElementById(`B${i}`).value = "";
      }
      document.getElementById("solutionoutCoef").innerHTML="Una solución óptima (o mensaje) aparecerá aquí.";
      document.getElementById("outputareaCoef").innerHTML="Las tablas del Método Simplex apareceran aquí.";
      document.getElementById("costoOportunidadCoef").innerHTML = "";
      document.getElementById("valorSlackCoef").innerHTML = "";
      document.getElementById("situacioN").innerHTML="";
    }

    function clearOutput() {
      document.getElementById("outputarea").innerHTML="Las tablas del Método Simplex apareceran aquí.";
    }
    
    function showOutput( str ) {
      document.getElementById("outputarea").innerHTML = str;
    }

    function showOutputCoef( str ) {
      document.getElementById("outputareaCoef").innerHTML = str;
    }
    
    function showSolution( str ) {
      document.getElementById("solutionout").innerHTML = str;
    }

    function showSolutionCoef( str ) {
      document.getElementById("solutionoutCoef").innerHTML = str;
    }

    function adjustAccuracy() {
      var inAcc=parseInt(document.getElementById("accuracyDig").value);
      if ( (inAcc<=0)||(inAcc>13)||(isNaN(inAcc)) ) {
        alert("Dígitos significativos debe ser un entero entre 0-13")
        document.getElementById("accuracyDig").value=6;
      }
      else lp_demo_accuracy = inAcc;
    }

    function adjustAccuracyCoef() {
      var inAcc=parseInt(document.getElementById("accuracyDigCoef").value);
      if ( (inAcc<=0)||(inAcc>13)||(isNaN(inAcc)) ) {
        alert("Dígitos significativos debe ser un entero entre 0-13")
        document.getElementById("accuracyDig").value=6;
      }
      else lp_demo_accuracy = inAcc;
    }

    function setMode() {
      var theId = document.querySelector('input[name="modepicker"]:checked').id;
      switch ( theId ) {
        case "1coef": lp_demo_mode=1; break;
        case "2coef": lp_demo_mode=2; break;
        case "3coef": lp_demo_mode=3; break;
        default: lp_demo_mode=parseInt(document.querySelector('input[name="modepicker"]:checked').id); // ids are conveniently set to equal the mode
      }
      
    }

    function setShowTabl() {
      var theId = document.querySelector('input[name="displaytabl"]:checked').id;
      switch ( theId ) {
        case "yesTabl":   lp_demo_verboseLevel = lp_verbosity_tableaus; break;
        case "andSolns":  lp_demo_verboseLevel = lp_verbosity_solutions; break;
        case "yesTablCoef":   lp_demo_verboseLevel = lp_verbosity_tableaus; break;
        case "andSolnsCoef":  lp_demo_verboseLevel = lp_verbosity_solutions; break;
        default:      lp_demo_verboseLevel = lp_verbosity_none; break;
      }
//      lp_demo_verboseLevel = (theId=="yesTabl") ? lp_verbosity_tableaus : lp_verbosity_none;
    }

        function Resolv() {
              document.getElementById("situacion").innerHTML ="";
              var f = document.getElementById("funcion").value; //variable f toma el valor del cuadro de texto funcion
              var ob = document.getElementById("objetivo").value; //variable ob toma el valor del cuadro de texto objetivo
              var r = document.getElementById("restriccion").value; //variable r toma el valor del cuadro de texto restriccion
          
              var ArrayFormateado;
              const subject = " subject to ";


              if (ob == "Maximizar"){
                ob = "Maximize ";
              }else{
                ob = "minimize ";
              }
            
            ArrayFormateado = `${ob}${f}${subject}${r}`; //arrayformateado guarda los datos del problema, separados
            //console.log({ArrayFormateado});
            clearOutput();
                    adjustAccuracy();setMode();setShowTabl();
                    var Q = new lpProblem( ArrayFormateado); //crea un objeto lpProblem a partir de arrayformateado
                    lp_verboseLevel=lp_demo_verboseLevel;
                    Q.mode=lp_demo_mode;
                    Q.sigDigits=lp_demo_accuracy;
                    try{Q.solve()} //acá llama a solve para el problema
                    finally{showOutput( lp_trace_string );showSolution( Q.solutionToString() );showFilaZ(filaZ, Q.formatUnknowns(), ob, Q.status, Q.constraints, Q.formatLastSolution(true))} //muestra la solución como string, también los pasos intermedios
            }

        function Resuelve(){
          document.getElementById("situacioN").innerHTML ="";
          var cantidadVariable = document.getElementById("cantVariable").value;
          var TxtFuncion = "z = ";
          var Txt ="";
          //este FOR toma todo lo del Z//
          for (var j = 1; j <= (cantidadVariable) ; j++) {//filas
            var verificacion = 0;
            var Zi = document.getElementById(`Z${j}`).value;
            if (Zi != ""){
              if((Zi < 0) && (j == 1)){
                TxtFuncion += Zi + 'X'+ [j];
              }else{
                if(Zi < 0){
                  Zi = (Zi * -1);
                  TxtFuncion += ' - ' + Zi + 'X'+ [j];
                  verificacion = 1;
                }
                if((Zi > 0) && (j == 1)){
                  TxtFuncion += Zi + 'X'+ [j];
    
                }else{
                  if(verificacion == 0){
                  TxtFuncion += ' + ' + Zi + 'X'+ [j];
                  }
                }

              }
            }
          }
            TxtFuncion += Txt;
              var f = TxtFuncion; //variable f toma el valor del cuadro de texto funcion
              var ob = document.getElementById("objetivo").value; //variable ob toma el valor del cuadro de texto objetivo
              var r = mostrar(); //variable r toma el valor del cuadro de texto restriccion
          
              var ArrayFormateado;
              const subject = " subject to ";


              if (ob == "Maximizar"){
                ob = "Maximize ";
              }else{
                ob = "minimize ";
              }
            
            ArrayFormateado = `${ob}${f}${subject}${r}`; //arrayformateado guarda los datos del problema, separados
            console.log({ArrayFormateado});
            clearOutput();
                    adjustAccuracy();setMode();setShowTabl();
                    var Q = new lpProblem( ArrayFormateado); //crea un objeto lpProblem a partir de arrayformateado
                    lp_verboseLevel=lp_demo_verboseLevel;
                    Q.mode=lp_demo_mode;
                    Q.sigDigits=lp_demo_accuracy;
                    try{Q.solve()} //acá llama a solve para el problema
                    finally{showOutputCoef( lp_trace_string );showSolutionCoef(Q.solutionToString());showFilaZCoef(filaZ, Q.formatUnknowns(), ob, Q.status, Q.constraints, Q.formatLastSolution(true))} //muestra la solución como string, también los pasos intermedios
            }
          

	// FILA DEL Z (Muestra los costo de oportunidad y la slack)
            function showFilaZ( filafinalZ, arrayVariables, ob, str, rest, sol) {
              var posicion = filafinalZ.length; //tamaño
              var mostrar = filafinalZ[posicion-1]; // me devuelve el ultima fila
              var cOportrunidad = "";
              var slack = "";
              var cantidadVariable = arrayVariables.length; // cuando tengamos el id de la cantidad de variables se le puede colocar aca
              var j = 1;
              var cantidadRestriccion = rest.length;
              var cantidadCero = 0;
              //console.log(sol);
              if(str == 4){
                var control = 0;
              for (var i=1; i < ((mostrar.length) -2); i++){
                if(i<= cantidadVariable){
                if(mostrar[i] == 0){
                  cOportrunidad = cOportrunidad + `<p class="font-weight-bold">Producto`+[i]+":"+" "+ "No tiene costo de oportunidad"+` </p>`;
                  cOportrunidad = cOportrunidad + "Este producto forma parte de la solución" + "<br>"+"<br>";
                  cantidadCero += 1 ; 
                }else{
                  cOportrunidad = cOportrunidad + `<p class="font-weight-bold">Producto`+[i]+":"+" "+ mostrar[i] +` </p>`;

                  if (ob == "Maximize "){
                    cOportrunidad = cOportrunidad + "Si se incluye este producto en la solución el funcional disminuiria en: " + mostrar[i] + "<br>"+"<br>";
                  }else{
                    cOportrunidad = cOportrunidad + "Si se incluye este producto en la solución el funcional aumentaria en:  " + mostrar[i] + "<br>"+"<br>";
                  }
                 }
                 
                }else{

                if( mostrar[i] == 0){
                  slack = slack + `<p class="font-weight-bold">Recurso`+ j +":"+" "+"No tiene valor marginal" + ` </p>`;

                  slack = slack + "Existe un sobrante de " + sol[i-1] +" de este recurso" + "<br>"+"<br>";
                  cantidadCero += 1 ;
                }else{
                  slack = slack + `<p class="font-weight-bold">Recurso`+ j +":"+" "+ mostrar[i] + ` </p>`;

                  if (ob == "Maximize "){
                  slack = slack + "Si se incluye una unidad mas de este recurso el funcional aumentaria en " + mostrar[i] + "<br>"+"<br>";
                  }else{
                    slack = slack + "Si se incluye una unidad mas de este recurso el funcional disminuiria en " +mostrar[i] + "<br>"+"<br>";
                  }
                }
                j += 1;
              }
            }
              document.getElementById("costoOportunidad").innerHTML = cOportrunidad;
              document.getElementById("valorSlack").innerHTML = slack;
            }
            for( var i=0; i<=sol.length; i++){
              if(sol[i] == 0){
                control = control + 1;
              }
            }
            if (cantidadCero > cantidadRestriccion){
              document.getElementById("situacion").innerHTML = "El problema tiene Multiples soluciones";
            }else{
              if (control > cantidadVariable){
                document.getElementById("situacion").innerHTML = "El problema tiene una Solución degenerada";
                
                }
            }            
          }

          //Para modo coeficiente
          function showFilaZCoef( filafinalZ, arrayVariables, ob, str, rest, sol) {
            var posicion = filafinalZ.length; //tamaño
            var mostrar = filafinalZ[posicion-1]; // me devuelve el ultima fila
            var cOportrunidad = "";
            var slack = "";
            var cantidadVariable = arrayVariables.length; // cuando tengamos el id de la cantidad de variables se le puede colocar aca
            var j = 1;
            var cantidadRestriccion = rest.length;
            var cantidadCero = 0;
            console.log(sol);
            if(str == 4){
              var control = 0;
            for (var i=1; i < ((mostrar.length) -2); i++){
              if(i<= cantidadVariable){
              if(mostrar[i] == 0){
                cOportrunidad = cOportrunidad + `<p class="font-weight-bold">Producto`+[i]+":"+" "+ "No tiene costo de oportunidad"+` </p>`;
                cOportrunidad = cOportrunidad + "Este producto forma parte de la solución" + "<br>"+"<br>";
                
                cantidadCero += 1 ; 
              }else{
                cOportrunidad = cOportrunidad + `<p class="font-weight-bold">Producto`+[i]+":"+" "+ mostrar[i] +` </p>`;
                if (ob == "Maximize "){
                  cOportrunidad = cOportrunidad + "Si se incluye este producto en la solución el funcional disminuiria en: " + mostrar[i] + "<br>"+"<br>";
                }else{
                  cOportrunidad = cOportrunidad + "Si se incluye este producto en la solución el funcional aumentaria en:  " + mostrar[i] + "<br>"+"<br>";
                }
               }
               
              }else{

              if( mostrar[i] == 0){
                slack = slack + `<p class="font-weight-bold">Recurso`+ j +":"+" "+"No tiene valor marginal" + ` </p>`;

                slack = slack + "Existe un sobrante de " + sol[i-1] +" de este recurso" + "<br>"+"<br>";
                cantidadCero += 1 ;
              }else{
                slack = slack + `<p class="font-weight-bold">Recurso`+ j +":"+" "+ mostrar[i] + ` </p>`;

                if (ob == "Maximize "){
                slack = slack + "Si se incluye una unidad mas de este recurso el funcional aumentaria en " + mostrar[i] + "<br>"+"<br>";
                }else{
                  slack = slack + "Si se incluye una unidad mas de este recurso el funcional disminuiria en " +mostrar[i] + "<br>"+"<br>";
                }
              }
              j += 1;
            }
          }
            document.getElementById("costoOportunidadCoef").innerHTML = cOportrunidad;
            document.getElementById("valorSlackCoef").innerHTML = slack;
          }
          for( var i=0; i<=sol.length; i++){
            if(sol[i] == 0){
              control = control + 1;
            }
          }
          if (cantidadCero > cantidadRestriccion){
            document.getElementById("situacioN").innerHTML = "El problema tiene Multiples soluciones";
          }else{
            if (control > cantidadVariable){
            document.getElementById("situacioN").innerHTML = "El problema tiene una Solución degenerada";
            console.log(control); 
            }
          }
        }

  function CrearRelleno(){
    var cantidadVariable = document.getElementById("cantVariable").value;
    var cantidadRestricciones= document.getElementById("cantRestriccion").value;
    var DivRestricciones = "";
    var Divfuncion = "";
    
    Divfuncion += `
          <div class="form-group row">
            <label for="funcion" style="
              padding-right: 10px;
          ">Función:     </label>` + '       Z=    ';
    for (var i = 1; i <= (cantidadRestricciones) ; i++) {//filas
      DivRestricciones += ' <div  class="form-group row">';
      for (var j = 1; j <= (cantidadVariable) ; j++) {//colmunas
        DivRestricciones += `<input type="text" id='C${i}${j}' class="form-control" size="5">
                 X`+[j]+'     + '; //formateo de texto se llama
      }
      DivRestricciones = DivRestricciones.slice(0,-2); //dame todo el string menos el ultimo caracter
      DivRestricciones += `<select class="custom-select d-block w-20"  id='opcion${i}'>
            <option value ="menor_igual">≤</option>
            <option value="mayor_igual">≥</option>
            <option value="igual">=</option>
            </select>
            <input type="text" id='B${i}' class="form-control" size="5" >`;
      DivRestricciones += '</div>';
    }
    for (var j = 1; j <= (cantidadVariable) ; j++) {//columnas
        Divfuncion += `<input type="text" id='Z${j}' class="form-control" size="5">  
                      X`+[j]+'   + ';
      }
    Divfuncion = Divfuncion.slice(0,-2);
    
    /*Divfuncion += `</div>
    <p></p>
    <button type="button" class="btn btn-outline-info"  onClick="mostrar()">Continuar</button>`;*/
    document.getElementById("FormRestricciones").innerHTML = DivRestricciones;
    document.getElementById("FormFuncion").innerHTML = Divfuncion;
    
  }

  //Formateo las restricciones
   function mostrar() {
    var cantidadVariable = document.getElementById("cantVariable").value;
    var cantidadRestricciones= document.getElementById("cantRestriccion").value;
    var TxtRestricciones = "";
   
    //este FOR toma todo lo de las restricciones//
    for (var i = 1; i <= (cantidadRestricciones) ; i++) {//filas
      for (var j = 1; j <= (cantidadVariable) ; j++) {//colmunas
        var verificacion = 0;
        var coeficiente = document.getElementById(`C${i}${j}`).value;
        if (coeficiente != ""){
          if((coeficiente < 0) && (j == 1)){
            coeficiente = (coeficiente*-1);
            TxtRestricciones += '-' + coeficiente + 'X'+ [j];

          }else{
            if(coeficiente < 0){
              coeficiente = (coeficiente*-1);
              TxtRestricciones += ' - ' + coeficiente + 'X'+ [j];
              verificacion = 1;
            }
            if((coeficiente > 0) && (j == 1)){
              TxtRestricciones += coeficiente + 'X'+ [j];

            }else{
              if(verificacion == 0){
              TxtRestricciones += ' + ' + coeficiente + 'X'+ [j];
              }
            }

          }
        }
        
      }
      var opcion = document.getElementById(`opcion${i}`).value;
      switch (opcion){
        case 'menor_igual':
        opcion = ' <= ';
        break;
        case 'mayor_igual':
        opcion = ' >= ';
        break;
        case 'igual':
        opcion = ' = '
        break;
      }
      
      var valor = document.getElementById(`B${i}`).value;
      TxtRestricciones += opcion + valor;
      TxtRestricciones += "\n";
    }
    
    TxtRestricciones = TxtRestricciones.slice(0,-1);
  
    //console.log(TxtRestricciones);
    return TxtRestricciones;
  }
