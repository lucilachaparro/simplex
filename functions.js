    function showExamples() {
      document.getElementById("funcion").value=exampleObj[lp_demo_exampleNumber%exampleObj.length];
      document.getElementById("restriccion").value=exampleRest[lp_demo_exampleNumber%exampleRest.length];
      lp_demo_exampleNumber++;

    }

    function clearAll() {
      document.getElementById("funcion").value="";
            document.getElementById("restriccion").value="";
      document.getElementById("solutionout").innerHTML="Una solución óptima (o mensaje) aparecerá aquí.";
      document.getElementById("outputarea").innerHTML="Las tablas del Método Simplex apareceran aquí.";
    }

    function clearOutput() {
      document.getElementById("outputarea").innerHTML="Las tablas del Método Simplex apareceran aquí.";
    }
    
    function showOutput( str ) {
      document.getElementById("outputarea").innerHTML = str;
    }
    
    function showSolution( str ) {
      document.getElementById("solutionout").innerHTML = str;
    }

    function adjustAccuracy() {
      var inAcc=parseInt(document.getElementById("accuracyDig").value);
      if ( (inAcc<=0)||(inAcc>13)||(isNaN(inAcc)) ) {
        alert("Must be in integer in the range 0-13")
        document.getElementById("accuracyDig").value=6;
      }
      else lp_demo_accuracy = inAcc;
    }

    function setMode() {
      lp_demo_mode=parseInt(document.querySelector('input[name="modepicker"]:checked').id); // ids are conveniently set to equal the mode
    }

    function setShowTabl() {
      var theId = document.querySelector('input[name="displaytabl"]:checked').id;
      switch ( theId ) {
        case "yesTabl":   lp_demo_verboseLevel = lp_verbosity_tableaus; break;
        case "andSolns":  lp_demo_verboseLevel = lp_verbosity_solutions; break;
        default:      lp_demo_verboseLevel = lp_verbosity_none; break;
      }
//      lp_demo_verboseLevel = (theId=="yesTabl") ? lp_verbosity_tableaus : lp_verbosity_none;
    }

        function Resolv() {
              var ob = document.getElementById("objetivo").value; //variable ob toma el valor del cuadro de texto objetivo
              var f = document.getElementById("funcion").value; //variable f toma el valor del cuadro de texto funcion
              var r = document.getElementById("restriccion").value; //variable r toma el valor del cuadro de texto restriccion

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
                    finally{showOutput( lp_trace_string );showSolution( Q.solutionToString() ); showFilaZ(filaZ, Q.formatUnknowns(), ob, Q.status, Q.constraints)} //muestra la solución como string, también los pasos intermedios
            }

            

	// FILA DEL Z (Muestra los costo de oportunidad y la slack)
            function showFilaZ( filafinalZ, arrayVariables, ob, str, rest) {
              var posicion = filafinalZ.length; //tamaño
              var mostrar = filafinalZ[posicion-1]; // me devuelve el ultima fila
              var cOportrunidad = "";
              var slack = "";
              var cantidadVariable = arrayVariables.length; // cuando tengamos el id de la cantidad de variables se le puede colocar aca
              var j = 1;
              var cantidadRestriccion = rest.length;
              var cantidadCero = 0;
              console.log(mostrar);
              if(str == 4){
              for (var i=1; i < ((mostrar.length) -2); i++){
                if(i<= cantidadVariable){
                //cOportrunidad = cOportrunidad + "Producto "+[i]+":"+" "+ mostrar[i] + "<br>";
                cOportrunidad = cOportrunidad + `<p class="font-weight-bold">Item`+[i]+":"+" "+ mostrar[i] +` </p>`;
                if(mostrar[i] == 0){
                  cOportrunidad = cOportrunidad + "Este item forma parte de la solución" + "<br>"+"<br>";
                  cantidadCero += 1 ; 
                }else{
                  if (ob == "Maximize "){
                    cOportrunidad = cOportrunidad + "Si se incluye una unidad mas de este item el funcional disminuiria en: " + mostrar[i] + "<br>"+"<br>";
                  }else{
                    cOportrunidad = cOportrunidad + "Si se incluye una unidad mas de este item el funcional aumentaria en:  " + mostrar[i] + "<br>"+"<br>";
                  }
                 }
                 
                }else{
                slack = slack + `<p class="font-weight-bold">Recurso`+ j +":"+" "+ mostrar[i] + ` </p>`;

                if( mostrar[i] == 0){
                  slack = slack + "Este item es escaso" + "<br>";
                  cantidadCero += 1 ;
                }else{
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
            if (cantidadCero > cantidadRestriccion){
              document.getElementById("situacion").innerHTML = "El problema tiene Multiples soluciones";
            }
          }


