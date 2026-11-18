import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import questions from "./questions";
import "./App.css";

// custom Monaco theme that matches the style guide colours
function setupTheme(monaco) {
  monaco.editor.defineTheme("indigo-night", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "8581aa" },
      { token: "keyword", foreground: "a79cff" },
      { token: "string", foreground: "7ed3a9" },
      { token: "number", foreground: "e0c85e" },
    ],
    colors: {
      "editor.background": "#202033",
      "editor.lineHighlightBackground": "#29283b",
      "editorLineNumber.foreground": "#5f5d71",
      "editorCursor.foreground": "#a79cff",
      "editor.selectionBackground": "#46447a",
    },
  });
}

// re-measure character widths once DM Mono has loaded
function handleMount(editor, monaco) {
  document.fonts.load('14px "DM Mono"').then(() => {
    monaco.editor.remeasureFonts();
  });
}

// turn any value into text we can show on screen
function show(value) {
  return value === undefined ? "undefined" : JSON.stringify(value);
}

// ["javascript"] with params ["text"] becomes: text = "javascript"
function formatInput(input, params) {
  return input.map((arg, i) => params[i] + " = " + show(arg)).join(", ");
}

// 75 seconds becomes "01:15"
function formatTime(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return minutes + ":" + seconds;
}

// text between `backticks` becomes a small code chip
function withCode(text) {
  return text
    .split("`")
    .map((part, i) => (i % 2 === 1 ? <code key={i}>{part}</code> : part));
}

// run the user's function against a list of tests
function runTests(code, functionName, tests) {
  return tests.map((test) => {
    try {
      const userFunction = new Function(
        code + "\nreturn " + functionName + ";"
      )();
      // copy the input so the user's code can't change our test data
      const input = JSON.parse(JSON.stringify(test.input));
      const got = userFunction(...input);
      const passed = JSON.stringify(got) === JSON.stringify(test.expected);
      return { passed: passed, shown: show(got) };
    } catch (error) {
      return { passed: false, shown: "Error: " + error.message };
    }
  });
}

// run the code and collect everything it prints with console.log
function captureConsole(code) {
  const lines = [];
  const originalLog = console.log;

  console.log = (...args) =>
    lines.push(
      args.map((a) => (typeof a === "string" ? a : show(a))).join(" ")
    );

  try {
    new Function(code)();
  } catch (error) {
    lines.push("Error: " + error.message);
  }

  console.log = originalLog;
  return lines;
}

