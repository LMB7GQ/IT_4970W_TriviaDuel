import React from 'react';
import { useGame } from '../contexts/GameContext';

function UserProfile() {
    const { userData, setScreen, logout, updateProfilePic } = useGame();
    const [showPicModal, setShowPicModal] = React.useState(false);
    const [selectedPic, setSelectedPic] = React.useState(null);

    const feedbackForm = () => {
            const link="https://docs.google.com/forms/d/e/1FAIpQLSemHNMO2h8pj1ky54JfBsgjc8lu_c8AY9fVQGoFBP7CNqAeYQ/viewform?usp=publish-editor"
            window.open(link, '_blank');
        };

    // show a loading stat if data hasn't arrived yet
    if (!userData) {
        return (
            <div className="join-section">
                <h2>Loading profile...</h2>
                <button onClick={() => setScreen('modeSelect')}>Back</button>
            </div>
        );
    }

    const profilePics = [
        'pfps_0000_Layer-2.png',
        'pfps_0001_Layer-3.png',
        'pfps_0002_Layer-4.png',
        'pfps_0003_Layer-5.png',
        'pfps_0004_Layer-6.png',
        'pfps_0005_Layer-7.png',
        'pfps_0006_Layer-8.png',
        'pfps_0007_Layer-9.png',
        'pfps_0008_Layer-10.png',
        'pfps_0009_Layer-11.png',
        'pfps_0010_Layer-12.png',
        'pfps_0011_Layer-13.png',
    ];
    const picIndex = userData.profilePic ?? 0;

    // Number of Wins
    const totalWins = userData.wins;

    // Calculate Win Rate percentage
    const totalGames = userData.wins + userData.losses;
    const winRate = totalGames > 0
        ? ((userData.wins / totalGames) * 100).toFixed(1)
        : 0;

    const handleSaveIcon = async () => {
        await updateProfilePic(selectedPic);
        setShowPicModal(false);
    };

    return (
        <div className="join-section">
            <h2>User Profile</h2>

            {/* Profile Picture Picker Modal */}
            {showPicModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        backgroundColor: '#1a1a2e', padding: '40px', borderRadius: '12px',
                        textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        border: '2px solid #4fc3f7', maxWidth: '420px', width: '90%'
                    }}>
                        <h2 style={{ color: '#4fc3f7', marginBottom: '20px', fontSize: '22px' }}>Choose an Icon</h2>
                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '12px', marginBottom: '24px'
                        }}>
                            {profilePics.map((pic, index) => (
                                <img
                                    key={index}
                                    src={`/ProfilePics/${pic}`}
                                    alt={`Icon ${index}`}
                                    onClick={() => setSelectedPic(index)}
                                    style={{
                                        width: '70px', height: '70px', borderRadius: '50%',
                                        objectFit: 'cover', cursor: 'pointer',
                                        border: selectedPic === index
                                            ? '3px solid #4fc3f7'
                                            : '3px solid transparent',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={handleSaveIcon}
                                disabled={selectedPic === null}
                                style={{
                                    backgroundColor: selectedPic === null ? '#4e4e6a' : '#4fc3f7',
                                    color: selectedPic === null ? '#aaa' : '#1a1a2e',
                                    padding: '12px 24px', borderRadius: '6px', border: 'none',
                                    cursor: selectedPic === null ? 'default' : 'pointer',
                                    fontWeight: 'bold', fontSize: '14px'
                                }}
                            >
                                Save Icon
                            </button>
                            <button
                                onClick={() => { setShowPicModal(false); setSelectedPic(null); }}
                                style={{
                                    backgroundColor: '#4e4e6a', color: 'white',
                                    padding: '12px 24px', borderRadius: '6px', border: 'none',
                                    cursor: 'pointer', fontWeight: 'bold', fontSize: '14px'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="profile-stats" style={{ textAlign: 'left', margin: '20px 0' }}>
                <img
                    src={`/ProfilePics/${profilePics[picIndex]}`}
                    alt="Profile"
                    onClick={() => { setSelectedPic(picIndex); setShowPicModal(true); }}
                    style={{
                        width: '100px', height: '100px', borderRadius: '50%',
                        border: '3px solid black', display: 'block',
                        marginBottom: '12px', objectFit: 'cover',
                        cursor: 'pointer'
                    }}
                />
                <p style={{ fontSize: '20px' }}><strong>Username:</strong> {userData.username}</p>
                <p style={{ fontSize: '20px' }}><strong>Rank:</strong> {userData.rank}</p>
                <hr style={{ opacity: 0.2}} />
                <p><strong>Wins:</strong> {userData.wins}</p>
                <p><strong>Number of Games:</strong> {totalGames}</p>
                <p><strong>Win Rate:</strong> {winRate}%</p>
                <p><strong>Current Streak:</strong> {userData.streak}</p>
            </div>

            <button onClick={() => setScreen('modeSelect')}>
                Back to Menu
            </button>
            <button onClick={logout}>
                Logout
            </button>
            <button onClick={feedbackForm}>
                Feedback
            </button>
        </div>
    );
}

export default UserProfile;