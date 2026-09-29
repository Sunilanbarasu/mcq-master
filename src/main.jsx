import React, {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { createRoot } from "react-dom/client";

import {
  Home,
  BookOpen,
  ClipboardCheck,
  Database,
  BarChart3,
  Upload,
  Shuffle,
  Play,
  Clock3,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Search,
  LogOut,
  User,
  Settings,
  ArrowLeft,
  RotateCcw,
  Trophy,
  Target,
  Flame,
  Brain,
  Menu,
  X,
  Bookmark,
  CircleHelp,
  Sparkles
} from "lucide-react";

import "./styles.css";

import {
  supabase,
  cloudEnabled
} from "./supabase";


/* =========================================================
   STARTER MCQS
========================================================= */

const starter = `
Which of the following best defines the Internet of Things (IoT)?

A) A network of computers connected through LAN only

B) A network of physical devices connected through the Internet to collect and exchange data

C) A wireless communication protocol for mobile phones

D) A cloud computing platform for data storage

B) A network of physical devices connected through the Internet to collect and exchange data

Which component in an IoT system converts a physical quantity into an electrical signal?

A) Actuator

B) Sensor

C) Gateway

D) Transceiver

B) Sensor
`;


/* =========================================================
   MCQ PARSER
========================================================= */

function parseMCQs(raw, unit = "Unit 1") {

  const text = raw
    .replace(/\|\s*\|/g, "")
    .replace(/^\|.*$/gm, "")
    .replace(/\r/g, "")
    .trim();

  const lines = text
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  const questions = [];

  let i = 0;

  while (i < lines.length) {

    if (
      !/^A\)/i.test(lines[i]) &&
      !/^[A-D][.)]\s+/i.test(lines[i])
    ) {

      const question = lines[i++];

      const options = {};

      for (const letter of ["A", "B", "C", "D"]) {

        if (
          i < lines.length &&
          new RegExp(
            `^${letter}[.)]\\s+`,
            "i"
          ).test(lines[i])
        ) {

          options[letter] = lines[i++]
            .replace(
              new RegExp(
                `^${letter}[.)]\\s+`,
                "i"
              ),
              ""
            )
            .trim();

        } else {
          break;
        }
      }

      if (
        Object.keys(options).length === 4
      ) {

        let answer = null;

        if (
          i < lines.length &&
          /^[A-D][.)]?\s+/i.test(lines[i])
        ) {

          answer = lines[i]
            .trim()
            .charAt(0)
            .toUpperCase();

          i++;
        }

        if (
          answer &&
          options[answer]
        ) {

          questions.push({
            id: `local-${crypto.randomUUID()}`,
            question,
            options,
            answer,
            unit
          });
        }

        continue;
      }
    }

    i++;
  }

  return questions;
}


/* =========================================================
   DEMO DATA
========================================================= */

const demoQuestions = parseMCQs(starter);


function resultTotal(result) {
  return Number(
    result.total_questions ??
    result.total ??
    0
  );
}


function resultCorrect(result) {
  return Number(
    result.correct_answers ??
    result.score ??
    0
  );
}


function resultPercentage(result) {
  const total = resultTotal(result);

  if (!total) {
    return 0;
  }

  return Math.round(
    (resultCorrect(result) / total) * 100
  );
}


/* =========================================================
   APP
========================================================= */

