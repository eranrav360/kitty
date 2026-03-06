import { HE } from '../i18n/he';

// Color mapping based on purple/teal palette
function getCardColor(card) {
  if (!card || card.value === null) {
    if (card?.type === 'PEEK') return 'card-peek';
    if (card?.type === 'SWAP') return 'card-swap';
    if (card?.type === 'DRAW2') return 'card-draw2';
    return 'card-unknown';
  }
  if (card.value <= 2) return 'card-low';
  if (card.value <= 5) return 'card-mid';
  if (card.value <= 7) return 'card-high';
  return 'card-very-high';
}

// Dogs on 1-6, hamsters on 7-9, nothing on 0
function getCardAnimal(card) {
  if (!card || card.value === null) return null;
  if (card.value >= 1 && card.value <= 6) return '🐶';
  if (card.value >= 7 && card.value <= 9) return '🐹';
  return null;
}

function getCardLabel(card, forceReveal) {
  if (!forceReveal && !card.isKnownToMe && !card.isRevealed) {
    return { top: '?', center: '?', isHidden: true };
  }
  if (card.type === 'PEEK') return { top: '👁', center: HE.CARD_PEEK, isHidden: false };
  if (card.type === 'SWAP') return { top: '🔄', center: HE.CARD_SWAP, isHidden: false };
  if (card.type === 'DRAW2') return { top: '✌', center: HE.CARD_DRAW2, isHidden: false };
  return { top: card.value, center: card.value, isHidden: false };
}

export default function Card({
  card,
  index,
  onClick,
  selected,
  highlighted,
  small,
  forceReveal,
  faceDown,
  localReveal,
}) {
  if (!card) return <div className={`card card-empty ${small ? 'card-small' : ''}`} />;

  const reveal = forceReveal || localReveal || card.isRevealed;
  const hidden = faceDown || !reveal;
  const { top, center, isHidden } = getCardLabel(card, forceReveal || localReveal);
  const colorClass = hidden ? 'card-back' : getCardColor(card);
  const animal = !hidden ? getCardAnimal(card) : null;
  // Subtle indicator: player knows this card but it's showing face-down
  const isKnownButHidden = card.isKnownToMe && hidden && !faceDown;

  return (
    <div
      className={[
        'card',
        colorClass,
        small ? 'card-small' : '',
        selected ? 'card-selected' : '',
        highlighted ? 'card-highlighted' : '',
        onClick ? 'card-clickable' : '',
        hidden ? 'card-hidden' : '',
        isKnownButHidden ? 'card-known' : '',
      ].join(' ')}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {hidden ? (
        <div className="card-back-content">
          <span className="card-back-icon">🐶</span>
        </div>
      ) : (
        <>
          <div className="card-corner card-corner-top">{top}</div>
          <div className="card-center">
            {animal && <div className="card-animal">{animal}</div>}
            <div>{center}</div>
          </div>
          <div className="card-corner card-corner-bottom">{top}</div>
        </>
      )}
    </div>
  );
}
