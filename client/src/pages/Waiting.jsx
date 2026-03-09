function Waiting() {

    return (
      <div className="page">
  
        <div className="waiting-animation">
          <div className="dot red"></div>
          <div className="dot yellow"></div>
          <div className="dot blue"></div>
        </div>
  
        <div className="vs-text">VS</div>
  
        <div className="player-row">
  
          <div className="avatar red"></div>
  
          <h2>USERNAME</h2>
  
          <div className="rank">
            Rank Gold: 1000
          </div>
  
        </div>
  
      </div>
    );
  }
  
  export default Waiting;