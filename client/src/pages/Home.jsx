import { useNavigate } from "react-router-dom";
import ModeCard from "../components/ModeCard";

function Home() {

  const navigate = useNavigate();

  return (
    <div className="page">

      <div className="title-box">
        Trivia Duel
      </div>

      <div className="mode-container">

        <ModeCard
          title="Solo"
          description="Play practice rounds and improve your knowledge."
          onClick={() => navigate("/categories")}
        />

        <ModeCard
          title="Ranked"
          description="Compete against other players for ranking."
          onClick={() => navigate("/waiting")}
        />

      </div>

    </div>
  );
}

export default Home;