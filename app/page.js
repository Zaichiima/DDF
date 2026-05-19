"use client";

import { useEffect, useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDMk-FRTSJqzRonA-fOfYc-1B-Ln0K-ooM",
  authDomain: "zaichiimaddf.firebaseapp.com",
  projectId: "zaichiimaddf",
  storageBucket: "zaichiimaddf.firebasestorage.app",
  messagingSenderId: "719482835497",
  appId: "1:719482835497:web:2ce8dfee6e45f31afa4238"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
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

  const [joinName, setJoinName] = useState("");
  const [joinCam, setJoinCam] = useState("");
  const [myId, setMyId] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("host") === "1") setMode("host");
    else if (params.get("join") === "1") setMode("join");
    else setMode("show");

    const savedId = localStorage.getItem("overlayPlayerId");
    const savedName = localStorage.getItem("overlayPlayerName");
    const savedCam = localStorage.getItem("overlayPlayerCam");

    if (savedId) setMyId(savedId);
    if (savedName) setJoinName(savedName);
    if (savedCam) setJoinCam(savedCam);

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

  function makeVdoLink(url) {
    if (!url) return "";
    if (!url.includes("vdo.ninja")) return "";
    return url;
  }

  async function joinPlayer() {
    if (!joinName.trim()) return alert("Bitte Namen eingeben");
    if (!joinCam.trim()) return alert("Bitte VDO.Ninja Link einfügen");

    const id = myId || crypto.randomUUID();
    const exists = data.players.find((p) => p.id === id);
    const pos = positions[data.players.length] || { x: 20, y: 20 };

    const player = {
      id,
      name: joinName,
      cam: makeVdoLink(joinCam),
      votes: exists?.votes ?? 0,
      lives: exists?.lives ?? 3,
      active: exists?.active ?? false,
      status: exists?.status ?? "Waiting",
      avatar:
        exists?.avatar ||
        "https://cdn-icons-png.flaticon.com/512/149/149071.png",
      x: exists?.x ?? pos.x,
      y: exists?.y ?? pos.y,
    };

    const newPlayers = exists
      ? data.players.map((p) => (p.id === id ? player : p))
      : [...data.players, player];

    localStorage.setItem("overlayPlayerId", id);
    localStorage.setItem("overlayPlayerName", joinName);
    localStorage.setItem("overlayPlayerCam", joinCam);
    setMyId(id);

    await save({ ...data, players: newPlayers });
    window.location.href = "/?show=1";
  }

  async function addPlayer() {
    const pos = positions[data.players.length] || { x: 20, y: 20 };

    const player = {
      id: crypto.randomUUID(),
      name: "Spieler",
      cam: "",
      votes: 0,
      lives: 3,
      active: false,
      status: "Waiting",
      avatar: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
      x: pos.x,
      y: pos.y,
    };

    await save({ ...data, players: [...data.players, player] });
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

  const me = data.players.find((p) => p.id === myId);

  return (
    <main
      className={`min-h-screen overflow-hidden bg-black ${
        mode === "host" || mode === "join" ? "bg-[#070711]" : "bg-transparent"
      }`}
    >
      <style jsx global>{`
        body {
          margin: 0;
          overflow: hidden;
          background: #000;
          font-family: Arial, Helvetica, sans-serif;
        }

        .cam {
          position: absolute;
          width: 620px;
          height: 330px;
          border-radius: 22px;
          overflow: hidden;
          border: none;
          background: transparent;
        }

        .active {
          border: 3px solid #00ff95;
          box-shadow: 0 0 40px #00ff9540;
        }

        .video {
          width: 100%;
          height: 100%;
          border: 0;
        }

.bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 18px;
  background: transparent;
}

        .panel {
          position: fixed;
          right: 20px;
          top: 20px;
          width: 390px;
          height: 92vh;
          overflow-y: auto;
          border-radius: 24px;
          background: #111122;
          border: 1px solid rgba(255,255,255,.1);
          padding: 18px;
          z-index: 99999;
          color: white;
        }

        input,
        select {
          width: 100%;
          padding: 11px;
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

      {mode === "join" && (
        <section
          style={{
            maxWidth: 620,
            margin: "80px auto",
            background: "#111122",
            padding: 28,
            borderRadius: 24,
            color: "white",
          }}
        >
          <h1 style={{ fontSize: 46, fontWeight: 900, marginBottom: 20 }}>
            Spieler beitreten
          </h1>

          <label>Name</label>
          <input
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            style={{
  color: "white",
  background: "#111",
  border: "1px solid #333",
}}
            placeholder="Dein Name"
          />

          <label>VDO.Ninja Link</label>
          <input
            value={joinCam}
            onChange={(e) => setJoinCam(e.target.value)}
            style={{
  color: "white",
  background: "#111",
  border: "1px solid #333",
}}
            placeholder="https://vdo.ninja/?view=..."
          />

          <button
            onClick={joinPlayer}
            style={{
              width: "100%",
              background: "linear-gradient(135deg,#a855f7,#ec4899)",
              color: "white",
              padding: 16,
              fontSize: 20,
              marginTop: 10,
            }}
          >
            Beitreten / Aktualisieren
          </button>

          {me && (
            <p style={{ marginTop: 20, fontSize: 22, fontWeight: 800 }}>
              ✅ Du bist drin als {me.name}
            </p>
          )}
        </section>
      )}

      {mode === "host" && (
        <div className="panel">
          <h1 style={{ fontSize: 42, fontWeight: 900, marginBottom: 18 }}>
            Stream Overlay
          </h1>

          <button
            onClick={addPlayer}
            style={{
              width: "100%",
              background: "linear-gradient(135deg,#a855f7,#ec4899)",
              color: "white",
              marginBottom: 16,
              padding: 16,
              fontSize: 18,
            }}
          >
            + Spieler manuell hinzufügen
          </button>
          <button
  onClick={() => save({ ...data, players: [] })}
  style={{
    width: "100%",
    background: "#dc2626",
    color: "white",
    marginBottom: 16,
    padding: 16,
    fontSize: 18,
  }}
>
  Alle Spieler löschen
</button>

          <label>Timer</label>
          <input
            value={data.timer}
            onChange={(e) => save({ ...data, timer: e.target.value })}
            style={{
  color: "white",
  background: "#111",
  border: "1px solid #333",
}}
          />

          <label>Zaichiima</label>
          <input
            value={data.hostCam}
            onChange={(e) => save({ ...data, hostCam: e.target.value })}
            style={{
  color: "white",
  background: "#111",
  border: "1px solid #333",
}}
          />

          {data.players.map((p, i) => (
            <div
              key={p.id}
              style={{
                background: "#0b0b1a",
                padding: 16,
                borderRadius: 20,
                marginTop: 16,
                border: "1px solid rgba(255,255,255,.08)",
              }}
            >
              <h2 style={{ fontSize: 26, fontWeight: 900 }}>
                Spieler {i + 1}
              </h2>

              <label>Name</label>
              <input
                value={p.name}
                onChange={(e) => updatePlayer(p.id, { name: e.target.value })}
                style={{
  color: "white",
  background: "#111",
  border: "1px solid #333",
}}
              />

              <label>VDO.Ninja Link</label>
              <input
                value={p.cam || ""}
                onChange={(e) => updatePlayer(p.id, { cam: e.target.value })}
                style={{
  color: "white",
  background: "#111",
  border: "1px solid #333",
}}
              />
{p.cam && (
  <iframe
    src={p.cam}
    allow="camera; microphone; fullscreen; autoplay"
    style={{
      width: "100%",
      aspectRatio: "16/9",
      borderRadius: 16,
      marginBottom: 12,
      border: "2px solid rgba(255,255,255,.08)",
      background: "#000",
    }}
  />
)}
              <label>Status</label>
              <select
                value={p.status}
                onChange={(e) => updatePlayer(p.id, { status: e.target.value })}
              >
                <option>Waiting</option>
                <option>Talking</option>
                <option>Thinking</option>
                <option>Answering</option>
                <option>AFK</option>
                <option>Out</option>
              </select>

              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <button
                  style={{ background: "#ec4899", color: "white" }}
                  onClick={() => updatePlayer(p.id, { lives: p.lives + 1 })}
                >
                  ❤️+
                </button>
                <button
                  style={{ background: "#374151", color: "white" }}
                  onClick={() =>
                    updatePlayer(p.id, { lives: Math.max(0, p.lives - 1) })
                  }
                >
                  ❤️-
                </button>
                <button
                  style={{ background: "#06b6d4", color: "white" }}
                  onClick={() => updatePlayer(p.id, { votes: p.votes + 1 })}
                >
                  Vote +
                </button>
                <button
                  style={{ background: "#374151", color: "white" }}
                  onClick={() =>
                    updatePlayer(p.id, { votes: Math.max(0, p.votes - 1) })
                  }
                >
                  Vote -
                </button>
              </div>

              <button
                style={{
                  width: "100%",
                  background: p.active ? "#00ff95" : "#374151",
                  color: "white",
                  marginBottom: 10,
                }}
                onClick={() => updatePlayer(p.id, { active: !p.active })}
              >
                {p.active ? "Aktiv" : "Aktiv markieren"}
              </button>

              <button
                style={{ width: "100%", background: "#dc2626", color: "white" }}
                onClick={() => removePlayer(p.id)}
              >
                Entfernen
              </button>
            </div>
          ))}
        </div>
      )}

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
          }}
        >
          {data.timer}
        </div>
      )}
{(mode === "show" || mode === "host") && data.hostCam && (
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
      <div style={{ fontSize: 38, fontWeight: 900, color: "white" }}>
        Zaichiima(Host)
      </div>
    </div>
  </div>
)}
      {(mode === "show" || mode === "host") &&
        data.players.map((p) => (
          <div
            key={p.id}
            className={`cam ${p.active ? "active" : ""}`}
            style={{ left: p.x, top: p.y }}
          >
            {p.cam ? (
              <iframe
                src={p.cam}
                className="video"
                allow="camera; microphone; fullscreen; autoplay"
              />
            ) : null}

            <div className="bottom">
              <div style={{ fontSize: 38, fontWeight: 900, color: "white" }}>
                {p.name}
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
                <span>{"❤️".repeat(p.lives)}</span>
                <span>{p.status}</span>
                <span>{p.votes} Votes</span>
              </div>
            </div>
          </div>
        ))}
    </main>
  );
}