function App() {

  const historyReady = useRef(false);
  const handlingPopState = useRef(false);

  const [bank, setBank] = useState(() => {

    try {

      const saved =
        localStorage.getItem("mcq-bank");

      return saved
        ? JSON.parse(saved)
        : demoQuestions;

    } catch {

      return demoQuestions;

    }

  });


  const [user, setUser] = useState(null);

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [authMessage, setAuthMessage] =
    useState("");

  const [results, setResults] =
    useState([]);

  const [page, setPage] =
    useState("home");

  const [mobileMenu, setMobileMenu] =
    useState(false);

  const [raw, setRaw] =
    useState("");

  const [unit, setUnit] =
    useState("Unit 1");

  const [subject, setSubject] =
    useState("IoT");

  const [mode, setMode] =
    useState(null);

  const [session, setSession] =
    useState(null);

  const [settings, setSettings] =
    useState({
      unit: "All Units",
      type: "order",
      count: 10,
      timer: 0
    });


  /* =====================================================
     CLOUD SESSION
  ===================================================== */

  useEffect(() => {

    if (!cloudEnabled) {
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {

        setUser(
          data.session?.user || null
        );

      });


    const {
      data: listener
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {

          setUser(
            session?.user || null
          );

        }
      );


    return () => {

      listener.subscription.unsubscribe();

    };

  }, []);


  /* =====================================================
     LOAD CLOUD DATA
  ===================================================== */

  useEffect(() => {

    if (!user) {
      return;
    }


    async function loadCloudData() {

      const {
        data: questions,
        error: questionError
      } =
        await supabase
          .from("questions")
          .select("*")
          .order("created_at", {
            ascending: true
          });


      if (!questionError && questions) {

        setBank(questions);

        localStorage.setItem(
          "mcq-bank",
          JSON.stringify(questions)
        );

      }


      const {
        data: testResults,
        error: resultError
      } =
        await supabase
          .from("test_results")
          .select("*")
          .order("created_at", {
            ascending: false
          });


      if (
        !resultError &&
        testResults
      ) {

        setResults(testResults);

      }

    }


    loadCloudData();

  }, [user]);


  /* =====================================================
     UNITS
  ===================================================== */

  const units = useMemo(() => {

    return [
      "All Units",
      ...new Set(
        bank.map(
          question => question.unit
        )
      )
    ];

  }, [bank]);


  /* =====================================================
     SAVE BANK
  ===================================================== */

  function saveBank(next) {

    setBank(next);

    localStorage.setItem(
      "mcq-bank",
      JSON.stringify(next)
    );

  }


  /* =====================================================
     AUTH
  ===================================================== */

  async function authenticate(type) {

    setAuthMessage("");

    if (!cloudEnabled) {

      setAuthMessage(
        "Supabase is not configured."
      );

      return;
    }


    const response =
      type === "signup"

        ? await supabase.auth.signUp({
            email,
            password
          })

        : await supabase.auth.signInWithPassword({
            email,
            password
          });


    if (response.error) {

      setAuthMessage(
        response.error.message
      );

      return;
    }


    setAuthMessage(
      type === "signup"
        ? "Account created successfully."
        : "Signed in successfully."
    );

  }


  /* =====================================================
     LOGOUT
  ===================================================== */

  async function logout() {

    if (cloudEnabled) {

      await supabase.auth.signOut();

    }

    setUser(null);

    setResults([]);

    navigate("home");

  }


  /* =====================================================
     IMPORT QUESTIONS
  ===================================================== */

  async function importQuestions() {

    const parsed =
      parseMCQs(raw, unit);


    if (!parsed.length) {

      alert(
        "No complete MCQs found. Make sure every question has A/B/C/D and a correct-answer line."
      );

      return;
    }


    if (user) {

      const rows =
        parsed.map(question => ({
          user_id: user.id,
          question: question.question,
          options: question.options,
          answer: question.answer,
          unit: question.unit
        }));


      const {
        data,
        error
      } =
        await supabase
          .from("questions")
          .insert(rows)
          .select();


      if (error) {

        alert(error.message);

        return;
      }


      saveBank([
        ...bank.filter(
          q =>
            !String(q.id)
              .startsWith("local-")
        ),
        ...data
      ]);

    } else {

      saveBank([
        ...bank,
        ...parsed
      ]);

    }


    setRaw("");

    navigate("bank");

  }


  /* =====================================================
     DELETE QUESTION
  ===================================================== */

  async function deleteQuestion(question) {

    if (
      user &&
      cloudEnabled &&
      !String(question.id)
        .startsWith("local-")
    ) {

      const {
        error
      } =
        await supabase
          .from("questions")
          .delete()
          .eq("id", question.id);


      if (error) {

        alert(error.message);

        return;
      }

    }


    saveBank(
      bank.filter(
        q => q.id !== question.id
      )
    );

  }


  /* =====================================================
     START PRACTICE
  ===================================================== */

  function startPractice() {

    let pool =
      settings.unit === "All Units"
        ? [...bank]
        : bank.filter(
            q =>
              q.unit === settings.unit
          );


    if (!pool.length) {

      alert(
        "No questions available for this selection."
      );

      return;
    }


    if (
      settings.type === "random" ||
      settings.type === "shuffled"
    ) {

      pool.sort(
        () => Math.random() - 0.5
      );

    }


    if (settings.count !== "all") {

      pool =
        pool.slice(
          0,
          Math.min(
            Number(settings.count),
            pool.length
          )
        );

    }


    setSession({

      questions: pool,

      index: 0,

      answers: {},

      submitted: false,

      marked: {},

      seconds:
        mode === "test"
          ? Number(settings.timer) * 60
          : 0

    });


    navigate("quiz", false);

  }


  /* =====================================================
     ANSWER
  ===================================================== */

  function selectAnswer(letter) {

    if (!session) {
      return;
    }


    if (mode === "study") {

      return;

    }


    setSession(current => ({

      ...current,

      answers: {

        ...current.answers,

        [current.index]: letter

      }

    }));

  }


  /* =====================================================
     TIMER
  ===================================================== */

  useEffect(() => {

    if (
      !session ||
      mode !== "test" ||
      session.submitted ||
      session.seconds <= 0
    ) {

      return;

    }


    const timer =
      setInterval(() => {

        setSession(current => {

          if (
            !current ||
            current.seconds <= 0
          ) {

            return current;

          }


          return {

            ...current,

            seconds:
              current.seconds - 1

          };

        });

      }, 1000);


    return () => {

      clearInterval(timer);

    };

  }, [
    session,
    mode
  ]);


  /* =====================================================
     AUTO SUBMIT TIMER
  ===================================================== */

  useEffect(() => {

    if (
      mode === "test" &&
      session &&
      !session.submitted &&
      session.seconds === 0 &&
      Number(settings.timer) > 0
    ) {

      finishTest();

    }

  }, [
    session?.seconds
  ]);


  /* =====================================================
     CURRENT QUESTION
  ===================================================== */

  const currentQuestion =
    session?.questions[
      session.index
    ];


  /* =====================================================
     FINISH TEST
  ===================================================== */

  async function finishTest() {

    if (!session) {
      return;
    }

    const finalSession = {
      ...session,
      submitted: true
    };

    setSession(finalSession);

    const total =
      finalSession.questions.length;

    const correct =
      finalSession.questions.reduce(
        (count, question, index) => {
          return (
            count +
            (
              finalSession.answers[index] ===
              question.answer
                ? 1
                : 0
            )
          );
        },
        0
      );

    const unanswered =
      finalSession.questions.filter(
        (_, index) =>
          !finalSession.answers[index]
      ).length;

    const wrongAnswers =
      total - correct - unanswered;

    if (user) {

      const {
        data,
        error
      } = await supabase
        .from("test_results")
        .insert({
          user_id: user.id,
          test_type: "test",
          unit: settings.unit,
          total_questions: total,
          correct_answers: correct,
          wrong_answers: wrongAnswers,
          unanswered: unanswered,
          score: correct
        })
        .select()
        .single();

      if (!error && data) {
        setResults(current => [
          data,
          ...current
        ]);
      } else if (error) {
        console.error(
          "Failed to save test result:",
          error
        );
      }
    }
  }


  /* =====================================================
     SCORE
  ===================================================== */

  const score =
    session?.questions.reduce(
      (total, question, index) => {

        return (
          total +
          (
            session.answers[index] ===
            question.answer
              ? 1
              : 0
          )
        );

      },
      0
    ) || 0;


  /* =====================================================
     NAVIGATION
  ===================================================== */

  function navigate(target, clearSession = true, nextMode = mode) {

    if (historyReady.current && !handlingPopState.current) {
      window.history.pushState(
        {
          mcqMaster: true,
          page: target,
          mode: nextMode
        },
        "",
        window.location.href
      );
    }

    setPage(target);

    if (clearSession) {
      setSession(null);
    }

    setMobileMenu(false);

  }


  /* =====================================================
     BROWSER HISTORY / MOBILE BACK BUTTON
  ===================================================== */

  useEffect(() => {

    if (!window.history.state?.mcqMaster) {
      window.history.replaceState(
        {
          mcqMaster: true,
          page: "home",
          mode: null
        },
        "",
        window.location.href
      );
    }

    historyReady.current = true;

    function handlePopState(event) {

      const state = event.state;

      handlingPopState.current = true;

      setPage(state?.mcqMaster ? state.page : "home");
      setMode(state?.mcqMaster ? state.mode : null);
      setSession(null);
      setMobileMenu(false);

      window.setTimeout(() => {
        handlingPopState.current = false;
      }, 0);
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };

  }, []);


  /* =====================================================
     RENDER
  ===================================================== */

  return (

    <div className="app">


      {/* =================================================
          HEADER
      ================================================= */}

      <header className="topbar">


        <div
          className="brand"
          onClick={() =>
            navigate("home")
          }
        >

          <div className="brandIcon">
            <Brain size={21}/>
          </div>

          <div>

            <strong>
              MCQ Master
            </strong>

            <span>
              Study • Practice • Test
            </span>

          </div>

        </div>


        <nav className="desktopNav">

          <NavItem
            icon={<Home size={16}/>}
            label="Home"
            active={page === "home"}
            onClick={() =>
              navigate("home")
            }
          />

          <NavItem
            icon={<BookOpen size={16}/>}
            label="Study"
            active={
              page === "setup" &&
              mode === "study"
            }
            onClick={() => {

              setMode("study");

              navigate("setup", true, "study");

            }}
          />

          <NavItem
            icon={<ClipboardCheck size={16}/>}
            label="Test"
            active={
              page === "setup" &&
              mode === "test"
            }
            onClick={() => {

              setMode("test");

              navigate("setup", true, "test");

            }}
          />

          <NavItem
            icon={<Database size={16}/>}
            label="Question Bank"
            active={page === "bank"}
            onClick={() =>
              navigate("bank")
            }
          />

          <NavItem
            icon={<BarChart3 size={16}/>}
            label="Progress"
            active={page === "progress"}
            onClick={() =>
              navigate("progress")
            }
          />

        </nav>


        <div className="headerRight">

          <div className="onlineStatus">

            <span className={
              user
                ? "statusDot online"
                : "statusDot"
            }/>

            {user
              ? "Online"
              : "Local"}

          </div>


          {user ? (

            <button
              className="accountButton"
              onClick={logout}
            >

              <User size={16}/>

              <span>
                Account
              </span>

            </button>

          ) : (

            <button
              className="accountButton"
              onClick={() =>
                navigate("login")
              }
            >

              <User size={16}/>

              <span>
                Sign in
              </span>

            </button>

          )}


          <button
            className="mobileMenuButton"
            onClick={() =>
              setMobileMenu(
                !mobileMenu
              )
            }
          >

            {mobileMenu
              ? <X/>
              : <Menu/>}

          </button>

        </div>

      </header>


      {/* =================================================
          MOBILE MENU
      ================================================= */}

      {mobileMenu && (

        <div className="mobileMenu">

          <button
            onClick={() =>
              navigate("home")
            }
          >
            <Home/>
            Home
          </button>

          <button
            onClick={() => {

              setMode("study");

              navigate("setup", true, "study");

              setMobileMenu(false);

            }}
          >
            <BookOpen/>
            Study Mode
          </button>

          <button
            onClick={() => {

              setMode("test");

              navigate("setup", true, "test");

              setMobileMenu(false);

            }}
          >
            <ClipboardCheck/>
            Test Mode
          </button>

          <button
            onClick={() =>
              navigate("import")
            }
          >
            <Upload/>
            Import MCQs
          </button>

          <button
            onClick={() =>
              navigate("bank")
            }
          >
            <Database/>
            Question Bank
          </button>

          <button
            onClick={() =>
              navigate("progress")
            }
          >
            <BarChart3/>
            Progress
          </button>

        </div>

      )}


      <main>


        {/* =================================================
            HOME
        ================================================= */}

        {page === "home" && (

          <HomePage
            bank={bank}
            units={units}
            results={results}
            startStudy={() => {

              setMode("study");

              navigate("setup", true, "study");

            }}
            startTest={() => {

              setMode("test");

              navigate("setup", true, "test");

            }}
            randomPractice={() => {

              setMode("test");

              setSettings({
                ...settings,
                type: "random"
              });

              navigate("setup", true, "test");

            }}
            importMCQs={() =>
              navigate("import")
            }
          />

        )}


        {/* =================================================
            SETUP
        ================================================= */}

        {page === "setup" && (

          <PracticeSetup
            mode={mode}
            settings={settings}
            setSettings={setSettings}
            units={units}
            bank={bank}
            start={startPractice}
          />

        )}


        {/* =================================================
            QUIZ
        ================================================= */}

        {page === "quiz" &&
          session &&
          currentQuestion && (

          <QuizPage
            mode={mode}
            session={session}
            setSession={setSession}
            question={currentQuestion}
            score={score}
            selectAnswer={selectAnswer}
            finishTest={finishTest}
            back={() =>
              navigate("home")
            }
          />

        )}


        {/* =================================================
            IMPORT
        ================================================= */}

        {page === "import" && (

          <ImportPage
            raw={raw}
            setRaw={setRaw}
            unit={unit}
            setUnit={setUnit}
            subject={subject}
            setSubject={setSubject}
            importQuestions={importQuestions}
            count={bank.length}
          />

        )}


        {/* =================================================
            BANK
        ================================================= */}

        {page === "bank" && (

          <QuestionBankPage
            bank={bank}
            units={units}
            deleteQuestion={deleteQuestion}
          />

        )}


        {/* =================================================
            PROGRESS
        ================================================= */}

        {page === "progress" && (

          <ProgressPage
            bank={bank}
            results={results}
          />

        )}


        {/* =================================================
            LOGIN
        ================================================= */}

        {page === "login" && (

          <LoginPage
            cloudEnabled={cloudEnabled}
            email={email}
            password={password}
            setEmail={setEmail}
            setPassword={setPassword}
            authenticate={authenticate}
            message={authMessage}
          />

        )}

      </main>


      {/* =================================================
          MOBILE BOTTOM NAV
      ================================================= */}

      {page !== "quiz" && (

        <div className="mobileBottomNav">

          <button
            className={
              page === "home"
                ? "active"
                : ""
            }
            onClick={() =>
              navigate("home")
            }
          >
            <Home/>
            <span>Home</span>
          </button>

          <button
            onClick={() => {

              setMode("study");

              navigate("setup", true, "study");

            }}
          >
            <BookOpen/>
            <span>Study</span>
          </button>

          <button
            onClick={() => {

              setMode("test");

              navigate("setup", true, "test");

            }}
          >
            <ClipboardCheck/>
            <span>Test</span>
          </button>

          <button
            onClick={() =>
              navigate("bank")
            }
          >
            <Database/>
            <span>Bank</span>
          </button>

          <button
            onClick={() =>
              navigate("progress")
            }
          >
            <BarChart3/>
            <span>Progress</span>
          </button>

        </div>

      )}

    </div>
  );
}


