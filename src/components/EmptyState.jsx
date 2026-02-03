export default function EmptyState({ title, description, buttonText, onButtonClick }) {
  return (
    <div className="empty-state">
      <div className="empty-state-content">
        <h2>{title}</h2>
        <p>{description}</p>
        {buttonText && (
          <button onClick={onButtonClick} className="empty-state-btn">
            {buttonText}
          </button>
        )}
      </div>
    </div>
  );
}
