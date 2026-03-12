import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function GamePage(){

  const location = useLocation();
  const navigate = useNavigate();

  const { playerName, mode } = location.state;

  const [playerScore,setPlayerScore] = useState(0);
  const [botScore,setBotScore] = useState(0);

  const [questionIndex,setQuestionIndex] = useState(0);
  const [userAnswer,setUserAnswer] = useState("");
  const [timeLeft,setTimeLeft] = useState(15);

  const soloQuestions = useMemo(()=>[
    {question:"What is the capital of France?",answer:"Paris"},
    {question:"What planet is known as the Red Planet?",answer:"Mars"},
    {question:"How many sides does a triangle have?",answer:"3"}
  ],[]);

  const currentQuestion = soloQuestions[questionIndex];

  const submitAnswer = ()=>{

    if(!userAnswer) return;

    if(userAnswer.toLowerCase() === currentQuestion.answer.toLowerCase()){
      setPlayerScore(prev=>prev+1);
    }

    const next = questionIndex+1;

    if(next >= soloQuestions.length){
      navigate("/finished",{
        state:{playerScore,botScore,playerName}
      });
      return;
    }

    setQuestionIndex(next);
    setUserAnswer("");

  };

  return(

    <div className="game-section">

      <div className="scoreboard">

        <div className="score-card">
          {playerName}
          <br/>
          Score: {playerScore}
        </div>

        {mode !== "practice" &&

        <div className="score-card">
          Bot Knight
          <br/>
          Score: {botScore}
        </div>

        }

      </div>

      <div className="question-area">

        <h2>{currentQuestion.question}</h2>

        <input
          value={userAnswer}
          onChange={(e)=>setUserAnswer(e.target.value)}
        />

        <button onClick={submitAnswer}>
          Submit
        </button>

      </div>

    </div>

  );

}

export default GamePage;