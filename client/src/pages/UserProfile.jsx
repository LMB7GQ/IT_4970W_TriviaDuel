import React from 'react';
import { useGame } from '../contexts/GameContext';

function UserProfile() {
    const { userData, setScreen } = useGame();

    // show a loading stat if data hasn't arrived yet
    if (!userData) {
        return (
            <div className="join-section">
                <h2>Loading profile...</h2>
                <button onClick={() => setScreen('modeSelect')}>Back</button>
            </div>
        );
    }

    // Number of Wins
    const totalWins = userData.wins;

    // Calculate Win Rate percentage
    const totalGames = userData.wins + userData.losses;
    const winRate = totalGames > 0
        ? ((userData.wins / totalGames) * 100).toFixed(1)
        : 0;

    return (
        <div className="join-section">
            <h2>User Profile</h2>

            <div className="profile-stats" style={{ textAlign: 'left', margin: '20px 0' }}>
                <p><strong>Username:</strong> {userData.username}</p>
                <p><strong>Rank:</strong> {userData.rank}</p>
                <hr style={{ opacity: 0.2}} />
                <p><strong>Wins:</strong> {userData.wins}</p>
                <p><strong>Losses:</strong> {userData.losses}</p>
                <p><strong>Win Rate:</strong> {winRate}%</p>
                <p><strong>Current Streak:</strong> {userData.streak}</p>
            </div>

            <button onClick={() => setScreen('modeSelect')}>
                Back to Menu
            </button>
        </div>
    );
}

export default UserProfile;