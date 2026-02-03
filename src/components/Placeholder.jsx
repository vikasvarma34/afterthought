export default function Placeholder({ message, subMessage }) {
  return (
    <div className="placeholder">
      <div className="placeholder-content">
        <p className="placeholder-message">{message}</p>
        {subMessage && <p className="placeholder-submessage">{subMessage}</p>}
      </div>
    </div>
  );
}
