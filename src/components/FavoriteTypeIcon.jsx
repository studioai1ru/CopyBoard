import { getTypeIconMeta } from '../utils/typeIconMeta';
import { normalizeFavoriteIcon } from '../utils/favoriteIcons';

/** Colored type badge — same palette as history `kind-icon`. */
const FavoriteTypeIcon = ({ icon, content, size = 14, className = '' }) => {
  const id = normalizeFavoriteIcon(icon, content);
  const meta = getTypeIconMeta(id);
  const Icon = meta.Icon;

  return (
    <span
      className={`favorite-type-icon kind-icon kind-icon-${id} ${className}`.trim()}
      style={{ backgroundColor: meta.bg, color: meta.fg }}
      data-icon={id}
      aria-hidden="true"
    >
      <Icon size={size} />
    </span>
  );
};

export default FavoriteTypeIcon;