/* =========================================================
   NAV ITEM
========================================================= */

function NavItem({
  icon,
  label,
  active,
  onClick
}) {

  return (

    <button
      className={
        active
          ? "navItem active"
          : "navItem"
      }
      onClick={onClick}
    >

      {icon}

      {label}

    </button>

  );
}


/* =========================================================
   HOME PAGE
========================================================= */

function HomePage({
  bank,
  units,
  results,
  startStudy,
  startTest,
  randomPractice,
  importMCQs
}) {

  const average =
    results.length
      ? Math.round(
          results.reduce(
            (sum, result) =>
              sum +
              resultPercentage(result),
            0
          ) / results.length
        )
      : 0;


  return (

    <div className="page">


      <section className="dashboardHero">

        <div className="heroContent">

          <div className="heroBadge">
            <Sparkles size={14}/>
            PERSONAL MCQ PLATFORM
          </div>

          <h1>
            Learn smarter.
            <br/>
            <span>
              Test better.
            </span>
          </h1>

          <p>
            Your personal space to study,
            practice and master every MCQ.
          </p>


          <div className="heroActions">

            <button
              className="primary large"
              onClick={startStudy}
            >
              <BookOpen/>
              Start Studying
            </button>

            <button
              className="secondary large"
              onClick={startTest}
            >
              <ClipboardCheck/>
              Take a Test
            </button>

          </div>

        </div>


        <div className="heroStatsCard">

          <div className="heroStatsHeader">

            <span>
              QUESTION BANK
            </span>

            <Database size={18}/>

          </div>

          <strong>
            {bank.length}
          </strong>

          <p>
            questions ready
          </p>


          <div className="heroMiniStats">

            <div>

              <b>
                {Math.max(
                  units.length - 1,
                  0
                )}
              </b>

              <span>
                Units
              </span>

            </div>

            <div>

              <b>
                {results.length}
              </b>

              <span>
                Tests
              </span>

            </div>

            <div>

              <b>
                {average}%
              </b>

              <span>
                Average
              </span>

            </div>

          </div>

        </div>

      </section>


      {/* QUICK ACTIONS */}

      <section className="section">

        <div className="sectionTitle">

          <div>

            <span>
              QUICK ACTIONS
            </span>

            <h2>
              What do you want to do?
            </h2>

          </div>

        </div>


        <div className="actionGrid">

          <ActionCard
            icon={<BookOpen/>}
            title="Study Mode"
            description="See answers instantly and learn as you go."
            color="purple"
            onClick={startStudy}
          />

          <ActionCard
            icon={<ClipboardCheck/>}
            title="Test Mode"
            description="Take an exam without seeing answers."
            color="blue"
            onClick={startTest}
          />

          <ActionCard
            icon={<Shuffle/>}
            title="Random Practice"
            description="Get a fresh random set of questions."
            color="orange"
            onClick={randomPractice}
          />

          <ActionCard
            icon={<Upload/>}
            title="Import MCQs"
            description="Paste your questions and build your bank."
            color="green"
            onClick={importMCQs}
          />

        </div>

      </section>


      {/* STAT CARDS */}

      <section className="metricGrid">

        <MetricCard
          icon={<Database/>}
          value={bank.length}
          label="Total MCQs"
        />

        <MetricCard
          icon={<Target/>}
          value={`${average}%`}
          label="Average Score"
        />

        <MetricCard
          icon={<Trophy/>}
          value={results.length}
          label="Tests Completed"
        />

        <MetricCard
          icon={<Flame/>}
          value={bank.length ? "Active" : "—"}
          label="Practice Status"
        />

      </section>


      {/* RECENT TESTS */}

      <section className="section">

        <div className="sectionTitle">

          <div>

            <span>
              RECENT ACTIVITY
            </span>

            <h2>
              Your latest tests
            </h2>

          </div>

        </div>


        {results.length === 0 ? (

          <div className="emptyState">

            <BarChart3 size={35}/>

            <h3>
              No tests yet
            </h3>

            <p>
              Take your first test to start
              tracking your progress.
            </p>

          </div>

        ) : (

          <div className="recentList">

            {results
              .slice(0, 5)
              .map(result => (

                <div
                  className="recentItem"
                  key={result.id}
                >

                  <div className="recentIcon">
                    <ClipboardCheck/>
                  </div>

                  <div className="recentInfo">

                    <strong>
                      {result.unit ||
                        "All Units"}
                    </strong>

                    <span>
                      {resultCorrect(result)}/
                      {resultTotal(result)}
                      {" • "}
                      {new Date(
                        result.created_at
                      ).toLocaleDateString()}
                    </span>

                  </div>

                  <b className="recentScore">
                    {resultPercentage(result)}%
                  </b>

                </div>

              ))}

          </div>

        )}

      </section>

    </div>
  );
}


