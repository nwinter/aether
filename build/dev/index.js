(function() {
  var Range, clearMarkers, clearOutput, demoShowOutput, editors, examples, grabDemoCode, lastAetherInput, lastJSInputAether, lastProblems, loadExample, markerRanges, oldConsoleLog, populateExamples, showFlow, showMetrics, showProblems, watchForCodeChanges;

  editors = [];

  Range = ace.require("ace/range").Range;

  $(function() {
    $(".ace-editor-wrapper").each(function() {
      var editor;
      editor = ace.edit(this);
      editor.setTheme("ace/theme/xcode");
      editor.getSession().setUseWorker(false);
      editor.getSession().setMode("ace/mode/javascript");
      editor.getSession().getDocument().on("change", watchForCodeChanges);
      return editors.push(editor);
    });
    populateExamples();
    if (top.location.href.match('file:')) {
      return $('a[href="#demo"]').tab('show');
    }
  });

  grabDemoCode = function() {
    return editors[0].getValue();
  };

  markerRanges = [];

  clearMarkers = function() {
    var editor, markerRange, _i, _len;
    editor = editors[0];
    for (_i = 0, _len = markerRanges.length; _i < _len; _i++) {
      markerRange = markerRanges[_i];
      markerRange.start.detach();
      markerRange.end.detach();
      editor.getSession().removeMarker(markerRange.id);
    }
    return markerRanges = [];
  };

  lastProblems = null;

  showProblems = function(aether) {
    var allProblems, ann, annotations, editor, el, level, problem, problemIndex, problems, session, text, treema, treemaOptions, worst, wrapper, _ref;
    if (_.isEqual(aether.problems, lastProblems)) {
      return;
    }
    lastProblems = aether.problems;
    el = $("<div></div>");
    for (level in aether.problems) {
      problems = aether.problems[level];
      for (problemIndex in problems) {
        problem = problems[problemIndex];
        if (problem.serialize) {
          problems[problemIndex] = problem.serialize();
        }
      }
    }
    treemaOptions = {
      readOnly: true,
      data: aether.problems,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          errors: {
            type: "array",
            maxItems: aether.problems.errors.length
          },
          warnings: {
            type: "array",
            maxItems: aether.problems.warnings.length
          },
          infos: {
            type: "array",
            maxItems: aether.problems.infos.length
          }
        }
      }
    };
    treema = TreemaNode.make(el, treemaOptions);
    treema.build();
    $("#aether-problems").empty().append(el);
    treema.open(2);
    editor = editors[0];
    session = editor.getSession();
    annotations = [];
    allProblems = aether.getAllProblems();
    for (problemIndex in allProblems) {
      problem = allProblems[problemIndex];
      if (((_ref = problem.ranges) != null ? _ref[0] : void 0) == null) {
        continue;
      }
      ann = {
        row: problem.ranges[0][0].row,
        column: problem.ranges[0][0].col,
        raw: problem.message,
        text: problem.message,
        type: problem.level || "error"
      };
      annotations.push(ann);
    }
    session.setAnnotations(annotations);
    wrapper = $("#worst-problem-wrapper").empty();
    worst = allProblems[0];
    if (worst) {
      text = worst.type + " " + worst.level;
      text += ": " + worst.message;
      wrapper.text(text);
      wrapper.toggleClass("error", worst.level === "error");
      wrapper.toggleClass("warning", worst.level === "warning");
      return wrapper.toggleClass("info", worst.level === "info");
    }
  };

  showFlow = function(aether) {
    var el, end, key, markerRange, seen, session, start, state, states, text, treema, treemaOptions, _i, _j, _len, _len1, _ref, _ref1, _ref2, _ref3;
    clearMarkers();
    $("#aether-flow").empty();
    if (!((_ref = aether.flow) != null ? _ref.states : void 0)) {
      return;
    }
    text = editors[0].getValue();
    session = editors[0].getSession();
    seen = {};
    _ref1 = aether.flow.states;
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      states = _ref1[_i];
      _ref2 = states.statements;
      for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
        state = _ref2[_j];
        key = state.range[0].ofs + '-' + state.range[1].ofs;
        if (seen[key] > 3) {
          continue;
        }
        if (seen[key] == null) {
          seen[key] = 0;
        }
        ++seen[key];
        _ref3 = state.range, start = _ref3[0], end = _ref3[1];
        markerRange = new Range(start.row, start.col, end.row, end.col);
        markerRange.start = session.doc.createAnchor(markerRange.start);
        markerRange.end = session.doc.createAnchor(markerRange.end);
        markerRange.id = session.addMarker(markerRange, "executed", "text");
        markerRanges.push(markerRange);
      }
    }
    el = $("<div></div>");
    treemaOptions = {
      readOnly: true,
      data: aether.flow,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          states: {
            type: "array"
          }
        }
      }
    };
    treema = TreemaNode.make(el, treemaOptions);
    treema.build();
    $("#aether-flow").append(el);
    return treema.open(3);
  };

  showMetrics = function(aether) {
    var el, treema, treemaOptions;
    $("#aether-metrics").empty();
    if (!aether.metrics) {
      return;
    }
    el = $("<div></div>");
    treemaOptions = {
      readOnly: true,
      data: aether.metrics,
      schema: {
        type: "object"
      }
    };
    treema = TreemaNode.make(el, treemaOptions);
    treema.build();
    $("#aether-metrics").append(el);
    return treema.open(1);
  };

  demoShowOutput = function(aether) {
    showProblems(aether);
    editors[2].setValue(aether.pure);
    editors[2].clearSelection();
    showMetrics(aether);
    return showFlow(aether);
  };

  clearOutput = function() {
    $("#aether-console").text("");
    $("#aether-metrics").empty();
    $("#aether-flows").empty();
    return $("#aether-problems").empty();
  };

  lastJSInputAether = new Aether();

  lastAetherInput = "";

  watchForCodeChanges = function() {
    var aetherInput, code;
    aetherInput = editors[1].getValue();
    code = grabDemoCode();
    if (!lastJSInputAether.hasChangedSignificantly(code, lastJSInputAether.raw) && aetherInput === lastAetherInput) {
      return;
    }
    clearOutput();
    lastAetherInput = aetherInput;
    lastJSInputAether.transpile(code);
    return eval(aetherInput);
  };

  watchForCodeChanges = _.debounce(watchForCodeChanges, 1000);

  oldConsoleLog = console.log;

  console.log = function() {
    var ac, newText, oldText;
    oldConsoleLog.apply(console, arguments);
    ac = $("#aether-console");
    oldText = ac.text();
    newText = oldText + Array.prototype.slice.call(arguments).join(" ") + "\n";
    return ac.text(newText).scrollTop(ac.prop('scrollHeight'));
  };

  populateExamples = function() {
    var example, exampleSelect, i, option, _i, _len;
    exampleSelect = $("#example-select");
    for (i = _i = 0, _len = examples.length; _i < _len; i = ++_i) {
      example = examples[i];
      option = $("<option></option>");
      option.val(i).text(example.name);
      exampleSelect.append(option);
    }
    exampleSelect.change(function() {
      return loadExample(parseInt($(this).val()));
    });
    return loadExample(0);
  };

  loadExample = function(i) {
    var ex;
    ex = examples[i];
    editors[0].setValue(ex.code);
    editors[0].clearSelection();
    editors[1].setValue(ex.aether);
    return editors[1].clearSelection();
  };

  examples = [
    {
      name: "Basic",
      code: 'function fib(n) {\n  return n < 2 ? n : fib(n - 1) + fib(n - 2);\n}\nvar chupacabra = fib(Math.ceil(Math.random() * 5))\nthis.say("I want", chupacabra, "gold.");\nreturn chupacabra;',
      aether: 'var thisValue = {say: console.log};\nvar aetherOptions = {\n  problems: {jshint_W040: {level: "ignore"}}\n};\nvar aether = new Aether(aetherOptions);\nvar code = grabDemoCode();\naether.transpile(code);\nvar method = aether.createMethod(thisValue);\naether.run(method);\naether.run(method);\naether.run(method);\ndemoShowOutput(aether);'
    }, {
      name: "Buggy",
      code: 'function distance_squared(from, target) {  // no camelCase\n  if(from.pos)\n    return distance_squared(from.pos, target);  // |from| as Thang\n    if(target.pos)  // weird indentation\n      return distance_squared(from, target.pos);  // |target| as Thang\n  var dx = target.x - from.x; var dy = target.y - from.y;  // bad style: two statements, one line\nreturn dx * dx + dy dy;  // syntax error\n}\n\nvar enemies = getEnemys();  // missing this, also typo in method\nvar nearestEnemy = null  // missing semicolon\nnearestDistance = 9001;  // missing var\nfor(var enemy in enemies) {  // style: somehow warn user that JS loops do not really work like this on arrays?\n  //for(var i = 0; i < enemies.length; ++i) {  // (better method of looping an array)\n  var enemy = enemies[i];\n  var distance = distance_squared(this, enemy);\n  if(distance < nearestDistance) {\n    nearestDistance = distance;\n    nearestEnemy = enemyy;  // typo in local variable\n  }\n//}  // missing curly brace\nthis.markForDeath(nearestEnemy);  // no markForDeath method available in this challenge\nthis.say(nearestEnemy.id, you are going down!);  // missing string quotes, also will have runtime error when nearestEnemy is still null\nnearestEnemy.health = -9001;  // disallowed\nwindow.alert("pwn!");  // nope\ntry {\n  this.die();  // die() is not available, but they are going to handle it, so perhaps it should not be an error?\n}\ncatch (error) {\n  this.say("Could not shuffle mortal coil.");\n}\nthis.  // clearly not done typing\nthis.explode;  // does not do anything because the function is not called\n96;  // no effect\nreturn nearestEnemy;',
      aether: 'var thisValue ={\n  getEnemies: function() { return [{id: "Brack", health: 10, pos: {x: 15, y: 20}}, {id: "Goreball", health: 20, pos: {x: 25, y: 30}}]; },\n  say: console.log,\n  explode: function() { this.say("Exploooode!"); }\n};\nvar aetherOptions = {\n  problems: {\n    jshint_W040: {level: "ignore"},\n    aether_MissingThis: {level: "warning"}\n  },\n  functionName: "getNearestEnemy",\n};\nvar aether = new Aether(aetherOptions);\nvar code = grabDemoCode();\naether.transpile(code);\nvar method = aether.createMethod(thisValue);\naether.run(method);\ndemoShowOutput(aether);'
    }, {
      name: "Yield Conditionally",
      code: '// Try your own code here\nvar x = this.charge();\nthis.hesitate();\nthis.hesitate();\nif(retries)\n  return this.planStrategy(retries - 1);\nelse\n  return this.charge();',
      aether: 'var thisValue = {\n  charge: function() { this.say("attack!"); return "attack!"; },\n  hesitate: function() { this.say("uhh..."); this._aetherShouldYield = true; },\n  say: console.log\n};\nvar aetherOptions = {\n  problems: {\n    jshint_W040: {level: "ignore"},\n    aether_MissingThis: {level: "warning"}\n  },\n  functionName: "planStrategy",\n  functionParameters: ["retries"],\n  yieldConditionally: true,\n};\nvar aether = new Aether(aetherOptions);\nvar code = grabDemoCode();\naether.transpile(code);\nvar method = aether.createMethod(thisValue);\nvar generator = method();\naether.sandboxGenerator(generator);\nvar executeSomeMore = function executeSomeMore() {\n  var result = generator.next();\n  demoShowOutput(aether);\n  if(!result.done)\n    setTimeout(executeSomeMore, 2000);\n};\nexecuteSomeMore();'
    }, {
      name: "Yield Automatically",
      code: 'for (var i = 1; i <= 100; ++i) {\n  this.print([!(i % 3) ? \'fizz\' : void 0] + [!(i % 5) ? \'buzz\' : void 0] || i);\n}',
      aether: 'var thisValue = {\n  print: console.log\n};\nvar aetherOptions = {\n  problems: {\n    jshint_W040: {level: "ignore"}\n  },\n  yieldAutomatically: true\n};\nvar aether = new Aether(aetherOptions);\nvar code = grabDemoCode();\naether.transpile(code);\nvar method = aether.createMethod(thisValue);\nvar generator = method();\naether.sandboxGenerator(generator);\nvar executeSomeMore = function executeSomeMore() {\n  var result = generator.next();\n  demoShowOutput(aether);\n  if(!result.done)\n    setTimeout(executeSomeMore, 25);\n};\nexecuteSomeMore();'
    }, {
      name: "Hacker",
      code: 'var s = \'var x=new XMLHttpRequest();x.open("GET","/auth/whoami",false);x.send();var u=JSON.parse(x.responseText);u.name="Nick!";x=new XMLHttpRequest();x.open("PUT","/db/user/"+u._id,false);x.setRequestHeader("Content-Type","application/json");x.send(JSON.stringify(u));\'\nthis.say("Trying to run hack!");\n(function(){}).__proto__.constructor(s)();\nthis.say("Did we error out?");',
      aether: 'var thisValue = {say: console.log};\nvar aetherOptions = {\n  problems: {jshint_W040: {level: "ignore"}}\n};\nvar aether = new Aether(aetherOptions);\nvar code = grabDemoCode();\naether.transpile(code);\nvar method = aether.createMethod(thisValue);\naether.run(method);\ndemoShowOutput(aether);'
    }, {
      name: "Rectangles",
      code: 'function largestRectangle(grid, bottomY, leftX, width, height) {\n  var coveredRows = [];\n  var shortestCoveredRow = width - leftX;\n  var done = false;\n  for(var y = bottomY; !done && y < height; ++y) {\n    var coveredRow = 0, done2 = false;\n    for(var x = leftX; !done2 && x < leftX + shortestCoveredRow; ++x) {\n      if(!grid[y][x])\n        ++coveredRow;\n      else\n        done2 = true;\n    }\n    if(!coveredRow)\n      done = true;\n    else {\n      coveredRows.push(coveredRow);\n      shortestCoveredRow = Math.min(shortestCoveredRow, coveredRow);\n    }\n  }\n  var maxArea = 0, maxAreaRows = 0, maxAreaRowLength = 0, shortestRow = 0;\n  for(var rowIndex = 0; rowIndex < coveredRows.length; ++rowIndex) {\n    var rowLength = coveredRows[rowIndex];\n    if(!shortestRow)\n      shortestRow = rowLength;\n    area = rowLength * (rowIndex + 1);\n    if(area > maxArea) {\n      maxAreaRows = rowIndex +1;\n      maxAreaRowLength = shortestRow;\n      maxArea = area;\n    }\n    shortestRow = Math.min(rowLength, shortestRow);\n  }\n  return {x: leftX + maxAreaRowLength / 2, y: bottomY + maxAreaRows / 2, width: maxAreaRowLength, height: maxAreaRows};\n}\n\nvar grid = this.getNavGrid().grid;\nvar tileSize = 4;\nfor(var y = 0; y < grid.length - tileSize / 2; y += tileSize) {\n  for(var x = 0; x < grid[0].length - tileSize / 2; x += tileSize) {\n    var occupied = grid[y][x];\n    if(!occupied) {\n      var rect = largestRectangle(grid, y, x, grid[0].length, grid.length);\n      this.addRect(rect.x, rect.y, rect.width, rect.height);\n      this.say("Placed rect " + rect.x + ", " + rect.y + ", " + rect.width + ", " + rect.height + " for " + grid[0].length + ",  " + grid.length + ", " + x + ", " + y);\n      this.wait(0.1);\n      for(var y2 = rect.y - rect.height / 2; y2 < rect.y + rect.height / 2; ++y2) {\n        for(var x2 = rect.x - rect.width / 2; x2 < rect.x + rect.width / 2; ++x2) {\n          grid[y2][x2] = 1;\n        }\n      }\n    }\n  }\n}',
      aether: 'var _canvas = [\n  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],\n  [1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0],\n  [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0],\n  [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0],\n  [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0],\n  [0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0],\n  [0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0],\n  [0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0],\n  [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],\n  [1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0],\n  [1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0],\n  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0],\n  [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0],\n  [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0],\n  [0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0],\n  [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0],\n  [0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],\n  [1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 0],\n  [1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],\n  [1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]\n];\n\nvar thisValue = {\n  getNavGrid: function() { return {grid: _canvas }; },\n  addRect: function() { },\n  say: console.log,\n  wait: function() { }\n};\nvar aetherOptions = {\n  problems: {\n    jshint_W040: {level: "ignore"},\n    aether_MissingThis: {level: "warning"}\n  },\n  functionName: "plan",\n  functionParameters: [],\n  yieldConditionally: true,\n};\nvar aether = new Aether(aetherOptions);\nvar code = grabDemoCode();\naether.transpile(code);\nvar method = aether.createMethod(thisValue);\nvar generator = method();\nif(aetherOptions.yieldConditionally) {\n  var executeSomeMore = function executeSomeMore() {\n    var result = generator.next();\n    demoShowOutput(aether);\n    if(!result.done)\n      setTimeout(executeSomeMore, 2000);\n  };\n  executeSomeMore();\n}\nelse {\n  demoShowOutput(aether);\n}'
    }
  ];

}).call(this);
