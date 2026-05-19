"use client";

import { useEffect, useMemo, useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "DEIN_API_KEY",
  authDomain: "DEIN_PROJEKT.firebaseapp.com",
  projectId: "DEIN_PROJEKT_ID",
  storageBucket: "DEIN_PROJEKT.appspot.com",
  messagingSenderId: "DEINE_ID",
  appId: "DEINE_APP_ID",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);
const roomRef = doc(db, "duemmsteFliegt", "mainRoom");

const QUESTIONS = [
  {
    q: "Welche Farbe bekommt man, wenn man Blau und Gelb mischt?",
    a: ["Rot", "Grün", "Lila", "Orange"],
    correct: 1,
  },
  {
    q: "Wie viele Beine hat eine Spinne?",
    a: ["6", "8", "10", "12"],
    correct: 1,
  },
  {
    q: "Wie heißt der bekannte Klempner von Nintendo?",
    a: ["Sonic", "Mario", "Link", "Kirby"],
    correct: 1,
  },
  {
    q: "Was ist 9 x 7?",
    a: ["56", "63", "72", "81"],
    correct: 1,
  },
  {
    q: "Welches Land hat einen roten Kreis auf weißem Hintergrund?",
    a: ["China", "Japan", "Korea", "Thailand"],
    correct: 1,
  },
];

const DEFAULT_STATE = {
  phase: "lobby",
  round: 1,
  questionIndex: 0,
  currentQuestion: null,
  revealAnswer: false,
  timer: 20,
  timerRunning: false,
  players: {},
  answers: {},
  eliminatedText: "",
};

