function showExamples() {
      document.getElementById("inputarea").value=exampleStr[lp_demo_exampleNumber%exampleStr.length];
      lp_demo_exampleNumber++;
    }

    function clearAll() {
      document.getElementById("inputarea").value="";
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
      //console.log(str); este seria el lo que me da z y x1, x2
    }

    function showFilaZ( filafinalZ) {
      var posicion = filafinalZ.length; //tamaño
      var mostrar = filafinalZ[posicion-1]; // me devuelve el ultima fila
      var cOportrunidad = "";
      var slack = "";
      var cantidadVariable = 2; // cuando tengamos el id de la cantidad de variables se le puede colocar aca
      for (var i=1; i < ((mostrar.length) -2); i++){
        if(i<= cantidadVariable){
        cOportrunidad = cOportrunidad + "Producto "+[i]+":"+" "+ mostrar[i] + "<br>";
        }else{
        slack = slack +" "+ mostrar[i] + "<br>";
        }
      }
        
      document.getElementById("costoOportunidad").innerHTML = cOportrunidad;
      document.getElementById("valorSlack").innerHTML = slack;
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

     function TxtRestriccionesolv() {
    var ob = document.getElementById("objetivo").value; //variable ob toma el valor del cuadro de texto objetivo
    var f = document.getElementById("funcion").value; //variable f toma el valor del cuadro de texto funcion
    var r = document.getElementById("TxtRestriccionestriccion").value; //variable r toma el valor del cuadro de texto TxtRestriccionestriccion
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
          finally{showOutput( lp_trace_string );showSolution( Q.solutionToString() ); showFilaZ(filaZ)} //muestra la solución como string, también los pasos intermedios
  }
  
  function CrearRelleno(){
    var cantidadVariable = document.getElementById("cantVariable").value;
    var cantidadRestricciones= document.getElementById("cantRestriccion").value;
    var DivRestricciones = "";
    var Divfuncion = "";
    Divfuncion += `<center>
        <div class="col-md-3 mb-3">
          <label for="objetivo">¿Cuál es el objetivo de la función?</label>
            <select class="custom-select d-block w-100" id="objetivo">
            <option value ="Maximizar">Maximizar</option>
            <option value="Minimizar">Minimizar</option>
            </select>
          </div>
          </center>
          <div class="form-group row">
            <label for="funcion">Función:</label>` + 'Z=';
    for (var i = 1; i <= (cantidadRestricciones) ; i++) {//filas
      DivRestricciones += ' <div  class="form-group row">';
      for (var j = 1; j <= (cantidadVariable) ; j++) {//colmunas
        DivRestricciones += `<input type="text" id='C${i}${j}' class="form-control" >
                 X`+[j]+' + '; //formateo de texto se llama
      }
      DivRestricciones = DivRestricciones.slice(0,-2); //dame todo el string menos el ultimo caracter
      DivRestricciones += `<select class="custom-select d-block w-20"  id='opcion${i}'>
            <option value ="menor_igual">≤</option>
            <option value="mayor_igual">≥</option>
            <option value="igual">=</option>
            </select>
            <input type="text" id='B${i}' class="form-control" >`;
      DivRestricciones += '</div>';
    }
    for (var j = 1; j <= (cantidadVariable) ; j++) {//columnas
        Divfuncion += `<input type="text" id='Z${j}' class="form-control" >  
                      X`+[j]+' + ';
      }
    Divfuncion = Divfuncion.slice(0,-2);
    Divfuncion += `</div>
    <p></p>
    <button type="button" class="btn btn-outline-info"  onClick="mostrar()">Continuar</button>`;
    document.getElementById("FormRestricciones").innerHTML = DivRestricciones;
    document.getElementById("FormFuncion").innerHTML = Divfuncion;
  }

  function mostrar() {
    var cantidadVariable = document.getElementById("cantVariable").value;
    var cantidadRestricciones= document.getElementById("cantRestriccion").value;
    var TxtRestricciones = "";
    var TxtFuncion = "";
    //este FOR toma todo lo de las restricciones//
    for (var i = 1; i <= (cantidadRestricciones) ; i++) {//filas
      for (var j = 1; j <= (cantidadVariable) ; j++) {//colmunas
        var coeficiente = document.getElementById(`C${i}${j}`).value;
        TxtRestricciones += coeficiente + 'X'+ [j] +' + ';
      }
      TxtRestricciones = TxtRestricciones.slice(0,-2);
      var opcion = document.getElementById(`opcion${i}`).value;
      switch (opcion){
        case 'menor_igual':
        opcion = '≤ ';
        break;
        case 'mayor_igual':
        opcion = '≥ ';
        break;
        case 'igual':
        opcion = '= '
        break;
      }
      var valor = document.getElementById(`B${i}`).value;
      TxtRestricciones += opcion + valor + "<br>";
    }
    //este FOR toma todo lo del Z//
    for (var j = 1; j <= (cantidadVariable) ; j++) {//filas
      var Zi = document.getElementById(`Z${j}`).value;
      TxtFuncion += Zi + 'X'+ [j] +' + ';
    }
    TxtFuncion = TxtFuncion.slice(0,-2);
    document.getElementById("funcion").innerHTML = TxtFuncion;
    document.getElementById("restriccion").innerHTML = TxtRestricciones;
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