/* =========================================================
   ACTION CARD
========================================================= */

function ActionCard({
  icon,
  title,
  description,
  color,
  onClick
}) {

  return (

    <button
      className={`actionCard ${color}`}
      onClick={onClick}
    >

      <div className="actionIcon">
        {icon}
      </div>

      <div>

        <h3>
          {title}
        </h3>

        <p>
          {description}
        </p>

      </div>

      <ChevronRight className="actionArrow"/>

    </button>

  );
}


/* =========================================================
   METRIC CARD
========================================================= */

function MetricCard({
  icon,
  value,
  label
}) {

  return (

    <div className="metricCard">

      <div className="metricIcon">
        {icon}
      </div>

      <strong>
        {value}
      </strong>

      <span>
        {label}
      </span>

    </div>

  );
}


/* =========================================================
   PRACTICE SETUP
========================================================= */

function PracticeSetup({
  mode,
  settings,
  setSettings,
  units,
  bank,
  start
}) {

  const available =
    settings.unit === "All Units"
      ? bank.length
      : bank.filter(
          q =>
            q.unit === settings.unit
        ).length;


  return (

    <div className="page">

      <button
        className="backButton"
        onClick={() =>
          window.history.back()
        }
      >
        <ArrowLeft size={17}/>
        Back
      </button>


      <section className="setupPage">

        <div className="setupHeader">

          <div className={
            mode === "study"
              ? "modeBadge study"
              : "modeBadge test"
          }>

            {mode === "study"
              ? <BookOpen/>
              : <ClipboardCheck/>}

            {mode === "study"
              ? "STUDY MODE"
              : "TEST MODE"}

          </div>

          <h1>
            {mode === "study"
              ? "Learn at your pace."
              : "Challenge yourself."}
          </h1>

          <p>
            {mode === "study"
              ? "Answers are visible immediately so you can focus on learning."
              : "Answers stay hidden until you submit the test."}
          </p>

        </div>


        <div className="setupCard">

          <div className="setupGrid">

            <div className="field">

              <label>
                UNIT
              </label>

              <select
                value={settings.unit}
                onChange={e =>
                  setSettings({
                    ...settings,
                    unit: e.target.value
                  })
                }
              >

                {units.map(unit => (
                  <option
                    key={unit}
                    value={unit}
                  >
                    {unit}
                  </option>
                ))}

              </select>

            </div>


            <div className="field">

              <label>
                QUESTION ORDER
              </label>

              <select
                value={settings.type}
                onChange={e =>
                  setSettings({
                    ...settings,
                    type: e.target.value
                  })
                }
              >

                <option value="order">
                  Original Order
                </option>

                <option value="shuffled">
                  Shuffle Questions
                </option>

                <option value="random">
                  Random Questions
                </option>

              </select>

            </div>


            <div className="field">

              <label>
                NUMBER OF QUESTIONS
              </label>

              <select
                value={settings.count}
                onChange={e =>
                  setSettings({
                    ...settings,
                    count: e.target.value
                  })
                }
              >

                <option value="10">
                  10 Questions
                </option>

                <option value="20">
                  20 Questions
                </option>

                <option value="30">
                  30 Questions
                </option>

                <option value="50">
                  50 Questions
                </option>

                <option value="all">
                  All Available
                </option>

              </select>

            </div>


            <div className="field">

              <label>
                TIMER
              </label>

              <select
                value={settings.timer}
                disabled={mode === "study"}
                onChange={e =>
                  setSettings({
                    ...settings,
                    timer: e.target.value
                  })
                }
              >

                <option value="0">
                  No Timer
                </option>

                <option value="10">
                  10 Minutes
                </option>

                <option value="20">
                  20 Minutes
                </option>

                <option value="30">
                  30 Minutes
                </option>

                <option value="60">
                  60 Minutes
                </option>

              </select>

            </div>

          </div>


          <div className="availableBar">

            <Database size={18}/>

            <span>
              <strong>
                {available}
              </strong>
              {" "}
              questions available
            </span>

          </div>


          <button
            className="primary launchButton"
            onClick={start}
          >

            <Play
              size={20}
              fill="currentColor"
            />

            Start{" "}
            {mode === "study"
              ? "Studying"
              : "Test"}

          </button>

        </div>

      </section>

    </div>
  );
}