export default function Page() {
  const [game, setGame] = useState(DEFAULT_STATE);
  const [mode, setMode] = useState("show");
  const [name, setName] = useState("");
  const [cam, setCam] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [hostPass, setHostPass] = useState("");
  const [hostUnlocked, setHostUnlocked] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("join") === "1") setMode("join");
    else if (params.get("host") === "1") setMode("hostLogin");
    else setMode("show");

    const savedId = localStorage.getItem("ddf_playerId");
    const savedName = localStorage.getItem("ddf_name");
    const savedCam = localStorage.getItem("ddf_cam");

    if (savedId) setPlayerId(savedId);
    if (savedName) setName(savedName);
    if (savedCam) setCam(savedCam);
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(roomRef, async (snap) => {
      if (!snap.exists()) {
        await setDoc(roomRef, DEFAULT_STATE);
      } else {
        setGame(snap.data());
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!game.timerRunning || game.timer <= 0) return;

    const interval = setInterval(async () => {
      await updateDoc(roomRef, {
        timer: Math.max((game.timer || 0) - 1, 0),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [game.timerRunning, game.timer]);

  const players = useMemo(() => Object.values(game.players || {}), [game.players]);
  const alivePlayers = players.filter((p) => !p.eliminated);
  const me = game.players?.[playerId];

  function cleanVdoLink(url) {
    if (!url) return "";
    return url.includes("vdo.ninja") ? url : "";
  }

  async function joinGame() {
    if (!name.trim()) return alert("Bitte Namen eingeben");

    const id = playerId || crypto.randomUUID();

    localStorage.setItem("ddf_playerId", id);
    localStorage.setItem("ddf_name", name);
    localStorage.setItem("ddf_cam", cam);

    setPlayerId(id);

    await setDoc(
      roomRef,
      {
        players: {
          ...game.players,
          [id]: {
            id,
            name,
            cam: cleanVdoLink(cam),
            lives: 3,
            score: 0,
            eliminated: false,
          },
        },
      },
      { merge: true }
    );
  }

  async function startQuestion() {
    const q = QUESTIONS[game.questionIndex % QUESTIONS.length];

    await updateDoc(roomRef, {
      phase: "question",
      currentQuestion: q,
      revealAnswer: false,
      answers: {},
      timer: 20,
      timerRunning: true,
      eliminatedText: "",
    });
  }

  async function revealAnswer() {
    await updateDoc(roomRef, {
      revealAnswer: true,
      timerRunning: false,
    });
  }

  async function nextQuestion() {
    await updateDoc(roomRef, {
      questionIndex: game.questionIndex + 1,
      round: game.round + 1,
      phase: "lobby",
      currentQuestion: null,
      revealAnswer: false,
      answers: {},
      timer: 20,
      timerRunning: false,
      eliminatedText: "",
    });
  }

  async function answerQuestion(index) {
    if (!playerId || game.answers?.[playerId] !== undefined) return;

    await setDoc(
      roomRef,
      {
        answers: {
          ...game.answers,
          [playerId]: index,
        },
      },
      { merge: true }
    );
  }

  async function evaluateAnswers() {
    const updatedPlayers = { ...game.players };
    const eliminatedNames = [];

    Object.values(updatedPlayers).forEach((p) => {
      if (p.eliminated) return;

      const answer = game.answers?.[p.id];

      if (answer === game.currentQuestion?.correct) {
        p.score += 100;
      } else {
        p.lives -= 1;
      }

      if (p.lives <= 0) {
        p.eliminated = true;
        p.lives = 0;
        eliminatedNames.push(p.name);
      }
    });

    await updateDoc(roomRef, {
      players: updatedPlayers,
      phase: "result",
      revealAnswer: true,
      timerRunning: false,
      eliminatedText: eliminatedNames.length
        ? `${eliminatedNames.join(", ")} fliegt raus!`
        : "",
    });
  }

  async function changeLives(id, amount) {
    const updatedPlayers = { ...game.players };
    updatedPlayers[id].lives += amount;

    if (updatedPlayers[id].lives <= 0) {
      updatedPlayers[id].lives = 0;
      updatedPlayers[id].eliminated = true;
    } else {
      updatedPlayers[id].eliminated = false;
    }

    await updateDoc(roomRef, { players: updatedPlayers });
  }

  async function kickPlayer(id) {
    const updatedPlayers = { ...game.players };
    updatedPlayers[id].lives = 0;
    updatedPlayers[id].eliminated = true;
    await updateDoc(roomRef, { players: updatedPlayers });
  }

  async function resetGame() {
    await setDoc(roomRef, DEFAULT_STATE);
  }

  function unlockHost() {
    if (hostPass === "host123") {
      setHostUnlocked(true);
      setMode("host");
    } else {
      alert("Falsches Passwort");
    }
  }

  return (
    <main className="min-h-screen bg-[#070716] text-white">
      <style jsx global>{`
        body {
          margin: 0;
          background: #070716;
          font-family: Arial, Helvetica, sans-serif;
        }

        .card {
          background: linear-gradient(145deg, #17172f, #0f0f20);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 24px;
          padding: 20px;
        }

        .btn {
          background: linear-gradient(135deg, #7c3aed, #ec4899);
          color: white;
          font-weight: 900;
          padding: 14px 22px;
          border-radius: 16px;
          border: none;
        }

        .btn2 {
          background: #23233d;
          color: white;
          font-weight: 800;
          padding: 12px 18px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.15);
        }

        .answer {
          background: #191932;
          border: 2px solid rgba(255,255,255,0.15);
          border-radius: 18px;
          padding: 18px;
          font-size: 22px;
          font-weight: 900;
        }

        .correct {
          background: #16a34a !important;
        }

        .eliminated {
          opacity: 0.35;
          filter: grayscale(1);
        }

        input {
          color: black;
        }
      `}</style>

      {mode === "show" && (
        <section className="max-w-7xl mx-auto p-6">
          <div className="text-center mb-8">
            <h1 className="text-7xl font-black">DER DÜMMSTE FLIEGT</h1>
            <p className="text-2xl text-purple-300">
              Runde {game.round} · Noch {alivePlayers.length} Spieler
            </p>
          </div>

          {game.eliminatedText && (
            <div className="bg-red-700 text-center text-5xl font-black p-6 rounded-3xl mb-8 animate-pulse">
              {game.eliminatedText}
            </div>
          )}

          <div className="card text-center mb-8 min-h-[300px] flex flex-col justify-center">
            {game.currentQuestion ? (
              <>
                <div className="text-8xl font-black mb-4">{game.timer}</div>
                <h2 className="text-5xl font-black mb-8">
                  {game.currentQuestion.q}
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  {game.currentQuestion.a.map((answer, i) => (
                    <div
                      key={i}
                      className={`answer ${
                        game.revealAnswer && i === game.currentQuestion.correct
                          ? "correct"
                          : ""
                      }`}
                    >
                      {answer}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <h2 className="text-5xl font-black">
                Warte auf die nächste Frage...
              </h2>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {players.map((p) => (
              <div
                key={p.id}
                className={`card text-center ${p.eliminated ? "eliminated" : ""}`}
              >
                <div className="h-40 bg-black rounded-2xl overflow-hidden mb-3 flex items-center justify-center">
                  {p.cam ? (
                    <iframe
                      src={p.cam}
                      allow="camera;microphone;fullscreen"
                      className="w-full h-full"
                    />
                  ) : (
                    <span className="text-gray-500">Keine Cam</span>
                  )}
                </div>

                <h3 className="text-2xl font-black">{p.name}</h3>
                <p className="text-xl">{"❤️".repeat(Math.max(p.lives, 0))}</p>
                <p className="text-purple-300 font-black">{p.score} Punkte</p>
                {p.eliminated && (
                  <p className="text-red-500 text-2xl font-black">RAUS</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {mode === "join" && (
        <section className="max-w-3xl mx-auto p-6 mt-10 card">
          <h1 className="text-5xl font-black text-center mb-6">
            Spieler beitreten
          </h1>

          {!me && (
            <>
              <input
                className="w-full p-4 rounded-xl text-xl mb-4"
                placeholder="Dein Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <input
                className="w-full p-4 rounded-xl text-xl mb-4"
                placeholder="VDO.Ninja Link einfügen"
                value={cam}
                onChange={(e) => setCam(e.target.value)}
              />

              <button className="btn w-full" onClick={joinGame}>
                Beitreten
              </button>
            </>
          )}

          {me && (
            <div className="text-center">
              <h2 className="text-4xl font-black">{me.name}</h2>
              <p className="text-2xl mt-2">
                Leben: {"❤️".repeat(Math.max(me.lives, 0))}
              </p>

              {me.eliminated && (
                <p className="text-red-500 text-5xl font-black mt-6">
                  DU BIST RAUS 💀
                </p>
              )}

              {game.currentQuestion && !me.eliminated && (
                <div className="mt-8">
                  <div className="text-7xl font-black mb-4">{game.timer}</div>
                  <h3 className="text-3xl font-black mb-6">
                    {game.currentQuestion.q}
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    {game.currentQuestion.a.map((answer, i) => (
                      <button
                        key={i}
                        className="answer"
                        onClick={() => answerQuestion(i)}
                      >
                        {answer}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {mode === "hostLogin" && (
        <section className="max-w-xl mx-auto p-6 mt-20 card text-center">
          <h1 className="text-5xl font-black mb-6">Host Login</h1>

          <input
            className="w-full p-4 rounded-xl text-xl mb-4"
            placeholder="Host Passwort"
            type="password"
            value={hostPass}
            onChange={(e) => setHostPass(e.target.value)}
          />

          <button className="btn w-full" onClick={unlockHost}>
            Host öffnen
          </button>

          <p className="text-gray-400 mt-4">Passwort: host123</p>
        </section>
      )}

      {mode === "host" && hostUnlocked && (
        <section className="max-w-6xl mx-auto p-6">
          <h1 className="text-6xl font-black mb-6">Host Panel</h1>

          <div className="flex flex-wrap gap-3 mb-8">
            <button className="btn" onClick={startQuestion}>
              Frage starten
            </button>
            <button className="btn2" onClick={revealAnswer}>
              Antwort zeigen
            </button>
            <button className="btn2" onClick={evaluateAnswers}>
              Auswerten
            </button>
            <button className="btn2" onClick={nextQuestion}>
              Nächste Frage
            </button>
            <button className="btn2" onClick={resetGame}>
              Reset
            </button>
          </div>

          <div className="card mb-8">
            <h2 className="text-3xl font-black mb-3">Aktuelle Frage</h2>
            <p className="text-2xl">
              {game.currentQuestion?.q || "Keine Frage aktiv"}
            </p>
            <p className="text-5xl font-black mt-4">Timer: {game.timer}</p>

            {game.currentQuestion && (
              <p className="text-green-400 text-2xl font-black mt-4">
                Richtige Antwort:{" "}
                {game.currentQuestion.a[game.currentQuestion.correct]}
              </p>
            )}
          </div>

          <h2 className="text-3xl font-black mb-4">Spieler</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {players.map((p) => (
              <div
                key={p.id}
                className={`card ${p.eliminated ? "eliminated" : ""}`}
              >
                <h3 className="text-2xl font-black">{p.name}</h3>
                <p>Leben: {p.lives}</p>
                <p>Punkte: {p.score}</p>
                <p>
                  Antwort:{" "}
                  {game.answers?.[p.id] !== undefined && game.currentQuestion
                    ? game.currentQuestion.a[game.answers[p.id]]
                    : "Noch keine"}
                </p>

                <div className="flex gap-2 mt-4 flex-wrap">
                  <button className="btn2" onClick={() => changeLives(p.id, 1)}>
                    + Leben
                  </button>
                  <button className="btn2" onClick={() => changeLives(p.id, -1)}>
                    - Leben
                  </button>
                  <button className="btn2" onClick={() => kickPlayer(p.id)}>
                    Raus
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}