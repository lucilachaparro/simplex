// LPdefs.js
//
// definición del objeto lpProblem
// para resolución de problemas de PL usando método simplex
//
// Copyright (C) 2017 Steven R. Costenoble and Stefan Waner

// modos de PL
const lp_Integral = 1;					// resolver usando enteros?
const lp_Fraction = lp_Integral+1;		// usando fracciones?
const lp_Decimal = lp_Fraction+1;		// usando decimales?

// estado de PL
const lp_no_problem = 0;				// no hay problema (aún)
const lp_parsed = lp_no_problem+1;		// problema parseado o leído
const lp_phase1 = lp_parsed+1;			// se terminó la fase I
const lp_phase2 = lp_phase1+1;			// se terminó la fase II
const lp_optimal = lp_phase2+1;			// completamente terminado. no necesariamente la fase 2 para programación entera
const lp_no_solution = lp_optimal+1;	// no hay solución, no continuar

// nivel de verbosidad
const lp_verbosity_none = 0;			// cuánta verbosidad hay que usar? (cuànto "texto" a mostrar)
const lp_verbosity_tableaus = lp_verbosity_none + 1;		// mostrar todas las tablas
const lp_verbosity_solutions = lp_verbosity_tableaus + 1;	// mostrar todas las tablas y soluciones intermedias

// globales
var lp_verboseLevel = lp_verbosity_none;
var lp_reportErrorsTo = "";  			// vacío para reporte estándar, "alerta" o id de un elemento html
var lp_trace_string = "";				// string que contiene las tablas, soluciones, etc.

// mensajes de error (deberían ser reasignables por un contenedor de orden superior, pero de momento son constantes)
var lp_noLPErr = "No se ingresó problema de PL";
var lp_IllegCharsErr = "Caracteres ilegales";
var lp_UnspecMaxMinErr = "No se especificó max o min";
var lp_noRelationConstrErr = "Restricciones deben contener '=', '<=', or '>='";
var lo_tooManyTabloeausErr = "Número de tablas excede ";
var lp_emptyFeasibleRegionErr = "No hay solución, región factible vacía";
var lp_noMaxErr = "No hay valor máximo, la función puede ser arbitrariamente grande (no está acotada)";
var lp_noMinErr = "No hay valor mínimo, la función puede ser arbitrariamente grande en negativo"; //este no lo entiendo, cómo es cuando no se halla mínimo?
var lp_phase2TooSoonErr = "Intentando hacer fase II cuando la fase I no está completa";
var lp_badExprErr = "Algo es incorrecto en la expresión ";
var lp_illegalCoeffErr = "Coeficiente ilegal de ";
var lp_inExprErr = " en la expresión\n";
var lp_objNotSetErr = "Objetivo no definido en extractUnknowns";
var lp_noNiceSolutionErr = "No existe solución con los enteros deseados"



// Definiendo el lpProblem
// Hacer uno de los siguientes:
//   1) Proveer un lpProblem existente cuando se construye el objeto
//   2) Poner en problemStr un problema de PL completo
//		Para problemas de entera/mixta, agregar "integer x,y,x" como la última línea, con variables que deben ser enteras
//   3) Definir el objetivo con la función objetivo, con un string de la forma:
//         "[max|min]izar var = expresión lineal" y
//      Definir restricciones con un array de restricciones de la forma
//         "expresión linear <=, >=, o = número"
//   4) Definir maximize, objectiveName, unkowns, y numActualUnknowns, y
//      definir tableaus como un array de un elemento conteniendo la primer tabla
//
// Una vez que el problema está definido, llamar a solve().
//
// El éxito lo indica this.status, que puede ser lp_optimal o lp_no_solution.
//
// Para problemas ordinarios de PL, las soluciones, icluyendo todos los pasos intermedios, se encuentran en
// 		this.objectiveValues y this.solutions, con tablas en this.tableaus
//		Usar la rutina formatXXX() apropiada para dejarlos bien formateados.
//
// Para problemas de programación entera, la solución está en
// 		this.integerSolution y this.integerObjValue.
//		Usar formatIntegerXXX() para dejarlo bien formateado.


