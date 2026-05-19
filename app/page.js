"use client";

import { useEffect, useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc } from "firebase/firestore";

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
const roomRef = doc(db, "overlay", "main");

const DEFAULT_STATE = {
  players: [],
};

export default function Page() {
  const [mode, setMode] = useState("show");
  const [data, setData] = useState(DEFAULT_STATE);
  const [dragId, setDragId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setMode(params.get("host") === "1" ? "host" : "show");

    const unsub = onSnapshot(roomRef, async (snap) => {
      if (!snap.exists()) {
        await setDoc(roomRef, DEFAULT_STATE);
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
    const newPlayer = {
      id: crypto.randomUUID(),
      name: "Spieler",
      lives: 3,
      votes: 0,
      x: 100,
      y: 100,
    };

    await save({
      players: [...(data.players || []), newPlayer],
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

  function startDrag(e, id) {
    if (mode !== "host") return;
    setDragId(id);
  }

  async function moveDrag(e) {
    if (!dragId || mode !== "host") return;

    const player = data.players.find((p) => p.id === dragId);
    if (!player) return;

    await updatePlayer(dragId, {
      x: e.clientX - 100,
      y: e.clientY - 40,
    });
  }

  function stopDrag() {
    setDragId(null);
  }

  return (
    <main
      onMouseMove={moveDrag}
      onMouseUp={stopDrag}
      className="min-h-screen bg-transparent text-white overflow-hidden"
    >
      <style jsx global>{`
        body {
          margin: 0;
          background: transparent;
          font-family: Arial, Helvetica, sans-serif;
        }

        .player-card {
          position: absolute;
          width: 230px;
          padding: 14px;
          border-radius: 18px;
          background: rgba(10, 10, 20, 0.82);
          border: 2px solid rgba(255, 255, 255, 0.25);
          box-shadow: 0 0 25px rgba(0, 0, 0, 0.7);
          user-select: none;
        }

        .host-panel {
          position: fixed;
          top: 20px;
          left: 20px;
          z-index: 9999;
          width: 360px;
          max-height: 90vh;
          overflow-y: auto;
          background: #111122;
          border: 1px solid rgba(255,255,255,.2);
          border-radius: 20px;
          padding: 16px;
        }

        input {
          color: black;
          width: 100%;
          padding: 8px;
          border-radius: 8px;
          margin-top: 6px;
        }

        button {
          padding: 8px 12px;
          border-radius: 10px;
          border: none;
          font-weight: 900;
          cursor: pointer;
        }
      `}</style>

      {mode === "host" && (
        <div className="host-panel">
          <h1 className="text-2xl font-black mb-3">Host Overlay</h1>

          <button onClick={addPlayer} className="bg-purple-600 text-white mb-4">
            + Spieler hinzufügen
          </button>

          {(data.players || []).map((p) => (
            <div key={p.id} className="bg-black/40 rounded-xl p-3 mb-3">
              <label>Name</label>
              <input
                value={p.name}
                onChange={(e) => updatePlayer(p.id, { name: e.target.value })}
              />

              <div className="flex gap-2 mt-3">
                <button onClick={() => updatePlayer(p.id, { lives: p.lives + 1 })}>
                  + Leben
                </button>
                <button onClick={() => updatePlayer(p.id, { lives: Math.max(0, p.lives - 1) })}>
                  - Leben
                </button>
              </div>

              <div className="flex gap-2 mt-2">
                <button onClick={() => updatePlayer(p.id, { votes: p.votes + 1 })}>
                  + Vote
                </button>
                <button onClick={() => updatePlayer(p.id, { votes: Math.max(0, p.votes - 1) })}>
                  - Vote
                </button>
              </div>

              <button
                onClick={() => removePlayer(p.id)}
                className="bg-red-600 text-white mt-3"
              >
                Entfernen
              </button>
            </div>
          ))}

          <p className="text-sm text-gray-400 mt-4">
            Karten kannst du direkt auf der Seite mit der Maus verschieben.
          </p>
        </div>
      )}

      {(data.players || []).map((p) => (
        <div
          key={p.id}
          onMouseDown={(e) => startDrag(e, p.id)}
          className="player-card"
          style={{
            left: p.x,
            top: p.y,
            cursor: mode === "host" ? "grab" : "default",
          }}
        >
          <h2 className="text-3xl font-black">{p.name}</h2>
          <div className="text-2xl mt-2">{"❤️".repeat(p.lives)}</div>
          <div className="text-xl font-black mt-2">Votes: {p.votes}</div>
        </div>
      ))}
    </main>
  );
}