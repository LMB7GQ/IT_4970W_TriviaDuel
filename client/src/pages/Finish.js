import { useLocation, useNavigate } from "react-router-dom";

function FinishedPage(){

  const location = useLocation();
  const navigate = useNavigate();

  const {playerScore,botScore,playerName} = location.state;

  return(

    <div className="game-section">

      <h2>Battle Complete</h2>

      <div className="scoreboard">

        <div className="score-card">
          {playerName}
          <br/>
          Final Score: {playerScore}
        </div>

        <div className="score-card">
          Bot Knight
          <br/>
          Final Score: {botScore}
        </div>

      </div>

      <button onClick={()=>navigate("/modes")}>
        Play Again
      </button>

    </div>

  );

}

export default FinishedPage;