import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "/pages/Home.jsx";
import Waiting from "/pages/Waiting.jsx";
import Categories from "/pages/Categories.jsx";
import Results from "./pages/Results";
import "./styles/main.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Home />} />
        <Route path="/waiting" element={<Waiting />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/results" element={<Results />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;