import { useNavigate, useLocation } from "react-router-dom";

function ModeSelectPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const playerName = location.state?.playerName;

  return (
    <div className="join-section">
      <h2>Welcome, {playerName}</h2>

      <button onClick={() => navigate("/game", { state: { mode: "practice", playerName } })}>
        Solo Practice
      </button>

      <button onClick={() => navigate("/game", { state: { mode: "bot", playerName } })}>
        Bot Duel
      </button>

      <button onClick={() => navigate("/waiting", { state: { playerName } })}>
        Ranked Mode
      </button>
    </div>
  );
}

export default ModeSelectPage;