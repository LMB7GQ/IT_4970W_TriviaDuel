import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function GamePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { playerName, mode } = location.state || {};

  // Scores
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);

  // Game tracking
  const [questionIndex, setQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(15);

  // Bot state
  const [botAnswered, setBotAnswered] = useState(false);
  const [botAnswerData, setBotAnswerData] = useState(null);

  // Round results
  const [roundResults, setRoundResults] = useState(null);

  // Sample questions
  const soloQuestions = useMemo(
    () => [
      { question: "What is the capital of France?", answer: "Paris" },
      { question: "What planet is known as the Red Planet?", answer: "Mars" },
      { question: "How many sides does a triangle have?", answer: "3" },
      { question: "Who wrote Hamlet?", answer: "Shakespeare" },
      { question: "What is the largest ocean on Earth?", answer: "Pacific" },
    ],
    []
  );

  const currentQuestion = soloQuestions[questionIndex];

  // Bot parameters
  const playerRank = 1000;
  const getBotAccuracy = (rank) =>
    rank < 900 ? 0.4 : rank < 1200 ? 0.6 : 0.75;
  const getBotResponseTime = (rank) =>
    rank < 900 ? 9000 : rank < 1200 ? 7000 : 5000;

  // Bot auto-answer
  useEffect(() => {
    if (mode !== "bot" || !currentQuestion) return;

    setBotAnswered(false);
    setBotAnswerData(null);

    const botAccuracy = getBotAccuracy(playerRank);
    const responseTime = getBotResponseTime(playerRank);

    const botTimer = setTimeout(() => {
      const correct = Math.random() < botAccuracy;
      const answer = correct ? currentQuestion.answer : "Wrong Answer";

      setBotAnswered(true);
      setBotAnswerData({ answered: answer, correct });
    }, responseTime);

    return () => clearTimeout(botTimer);
  }, [mode, currentQuestion]);

  // Player timer
  useEffect(() => {
    if (!currentQuestion || mode === "ranked") return;

    if (timeLeft <= 0) {
      handleSubmitAnswer(true);
      return;
    }

    const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, currentQuestion]);

  // Handle answer submission
  const handleSubmitAnswer = (timeExpired = false) => {
    const submittedAnswer = timeExpired ? "" : userAnswer;
    const playerCorrect =
      submittedAnswer.trim().toLowerCase() ===
      currentQuestion.answer.trim().toLowerCase();

    let newPlayerScore = playerScore;
    let newBotScore = botScore;

    if (playerCorrect) newPlayerScore += 1;
    if (botAnswerData?.correct) newBotScore += 1;

    setPlayerScore(newPlayerScore);
    setBotScore(newBotScore);

    setRoundResults({
      player: {
        playerName,
        answered: submittedAnswer || "No Answer",
        correct: playerCorrect,
        currentScore: newPlayerScore,
      },
      bot: botAnswerData
        ? {
            playerName: "Bot Knight",
            answered: botAnswerData.answered,
            correct: botAnswerData.correct,
            currentScore: newBotScore,
          }
        : null,
    });

    // Reset input and bot for next question
    setUserAnswer("");
    setBotAnswered(false);
    setBotAnswerData(null);

    // Move to next question
    const nextIndex = questionIndex + 1;
    if (nextIndex >= soloQuestions.length) {
      navigate("/finished", {
        state: { playerScore: newPlayerScore, botScore: newBotScore, playerName, mode },
      });
      return;
    }

    setQuestionIndex(nextIndex);
    setTimeLeft(15);
  };

  return (
    <div className="game-section">
      <div className="scoreboard">
        <div className="score-card">
          {playerName}
          <br />
          Score: {playerScore}
        </div>
        {mode === "bot" && (
          <div className="score-card">
            Bot Knight
            <br />
            Score: {botScore}
          </div>
        )}
      </div>

      {currentQuestion && (
        <div className="question-area">
          <h2>{currentQuestion.question}</h2>
          <input
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmitAnswer()}
          />
          <button onClick={() => handleSubmitAnswer()}>Submit Answer</button>
        </div>
      )}

      {mode === "bot" && (
        <p>{botAnswered ? "Bot Knight has answered." : "Bot Knight is thinking..."}</p>
      )}

      {roundResults && (
        <div className="results-area">
          <h3>Round Results</h3>
          <ul>
            {Object.entries(roundResults).map(([key, info]) =>
              info ? (
                <li key={key}>
                  {info.playerName}: {info.answered} —{" "}
                  {info.correct ? "Correct" : "Incorrect"} (Score: {info.currentScore})
                </li>
              ) : null
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default GamePage;