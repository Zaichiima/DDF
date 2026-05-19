"use client";

import { useEffect, useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  doc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDMk-FRTSJqzRonA-fOfYc-1B-Ln0K-ooM",
  authDomain: "zaichiimaddf.firebaseapp.com",
  projectId: "zaichiimaddf",
  storageBucket: "zaichiimaddf.firebasestorage.app",
  messagingSenderId: "719482835497",
  appId: "1:719482835497:web:2ce8dfee6e45f31afa4238"
};

const app = getApps().length
  ? getApps()[0]
  : initializeApp(firebaseConfig);

const db = getFirestore(app);

const roomRef = doc(db, "streamOverlay", "main");

const defaultState = {
  players: [],
  timer: "01:13",
  hostCam: "",
};

const positions = [
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

    if (params.get("host") === "1") setMode("host");
    else if (params.get("join") === "1") setMode("join");
    else setMode("show");

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
    if (data.players.length >= 9) return;

    const pos = positions[data.players.length];

    const newPlayer = {
      id: Date.now().toString(),
      name: "Spieler",
      cam: "",
      lives: 3,
      votes: 0,
      status: "Waiting",
      active: false,
      x: pos.x,
      y: pos.y,
    };

    await save({
      ...data,
      players: [...data.players, newPlayer],
    });
  }

  async function removePlayer(id) {
    await save({
      ...data,
      players: data.players.filter((p) => p.id !== id),
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

  async function joinPlayer(name, cam) {
    if (!name || !cam) return;

    if (data.players.length >= 9) return;

    const pos = positions[data.players.length];

    const player = {
      id: Date.now().toString(),
      name,
      cam,
      lives: 3,
      votes: 0,
      status: "Waiting",
      active: false,
      x: pos.x,
      y: pos.y,
    };

    await save({
      ...data,
      players: [...data.players, player],
    });

    alert("Erfolgreich gejoint");
  }

  return (
    <main
      style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        overflow: "hidden",
        position: "relative",
        fontFamily: "Arial",
      }}
    >
      {mode === "host" && (
        <section style={{ padding: 28, color: "white" }}>
          <h1
            style={{
              fontSize: 52,
              fontWeight: 900,
              marginBottom: 20,
            }}
          >
            Host Control Panel
          </h1>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "360px 1fr",
              gap: 24,
            }}
          >
            <div
              style={{
                background:
                  "linear-gradient(145deg,#17172f,#0b0b18)",
                borderRadius: 24,
                padding: 20,
                border: "1px solid rgba(255,255,255,.12)",
              }}
            >
              <button
                onClick={addPlayer}
                style={buttonPink}
              >
                + Spieler hinzufügen
              </button>

              <label>Timer</label>
              <input
                value={data.timer}
                onChange={(e) =>
                  save({
                    ...data,
                    timer: e.target.value,
                  })
                }
                style={inputStyle}
              />

              <label>Zaichiima</label>
              <input
                value={data.hostCam || ""}
                onChange={(e) =>
                  save({
                    ...data,
                    hostCam: e.target.value,
                  })
                }
                style={inputStyle}
              />

              <button
                onClick={() =>
                  save({
                    ...data,
                    players: [],
                  })
                }
                style={{
                  ...buttonPink,
                  background: "#dc2626",
                  marginTop: 12,
                }}
              >
                Alle Spieler löschen
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(3, minmax(220px, 1fr))",
                gap: 18,
              }}
            >
              {data.players.map((p, i) => (
                <div
                  key={p.id}
                  style={{
                    background:
                      "linear-gradient(145deg,#181830,#10101f)",
                    border:
                      "1px solid rgba(255,255,255,.12)",
                    borderRadius: 24,
                    padding: 18,
                  }}
                >
                  <h2
                    style={{
                      fontSize: 28,
                      fontWeight: 900,
                    }}
                  >
                    Spieler {i + 1}
                  </h2>

                  {p.cam && (
                    <iframe
                      src={p.cam}
                      allow="camera; microphone; fullscreen; autoplay"
                      style={{
                        width: "100%",
                        aspectRatio: "16/9",
                        borderRadius: 16,
                        marginBottom: 12,
                        border:
                          "2px solid rgba(255,255,255,.08)",
                        background: "#000",
                      }}
                    />
                  )}

                  <label>Name</label>
                  <input
                    value={p.name}
                    onChange={(e) =>
                      updatePlayer(p.id, {
                        name: e.target.value,
                      })
                    }
                    style={inputStyle}
                  />



                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 900,
                      margin: "10px 0",
                    }}
                  >
                    ❤️ {p.lives} · 🗳️ {p.votes}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                    }}
                  >
                    <button
                      style={buttonPink}
                      onClick={() =>
                        updatePlayer(p.id, {
                          lives: p.lives + 1,
                        })
                      }
                    >
                      + Leben
                    </button>

                    <button
                      style={buttonGray}
                      onClick={() =>
                        updatePlayer(p.id, {
                          lives: Math.max(
                            0,
                            p.lives - 1
                          ),
                        })
                      }
                    >
                      - Leben
                    </button>

                    <button
                      style={buttonBlue}
                      onClick={() =>
                        updatePlayer(p.id, {
                          votes: p.votes + 1,
                        })
                      }
                    >
                      + Vote
                    </button>

                    <button
                      style={buttonGray}
                      onClick={() =>
                        updatePlayer(p.id, {
                          votes: Math.max(
                            0,
                            p.votes - 1
                          ),
                        })
                      }
                    >
                      - Vote
                    </button>
                  </div>

                  <button
                    style={{
                      ...buttonPink,
                      marginTop: 10,
                      background: p.active
                        ? "#00ff95"
                        : "#7c3aed",
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
                      ...buttonPink,
                      background: "#dc2626",
                      marginTop: 10,
                    }}
                    onClick={() =>
                      removePlayer(p.id)
                    }
                  >
                    Spieler entfernen
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {mode === "join" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 500,
              background:
                "linear-gradient(145deg,#181830,#10101f)",
              borderRadius: 30,
              padding: 30,
              color: "white",
            }}
          >
            <h1
              style={{
                fontSize: 42,
                fontWeight: 900,
                marginBottom: 20,
              }}
            >
              Join Stream
            </h1>

            <label>Name</label>
            <input
              id="join-name"
              style={inputStyle}
            />

            <label>VDO.Ninja Link</label>
            <input
              id="join-cam"
              style={inputStyle}
            />

            <button
              style={{
                ...buttonPink,
                marginTop: 20,
              }}
              onClick={() => {
                const name =
                  document.getElementById(
                    "join-name"
                  ).value;

                const cam =
                  document.getElementById(
                    "join-cam"
                  ).value;

                joinPlayer(name, cam);
              }}
            >
              Beitreten
            </button>
          </div>
        </div>
      )}

      {mode === "show" && (
        <>
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
              zIndex: 9999,
            }}
          >
            {data.timer}
          </div>

          {data.hostCam && (
            <div
              className="cam active"
              style={{
                left: 20,
                top: 20,
                zIndex: 999,
              }}
            >
              <iframe
                src={data.hostCam}
                className="video"
                allow="camera; microphone; fullscreen; autoplay"
              />

              <div className="bottom">
                <div
                  style={{
                    fontSize: 38,
                    fontWeight: 900,
                    color: "white",
                  }}
                >
                  Zaichiima(Host)
                </div>
              </div>
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
              {p.cam && (
                <iframe
                  src={p.cam}
                  className="video"
                  allow="camera; microphone; fullscreen; autoplay"
                />
              )}

              <div className="bottom">
                <div
                  style={{
                    fontSize: 38,
                    fontWeight: 900,
                    color: "white",
                  }}
                >
                  {p.name}
                </div>

                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: "white",
                  }}
                >
                  {"❤️".repeat(p.lives)} · {p.status} ·{" "}
                  {p.votes} Votes
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      <style jsx global>{`
        body {
          margin: 0;
          overflow: hidden;
          background: black;
        }

        .cam {
          position: absolute;
          width: 600px;
          height: 340px;
          border-radius: 24px;
          overflow: hidden;
          background: #111827;
        }

        .active {
          outline: 3px solid #00ff95;
        }

        .video {
          width: 100%;
          height: 100%;
          border: none;
          background: black;
        }

        .bottom {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          padding: 14px 18px;
          background: linear-gradient(
            to top,
            rgba(0, 0, 0, 0.9),
            transparent
          );
        }

        button {
          border: none;
          border-radius: 14px;
          padding: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        label {
          display: block;
          margin-top: 14px;
          margin-bottom: 6px;
          font-weight: 700;
        }

        input,
        select {
          width: 100%;
          padding: 14px;
          border-radius: 14px;
          border: 1px solid #333;
          background: #111;
          color: white;
          margin-bottom: 10px;
          box-sizing: border-box;
        }
      `}</style>
    </main>
  );
}

const buttonPink = {
  width: "100%",
  background:
    "linear-gradient(135deg,#a855f7,#ec4899)",
  color: "white",
};

const buttonGray = {
  width: "100%",
  background: "#374151",
  color: "white",
};

const buttonBlue = {
  width: "100%",
  background: "#06b6d4",
  color: "white",
};

const inputStyle = {
  width: "100%",
  padding: 14,
  borderRadius: 14,
  border: "1px solid #333",
  background: "#111",
  color: "white",
  marginBottom: 10,
  boxSizing: "border-box",
};