/* =========================================================
   QUIZ PAGE
========================================================= */

function QuizPage({
  mode,
  session,
  setSession,
  question,
  score,
  selectAnswer,
  finishTest,
  back
}) {

  /* =====================================================
     RESULT
  ===================================================== */

  if (session.submitted) {

    const percentage =
      Math.round(
        (
          score /
          session.questions.length
        ) * 100
      );


    return (

      <div className="page">

        <section className="resultPage">

          <div className="resultTrophy">
            <Trophy size={40}/>
          </div>

          <span className="resultLabel">
            TEST COMPLETE
          </span>

          <h1>
            {score}
            <span>
              /
              {session.questions.length}
            </span>
          </h1>

          <p className="resultPercentage">
            {percentage}% correct
          </p>


          <div className="resultStats">

            <div>

              <CheckCircle2/>

              <strong>
                {score}
              </strong>

              <span>
                Correct
              </span>

            </div>


            <div>

              <XCircle/>

              <strong>
                {
                  session.questions.length -
                  score
                }
              </strong>

              <span>
                Wrong
              </span>

            </div>


            <div>

              <CircleHelp/>

              <strong>
                {
                  session.questions.length -
                  Object.keys(
                    session.answers
                  ).length
                }
              </strong>

              <span>
                Unanswered
              </span>

            </div>

          </div>


          <div className="resultActions">

            <button
              className="secondary"
              onClick={() => {

                setSession(null);

              }}
            >
              <RotateCcw/>
              Back to Setup
            </button>

            <button
              className="primary"
              onClick={back}
            >
              <Home/>
              Home
            </button>

          </div>

        </section>

      </div>
    );
  }


  const selected =
    session.answers[
      session.index
    ];


  const isStudy =
    mode === "study";


  const progress =
    (
      (session.index + 1) /
      session.questions.length
    ) * 100;


  const minutes =
    Math.floor(
      session.seconds / 60
    );


  const seconds =
    session.seconds % 60;


  return (

    <div className="studyPage">


      {/* QUIZ HEADER */}

      <div className="quizHeader">

        <button
          className="quizBack"
          onClick={back}
        >
          <ArrowLeft/>
          <span>
            Exit
          </span>
        </button>


        <div className="quizModeTitle">

          {isStudy
            ? <BookOpen/>
            : <ClipboardCheck/>}

          <strong>
            {isStudy
              ? "Study Mode"
              : "Test Mode"}
          </strong>

        </div>


        <div className="quizCounter">

          {session.index + 1}

          <span>
            /
            {session.questions.length}
          </span>

        </div>

      </div>


      {/* PROGRESS */}

      <div className="quizProgress">

        <div
          style={{
            width: `${progress}%`
          }}
        />

      </div>


      <div className="quizContainer">


        {/* QUESTION META */}

        <div className="questionMeta">

          <span>
            {question.unit}
          </span>

          {isStudy && (

            <span className="studyTag">
              <Sparkles size={13}/>
              LEARNING
            </span>

          )}

        </div>


        {/* QUESTION */}

        <h1 className="questionTitle">
          {question.question}
        </h1>


        {/* OPTIONS */}

        <div className="answerOptions">

          {Object.entries(
            question.options
          ).map(
            ([letter, text]) => {

              const correct =
                letter ===
                question.answer;

              const isSelected =
                selected === letter;


              return (

                <button
                  key={letter}
                  className={`
                    answerOption
                    ${
                      isStudy &&
                      correct
                        ? "studyCorrect"
                        : ""
                    }
                    ${
                      !isStudy &&
                      isSelected
                        ? "testSelected"
                        : ""
                    }
                  `}
                  onClick={() =>
                    selectAnswer(letter)
                  }
                  disabled={isStudy}
                >

                  <span className="optionLetter">
                    {isStudy && correct
                      ? <CheckCircle2/>
                      : letter}
                  </span>

                  <span className="optionText">
                    {text}
                  </span>


                  {isStudy &&
                    correct && (

                    <span className="correctLabel">
                      Correct
                    </span>

                  )}


                  {!isStudy &&
                    isSelected && (

                    <span className="selectedLabel">
                      Selected
                    </span>

                  )}

                </button>

              );

            }
          )}

        </div>


        {/* STUDY EXPLANATION */}

        {isStudy && (

          <div className="studyAnswerCard">

            <div className="studyAnswerIcon">
              <CheckCircle2/>
            </div>

            <div>

              <span>
                CORRECT ANSWER
              </span>

              <strong>
                {question.answer})
                {" "}
                {question.options[
                  question.answer
                ]}
              </strong>

              <p>
                This is the correct answer
                for this question.
              </p>

            </div>

          </div>

        )}


        {/* TEST TIMER */}

        {!isStudy &&
          session.seconds > 0 && (

          <div className={
            session.seconds < 60
              ? "quizTimer dangerTimer"
              : "quizTimer"
          }>

            <Clock3/>

            <span>
              {String(minutes).padStart(2, "0")}
              :
              {String(seconds).padStart(2, "0")}
            </span>

          </div>

        )}


        {/* NAVIGATION */}

        <div className="quizNavigation">

          <button
            className="secondary"
            disabled={
              session.index === 0
            }
            onClick={() =>
              setSession({
                ...session,
                index:
                  session.index - 1
              })
            }
          >

            <ChevronLeft/>

            Previous

          </button>


          {session.index ===
          session.questions.length - 1 ? (

            <button
              className="primary"
              onClick={
                isStudy
                  ? () =>
                      setSession({
                        ...session,
                        submitted: true
                      })
                  : finishTest
              }
            >

              {isStudy
                ? "Finish Study"
                : "Submit Test"}

              <ChevronRight/>

            </button>

          ) : (

            <button
              className="primary"
              onClick={() =>
                setSession({
                  ...session,
                  index:
                    session.index + 1
                })
              }
            >

              Next

              <ChevronRight/>

            </button>

          )}

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   IMPORT PAGE
========================================================= */

function ImportPage({
  raw,
  setRaw,
  unit,
  setUnit,
  subject,
  setSubject,
  importQuestions,
  count
}) {

  const preview =
    raw
      ? parseMCQs(raw, unit)
      : [];


  return (

    <div className="page">

      <div className="pageHeading">

        <div>

          <span>
            QUESTION IMPORTER
          </span>

          <h1>
            Build your question bank.
          </h1>

          <p>
            Paste your MCQs exactly as you have
            them. MCQ Master will detect the
            question, options and correct answer.
          </p>

        </div>

        <div className="bankCount">

          <Database/>

          <strong>
            {count}
          </strong>

          <span>
            saved
          </span>

        </div>

      </div>


      <section className="importLayout">


        <div className="importCard">

          <div className="importCardHeader">

            <div>

              <h2>
                Paste your MCQs
              </h2>

              <p>
                Question → A/B/C/D →
                correct answer
              </p>

            </div>

            <button
              className="exampleButton"
              onClick={() =>
                setRaw(starter)
              }
            >
              Load Example
            </button>

          </div>


          <textarea
            className="mcqTextarea"
            value={raw}
            onChange={e =>
              setRaw(e.target.value)
            }
            placeholder={`Paste your MCQs here...

Example:

Which of the following...?

A) Option one
B) Option two
C) Option three
D) Option four

B) Option two`}
          />


          <div className="importFooter">

            <span>
              {raw
                ? `${preview.length} questions detected`
                : "Waiting for questions..."}
            </span>

            <button
              className="primary"
              onClick={importQuestions}
            >

              <Upload/>

              Parse & Save

            </button>

          </div>

        </div>


        <aside className="importSettings">

          <h3>
            Question Settings
          </h3>


          <div className="field">

            <label>
              SUBJECT
            </label>

            <input
              value={subject}
              onChange={e =>
                setSubject(e.target.value)
              }
              placeholder="IoT"
            />

          </div>


          <div className="field">

            <label>
              UNIT
            </label>

            <input
              value={unit}
              onChange={e =>
                setUnit(e.target.value)
              }
              placeholder="Unit 1"
            />

          </div>


          <div className="importHelp">

            <CircleHelp/>

            <div>

              <strong>
                Supported format
              </strong>

              <p>
                Your existing format with
                extra <code>| |</code> lines
                is supported.
              </p>

            </div>

          </div>


          <div className="importFeature">

            <CheckCircle2/>

            Automatic answer detection

          </div>

          <div className="importFeature">

            <CheckCircle2/>

            Unit organization

          </div>

          <div className="importFeature">

            <CheckCircle2/>

            Cloud synchronization

          </div>

        </aside>

      </section>

    </div>
  );
}


/* =========================================================
   QUESTION BANK PAGE
========================================================= */

function QuestionBankPage({
  bank,
  units,
  deleteQuestion
}) {

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState("All Units");


  const filtered =
    bank.filter(question => {

      const matchesUnit =
        filter === "All Units" ||
        question.unit === filter;


      const matchesSearch =
        question.question
          .toLowerCase()
          .includes(
            search.toLowerCase()
          );


      return (
        matchesUnit &&
        matchesSearch
      );

    });


  return (

    <div className="page">

      <div className="pageHeading">

        <div>

          <span>
            QUESTION BANK
          </span>

          <h1>
            Your questions.
          </h1>

          <p>
            Search, review and manage all
            your imported MCQs.
          </p>

        </div>

        <div className="bankCount">

          <Database/>

          <strong>
            {bank.length}
          </strong>

          <span>
            questions
          </span>

        </div>

      </div>


      <div className="bankToolbar">

        <div className="searchBox">

          <Search size={18}/>

          <input
            value={search}
            onChange={e =>
              setSearch(e.target.value)
            }
            placeholder="Search questions..."
          />

        </div>


        <select
          value={filter}
          onChange={e =>
            setFilter(e.target.value)
          }
        >

          {units.map(unit => (

            <option
              key={unit}
              value={unit}
            >
              {unit}
            </option>

          ))}

        </select>

      </div>


      <div className="questionList">

        {filtered.length === 0 ? (

          <div className="emptyState">

            <Database/>

            <h3>
              No questions found
            </h3>

            <p>
              Try another search or unit.
            </p>

          </div>

        ) : (

          filtered.map(
            (question, index) => (

              <div
                className="questionBankCard"
                key={question.id}
              >

                <div className="questionBankNumber">
                  {index + 1}
                </div>


                <div className="questionBankContent">

                  <div className="questionBankMeta">

                    <span>
                      {question.unit}
                    </span>

                    <span>
                      IoT
                    </span>

                  </div>

                  <h3>
                    {question.question}
                  </h3>


                  <div className="bankOptions">

                    {Object.entries(
                      question.options
                    ).map(
                      ([letter, text]) => (

                        <div
                          key={letter}
                          className={
                            letter ===
                            question.answer
                              ? "bankOption correct"
                              : "bankOption"
                          }
                        >

                          <strong>
                            {letter}
                          </strong>

                          <span>
                            {text}
                          </span>

                          {letter ===
                            question.answer && (

                            <CheckCircle2
                              size={16}
                            />

                          )}

                        </div>

                      )
                    )}

                  </div>

                </div>


                <button
                  className="deleteQuestion"
                  onClick={() =>
                    deleteQuestion(question)
                  }
                >

                  <Trash2 size={17}/>

                </button>

              </div>

            )
          )

        )}

      </div>

    </div>
  );
}


/* =========================================================
   PROGRESS PAGE
========================================================= */

function ProgressPage({
  bank,
  results
}) {

  const average =
    results.length
      ? Math.round(
          results.reduce(
            (sum, result) =>
              sum +
              resultPercentage(result),
            0
          ) /
          results.length
        )
      : 0;


  const best =
    results.length
      ? Math.max(
          ...results.map(
            r =>
              resultPercentage(r)
          )
        )
      : 0;


  return (

    <div className="page">

      <div className="pageHeading">

        <div>

          <span>
            PROGRESS
          </span>

          <h1>
            Track your growth.
          </h1>

          <p>
            See how your practice is progressing
            over time.
          </p>

        </div>

      </div>


      <div className="progressOverview">

        <ProgressMetric
          icon={<Database/>}
          value={bank.length}
          label="Questions"
        />

        <ProgressMetric
          icon={<ClipboardCheck/>}
          value={results.length}
          label="Tests"
        />

        <ProgressMetric
          icon={<Target/>}
          value={`${average}%`}
          label="Average"
        />

        <ProgressMetric
          icon={<Trophy/>}
          value={`${best}%`}
          label="Best Score"
        />

      </div>


      <section className="progressPanel">

        <div className="sectionTitle">

          <div>

            <span>
              TEST HISTORY
            </span>

            <h2>
              Recent performance
            </h2>

          </div>

        </div>


        {results.length === 0 ? (

          <div className="emptyState">

            <BarChart3/>

            <h3>
              No test history
            </h3>

            <p>
              Complete a test to see your
              performance here.
            </p>

          </div>

        ) : (

          <div className="historyList">

            {results.map(result => (

              <div
                className="historyItem"
                key={result.id}
              >

                <div className="historyIcon">
                  <ClipboardCheck/>
                </div>

                <div className="historyMain">

                  <strong>
                    {result.unit ||
                      "All Units"}
                  </strong>

                  <span>
                    {resultCorrect(result)}
                    /
                    {resultTotal(result)}
                    {" • "}
                    {new Date(
                      result.created_at
                    ).toLocaleString()}
                  </span>

                </div>

                <div className={
                  resultPercentage(result) >= 70
                    ? "historyScore good"
                    : "historyScore"
                }>

                  {resultPercentage(result)}%

                </div>

              </div>

            ))}

          </div>

        )}

      </section>

    </div>
  );
}


/* =========================================================
   PROGRESS METRIC
========================================================= */

function ProgressMetric({
  icon,
  value,
  label
}) {

  return (

    <div className="progressMetric">

      <div>
        {icon}
      </div>

      <strong>
        {value}
      </strong>

      <span>
        {label}
      </span>

    </div>

  );
}


/* =========================================================
   LOGIN PAGE
========================================================= */

function LoginPage({
  cloudEnabled,
  email,
  password,
  setEmail,
  setPassword,
  authenticate,
  message
}) {

  return (

    <div className="loginPage">

      <div className="loginCard">

        <div className="loginLogo">
          <Brain/>
        </div>

        <span className="loginEyebrow">
          MCQ MASTER
        </span>

        <h1>
          Your learning
          <br/>
          space.
        </h1>

        <p>
          Sign in to sync your questions,
          tests and progress across devices.
        </p>


        {!cloudEnabled ? (

          <div className="loginWarning">

            Supabase is not configured yet.

          </div>

        ) : (

          <>

            <div className="field">

              <label>
                EMAIL
              </label>

              <input
                type="email"
                value={email}
                onChange={e =>
                  setEmail(e.target.value)
                }
                placeholder="you@example.com"
              />

            </div>


            <div className="field">

              <label>
                PASSWORD
              </label>

              <input
                type="password"
                value={password}
                onChange={e =>
                  setPassword(e.target.value)
                }
                placeholder="••••••••"
              />

            </div>


            {message && (

              <div className="authMessage">
                {message}
              </div>

            )}


            <button
              className="primary loginButton"
              onClick={() =>
                authenticate("signin")
              }
            >

              Sign In

            </button>


            <button
              className="createAccountButton"
              onClick={() =>
                authenticate("signup")
              }
            >

              Create New Account

            </button>

          </>

        )}

      </div>

    </div>
  );
}


/* =========================================================
   START REACT
========================================================= */

createRoot(
  document.getElementById("root")
).render(
  <App/>
);