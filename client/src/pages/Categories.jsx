import CategoryButton from "../components/CategoryButton";
import PlayerBar from "../components/PlayerBar";

function Categories() {

  const categories = [
    "History",
    "Animals",
    "Technology",
    "Music",
    "Foods"
  ];

  return (
    <div className="page">

      <h1>CATEGORIES</h1>

      <div className="category-box">

        {categories.map((c, i) => (
          <CategoryButton key={i} name={c}/>
        ))}

        <p>Player 1 ban</p>

      </div>

      <PlayerBar />

    </div>
  );
}

export default Categories;