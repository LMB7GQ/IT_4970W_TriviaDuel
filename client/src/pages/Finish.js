import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

function FinishedPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Get data passed from GamePage
  const { playerScore, botScore, playerName, mode } = location.state || {};

  const handlePlayAgain = () => {
    // Go back to mode selection
    navigate("/modes", { state: { playerName } });
  };

  return (
    <div className="game-section">
      <h2>Battle Complete</h2>

      <div className="scoreboard">
        <div className="score-card">
          {playerName}
          <br />
          Final Score: {playerScore}
        </div>

        {mode !== "practice" && (
          <div className="score-card">
            {mode === "bot" ? "Bot Knight" : "Opponent"}
            <br />
            Final Score: {botScore}
          </div>
        )}
      </div>

      {mode === "bot" && (
        <div className="results-area">
          <h3>Round Summary</h3>
          <p>
            {playerName}: {playerScore} points
            <br />
            Bot Knight: {botScore} points
          </p>
        </div>
      )}

      <button onClick={handlePlayAgain}>Play Again</button>
    </div>
  );
}

export default FinishedPage;