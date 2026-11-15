import { useState } from 'react';

export default function CardFlip({ front, back, alt }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="card-flip" onClick={() => setFlipped((f) => !f)}>
      <div className={`card-flip-inner ${flipped ? 'flipped' : ''}`}>
        <img className="card-face card-front" src={front} alt={`${alt} front`} />
        <img className="card-face card-back" src={back} alt={`${alt} back`} />
      </div>
      <p className="card-flip-hint">Click to flip</p>
    </div>
  );
}
