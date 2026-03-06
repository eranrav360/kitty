import { HE } from '../i18n/he';

// All number cards get the clean cream look; power cards get their own colour
function getCardColor(card) {
  if (!card || card.value === null) {
    if (card?.type === 'PEEK')  return 'card-peek';
    if (card?.type === 'SWAP')  return 'card-swap';
    if (card?.type === 'DRAW2') return 'card-draw2';
    return 'card-unknown';
  }
  return 'card-number';
}

// 0-6: dogs, 7-9: hamsters
function getCardAnimal(card) {
  if (!card || card.value === null) return null;
  if (card.value >= 0 && card.value <= 6) return '🐶';
  if (card.value >= 7 && card.value <= 9) return '🐹';
  return null;
}

function getCardLabel(card, forceReveal) {
  if (!forceReveal && !card.isKnownToMe && !card.isRevealed) {
    return { top: '?', center: '?', isHidden: true };
  }
  if (card.type === 'PEEK')  return { top: '👁',  center: HE.CARD_PEEK,  isHidden: false };
  if (card.type === 'SWAP')  return { top: '🔄',  center: HE.CARD_SWAP,  isHidden: false };
  if (card.type === 'DRAW2') return { top: '✌',   center: HE.CARD_DRAW2, isHidden: false };
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
