import React from 'react';
import { useGame } from './contexts/GameContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ModeSelect from './pages/ModeSelect';
import Waiting from './pages/Waiting';
import BanPick from './pages/BanPick';
import Playing from './pages/Playing';
import Finished from './pages/Finished';
import './App.css';

function App() {
  const { screen } = useGame();

  return (
    <div className="app-container">
      <div className="title-box">Trivia Duel</div>

      {screen === 'login' && <Login />}
      {screen === 'signup' && <Signup />}
      {screen === 'modeSelect' && <ModeSelect />}
      {screen === 'waiting' && <Waiting />}
      {screen === 'banPick' && <BanPick />}
      {screen === 'playing' && <Playing />}
      {screen === 'finished' && <Finished />}
    </div>
  );
}

export default App;
