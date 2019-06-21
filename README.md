# simplex
Este solucionador de problemas de programación lineal permite ingresar un problema en español o inglés, luego lo analiza y lo resuelve. Para verlo en acción, abrir el archivo demo en un navegador.

## Para usarlo en un código propio
Usar el solucionador involucra cuatro pasos:

1. Crear un objeto lpProblem y especificar el problema de PL a resolver.
2. Fijar banderas describiendo el tipo de problema a resolver o el tipo de salida que se quiere.
3. Llamar a solve().
4. Recuperar la solución.

### Creando un lpProblem
Un nuevo objeto lpProblem se crea con
```
p = new lpProblem();
```
El constructor toma como argumento opcional, otro lpProblem para copiar. Si no se copia un objeto existente, el próximo paso es especificar el problema de PL a resolver. Esto se puede hacer de una de las siguientes maneras:

#### Especificar el problema de PL como string.

Establecer `p.problemStr` como un problema completo de PL, dado como string. El string debe tener la forma
```
Maximizar <objetivo linear> sujeto a
<restricciones lineales separadas por comas o saltos de línea>
```
`Maximizar` puede ser reemplazado por `minimizar` y puede usarse inglés también. Si se desea restringir una o más variables a valores enteros, se debe agregar lo siguiente al final del string:
```
integer <lista de variables separadas por comas>
```
Especificar expresiones lineales usando yuxtaposición para la multiplicación, es decir "2x + 3y", no "2*x+3*y". Usar "<=" y ">=" para especificar inecuaciones. La función objetivo puede ser especificada como expresión lineal o como una ecuación declarando el nombre de la función objetivo, de la forma "p = 2x + 3y". Las restricciones deben tener la forma "<expresión lineal> <= <número>" donde la igualdad también puede ser ">=" o "=". No colocar comas en los números (afecta al análisis).

#### Especificar el problema de LP fijando las propiedades de objetivo y restricciones.
- Fijar `p.objective` a un string representando la función objetivo, de la forma `[max|min]imizar [var =] <expresión lineal>`. 
- Fijar `p.constraints` a un arreglo de strings representando las restricciones.
- Si se está resolviendo un problema entero o mixto, fijar `p.isIntegral` a `true` y fijar `p.integerUnknowns` a un arreglo de nombres de variables que deben ser restringidas a valores enteros.

### Poniendo banderas
- `p.mode` puede tomar uno de los siguientes valores
  - `lp_Integral` para que todas las tablas tengan entradas enteras y salidas fraccionales.
  - `lp_Fraction` para que todas las tablas tengan entradas fraccionales y salidas también dadas como fracción.
  - `lp_Decimal` para que las tablas y soluciones usen notación decimal.
- `p.showArtificialVariables` por default está en `false`, en cuyo caso las variables de slack y superávit no se muestran como parte de las soluciones. Si se fija a `true`, estas variables se presentan en las soluciones.
- `p.sigDigits` es el número de dígitos significativos a mostrar en modo decimal en las entradas de las tablas y en soluciones. Por default queda en 6.
- `lp_verboseLevel` es una variable global que controla lo que se guarda en el string `lp_trace_string` mientras el problema está siendo resuelto. El default es no guardar nada. Si `lp_verboseLevel = lp_verbosity_tableaus`, se guardan todas las tablas intermedias. Si `lp_verboseLevel = lp_verbosity_solutions` entonces todas las tablas y las correspondientes soluciones básicas se guardan. El string guardado es HTML, adecuado para insertar en un `<div>`, por ejemplo, para mostrar en una página web.
- `lp_reportErrorsTo` es un string global que controla como se reportan los errores. Si está vacío (por default lo está), los errores no se reportan. Si se fija a `"alert"`, los errores causan alertas que son avisadas. Si se fija al ID de un elemento HTML, los errores se insertan en dicho elemento en la página.

### Llamando a `solve()`
Una vez que el problema está establecido y las banderas puestas correctamente, , llamar a `p.solve()`, que no toma argumentos. Si hay algún problema con la forma en que se planteó el problema, puede generar un error, que será un string describiendo el problema. El string estará también disponible como `p.error`.

### Recuperando la solución
Luego de llamar a `p.solve()`, checkear `p.status`, que será `lp_optimal` si se encontró una solución óptima, o `lp_no_solution` si no hubo solución. En este último caso, la propiedad `p.message` contiene un string indicando por qué no se encontró solución.

Asumiendo que se encontró una solución, `p.tableaus` será un arreglo de todas las tablas generadas por el método simplex (ver Tablas más abajo para más información acerca de las tablas y métodos para mostrarlas de forma correcta) y `p.solutions` será un arreglo de soluciones, siendo cada una un arreglo de valores para las variables. La propiedad `p.unknowns` is an array giving the names of the unknowns in the order in which the values appear in the solutions.

To get the solutions as nicely formatted strings, call one of the following:

- `p.solutionToString()` returns a string showing the solution of the problem, using the settings of `p.showArtificialVariables` and `p.mode`.
- `p.lastSolutionToString()` is used internally to return the basic solution from the last tableau, which will not necessarily be the solution to the problem if doing integer or mixed programming.
- `p.formatUnknowns ( includeArtificalVariables )` returns an array with the names of the unknowns in the order used in the following functions. The optional argument tells whether to include the slack and surplus variables (default: `false`).
- `p.formatLastSolution ( includeArtificalVariables, mode )` returns the solution of the problem as an array of strings giving the values of the variables in the order specified in `p.unknowns`. The optional arguments tell whether to include the artificial variables (default: `false`) and the mode of solution to show (default: value of `p.mode`).
- `p.formatIntegerSolution ( includeArtificalVariables, mode )` is the corresponding routine you should use if doing integer or mixed programming.
- `p.formatLastObjectiveValue ( mode )` returns a string representing the optimal value of the objective function (for non-integer/mixed programming). The mode is optional, defaulting to `p.mode`.
- `p.formatIntegerObjectiveValue ( mode )` is the corresponding routine to use when doing integer or mixed programming.
- `p.formatSolutions ( includeArtificalVariables, mode )` is similar to `formatLastSolution`, but returns an array of basic solutions, one for each tableau generated by the simplex method.
- `p.formatObjectiveValues ( mode )` is similar to `formatLastObjectiveValue` but returns an array of all the values of the objective function for all of the tableaus.

## Tableaus
The `tableau` class extends `Array`; tableaus are always two-dimensional arrays. The 0th row contains the variable names corresponding to each column and the 0th column contains the currently active variables corresponding to each row. The actual tableau starts with index [1][1], so the matrix itself uses 1-based indexing.

There are three methods added to the `Array` class:

- `pivot ( row, col, sigDigs )` pivots on the entry in `[row][col]` and returns a new tableau. `sigDigs` is used to mitigate subtractive error and should usually be set to something large, like 13.
- `toString ( mode, sigDigs )` returns an ASCII formatted string representing the tableau. It contains no HTML tags and is suitable for showing in `<pre>` tags (but such tags are not part of the string). `mode` is one of `lp_Integral`, `lp_Fraction`, or `lp_Decimal`, and `sigDigs` is used for rounding the entries, so might be something like 6.
- `toHTML ( mode, sigDigs, params )` returns a string of HTML code representing the tableau as a `<table>`. `mode` and `sigDigs` are as for `toString`. `params` is an optional argument: If it has a `cellPadding` property, that is used to set the padding in the `<table>`  (default: 10); if it has a `lineColor` property, that is used to set the color of the lines separating the first and last rows and columns from the rest of the tableau (default: `"black"`).