class lpProblem
{
	constructor ( problem = null ) {
			//expresión lineal a optimizar
		this.objective = (problem != null && typeof problem.objective == 'string') 
							? problem.objective : "";			

			// arreglo de restricciones, expresión lineal <=, >=, o = número
		this.constraints = (problem != null && Array.isArray(problem.constraints)) 
							? problem.constraints.slice() : [];

			// programación entera/mixta?
		this.isIntegral = (problem != null && typeof problem.isIntegral == 'boolean') 
							? problem.isIntegral : false;

			// resolver enteros, fracciones, o decimales?
		this.mode = (problem != null && typeof problem.mode == 'number')
							? problem.mode : lp_Decimal;

			// falso para minimizar
		this.maximize = (problem != null && typeof problem.maximize == 'boolean') 
							? problem.maximize : true;

			// provisto con el string del problema o generado
		this.objectiveName = (problem != null && typeof problem.objectiveName == 'string') 
							? problem.objectiveName : "Obj";

			// arreglo de nombres de variables/incógnitas (incluyendo variables de slack/superávit)
		this.unknowns = (problem != null && Array.isArray(problem.unknowns)) 
							? problem.unknowns.slice() : [];

			// arreglo de variables/incógnitas para las que se necesitan valores enteros (programación mixta)
		this.integerUnknowns = (problem != null && Array.isArray(problem.integerUnknowns)) 
							? problem.integerUnknowns.slice() : [];
			// mostrar o no los valores de las variables de slack/superávit en la solución
		this.showArtificialVariables = false;
			// matriz inicial del sistema, estilo Ax >= b.
			// no necesita ser copiada, no cambia si ya está rellenada
		this.systemMatrix = (problem != null && Array.isArray(problem.systemMatrix))
							? problem.systemMatrix : [];

		this.systemRowIsStarred = (problem != null && Array.isArray(problem.systemRowIsStarred))
							? problem.systemRowIsStarred : [];

			// de igual forma para los lado derecho de las restricciones
		this.constraintRHS = (problem != null && Array.isArray(problem.constraintRHS))
							? problem.constraintRHS : [];

			// similarmente para la función objetivo
		this.objectiveCoeffs = (problem != null && Array.isArray(problem.objectiveCoeffs))
							? problem.objectiveCoeffs : [];

			// restricciones adicionales usadas en programación entera, indexadas como integerUnknowns
		this.integerMins = (problem != null && Array.isArray(problem.integerMins))
							? problem.integerMins.slice() : [];
		this.integerMaxs = (problem != null && Array.isArray(problem.integerMaxs))
							? problem.integerMaxs.slice() : [];

			// cuántas incógnitas reales?
		this.numActualUnknowns = (problem != null && typeof problem.numActualUnknowns == 'number') 
							? problem.numActualUnknowns : 0;

		this.rowIsStarred = [];			// elemento en posición i es verdadero si la fila está "starred" (destacado?)

		this.tableaus = [];				// arreglo de tablas
		this.tableauDimensions = [];	// número de filas, número de columnas
		this.maxNumTableaus=50;			// arbitrario

		this.status = lp_no_problem;	// ya se llegó a la solución?

		this.solutions = [];			// arreglo de soluciones intermedias
		this.objectiveValues = [];		// arreglo de valores objetivo intermedios
		this.error = "";				// mensaje de error para problema definido erróneamente, etc
		this.message = "";				// mensaje cuando no hay solución por la razón que sea
		
		this.integerSolution = [];		// usada para devolver la solución de un problema de PL entera
		this.integerObjValue = 0;
		
		this.problemStr = (problem != null && typeof problem == 'string') ? problem : "";
		
		// settings
		this.maxSigDigits = 13;			// try to push to 16 but issues with roundSigDig which internally uses three more
		this.sigDigits = 6;				// dígitos significativos, especificados por el usuario para redondeo en tablas y resultados
		
	}
	

	// Funciones
	
	solve ( ) {}								// resolver, retorna true si lo hace con éxito

	formatObjectiveValues ( mode = 0 ) {}			// retorna arreglo de valores objetivo, en forma correcta

	formatLastObjectiveValue ( mode = 0 ) {}		// lo mismo, solo el último valor										

											// retorna arreglo de incógnitas, con o sin las variables de slack	
	formatUnknowns ( includeSlackVariables = false ) {}

											// usar para obtener las soluciones, en forma correcta,
											// con o sin variables de slack
											// modo por default dado por this.mode
											// retorna un arreglo de arreglos, cada uno en orden de incógnitas
	formatSolutions ( includeSlackVariables = false, mode = 0 ) {}
	
											// lo mismo, pero solo la última solución, no los pasos intermedios
	formatLastSolution ( includeSlackVariables = false, mode = 0 ) {}

											// usar para obtener soluciones enteras en caso de PLE
	formatIntegerObjectiveValue ( mode = 0) {}
	formatIntegerSolution ( includeSlackVariables = false ) {}

											// retorna string con los valores de las variables en la última solución o solución entera,
											// usando especificaciones de showArtificialVariables y mode
	solutionToString () {}
											// lo mismo, pero muestra la última solución, incluso en caso de PLE
}


// la clase tableau (tabla) es una subclase de Array
// Las columnas y filas '0' contienen los encabezados
// Los valores de la tabla en si están indexados desde [1][1]
//
class tableau extends Array
{
	constructor ( arr = [] ) {			// construye a partir de un arreglo o tabla 2D dado
		super();
		for ( var i = 0; i < arr.length; i++ )
			this[i] = arr[i].slice();
	}

	pivot ( pRow, pCol, sigDigs ) {}	// pivot, retorna una nueva tabla (cálculos algebraicos)
	
	toString ( theMode, sigDigs ) {}	// retorna un string formateado en ascii representando la tabla
	
	toHTML ( theMode, sigDigs , params) {}		// retorna una tabla HTML representando la tabla
}
