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
  timer: "01:13",
};

const positions = [
  { x: 20, y: 20 },
  { x: 660, y: 20 },
  { x: 1300, y: 20 },

  { x: 20, y: 380 },
  { x: 660, y: 380 },
  { x: 1300, y: 380 },

  { x: 20, y: 740 },
  { x: 660, y: 740 },
  { x: 1300, y: 740 },
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
    const pos = positions[data.players.length] || {
      x: 20,
      y: 20,
    };

    const player = {
      id: crypto.randomUUID(),
      name: "Spieler",
      votes: 0,
      lives: 3,
      active: false,
      status: "Waiting",
      avatar:
        "https://cdn-icons-png.flaticon.com/512/149/149071.png",
      x: pos.x,
      y: pos.y,
    };

    await save({
      ...data,
      players: [...data.players, player],
    });
  }

  async function updatePlayer(id, changes) {
    await save({
      ...data,
      players: data.players.map((p) =>
        p.id === id ? { ...p, ...changes } : p
      ),
    });
  }

  async function removePlayer(id) {
    await save({
      ...data,
      players: data.players.filter((p) => p.id !== id),
    });
  }

  return (
    <main
      className={`min-h-screen overflow-hidden ${
        mode === "host"
          ? "bg-[#070711]"
          : "bg-transparent"
      }`}
    >
      <style jsx global>{`
        body {
          margin: 0;
          overflow: hidden;
          background: ${
            mode === "show"
              ? "transparent"
              : "#070711"
          };
          font-family: Arial, Helvetica, sans-serif;
        }

        .cam {
          position: absolute;
          width: 620px;
          height: 330px;
          border-radius: 22px;
          overflow: hidden;
          border: 3px solid rgba(255,255,255,0.08);
          background: rgba(0,0,0,0.2);
          backdrop-filter: blur(10px);
        }

        .active {
          border: 3px solid #00ff95;
          box-shadow: 0 0 40px #00ff9540;
        }

        .bottom {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 18px;
          background: linear-gradient(
            to top,
            rgba(0,0,0,.95),
            rgba(0,0,0,.15)
          );
        }

        .panel {
          position: fixed;
          right: 20px;
          top: 20px;
          width: 380px;
          height: 92vh;
          overflow-y: auto;
          border-radius: 24px;
          background: #111122;
          border: 1px solid rgba(255,255,255,.1);
          padding: 18px;
          z-index: 99999;
        }

        input,
        select {
          width: 100%;
          padding: 10px;
          border-radius: 12px;
          border: none;
          margin-top: 6px;
          margin-bottom: 10px;
          color: black;
        }

        button {
          border: none;
          border-radius: 14px;
          padding: 10px 14px;
          font-weight: 900;
          cursor: pointer;
        }
      `}</style>

      {mode === "show" && (
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 20,
            background: "rgba(0,0,0,.7)",
            color: "white",
            padding: "10px 14px",
            borderRadius: 14,
            fontWeight: 900,
            fontSize: 38,
            backdropFilter: "blur(10px)",
          }}
        >
          {data.timer}
        </div>
      )}

      {mode === "host" && (
        <div className="panel">
          <h1
            style={{
              fontSize: 44,
              fontWeight: 900,
              marginBottom: 18,
              color: "white",
            }}
          >
            Stream Overlay
          </h1>

          <button
            onClick={addPlayer}
            style={{
              width: "100%",
              background:
                "linear-gradient(135deg,#a855f7,#ec4899)",
              color: "white",
              marginBottom: 20,
              padding: 16,
              fontSize: 20,
            }}
          >
            + Spieler hinzufügen
          </button>

          <label
            style={{
              color: "white",
              fontWeight: 800,
            }}
          >
            Timer
          </label>

          <input
            value={data.timer}
            onChange={(e) =>
              save({
                ...data,
                timer: e.target.value,
              })
            }
          />

          {data.players.map((p, i) => (
            <div
              key={p.id}
              style={{
                background: "#0b0b1a",
                padding: 16,
                borderRadius: 20,
                marginTop: 16,
                border:
                  "1px solid rgba(255,255,255,.08)",
              }}
            >
              <h2
                style={{
                  color: "white",
                  fontSize: 28,
                  fontWeight: 900,
                }}
              >
                Spieler {i + 1}
              </h2>

              <label style={{ color: "white" }}>
                Name
              </label>

              <input
                value={p.name}
                onChange={(e) =>
                  updatePlayer(p.id, {
                    name: e.target.value,
                  })
                }
              />

              <label style={{ color: "white" }}>
                Avatar URL
              </label>

              <input
                value={p.avatar}
                onChange={(e) =>
                  updatePlayer(p.id, {
                    avatar: e.target.value,
                  })
                }
              />

              <label style={{ color: "white" }}>
                Status
              </label>

              <select
                value={p.status}
                onChange={(e) =>
                  updatePlayer(p.id, {
                    status: e.target.value,
                  })
                }
              >
                <option>Waiting</option>
                <option>Talking</option>
                <option>Thinking</option>
                <option>Answering</option>
                <option>AFK</option>
                <option>Out</option>
              </select>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <button
                  style={{
                    background: "#ec4899",
                    color: "white",
                  }}
                  onClick={() =>
                    updatePlayer(p.id, {
                      lives: p.lives + 1,
                    })
                  }
                >
                  ❤️+
                </button>

                <button
                  style={{
                    background: "#374151",
                    color: "white",
                  }}
                  onClick={() =>
                    updatePlayer(p.id, {
                      lives: Math.max(
                        0,
                        p.lives - 1
                      ),
                    })
                  }
                >
                  ❤️-
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <button
                  style={{
                    background: "#06b6d4",
                    color: "white",
                  }}
                  onClick={() =>
                    updatePlayer(p.id, {
                      votes: p.votes + 1,
                    })
                  }
                >
                  Vote +
                </button>

                <button
                  style={{
                    background: "#374151",
                    color: "white",
                  }}
                  onClick={() =>
                    updatePlayer(p.id, {
                      votes: Math.max(
                        0,
                        p.votes - 1
                      ),
                    })
                  }
                >
                  Vote -
                </button>
              </div>

              <button
                style={{
                  width: "100%",
                  background: p.active
                    ? "#00ff95"
                    : "#374151",
                  color: "white",
                  marginBottom: 10,
                }}
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
                style={{
                  width: "100%",
                  background: "#dc2626",
                  color: "white",
                }}
                onClick={() =>
                  removePlayer(p.id)
                }
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
          className={`cam ${
            p.active ? "active" : ""
          }`}
          style={{
            left: p.x,
            top: p.y,
          }}
        >
          <div className="bottom">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <img
                src={p.avatar}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "100%",
                  border:
                    "2px solid rgba(255,255,255,.8)",
                }}
              />

              <div>
                <div
                  style={{
                    fontSize: 38,
                    fontWeight: 900,
                    color: "white",
                    lineHeight: 1,
                  }}
                >
                  /{p.name}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 18,
                    marginTop: 8,
                    color: "white",
                    fontSize: 24,
                    fontWeight: 700,
                  }}
                >
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
      ))}
    </main>
  );
}