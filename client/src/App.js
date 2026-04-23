import React from 'react';
import { useGame } from './contexts/GameContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ModeSelect from './pages/ModeSelect';
import UserProfile from './pages/UserProfile';
import Waiting from './pages/Waiting';
import BanPick from './pages/BanPick';
import Playing from './pages/Playing';
import Finished from './pages/Finished';
import './App.css';

function App() {
  const { screen, gameMode } = useGame();

  const backgroundClass = {
    practice: "background_solo",
    bot: "background_bot",
    ranked: "background_1v1"
  };

  const activeBackground = 
    screen === 'modeSelect' || !gameMode ? "background_default" :
      backgroundClass[gameMode] || "background_default";

  return (
    <div className={`background ${activeBackground} ${
        screen === 'finished' ? 'app-container finished-page' : 'app-container'
      }`}>
      {screen === 'login' && <Login />}
      {screen === 'signup' && <Signup />}
      {screen === 'modeSelect' && <ModeSelect />}
      {screen === 'userProfile' && <UserProfile />}
      {screen === 'waiting' && <Waiting />}
      {screen === 'banPick' && <BanPick />}
      {screen === 'playing' && <Playing />}
      {screen === 'finished' && <Finished />}
    </div>
  );
}

export default App;