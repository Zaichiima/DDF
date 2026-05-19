"use client";

import { useEffect, useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "DEINE_API_KEY",
  authDomain: "DEIN_PROJEKT.firebaseapp.com",
  projectId: "DEIN_PROJEKT_ID",
  storageBucket: "DEIN_PROJEKT.appspot.com",
  messagingSenderId: "DEINE_ID",
  appId: "DEINE_APP_ID",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

const roomRef = doc(db, "streamOverlay", "main");

const defaultState = {
  players: [],
};

const gridPositions = [
  { x: 20, y: 20 },
  { x: 560, y: 20 },
  { x: 1100, y: 20 },

  { x: 20, y: 330 },
  { x: 560, y: 330 },
  { x: 1100, y: 330 },

  { x: 20, y: 640 },
  { x: 560, y: 640 },
  { x: 1100, y: 640 },
];

export default function Page() {
  const [mode, setMode] = useState("show");
  const [data, setData] = useState(defaultState);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("host") === "1") {
      setMode("host");
    } else {
      setMode("show");
    }

    const unsub = onSnapshot(roomRef, async (snap) => {
      if (!snap.exists()) {
        await setDoc(roomRef, defaultState);
      } else {
        setData(snap.data());
      }
    });

    return () => unsub();
  }, []);

  async function save(newData) {
    setData(newData);
    await setDoc(roomRef, newData);
  }

  async function addPlayer() {
    const pos = gridPositions[data.players.length] || { x: 20, y: 20 };

    const player = {
      id: crypto.randomUUID(),
      name: "Spieler",
      lives: 3,
      votes: 0,
      status: "Waiting",
      active: false,
      avatar:
        "https://cdn-icons-png.flaticon.com/512/149/149071.png",
      x: pos.x,
      y: pos.y,
    };

    await save({
      players: [...data.players, player],
    });
  }

  async function updatePlayer(id, changes) {
    await save({
      players: data.players.map((p) =>
        p.id === id ? { ...p, ...changes } : p
      ),
    });
  }

  async function removePlayer(id) {
    await save({
      players: data.players.filter((p) => p.id !== id),
    });
  }

  return (
    <main
      className={`min-h-screen ${
        mode === "host" ? "bg-[#0b0b16]" : "bg-transparent"
      } text-white`}
    >
      <style jsx global>{`
        body {
          margin: 0;
          overflow: hidden;
          background: ${mode === "show" ? "transparent" : "#0b0b16"};
          font-family: Arial, Helvetica, sans-serif;
        }

        .player-card {
          position: absolute;
          width: 500px;
          height: 280px;
          border-radius: 18px;
          overflow: hidden;
          border: 3px solid rgba(255,255,255,0.1);
          background: rgba(0,0,0,0.2);
        }

        .active {
          border: 3px solid #00ff88;
          box-shadow: 0 0 30px #00ff8860;
        }

        .overlay-bottom {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 14px;
          background: linear-gradient(
            to top,
            rgba(0,0,0,.9),
            rgba(0,0,0,.2)
          );
        }

        .host-panel {
          position: fixed;
          top: 20px;
          right: 20px;
          width: 380px;
          height: 90vh;
          overflow-y: auto;
          background: #121226;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 20px;
          padding: 16px;
          z-index: 9999;
        }

        input,
        select {
          width: 100%;
          padding: 10px;
          border-radius: 10px;
          border: none;
          margin-top: 6px;
          margin-bottom: 10px;
          color: black;
        }

        button {
          border: none;
          border-radius: 12px;
          padding: 10px 14px;
          font-weight: 900;
          cursor: pointer;
        }
      `}</style>

      {mode === "host" && (
        <div className="host-panel">
          <h1 className="text-3xl font-black mb-4">
            Stream Overlay
          </h1>

          <button
            onClick={addPlayer}
            className="bg-purple-600 text-white w-full mb-5"
          >
            + Spieler hinzufügen
          </button>

          {data.players.map((p, index) => (
            <div
              key={p.id}
              className="bg-black/40 rounded-2xl p-4 mb-4"
            >
              <h2 className="font-black text-xl mb-2">
                Spieler {index + 1}
              </h2>

              <label>Name</label>
              <input
                value={p.name}
                onChange={(e) =>
                  updatePlayer(p.id, {
                    name: e.target.value,
                  })
                }
              />

              <label>Avatar URL</label>
              <input
                value={p.avatar}
                onChange={(e) =>
                  updatePlayer(p.id, {
                    avatar: e.target.value,
                  })
                }
              />

              <label>Status</label>
              <select
                value={p.status}
                onChange={(e) =>
                  updatePlayer(p.id, {
                    status: e.target.value,
                  })
                }
              >
                <option>Waiting</option>
                <option>Thinking</option>
                <option>Answering</option>
                <option>AFK</option>
                <option>Out</option>
              </select>

              <div className="flex gap-2 mb-2">
                <button
                  className="bg-pink-600 text-white"
                  onClick={() =>
                    updatePlayer(p.id, {
                      lives: p.lives + 1,
                    })
                  }
                >
                  ❤️+
                </button>

                <button
                  className="bg-gray-700 text-white"
                  onClick={() =>
                    updatePlayer(p.id, {
                      lives: Math.max(0, p.lives - 1),
                    })
                  }
                >
                  ❤️-
                </button>
              </div>

              <div className="flex gap-2 mb-2">
                <button
                  className="bg-cyan-600 text-white"
                  onClick={() =>
                    updatePlayer(p.id, {
                      votes: p.votes + 1,
                    })
                  }
                >
                  Vote +
                </button>

                <button
                  className="bg-gray-700 text-white"
                  onClick={() =>
                    updatePlayer(p.id, {
                      votes: Math.max(0, p.votes - 1),
                    })
                  }
                >
                  Vote -
                </button>
              </div>

              <button
                className={`w-full ${
                  p.active
                    ? "bg-green-500"
                    : "bg-gray-700"
                }`}
                onClick={() =>
                  updatePlayer(p.id, {
                    active: !p.active,
                  })
                }
              >
                {p.active
                  ? "Aktiv"
                  : "Aktiv markieren"}
              </button>

              <button
                className="w-full bg-red-600 text-white mt-2"
                onClick={() => removePlayer(p.id)}
              >
                Entfernen
              </button>
            </div>
          ))}
        </div>
      )}

      {data.players.map((p) => (
        <div
          key={p.id}
          className={`player-card ${
            p.active ? "active" : ""
          }`}
          style={{
            left: p.x,
            top: p.y,
          }}
        >
          <div className="w-full h-full bg-black/20 relative">
            <div className="overlay-bottom">
              <div className="flex items-center gap-3">
                <img
                  src={p.avatar}
                  className="w-10 h-10 rounded-full border-2 border-white"
                />

                <div>
                  <div className="text-3xl font-black">
                    /{p.name}
                  </div>

                  <div className="flex items-center gap-3 text-lg">
                    <span>
                      {"❤️".repeat(p.lives)}
                    </span>

                    <span>{p.status}</span>

                    <span>
                      {p.votes} Votes
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </main>
  );
}