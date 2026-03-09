import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Waiting from "./pages/Waiting";
import Categories from "./pages/Categories";
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