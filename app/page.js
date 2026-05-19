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

const roomRef = doc(db, "quizRooms", "main");

const QUESTIONS = [
  {
    q: "Welche Farbe bekommt man aus Blau und Gelb?",
    a: ["Rot", "Grün", "Lila", "Orange"],
    correct: 1,
  },
  {
    q: "Wie viele Beine hat eine Spinne?",
    a: ["6", "8", "10", "12"],
    correct: 1,
  },
  {
    q: "Was ist 9 x 7?",
    a: ["56", "63", "72", "81"],
    correct: 1,
  },
  {
    q: "Welches Land hat einen roten Kreis auf weißem Hintergrund?",
    a: ["China", "Japan", "Thailand", "Korea"],
    correct: 1,
  },
];

const DEFAULT_STATE = {
  phase: "lobby",
  currentQuestion: null,
  revealAnswer: false,
  timer: 20,
  timerRunning: false,
  questionIndex: 0,
  answers: {},
  eliminatedText: "",
  players: {},
};

export default function Page() {
  const [game, setGame] = useState(DEFAULT_STATE);

  const [mode, setMode] = useState("show");

  const [name, setName] = useState("");
  const [cam, setCam] = useState("");

  const [playerId, setPlayerId] = useState("");

  const [hostUnlocked, setHostUnlocked] = useState(false);
  const [hostPassword, setHostPassword] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("join") === "1") {
      setMode("join");
    } else if (params.get("host") === "1") {
      setMode("hostLogin");
    } else {
      setMode("show");
    }

    const savedId = localStorage.getItem("playerId");
    const savedName = localStorage.getItem("playerName");
    const savedCam = localStorage.getItem("playerCam");

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
        timer: Math.max(game.timer - 1, 0),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [game.timerRunning, game.timer]);

  const players = useMemo(() => {
    return Object.values(game.players || {});
  }, [game.players]);

  const me = game.players?.[playerId];

  async function joinGame() {
    if (!name.trim()) return;

    const id = playerId || crypto.randomUUID();

    localStorage.setItem("playerId", id);
    localStorage.setItem("playerName", name);
    localStorage.setItem("playerCam", cam);

    setPlayerId(id);

    await setDoc(
      roomRef,
      {
        players: {
          ...game.players,
          [id]: {
            id,
            name,
            cam,
            score: 0,
            lives: 3,
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
      currentQuestion: q,
      timer: 20,
      timerRunning: true,
      revealAnswer: false,
      answers: {},
      phase: "question",
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
      currentQuestion: null,
      revealAnswer: false,
      timer: 20,
      timerRunning: false,
      answers: {},
      phase: "lobby",
      eliminatedText: "",
    });
  }

  async function answer(index) {
    if (!playerId) return;
    if (game.answers?.[playerId] !== undefined) return;

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

  async function evaluate() {
    const updatedPlayers = { ...game.players };

    const eliminated = [];

    Object.values(updatedPlayers).forEach((p) => {
      if (p.eliminated) return;

      const answer = game.answers?.[p.id];

      if (answer === game.currentQuestion.correct) {
        p.score += 100;
      } else {
        p.lives -= 1;
      }

      if (p.lives <= 0) {
        p.lives = 0;
        p.eliminated = true;
        eliminated.push(p.name);
      }
    });

    await updateDoc(roomRef, {
      players: updatedPlayers,
      revealAnswer: true,
      timerRunning: false,
      phase: "result",
      eliminatedText: eliminated.length
        ? `${eliminated.join(", ")} fliegt raus!`
        : "",
    });
  }

  async function addLife(id) {
    const updatedPlayers = { ...game.players };

    updatedPlayers[id].lives += 1;
    updatedPlayers[id].eliminated = false;

    await updateDoc(roomRef, {
      players: updatedPlayers,
    });
  }

  async function removeLife(id) {
    const updatedPlayers = { ...game.players };

    updatedPlayers[id].lives -= 1;

    if (updatedPlayers[id].lives <= 0) {
      updatedPlayers[id].lives = 0;
      updatedPlayers[id].eliminated = true;
    }

    await updateDoc(roomRef, {
      players: updatedPlayers,
    });
  }

  function unlockHost() {
    if (hostPassword === "host123") {
      setHostUnlocked(true);
      setMode("host");
    } else {
      alert("Falsches Passwort");
    }
  }

  return (
    <main className="min-h-screen bg-[#060611] text-white">
      <style jsx global>{`
        body {
          margin: 0;
          background: #060611;
          font-family: Arial;
        }

        .card {
          background: linear-gradient(145deg, #181830, #10101f);
          border-radius: 24px;
          padding: 20px;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .btn {
          background: linear-gradient(135deg, #7c3aed, #ec4899);
          border: none;
          border-radius: 16px;
          padding: 14px 22px;
          color: white;
          font-weight: 900;
        }

        .btn2 {
          background: #262645;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          padding: 12px 18px;
          color: white;
          font-weight: 800;
        }

        .answer {
          background: #1b1b35;
          border: 2px solid rgba(255,255,255,0.1);
          border-radius: 18px;
          padding: 18px;
          font-size: 22px;
          font-weight: 900;
        }

        .correct {
          background: #16a34a !important;
        }

        .eliminated {
          opacity: 0.3;
          filter: grayscale(1);
        }

        input {
          color: black;
        }
      `}</style>

      {mode === "show" && (
        <section className="max-w-7xl mx-auto p-6">
          <div className="text-center mb-8">
            <h1 className="text-7xl font-black">
              DER DÜMMSTE FLIEGT
            </h1>
          </div>

          {game.eliminatedText && (
            <div className="bg-red-700 text-center p-6 rounded-3xl text-5xl font-black mb-8 animate-pulse">
              {game.eliminatedText}
            </div>
          )}

          <div className="card text-center mb-8 min-h-[300px] flex flex-col justify-center">
            {game.currentQuestion ? (
              <>
                <div className="text-8xl font-black mb-4">
                  {game.timer}
                </div>

                <h2 className="text-5xl font-black mb-8">
                  {game.currentQuestion.q}
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  {game.currentQuestion.a.map((a, i) => (
                    <div
                      key={i}
                      className={`answer ${
                        game.revealAnswer &&
                        i === game.currentQuestion.correct
                          ? "correct"
                          : ""
                      }`}
                    >
                      {a}
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
                className={`card text-center ${
                  p.eliminated ? "eliminated" : ""
                }`}
              >
                <div className="h-40 bg-black rounded-2xl overflow-hidden mb-3">
                  {p.cam ? (
                    <iframe
                      src={p.cam}
                      allow="camera; microphone; fullscreen"
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      Keine Cam
                    </div>
                  )}
                </div>

                <h3 className="text-2xl font-black">{p.name}</h3>

                <p className="text-xl">
                  {"❤️".repeat(Math.max(p.lives, 0))}
                </p>

                <p className="text-purple-300 font-black">
                  {p.score} Punkte
                </p>

                {p.eliminated && (
                  <p className="text-red-500 text-2xl font-black mt-2">
                    RAUS
                  </p>
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
                placeholder="VDO.Ninja Link"
                value={cam}
                onChange={(e) => setCam(e.target.value)}
              />

              <button
                className="btn w-full"
                onClick={joinGame}
              >
                Beitreten
              </button>
            </>
          )}

          {me && (
            <div className="text-center">
              <h2 className="text-4xl font-black">
                {me.name}
              </h2>

              <p className="text-2xl mt-2">
                {"❤️".repeat(Math.max(me.lives, 0))}
              </p>

              {me.eliminated && (
                <p className="text-red-500 text-5xl font-black mt-6">
                  DU BIST RAUS 💀
                </p>
              )}

              {game.currentQuestion && !me.eliminated && (
                <div className="mt-8">
                  <div className="text-7xl font-black mb-4">
                    {game.timer}
                  </div>

                  <h3 className="text-3xl font-black mb-6">
                    {game.currentQuestion.q}
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    {game.currentQuestion.a.map((a, i) => (
                      <button
                        key={i}
                        className="answer"
                        onClick={() => answer(i)}
                      >
                        {a}
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
          <h1 className="text-5xl font-black mb-6">
            Host Login
          </h1>

          <input
            className="w-full p-4 rounded-xl text-xl mb-4"
            placeholder="Host Passwort"
            type="password"
            value={hostPassword}
            onChange={(e) => setHostPassword(e.target.value)}
          />

          <button
            className="btn w-full"
            onClick={unlockHost}
          >
            Host öffnen
          </button>

          <p className="text-gray-400 mt-4">
            Passwort: host123
          </p>
        </section>
      )}

      {mode === "host" && hostUnlocked && (
        <section className="max-w-6xl mx-auto p-6">
          <h1 className="text-6xl font-black mb-6">
            Host Panel
          </h1>

          <div className="flex flex-wrap gap-3 mb-8">
            <button className="btn" onClick={startQuestion}>
              Frage starten
            </button>

            <button className="btn2" onClick={revealAnswer}>
              Antwort zeigen
            </button>

            <button className="btn2" onClick={evaluate}>
              Auswerten
            </button>

            <button className="btn2" onClick={nextQuestion}>
              Nächste Frage
            </button>
          </div>

          <div className="card mb-8">
            <h2 className="text-3xl font-black mb-4">
              Aktuelle Frage
            </h2>

            <p className="text-2xl">
              {game.currentQuestion?.q || "Keine aktive Frage"}
            </p>

            <p className="text-5xl font-black mt-4">
              Timer: {game.timer}
            </p>

            {game.currentQuestion && (
              <p className="text-green-400 text-2xl font-black mt-4">
                Richtige Antwort:{" "}
                {
                  game.currentQuestion.a[
                    game.currentQuestion.correct
                  ]
                }
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {players.map((p) => (
              <div
                key={p.id}
                className={`card ${
                  p.eliminated ? "eliminated" : ""
                }`}
              >
                <h3 className="text-2xl font-black">
                  {p.name}
                </h3>

                <p>Leben: {p.lives}</p>
                <p>Punkte: {p.score}</p>

                <div className="flex gap-2 mt-4 flex-wrap">
                  <button
                    className="btn2"
                    onClick={() => addLife(p.id)}
                  >
                    + Leben
                  </button>

                  <button
                    className="btn2"
                    onClick={() => removeLife(p.id)}
                  >
                    - Leben
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