function ModeCard({ title, description, onClick }) {

    return (
      <div className="mode-card">
  
        <button className="mode-btn" onClick={onClick}>
          {title}
        </button>
  
        <p>{description}</p>
  
      </div>
    );
  }
  
  export default ModeCard;