function App() {
  const [current, setCurrent] = useState(0);
  const [codes, setCodes] = useState(questions.map((q) => q.starterCode));
  const [leftTab, setLeftTab] = useState("description");
  const [bottomTab, setBottomTab] = useState("tests");
  const [activeCase, setActiveCase] = useState(0);
  const [consoleLines, setConsoleLines] = useState([]);
  const [visibleResults, setVisibleResults] = useState(null);
  const [hiddenResults, setHiddenResults] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [timerOn, setTimerOn] = useState(true);
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [solved, setSolved] = useState([]); // ids of questions you fully passed
  const [leftPercent, setLeftPercent] = useState(45); // width of the question pane
  const [testHeight, setTestHeight] = useState(250); // height of the test panel
  const [dragging, setDragging] = useState(null); // "side", "tests" or null
  const workspaceRef = useRef(null);
  const editorPaneRef = useRef(null);

  // count up one second at a time while the timer is running
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  // while a divider is being dragged, follow the pointer
  useEffect(() => {
    if (!dragging) return;

    function handleMove(e) {
      if (dragging === "side") {
        // width of the question pane, as a percentage of the page
        const box = workspaceRef.current.getBoundingClientRect();
        const percent = ((e.clientX - box.left) / box.width) * 100;
        setLeftPercent(Math.min(70, Math.max(25, percent)));
      } else {
        // height of the test panel, measured up from the bottom buttons
        const box = editorPaneRef.current.getBoundingClientRect();
        const height = box.bottom - e.clientY - 56 - 5;
        const maxHeight = box.height - 45 - 10 - 150;
        setTestHeight(Math.min(maxHeight, Math.max(120, height)));
      }
    }

    function handleUp() {
      setDragging(null);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [dragging]);

  const question = questions[current];
  const code = codes[current];
  const activeTest = question.visibleTests[activeCase];
  const activeResult = visibleResults ? visibleResults[activeCase] : null;
  const questionSubmissions = submissions.filter(
    (s) => s.questionId === question.id
  );
  const totalXp = questions
    .filter((q) => solved.includes(q.id))
    .reduce((sum, q) => sum + q.xp, 0);

  const hiddenCount = question.hiddenTests.length;
  const hiddenPassed = hiddenResults
    ? hiddenResults.filter((r) => r.passed).length
    : 0;
  const visiblePassed = visibleResults
    ? visibleResults.filter((r) => r.passed).length
    : 0;

  function goTo(index) {
    setCurrent(index);
    setLeftTab("description");
    setBottomTab("tests");
    setActiveCase(0);
    setConsoleLines([]);
    setVisibleResults(null);
    setHiddenResults(null);
    setShowHint(false);
    setRunning(false);
    setSeconds(0);
  }

  function handleCodeChange(value) {
    const newCodes = [...codes];
    newCodes[current] = value;
    setCodes(newCodes);
  }

  function resetCode() {
    const newCodes = [...codes];
    newCodes[current] = question.starterCode;
    setCodes(newCodes);
    setConsoleLines([]);
    setVisibleResults(null);
    setHiddenResults(null);
  }

  // Run code: show what it prints and check the visible tests
  function runCode() {
    setConsoleLines(captureConsole(code));
    setVisibleResults(
      runTests(code, question.functionName, question.visibleTests)
    );
  }

  // Submit: check the visible AND hidden tests, and save the attempt
  function submitSolution() {
    const visible = runTests(code, question.functionName, question.visibleTests);
    const hidden = runTests(code, question.functionName, question.hiddenTests);
    setVisibleResults(visible);
    setHiddenResults(hidden);
    setRunning(false);

    const passed =
      visible.filter((r) => r.passed).length +
      hidden.filter((r) => r.passed).length;

    // all tests passed: earn the XP (only once per question)
    if (
      passed === visible.length + hidden.length &&
      !solved.includes(question.id)
    ) {
      setSolved([...solved, question.id]);
    }

    const newSubmission = {
      questionId: question.id,
      passed: passed,
      total: visible.length + hidden.length,
      at: new Date().toLocaleTimeString(),
    };
    setSubmissions([newSubmission, ...submissions]);
  }

  return (
    <div className={"app" + (dragging ? " dragging-" + dragging : "")}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">JS</span>
          <span>
            Code<span className="brand-accent">Pad</span>
          </span>
        </div>
        <span className="total-xp">{totalXp} XP</span>
      </header>

      {/* toolbar: breadcrumb, previous/next, timer */}
      <div className="practice-toolbar">
        <div className="breadcrumb">
          Questions <span>/</span> <strong>{question.title}</strong>
        </div>

        <div className="problem-counter">
          <button onClick={() => goTo(current - 1)} disabled={current === 0}>
            ←
          </button>
          <span>
            Question <strong>{current + 1}</strong> of {questions.length}
          </span>
          <button
            onClick={() => goTo(current + 1)}
            disabled={current === questions.length - 1}
          >
            →
          </button>
        </div>

        <div className="timer-control">
          <label>
            <input
              type="checkbox"
              checked={timerOn}
              onChange={(e) => {
                setTimerOn(e.target.checked);
                setRunning(false);
              }}
            />
            Timer
          </label>
          {timerOn && (
            <>
              <span className={"timer-value " + (running ? "is-running" : "")}>
                {formatTime(seconds)}
              </span>
              <button
                className="timer-button"
                onClick={() => setRunning(!running)}
              >
                {running ? "Pause" : "Start"}
              </button>
              <button
                className="timer-reset"
                onClick={() => {
                  setRunning(false);
                  setSeconds(0);
                }}
              >
                Reset
              </button>
            </>
          )}
        </div>
      </div>

      <div
        className="practice-workspace"
        ref={workspaceRef}
        style={{
          gridTemplateColumns:
            leftPercent + "fr 12px " + (100 - leftPercent) + "fr",
        }}
      >
        {/* LEFT: question */}
        <div className="question-pane">
          <div className="question-tabs">
            <button
              className={leftTab === "description" ? "active" : ""}
              onClick={() => setLeftTab("description")}
            >
              Description
            </button>
            <button
              className={leftTab === "submissions" ? "active" : ""}
              onClick={() => setLeftTab("submissions")}
            >
              Submissions
            </button>
          </div>

          <div className="question-scroll">
            {leftTab === "description" ? (
              <>
                <p className="question-number">QUESTION {current + 1}</p>
                <h1>{question.title}</h1>
                <div className="classification">
                  <span className="classification-level">
                    {question.difficulty}
                  </span>
                  <span>{question.concept}</span>
                  <span className="xp-chip">+{question.xp} XP</span>
                </div>

                <div className="problem-copy">
                  <p>{withCode(question.description)}</p>

                  {question.examples.map((example, i) => (
                    <div key={i}>
                      <h2>Example {i + 1}</h2>
                      <div className="example-box">
                        <div>
                          <span>Input:</span> {example.input}
                        </div>
                        <div>
                          <span>Output:</span> {example.output}
                        </div>
                        {example.explanation && (
                          <div>
                            <span>Explanation:</span> {example.explanation}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  <h2>Constraints</h2>
                  <ul>
                    {question.constraints.map((rule, i) => (
                      <li key={i}>{withCode(rule)}</li>
                    ))}
                  </ul>

                  <div className="hint-box">
                    <strong>Need a hint?</strong>
                    {showHint ? (
                      <p>{question.hint}</p>
                    ) : (
                      <>
                        <p>Try the problem first, then reveal the hint.</p>
                        <button onClick={() => setShowHint(true)}>
                          Show hint
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </>
            ) : questionSubmissions.length === 0 ? (
              <div className="empty-submissions">
                <h2>No submissions yet</h2>
                <p>Press Submit solution to see your attempts here.</p>
              </div>
            ) : (
              <ul className="submission-list">
                {questionSubmissions.map((s, i) => (
                  <li key={i}>
                    <strong className={s.passed === s.total ? "pass" : "fail"}>
                      {s.passed === s.total ? "Passed" : "Failed"}
                    </strong>
                    <span>
                      {s.passed}/{s.total} tests
                    </span>
                    <span className="when">{s.at}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* drag this bar left or right to resize the two panes */}
        <div
          className="side-divider"
          title="Drag to resize. Double-click to reset."
          onPointerDown={(e) => {
            e.preventDefault();
            setDragging("side");
          }}
          onDoubleClick={() => setLeftPercent(45)}
        />

        {/* RIGHT: editor */}
        <div
          className="editor-pane"
          ref={editorPaneRef}
          style={{
            gridTemplateRows:
              "45px minmax(120px, 1fr) 10px " + testHeight + "px 56px",
          }}
        >
          <div className="editor-topbar">
            <div className="file-tab">
              <span>JS</span> solution.js
            </div>
            <select aria-label="Language">
              <option>JavaScript</option>
            </select>
          </div>

          <div className="editor-area">
            <Editor
              height="100%"
              theme="indigo-night"
              defaultLanguage="javascript"
              beforeMount={setupTheme}
              onMount={handleMount}
              value={code}
              onChange={handleCodeChange}
              options={{
                fontFamily: '"DM Mono", monospace',
                fontSize: 14,
                minimap: { enabled: false },
                padding: { top: 16 },
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>

          {/* drag this bar up or down: it sits between the code and the test cases */}
          <div
            className="tests-divider"
            title="Drag to resize. Double-click to reset."
            onPointerDown={(e) => {
              e.preventDefault();
              setDragging("tests");
            }}
            onDoubleClick={() => setTestHeight(250)}
          />

          <div className="test-panel">
            <div className="test-heading">
              <button
                className={bottomTab === "tests" ? "active" : ""}
                onClick={() => setBottomTab("tests")}
              >
                Test cases
              </button>
              <button
                className={bottomTab === "console" ? "active" : ""}
                onClick={() => setBottomTab("console")}
              >
                Console
              </button>
            </div>

            {bottomTab === "tests" ? (
              <div className="test-body">
                <div className="test-tabs">
                  {question.visibleTests.map((test, i) => {
                    const result = visibleResults ? visibleResults[i] : null;
                    return (
                      <button
                        key={i}
                        className={activeCase === i ? "active" : ""}
                        onClick={() => setActiveCase(i)}
                      >
                        Case {i + 1}
                        {result && (result.passed ? " ✓" : " ✕")}
                      </button>
                    );
                  })}
                </div>

                <div className="test-values">
                  <div>
                    <span>Input</span>
                    <code>{formatInput(activeTest.input, question.params)}</code>
                  </div>
                  <div>
                    <span>Expected</span>
                    <code>{show(activeTest.expected)}</code>
                  </div>
                  {activeResult && (
                    <div>
                      <span>Output</span>
                      <code
                        className={
                          activeResult.passed ? "output-success" : "output-fail"
                        }
                      >
                        {activeResult.shown}
                      </code>
                    </div>
                  )}
                </div>

                <p className="hidden-status">
                  {hiddenResults
                    ? "Hidden tests: " +
                      hiddenPassed +
                      "/" +
                      hiddenCount +
                      " passed" +
                      (visiblePassed + hiddenPassed ===
                      question.visibleTests.length + hiddenCount
                        ? " · All tests passed. Nice work!"
                        : " · Check the failed tests and try again.")
                    : hiddenCount +
                      " hidden tests run when you press Submit. You won't see their inputs."}
                </p>
              </div>
            ) : (
              <div className="test-body console-lines code">
                {consoleLines.length === 0 ? (
                  <div>Press Run code to see what your code prints</div>
                ) : (
                  consoleLines.map((line, i) => <div key={i}>&gt; {line}</div>)
                )}
              </div>
            )}
          </div>

          <div className="editor-actions">
            <button className="reset-code" onClick={resetCode}>
              Reset code
            </button>
            <div>
              <button className="run-button" onClick={runCode}>
                Run code
              </button>
              <button className="submit-button" onClick={submitSolution}>
                Submit solution →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
