import { getTypeIconMeta } from '../utils/typeIconMeta';
import { normalizeFavoriteIcon } from '../utils/favoriteIcons';
import { getCustomFavoriteIconVisual } from '../utils/customFavoriteIcons';

/** Colored type badge — same palette as history `kind-icon`. */
const FavoriteTypeIcon = ({ icon, content, customIcon, size = 14, className = '' }) => {
  const custom = getCustomFavoriteIconVisual(customIcon);
  const id = normalizeFavoriteIcon(icon, content, customIcon);
  const meta = id === 'custom' && custom ? custom : getTypeIconMeta(id);
  const Icon = meta.Icon;

  return (
    <span
      className={`favorite-type-icon kind-icon kind-icon-${id} ${className}`.trim()}
      style={{ backgroundColor: meta.bg, color: meta.fg }}
      data-icon={id}
      data-custom-symbol={custom?.symbol}
      data-custom-color={custom?.color}
      aria-hidden="true"
    >
      <Icon size={size} />
    </span>
  );
};

export default FavoriteTypeIcon;
